package storage

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	_ "modernc.org/sqlite"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"sync"
	"syscall"
	"time"
	_ "time/tzdata"
)

var ErrQuota = errors.New("今天的报告生成次数已用完，请明天再试")
var ErrNotFound = errors.New("任务不存在")

type RenderFunc func(context.Context, domain.Payload, string, func(int, string)) ([]byte, error)
type Queue struct {
	db     *sql.DB
	dir    string
	lock   *os.File
	wake   chan struct{}
	cancel context.CancelFunc
	wg     sync.WaitGroup
	render RenderFunc
}

func Token(bytes int) string {
	b := make([]byte, bytes)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b)
}
func today() string {
	zone, _ := time.LoadLocation("Asia/Shanghai")
	return time.Now().In(zone).Format("2006-01-02")
}
func Open(dir string, render RenderFunc) (q *Queue, err error) {
	dir, err = filepath.Abs(dir)
	if err != nil {
		return nil, err
	}
	for _, d := range []string{"reports", "original-images", "work"} {
		if err = os.MkdirAll(filepath.Join(dir, d), 0700); err != nil {
			return nil, err
		}
	}
	lock, err := os.OpenFile(filepath.Join(dir, "server.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		lock.Close()
		return nil, fmt.Errorf("数据目录已有运行中的 Go 服务: %w", err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dir, "reports.sqlite3"))
	if err != nil {
		lock.Close()
		return nil, err
	}
	db.SetMaxOpenConns(1)
	q = &Queue{db: db, dir: dir, lock: lock, wake: make(chan struct{}, 1), render: render}
	defer func() {
		if err != nil {
			db.Close()
			lock.Close()
		}
	}()
	_, err = db.Exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS jobs(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL,day TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,stage TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_user_day ON jobs(user_id,day);
UPDATE jobs SET status='queued',progress=0,stage='等待重新编译' WHERE status='running';
UPDATE jobs SET status='queued',progress=0,stage='模板修复后重新排队',error=NULL WHERE status='failed' AND error IN ('模板中不存在这些字段：student_id','模板中不存在这些字段：partner');`)
	if err != nil {
		return nil, err
	}
	return q, nil
}
func (q *Queue) Start() {
	ctx, cancel := context.WithCancel(context.Background())
	q.cancel = cancel
	q.wg.Add(1)
	go func() { defer q.wg.Done(); q.work(ctx) }()
}
func (q *Queue) Close() error {
	if q.cancel != nil {
		q.cancel()
	}
	q.wg.Wait()
	e := q.db.Close()
	q.lock.Close()
	return e
}
func (q *Queue) Create(ctx context.Context, user string, p domain.Payload, images []domain.Image) (job domain.Job, err error) {
	id := Token(16)
	payload, err := json.Marshal(p)
	if err != nil {
		return job, err
	}
	tx, err := q.db.BeginTx(ctx, nil)
	if err != nil {
		return job, err
	}
	defer tx.Rollback()
	used := 0
	if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE user_id=? AND day=?", user, today()).Scan(&used); err != nil {
		return job, err
	}
	if used >= 50 {
		return job, ErrQuota
	}
	archive := filepath.Join(q.dir, "original-images", id)
	defer func() {
		if err != nil {
			os.RemoveAll(archive)
		}
	}()
	if len(images) > 0 {
		if err = os.Mkdir(archive, 0700); err != nil {
			return job, err
		}
		for _, im := range images {
			if filepath.Base(im.Name) != im.Name || im.Name == "." || im.Name == ".." {
				return job, fmt.Errorf("无效图片文件名")
			}
			if err = os.WriteFile(filepath.Join(archive, im.Name), im.Content, 0600); err != nil {
				return job, err
			}
		}
	}
	_, err = tx.ExecContext(ctx, "INSERT INTO jobs(id,user_id,day,payload,status,stage,created_at) VALUES(?,?,?,?,?,?,?)", id, user, today(), string(payload), "queued", "正在排队", time.Now().Format(time.RFC3339Nano))
	if err != nil {
		return job, err
	}
	if err = tx.Commit(); err != nil {
		return job, err
	}
	select {
	case q.wake <- struct{}{}:
	default:
	}
	return q.Job(ctx, id, user)
}
func (q *Queue) Job(ctx context.Context, id, user string) (domain.Job, error) {
	var j domain.Job
	var seq int
	var raw string
	err := q.db.QueryRowContext(ctx, "SELECT seq,id,payload,status,progress,stage,error,created_at FROM jobs WHERE id=? AND user_id=?", id, user).Scan(&seq, &j.ID, &raw, &j.Status, &j.Progress, &j.Stage, &j.Error, &j.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return j, ErrNotFound
	}
	if err != nil {
		return j, err
	}
	var p domain.Payload
	if err = json.Unmarshal([]byte(raw), &p); err != nil {
		return j, err
	}
	j.ExperimentID = p.ExperimentID
	if j.Status == "queued" {
		if err = q.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE seq<? AND status IN ('queued','running')", seq).Scan(&j.QueueAhead); err != nil {
			return j, err
		}
	}
	entries, e := os.ReadDir(filepath.Join(q.dir, "original-images", id))
	if e != nil && !os.IsNotExist(e) {
		return j, e
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			j.ImageCount++
		}
	}
	return j, nil
}
func (q *Queue) Session(ctx context.Context, user string) (domain.Session, error) {
	s := domain.Session{UserID: user[:8], DailyLimit: 50, Jobs: []domain.Job{}}
	if e := q.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE user_id=? AND day=?", user, today()).Scan(&s.UsedToday); e != nil {
		return s, e
	}
	if e := q.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").Scan(&s.QueueAhead); e != nil {
		return s, e
	}
	rows, e := q.db.QueryContext(ctx, "SELECT id FROM jobs WHERE user_id=? ORDER BY seq DESC LIMIT 20", user)
	if e != nil {
		return s, e
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if e = rows.Scan(&id); e != nil {
			rows.Close()
			return s, e
		}
		ids = append(ids, id)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return s, e
	}
	for _, id := range ids {
		j, e := q.Job(ctx, id, user)
		if e != nil {
			return s, e
		}
		s.Jobs = append(s.Jobs, j)
	}
	return s, nil
}
func (q *Queue) Download(ctx context.Context, id, user string) (domain.Job, string, error) {
	j, e := q.Job(ctx, id, user)
	if e != nil {
		return j, "", e
	}
	if j.Status != "done" {
		return j, "", ErrNotFound
	}
	path := filepath.Join(q.dir, "reports", id+".pdf")
	if _, e = os.Stat(path); e != nil {
		return j, "", ErrNotFound
	}
	return j, path, nil
}
func (q *Queue) work(ctx context.Context) {
	for ctx.Err() == nil {
		var id, raw string
		e := q.db.QueryRowContext(ctx, "SELECT id,payload FROM jobs WHERE status='queued' ORDER BY seq LIMIT 1").Scan(&id, &raw)
		if errors.Is(e, sql.ErrNoRows) {
			select {
			case <-ctx.Done():
				return
			case <-q.wake:
			case <-time.After(time.Second):
			}
			continue
		}
		if e != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("queue: %v", e)
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Second):
			}
			continue
		}
		if _, e = q.db.ExecContext(ctx, "UPDATE jobs SET status='running',progress=0,stage='准备生成报告',error=NULL WHERE id=?", id); e != nil {
			continue
		}
		var p domain.Payload
		e = json.Unmarshal([]byte(raw), &p)
		var pdf []byte
		if e == nil {
			pdf, e = q.render(ctx, p, filepath.Join(q.dir, "original-images", id), func(value int, stage string) {
				if _, err := q.db.ExecContext(ctx, "UPDATE jobs SET progress=?,stage=? WHERE id=?", value, stage, id); err != nil && ctx.Err() == nil {
					log.Printf("progress: %v", err)
				}
			})
		}
		if ctx.Err() != nil {
			_, err := q.db.Exec("UPDATE jobs SET status='queued',progress=0,stage='等待重新编译' WHERE id=?", id)
			if err != nil {
				log.Printf("requeue: %v", err)
			}
			return
		}
		if e == nil {
			temp := filepath.Join(q.dir, "reports", id+".tmp")
			e = os.WriteFile(temp, pdf, 0600)
			if e == nil {
				e = os.Rename(temp, filepath.Join(q.dir, "reports", id+".pdf"))
			}
		}
		var updateErr error
		if e != nil {
			message := []rune(e.Error())
			if len(message) > 2500 {
				message = message[len(message)-2500:]
			}
			_, updateErr = q.db.Exec("UPDATE jobs SET status='failed',stage='生成失败',error=? WHERE id=?", string(message), id)
		} else {
			_, updateErr = q.db.Exec("UPDATE jobs SET status='done',progress=100,stage='报告已生成',error=NULL WHERE id=?", id)
		}
		if updateErr != nil {
			log.Printf("finish job %s: %v", id, updateErr)
		}
	}
}
