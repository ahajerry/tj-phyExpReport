"""通用报告接口：验证、排队、查询进度和下载 PDF。"""

from __future__ import annotations

import json
import argparse
import os
import re
import secrets
from decimal import Decimal
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from http.cookies import SimpleCookie

try:
    from .backend_revision import backend_revision
    from .experiment_registry import render_report, validate_report
    from .report_queue import ReportQueue, QuotaExceeded
    from .report_images import validate_image_bytes
    from .table_uploads import parse_table
    from .editable_instrument_data import editable_import
except ImportError:  # 兼容 python backend/main.py 的启动方式
    from backend_revision import backend_revision
    from experiment_registry import render_report, validate_report
    from report_queue import ReportQueue, QuotaExceeded
    from report_images import validate_image_bytes
    from table_uploads import parse_table
    from editable_instrument_data import editable_import


MAX_REQUEST_BYTES = 64 * 1024
MAX_MULTIPART_BYTES = 30 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGES = 5
BACKEND_REVISION = backend_revision()


def image_extension(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if content.startswith((b"II*\x00", b"MM\x00*")):
        return "tif"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "webp"
    if len(content) >= 12 and content[4:8] == b"ftyp":
        if content[8:12] in (b"heic", b"heix", b"heif", b"mif1"):
            return "heic"
        if content[8:12] in (b"avif", b"avis"):
            return "avif"
    return None


class ReportHandler(BaseHTTPRequestHandler):
    queue: ReportQueue
    environment = "development"

    def _identity(self) -> tuple[str, bool]:
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except Exception:
            pass
        value = cookie.get("report_user")
        if value and len(value.value) == 64 and all(char in "0123456789abcdef" for char in value.value):
            return value.value, False
        return secrets.token_hex(32), True

    def _send(self, status: int, body: bytes, content_type: str, new_user: str | None = None, download_name: str | None = None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if new_user:
            secure_by_default = "1" if self.environment == "production" else "0"
            secure = "; Secure" if os.environ.get("REPORT_COOKIE_SECURE", secure_by_default) == "1" else ""
            self.send_header("Set-Cookie", f"report_user={new_user}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax{secure}")
        if download_name:
            self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, data: dict, new_user: str | None = None):
        self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", new_user)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/health":
            self._json(200, {"service": "report-generator", "revision": BACKEND_REVISION})
            return
        user_id, is_new = self._identity()
        new_user = user_id if is_new else None
        if path == "/api/reports/session":
            self._json(200, self.queue.session(user_id), new_user)
            return
        parts = path.strip("/").split("/")
        if len(parts) >= 4 and parts[:3] == ["api", "reports", "jobs"]:
            job_id = parts[3]
            if len(parts) == 4:
                job = self.queue.job(job_id, user_id)
                self._json(200, job, new_user) if job else self._json(404, {"error": "任务不存在"}, new_user)
                return
            if len(parts) == 5 and parts[4] == "download":
                pdf = self.queue.download(job_id, user_id)
                if pdf is None:
                    self._json(404, {"error": "报告尚未生成或任务不存在"}, new_user)
                else:
                    job = self.queue.job(job_id, user_id)
                    experiment_id = job["experimentId"] if job else "experiment"
                    self._send(200, pdf, "application/pdf", new_user, download_name=f"{experiment_id}-report.pdf")
                return
        self._json(404, {"error": "接口不存在"}, new_user)

    def do_POST(self) -> None:
        user_id, is_new = self._identity()
        new_user = user_id if is_new else None
        path = urlsplit(self.path).path
        if path not in ("/api/reports/jobs", "/api/reports/import-table"):
            self._json(404, {"error": "接口不存在"}, new_user)
            return
        try:
            payload, images = self._read_submission()
            if path == "/api/reports/import-table":
                if (not isinstance(payload, dict) or payload.get("experimentId") not in ("forced-vibration", "millikan", "moment-of-inertia")
                        or not payload.get("sourceTables") or images):
                    raise ValueError("请上传对应实验的原始数据表")
                imported = editable_import(payload)
                validate_report({"experimentId": payload["experimentId"], **imported})
                self._json(200, imported, new_user)
                return
            job = self.queue.create(user_id, payload, images)
        except (ValueError, UnicodeError) as exc:
            self._json(400, {"error": str(exc)}, new_user)
            return
        except QuotaExceeded as exc:
            self._json(429, {"error": str(exc)}, new_user)
            return
        except OSError as exc:
            self._json(500, {"error": f"保存原始图片失败：{exc}"}, new_user)
            return
        self._json(202, job, new_user)

    def _read_submission(self) -> tuple[object, list[tuple[str, bytes]]]:
        content_type = self.headers.get("Content-Type", "")
        media_type = content_type.split(";")[0].strip().lower()
        # multipart 是简单表单类型，要求自定义头以阻止跨站表单消耗用户额度。
        if media_type == "multipart/form-data" and self.headers.get("X-Report-Request") != "1":
            raise ValueError("缺少报告上传标识")
        limit = MAX_MULTIPART_BYTES if media_type == "multipart/form-data" else MAX_REQUEST_BYTES
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > limit:
            raise ValueError("请求体为空或过大")
        body = self.rfile.read(length)
        if media_type == "application/json":
            payload = json.loads(body.decode("utf-8"), parse_float=Decimal)
            return payload, []
        if media_type != "multipart/form-data":
            raise ValueError("请使用 JSON 或 multipart/form-data 提交")
        message = BytesParser(policy=policy.default).parsebytes(
            b"MIME-Version: 1.0\r\nContent-Type: " + content_type.encode("ascii") + b"\r\n\r\n" + body
        )
        if not message.is_multipart():
            raise ValueError("上传表单格式错误")
        payload = None
        images: list[tuple[str, bytes]] = []
        table = None
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            content = part.get_payload(decode=True)
            if not isinstance(content, bytes):
                raise ValueError("上传表单内容无效")
            if name == "payload" and payload is None:
                if len(content) > MAX_REQUEST_BYTES:
                    raise ValueError("报告数据过大")
                payload = json.loads(content.decode("utf-8"), parse_float=Decimal)
            elif name == "images":
                if len(images) >= MAX_IMAGES or len(content) > MAX_IMAGE_BYTES:
                    raise ValueError("最多上传 5 张图片，每张不超过 8 MiB")
                extension = image_extension(content)
                if extension is None:
                    raise ValueError("只支持 PNG、JPEG、GIF、TIFF、WebP、HEIC 或 AVIF 图片")
                validate_image_bytes(content)
                original = (part.get_filename() or "image").replace("\\", "/").split("/")[-1]
                stem = re.sub(r"[^\w.-]", "_", original.rsplit(".", 1)[0])[:60].strip(".") or "image"
                images.append((f"{len(images) + 1:02d}_{stem}.{extension}", content))
            elif name == "table" and table is None:
                table = (part.get_filename() or "", content)
            else:
                raise ValueError("上传表单包含无效或重复字段")
        if payload is None:
            raise ValueError("缺少报告数据")
        if table is not None:
            if not isinstance(payload, dict) or not isinstance(payload.get("reportInfo", {}), dict):
                raise ValueError("报告数据必须是对象")
            imported = parse_table(payload.get("experimentId"), *table)
            payload = {**payload, **imported,
                       "reportInfo": {**imported.get("reportInfo", {}), **{
                           key: value for key, value in payload.get("reportInfo", {}).items() if value
                       }}}
        if isinstance(payload, dict) and payload.get("experimentId") == "oscilloscope" and len(images) > 2:
            raise ValueError("示波器报告最多附两张原始记录图片，以保持完整报告为 6–7 页")
        return payload, images


def main():
    parser = argparse.ArgumentParser(description="物理实验报告后端")
    parser.add_argument("--environment", choices=("development", "production"),
                        default=os.environ.get("REPORT_ENV", "development"))
    args = parser.parse_args()
    ReportHandler.environment = args.environment
    ReportHandler.queue = ReportQueue(validate_report, render_report)
    host = os.environ.get("REPORT_HOST", "127.0.0.1")
    port = int(os.environ.get("REPORT_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), ReportHandler)
    print(f"实验报告后端：http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        ReportHandler.queue.close()


if __name__ == "__main__":
    main()
