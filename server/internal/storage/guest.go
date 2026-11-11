package storage

import (
	"context"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"
)

const guestPrefix = "guest:"

var ErrGuestEnrollmentLimit = errors.New("匿名开通次数已达上限，请稍后再试")
var ErrGuestQueueLimit = errors.New("匿名报告生成额度已达上限，请稍后再试")

func (q *Queue) EnrollGuest(ctx context.Context, digest [32]byte, source string) error {
	tx, err := q.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var exists bool
	if err := tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM mcp_guests WHERE digest=?)", digest[:]).Scan(&exists); err != nil || exists {
		return err
	}
	window := time.Now().Unix() / 3600
	var total, fromSource int
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(count),0),COALESCE(SUM(CASE WHEN source=? THEN count ELSE 0 END),0)
FROM mcp_guest_issuance WHERE window=?`, source, window).Scan(&total, &fromSource); err != nil {
		return err
	}
	if total >= 120 || fromSource >= 30 {
		return ErrGuestEnrollmentLimit
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM mcp_guest_issuance WHERE window<?", window); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO mcp_guest_issuance(window,source,count) VALUES(?,?,1)
ON CONFLICT(window,source) DO UPDATE SET count=count+1`, window, source); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO mcp_guests(digest) VALUES(?)", digest[:]); err != nil {
		return err
	}
	return tx.Commit()
}

func (q *Queue) GuestPrincipal(ctx context.Context, digest [32]byte) (string, error) {
	var exists bool
	err := q.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM mcp_guests WHERE digest=?)", digest[:]).Scan(&exists)
	if err != nil || !exists {
		return "", err
	}
	return guestPrefix + hex.EncodeToString(digest[:]), nil
}

func checkGuestQueue(ctx context.Context, tx *sql.Tx, day string) error {
	var daily, pending int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM jobs WHERE day=? AND user_id GLOB 'guest:*'`, day).Scan(&daily); err != nil {
		return err
	}
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running') AND user_id GLOB 'guest:*'`).Scan(&pending); err != nil {
		return err
	}
	if daily >= 100 || pending >= 12 {
		return ErrGuestQueueLimit
	}
	return nil
}
