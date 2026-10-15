package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"sync"
	"testing"
	"time"
)

func TestLegacyDatabaseAndInterruptedWorker(t *testing.T) {
	dir := t.TempDir()
	db, e := sql.Open("sqlite", filepath.Join(dir, "reports.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	_, e = db.Exec(`CREATE TABLE jobs(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL,day TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,stage TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL)`)
	if e != nil {
		t.Fatal(e)
	}
	id, user := Token(16), Token(32)
	p := domain.Payload{ExperimentID: "speed-of-sound"}
	raw, _ := json.Marshal(p)
	_, e = db.Exec("INSERT INTO jobs(id,user_id,day,payload,status,stage,created_at) VALUES(?,?,?,?,?,?,?)", id, user, today(), string(raw), "running", "old worker", "2026-10-14T12:00:00")
	db.Close()
	if e != nil {
		t.Fatal(e)
	}
	started := make(chan struct{})
	q, e := Open(dir, func(ctx context.Context, _ domain.Payload, _ string, _ func(int, string)) ([]byte, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	})
	if e != nil {
		t.Fatal(e)
	}
	j, e := q.Job(context.Background(), id, user)
	if e != nil || j.Status != "queued" || j.CreatedAt != "2026-10-14T12:00:00" {
		t.Fatal(j, e)
	}
	q.Start()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("worker never claimed legacy job")
	}
	if e = q.Close(); e != nil {
		t.Fatal(e)
	}
	q, e = Open(dir, func(_ context.Context, _ domain.Payload, _ string, _ func(int, string)) ([]byte, error) {
		return []byte("%PDF-recovered"), nil
	})
	if e != nil {
		t.Fatal(e)
	}
	defer q.Close()
	j, e = q.Job(context.Background(), id, user)
	if e != nil || j.Status != "queued" {
		t.Fatal(j, e)
	}
	q.Start()
	for i := 0; i < 100; i++ {
		j, e = q.Job(context.Background(), id, user)
		if e != nil {
			t.Fatal(e)
		}
		if j.Status == "done" {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	_, path, e := q.Download(context.Background(), id, user)
	if e != nil {
		t.Fatal(e)
	}
	b, e := os.ReadFile(path)
	if e != nil || string(b) != "%PDF-recovered" {
		t.Fatal(string(b), e)
	}
}
func TestConcurrentQuota(t *testing.T) {
	q, e := Open(t.TempDir(), nil)
	if e != nil {
		t.Fatal(e)
	}
	defer q.Close()
	user := Token(32)
	var wg sync.WaitGroup
	var mu sync.Mutex
	created, rejected := 0, 0
	for i := 0; i < 60; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := q.Create(context.Background(), user, domain.Payload{ExperimentID: "oscilloscope"}, nil)
			mu.Lock()
			defer mu.Unlock()
			if e == nil {
				created++
			} else if e == ErrQuota {
				rejected++
			} else {
				t.Error(e)
			}
		}()
	}
	wg.Wait()
	if created != 50 || rejected != 10 {
		t.Fatal(created, rejected)
	}
}
