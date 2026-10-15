"""持久化的单工作线程报告队列。"""

import json
import os
import sqlite3
import sys
import threading
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


DAILY_LIMIT = 50
DATA_DIR = Path(os.environ.get("REPORT_DATA_DIR") or (
    (Path(sys.executable).resolve().parent if getattr(sys, "frozen", False)
     else Path(__file__).resolve().parents[1]) / ".report-data"
))


class QuotaExceeded(Exception):
    pass


class ReportQueue:
    def __init__(self, validate, renderer, data_dir=DATA_DIR, start_worker=True):
        self.validate = validate
        self.renderer = renderer
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir = self.data_dir / "reports"
        self.reports_dir.mkdir(exist_ok=True)
        self.originals_dir = self.data_dir / "original-images"
        self.originals_dir.mkdir(exist_ok=True)
        self.lock = threading.RLock()
        self.wakeup = threading.Event()
        self.stopped = threading.Event()
        self.db = sqlite3.connect(self.data_dir / "reports.sqlite3", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        with self.lock, self.db:
            self.db.execute("""CREATE TABLE IF NOT EXISTS jobs (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                day TEXT NOT NULL,
                payload TEXT NOT NULL,
                status TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                stage TEXT NOT NULL,
                error TEXT,
                created_at TEXT NOT NULL
            )""")
            self.db.execute("CREATE INDEX IF NOT EXISTS jobs_user_day ON jobs(user_id, day)")
            self.db.execute("UPDATE jobs SET status='queued',progress=0,stage='等待重新编译' WHERE status='running'")
            self.db.execute(
                """UPDATE jobs SET status='queued',progress=0,stage='模板修复后重新排队',error=NULL
                   WHERE status='failed' AND error IN (?, ?)""",
                ("模板中不存在这些字段：student_id", "模板中不存在这些字段：partner"),
            )
        self.worker = threading.Thread(target=self._work, name="latex-report-worker", daemon=True) if start_worker else None
        if self.worker:
            self.worker.start()

    @staticmethod
    def today():
        return datetime.now(ZoneInfo("Asia/Shanghai")).date().isoformat()

    def close(self):
        self.stopped.set()
        self.wakeup.set()
        if self.worker:
            self.worker.join()
        with self.lock:
            self.db.close()

    def create(self, user_id, payload, images=None):
        self.validate(payload)
        images = images or []
        job_id = uuid.uuid4().hex
        day = self.today()
        with self.lock, self.db:
            used = self.db.execute(
                "SELECT COUNT(*) FROM jobs WHERE user_id=? AND day=?", (user_id, day)
            ).fetchone()[0]
            if used >= DAILY_LIMIT:
                raise QuotaExceeded("今天的报告生成次数已用完，请明天再试")
            if images:
                archive = self.originals_dir / job_id
                archive.mkdir()
                try:
                    for name, content in images:
                        if not name or name in (".", "..") or "/" in name or "\\" in name:
                            raise ValueError("图片文件名无效")
                        (archive / name).write_bytes(content)
                except Exception:
                    for path in archive.iterdir():
                        path.unlink()
                    archive.rmdir()
                    raise
            self.db.execute(
                "INSERT INTO jobs(id,user_id,day,payload,status,stage,created_at) VALUES(?,?,?,?,?,?,?)",
                (job_id, user_id, day, json.dumps(payload, ensure_ascii=False, default=str),
                 "queued", "正在排队", datetime.now().isoformat()),
            )
            job = self._job_locked(job_id, user_id)
        self.wakeup.set()
        return job

    def _job_locked(self, job_id, user_id):
        row = self.db.execute("SELECT * FROM jobs WHERE id=? AND user_id=?", (job_id, user_id)).fetchone()
        if row is None:
            return None
        ahead = self.db.execute(
            "SELECT COUNT(*) FROM jobs WHERE seq<? AND status IN ('queued','running')", (row["seq"],)
        ).fetchone()[0] if row["status"] == "queued" else 0
        archive = self.originals_dir / job_id
        experiment_id = json.loads(row["payload"]).get("experimentId")
        return {"id": row["id"], "experimentId": experiment_id,
                "status": row["status"], "progress": row["progress"],
                "stage": row["stage"], "error": row["error"], "queueAhead": ahead,
                "createdAt": row["created_at"], "imageCount": sum(1 for path in archive.iterdir() if path.is_file()) if archive.exists() else 0}

    def job(self, job_id, user_id):
        with self.lock:
            return self._job_locked(job_id, user_id)

    def session(self, user_id):
        with self.lock:
            queue_ahead_if_submitted = self.db.execute(
                "SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')"
            ).fetchone()[0]
            used = self.db.execute(
                "SELECT COUNT(*) FROM jobs WHERE user_id=? AND day=?", (user_id, self.today())
            ).fetchone()[0]
            ids = self.db.execute(
                "SELECT id FROM jobs WHERE user_id=? ORDER BY seq DESC LIMIT 20", (user_id,)
            ).fetchall()
            jobs = [self._job_locked(row["id"], user_id) for row in ids]
        return {"userId": user_id[:8], "dailyLimit": DAILY_LIMIT, "usedToday": used,
                "queueAheadIfSubmitted": queue_ahead_if_submitted, "jobs": jobs}

    def download(self, job_id, user_id):
        with self.lock:
            job = self._job_locked(job_id, user_id)
            if job is None or job["status"] != "done":
                return None
            return (self.reports_dir / f"{job_id}.pdf").read_bytes()

    def _work(self):
        while not self.stopped.is_set():
            with self.lock, self.db:
                row = self.db.execute(
                    "SELECT id,payload FROM jobs WHERE status='queued' ORDER BY seq LIMIT 1"
                ).fetchone()
                if row:
                    self.db.execute(
                        "UPDATE jobs SET status='running',progress=0,stage='准备生成报告' WHERE id=?", (row["id"],)
                    )
            if row is None:
                self.wakeup.wait(timeout=5)
                self.wakeup.clear()
                continue
            job_id = row["id"]

            def progress(value, stage):
                with self.lock, self.db:
                    self.db.execute("UPDATE jobs SET progress=?,stage=? WHERE id=?", (value, stage, job_id))

            try:
                archive = self.originals_dir / job_id
                pdf = self.renderer(json.loads(row["payload"]), progress, archive if archive.exists() else None)
                temporary = self.reports_dir / f"{job_id}.tmp"
                temporary.write_bytes(pdf)
                temporary.replace(self.reports_dir / f"{job_id}.pdf")
                with self.lock, self.db:
                    self.db.execute(
                        "UPDATE jobs SET status='done',progress=100,stage='报告已生成' WHERE id=?", (job_id,)
                    )
            except Exception as exc:
                with self.lock, self.db:
                    self.db.execute(
                        "UPDATE jobs SET status='failed',stage='生成失败',error=? WHERE id=?", (str(exc)[-2500:], job_id)
                    )
