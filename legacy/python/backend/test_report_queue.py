import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from io import BytesIO
from pathlib import Path
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from PIL import Image

try:
    from . import report_queue as queue_module
    from .report_queue import QuotaExceeded, ReportQueue
except ImportError:
    import report_queue as queue_module
    from report_queue import QuotaExceeded, ReportQueue

try:
    from .main import ReportHandler
    from .backend_revision import backend_revision
except ImportError:
    from main import ReportHandler
    from backend_revision import backend_revision


class ReportQueueTests(unittest.TestCase):
    def test_template_field_failures_retry_after_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            renderer = lambda payload, progress, image_dir: b"%PDF-recovered"
            queue = ReportQueue(lambda payload: None, renderer, directory, start_worker=False)
            jobs = [queue.create("alice", {"test": index}) for index in range(2)]
            with queue.lock, queue.db:
                for job, field in zip(jobs, ("student_id", "partner")):
                    queue.db.execute(
                        "UPDATE jobs SET status='failed',error=? WHERE id=?",
                        (f"模板中不存在这些字段：{field}", job["id"]),
                    )
            queue.close()

            restarted = ReportQueue(lambda payload: None, renderer, directory)
            try:
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if all(restarted.job(job["id"], "alice")["status"] == "done" for job in jobs):
                        break
                    time.sleep(0.02)
                self.assertTrue(all(restarted.job(job["id"], "alice")["status"] == "done" for job in jobs))
            finally:
                restarted.close()

    @patch.object(queue_module, "DAILY_LIMIT", 2)
    def test_queue_quota_ownership_and_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            queue = ReportQueue(lambda payload: None, lambda payload, progress, image_dir: b"%PDF-test", path, start_worker=False)
            first = queue.create("alice", {"test": 1})
            second = queue.create("alice", {"test": 2})
            self.assertEqual(first["queueAhead"], 0)
            self.assertEqual(second["queueAhead"], 1)
            session_jobs = queue.session("alice")["jobs"]
            self.assertEqual({job["id"]: job["queueAhead"] for job in session_jobs},
                             {first["id"]: 0, second["id"]: 1})
            self.assertEqual(queue.session("alice")["queueAheadIfSubmitted"], 2)
            self.assertIsNone(queue.job(first["id"], "bob"))
            self.assertIsNone(queue.download(first["id"], "bob"))
            with self.assertRaises(QuotaExceeded):
                queue.create("alice", {"test": 3})
            queue.close()

            restarted = ReportQueue(lambda payload: None, lambda payload, progress, image_dir: b"%PDF-test", path)
            try:
                deadline = time.monotonic() + 5
                while restarted.job(second["id"], "alice")["status"] != "done" and time.monotonic() < deadline:
                    time.sleep(0.02)
                self.assertEqual(restarted.job(first["id"], "alice")["status"], "done")
                self.assertEqual(restarted.job(second["id"], "alice")["status"], "done")
                self.assertEqual(restarted.download(first["id"], "alice"), b"%PDF-test")
                self.assertEqual(restarted.session("alice")["usedToday"], 2)
            finally:
                restarted.close()

    def test_http_cookie_recovery_and_download(self):
        with tempfile.TemporaryDirectory() as directory:
            queue = ReportQueue(lambda payload: None, lambda payload, progress, image_dir: b"%PDF-test", directory)
            ReportHandler.queue = queue
            server = ThreadingHTTPServer(("127.0.0.1", 0), ReportHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            browser = build_opener(HTTPCookieProcessor(CookieJar()))
            stranger = build_opener(HTTPCookieProcessor(CookieJar()))
            try:
                import json
                self.assertEqual(json.load(browser.open(base + "/api/health"))["revision"], backend_revision())
                created = browser.open(Request(
                    base + "/api/reports/jobs", data=b'{}',
                    headers={"Content-Type": "application/json"}, method="POST"
                ))
                job_id = json.load(created)["id"]
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    status = json.load(browser.open(base + f"/api/reports/jobs/{job_id}"))
                    if status["status"] == "done":
                        break
                    time.sleep(0.02)
                self.assertEqual(status["status"], "done")
                self.assertEqual(browser.open(base + f"/api/reports/jobs/{job_id}/download").read(), b"%PDF-test")
                self.assertEqual(json.load(browser.open(base + "/api/reports/session"))["jobs"][0]["id"], job_id)
                boundary = "report-test-boundary"
                buffer = BytesIO()
                Image.new("RGB", (8, 8), "white").save(buffer, format="PNG")
                image = buffer.getvalue()
                multipart = (
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n{{}}\r\n"
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"images\"; filename=\"notes.png\"\r\n"
                    "Content-Type: image/png\r\n\r\n"
                ).encode() + image + f"\r\n--{boundary}--\r\n".encode()
                uploaded = json.load(browser.open(Request(
                    base + "/api/reports/jobs", data=multipart, method="POST",
                    headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "X-Report-Request": "1"},
                )))
                self.assertEqual(uploaded["imageCount"], 1)
                uploaded_status = None
                while time.monotonic() < deadline + 5:
                    uploaded_status = json.load(browser.open(base + f"/api/reports/jobs/{uploaded['id']}"))["status"]
                    if uploaded_status == "done":
                        break
                    time.sleep(0.02)
                self.assertEqual(uploaded_status, "done")
                self.assertEqual((queue.originals_dir / uploaded["id"] / "01_notes.png").read_bytes(), image)
                with self.assertRaises(HTTPError) as denial:
                    stranger.open(base + f"/api/reports/jobs/{job_id}/download")
                self.assertEqual(denial.exception.code, 404)
                denial.exception.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join()
                queue.close()


if __name__ == "__main__":
    unittest.main()
