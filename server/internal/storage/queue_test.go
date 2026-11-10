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
	q, e := Open(dir, func(ctx context.Context, _ domain.Payload, _ string, _ func(int, string)) (domain.ReportArtifacts, error) {
		close(started)
		<-ctx.Done()
		return domain.ReportArtifacts{}, ctx.Err()
	})
	if e != nil {
		t.Fatal(e)
	}
	// Simulate a crash after publishing one file but before the status update.
	if e = os.WriteFile(filepath.Join(dir, "reports", id+".pdf"), []byte("incomplete previous attempt"), 0600); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(dir, "reports", id+".typ.zip.tmp"), []byte("partial source"), 0600); e != nil {
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
	q, e = Open(dir, func(_ context.Context, _ domain.Payload, _ string, _ func(int, string)) (domain.ReportArtifacts, error) {
		return domain.ReportArtifacts{PDF: []byte("%PDF-recovered"), SourceZIP: []byte("source snapshot")}, nil
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
	_, source, e := q.DownloadSource(context.Background(), id, user)
	if e != nil {
		t.Fatal(e)
	}
	b, e = os.ReadFile(source)
	if e != nil || string(b) != "source snapshot" {
		t.Fatal(string(b), e)
	}
	if _, e = os.Stat(source + ".tmp"); !os.IsNotExist(e) {
		t.Fatal("partial source survived recovery", e)
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

func TestArtifactsPublishTogether(t *testing.T) {
	for _, mode := range []string{"missing-source", "source-rename-failure"} {
		t.Run(mode, func(t *testing.T) {
			dir := t.TempDir()
			q, err := Open(dir, func(context.Context, domain.Payload, string, func(int, string)) (domain.ReportArtifacts, error) {
				a := domain.ReportArtifacts{PDF: []byte("%PDF-synthetic")}
				if mode != "missing-source" {
					a.SourceZIP = []byte("synthetic source archive")
				}
				return a, nil
			})
			if err != nil {
				t.Fatal(err)
			}
			defer q.Close()
			user := Token(32)
			job, err := q.Create(context.Background(), user, domain.Payload{ExperimentID: "oscilloscope"}, nil)
			if err != nil {
				t.Fatal(err)
			}
			if mode == "source-rename-failure" {
				blocked := filepath.Join(dir, "reports", job.ID+".typ.zip")
				if err = os.Mkdir(blocked, 0700); err != nil {
					t.Fatal(err)
				}
				if err = os.WriteFile(filepath.Join(blocked, "synthetic-blocker"), []byte("test"), 0600); err != nil {
					t.Fatal(err)
				}
			}
			q.Start()
			deadline := time.Now().Add(3 * time.Second)
			for time.Now().Before(deadline) {
				job, err = q.Job(context.Background(), job.ID, user)
				if err != nil {
					t.Fatal(err)
				}
				if job.Status == "failed" {
					break
				}
				time.Sleep(5 * time.Millisecond)
			}
			if job.Status != "failed" {
				t.Fatalf("incomplete report published: %+v", job)
			}
			if _, _, err = q.Download(context.Background(), job.ID, user); err == nil {
				t.Fatal("partial PDF downloadable")
			}
			if _, _, err = q.DownloadSource(context.Background(), job.ID, user); err == nil {
				t.Fatal("partial source downloadable")
			}
			for _, suffix := range []string{".pdf", ".pdf.tmp", ".typ.zip.tmp"} {
				if _, err = os.Stat(filepath.Join(dir, "reports", job.ID+suffix)); !os.IsNotExist(err) {
					t.Fatalf("partial artifact remains: %s: %v", suffix, err)
				}
			}
		})
	}
}
