package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"phyexp/server/internal/httpapi"
	"phyexp/server/internal/render"
	"phyexp/server/internal/storage"
	"syscall"
	"time"
)

var revision = "development"

func env(k, defaultValue string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return defaultValue
}
func main() {
	environment := flag.String("environment", env("REPORT_ENV", "development"), "development or production")
	check := flag.Bool("healthcheck", false, "probe the local server and exit")
	flag.Parse()
	host, port := env("REPORT_HOST", "127.0.0.1"), env("REPORT_PORT", "8000")
	if *check {
		client := &http.Client{Timeout: 3 * time.Second}
		r, e := client.Get("http://127.0.0.1:" + port + "/api/health")
		if e != nil {
			log.Fatal(e)
		}
		r.Body.Close()
		if r.StatusCode != 200 {
			os.Exit(1)
		}
		return
	}
	if *environment != "development" && *environment != "production" {
		log.Fatal("invalid environment")
	}
	templates, e := filepath.Abs(env("REPORT_TEMPLATE_DIR", "typst/templates"))
	if e != nil {
		log.Fatal(e)
	}
	data, e := filepath.Abs(env("REPORT_DATA_DIR", ".report-data"))
	if e != nil {
		log.Fatal(e)
	}
	renderer := render.Renderer{TemplateDir: templates, WorkDir: filepath.Join(data, "work"), FontDir: env("REPORT_FONT_DIR", filepath.Join(filepath.Dir(templates), "fonts"))}
	q, e := storage.Open(data, renderer.Render)
	if e != nil {
		log.Fatal(e)
	}
	defer q.Close()
	q.Start()
	secureDefault := "0"
	if *environment == "production" {
		secureDefault = "1"
	}
	handler := httpapi.New(q, env("REPORT_REVISION", revision), env("REPORT_STATIC_DIR", ""), env("REPORT_COOKIE_SECURE", secureDefault) == "1")
	srv := &http.Server{Addr: host + ":" + port, Handler: handler, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 60 * time.Second, WriteTimeout: 120 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 32 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	done := make(chan error, 1)
	go func() { fmt.Printf("Go 报告服务 http://%s\n", srv.Addr); done <- srv.ListenAndServe() }()
	select {
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if e = srv.Shutdown(shutdown); e != nil {
			srv.Close()
		}
	case e = <-done:
		if !errors.Is(e, http.ErrServerClosed) {
			log.Printf("server: %v", e)
		}
	}
}
