package render

import (
	"context"
	"fmt"
	"os/exec"
	"syscall"
	"time"
)

type tailBuffer struct {
	b     []byte
	limit int
}

func (t *tailBuffer) Write(b []byte) (int, error) {
	n := len(b)
	t.b = append(t.b, b...)
	if len(t.b) > t.limit {
		t.b = t.b[len(t.b)-t.limit:]
	}
	return n, nil
}
func run(ctx context.Context, dir string, timeout time.Duration, name string, args ...string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return nil
		}
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	cmd.WaitDelay = 2 * time.Second
	out := &tailBuffer{limit: 16000}
	cmd.Stdout = out
	cmd.Stderr = out
	err := cmd.Run()
	if err != nil {
		return out.b, fmt.Errorf("%s 执行失败: %w\n%s", name, err, string(out.b))
	}
	return out.b, nil
}
