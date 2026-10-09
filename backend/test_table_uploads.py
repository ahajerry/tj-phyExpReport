"""Instrument file imports use the actual export layouts supplied for this project."""

import json
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
import unittest

from .main import ReportHandler
from .millikan_exp import report_fields as millikan_fields
from .moment_of_inertia_exp import report_fields as torsion_fields
from .table_uploads import parse_table
from .experiment_registry import validate_report
from scripts.verify_reports import samples


SOURCE_DIR = Path("D:/ProgramData/QQDownloads")


def sample(pattern):
    return next(SOURCE_DIR.glob(pattern), None)


class TableUploadTests(unittest.TestCase):
    def test_manual_submission_without_table(self):
        for experiment_id in ("millikan", "moment-of-inertia"):
            payload = {"experimentId": experiment_id, **samples[experiment_id]}
            encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            boundary = "manual-readings"
            multipart = (f'--{boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n'.encode()
                         + encoded + f"\r\n--{boundary}--\r\n".encode())
            for content_type, body in (("application/json", encoded),
                                       (f"multipart/form-data; boundary={boundary}", multipart)):
                with self.subTest(experiment_id=experiment_id, content_type=content_type):
                    fake = SimpleNamespace(headers={"Content-Type": content_type,
                                                    "Content-Length": str(len(body)), "X-Report-Request": "1"},
                                           rfile=BytesIO(body))
                    result, images = ReportHandler._read_submission(fake)
                    self.assertEqual(result, payload)
                    self.assertEqual(images, [])
                    self.assertTrue(validate_report(result))

    def test_csv_accepts_eight_and_rejects_nine_or_ten_drops(self):
        for count in (3, 8, 9, 10):
            content = ("当前电压,平衡电压,时间\n" + "120,120,10\n" * (count * 4)).encode()
            if count > 8:
                with self.assertRaisesRegex(ValueError, "3 至 8"):
                    parse_table("millikan", "data.csv", content)
            else:
                parsed = parse_table("millikan", "data.csv", content)
                self.assertTrue(all(len(values) == 8 for values in parsed["data"].values()))
                self.assertEqual(parsed["data"]["voltage"][count:], [""] * (8 - count))
                self.assertEqual(len(parsed["sourceTables"][0]["rows"]), count * 4)

    def test_json_requires_eight_slots(self):
        for count in (9, 10):
            payload = {"experimentId": "millikan", "parameters": {}, "data": {
                key: ["120" if key == "voltage" else "10"] * count
                for key in ("voltage", "time_1", "time_2", "time_3", "time_4")}}
            with self.assertRaisesRegex(ValueError, "8 个读数"):
                millikan_fields(payload)

    def test_millikan_csv_sample_has_eight_complete_drops(self):
        path = sample("密里根油滴.csv")
        if path is None:
            self.skipTest("user CSV is unavailable")
        parsed = parse_table("millikan", path.name, path.read_bytes())
        self.assertEqual(parsed["data"]["voltage"][0], "122.925")
        self.assertEqual(len(parsed["data"]["voltage"]), 8)
        self.assertEqual(len(parsed["sourceTables"][0]["rows"]), 32)
        fields = millikan_fields({"experimentId": "millikan", **parsed})
        self.assertIn("electron_charge_ls", fields)
        self.assertNotIn("charge_09", fields)

    def test_torsion_xlsx_sample_converts_units(self):
        path = sample("NB00000002*.xlsx")
        if path is None:
            self.skipTest("user XLSX is unavailable")
        parsed = parse_table("moment-of-inertia", path.name, path.read_bytes())
        self.assertEqual(parsed["parameters"]["mass_cylinder_g"], "717.3")
        self.assertEqual(parsed["parameters"]["slider_self_inertia"], "0.000040695")
        self.assertEqual(parsed["data"]["time_disk"], ["12.79", "12.79", "12.81"])
        fields = torsion_fields({"experimentId": "moment-of-inertia", **parsed})
        self.assertEqual(fields["slider_pair_inertia"], "0.000081390")

    def test_rejects_wrong_file_type_and_missing_csv_groups(self):
        with self.assertRaisesRegex(ValueError, "CSV"):
            parse_table("millikan", "data.xlsx", b"test")
        with self.assertRaisesRegex(ValueError, "连续 4 行"):
            parse_table("millikan", "data.csv", "平衡电压,时间\n1,2,3\n".encode())

    def test_http_submission_uses_uploaded_table(self):
        path = sample("密里根油滴.csv")
        if path is None:
            self.skipTest("user CSV is unavailable")
        boundary = "instrument-export"
        payload = {"experimentId": "millikan", "reportInfo": {"student": "测试"}}
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n"
                + json.dumps(payload, ensure_ascii=False) + "\r\n"
                + f"--{boundary}\r\nContent-Disposition: form-data; name=\"table\"; filename=\"data.csv\"\r\n"
                + "Content-Type: text/csv\r\n\r\n").encode("utf-8") + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        fake = SimpleNamespace(headers={"Content-Type": f"multipart/form-data; boundary={boundary}",
                                        "Content-Length": str(len(body)), "X-Report-Request": "1"},
                               rfile=BytesIO(body))
        result, images = ReportHandler._read_submission(fake)
        self.assertEqual(images, [])
        self.assertEqual(result["reportInfo"]["student"], "测试")
        self.assertEqual(result["data"]["voltage"][0], "122.925")


if __name__ == "__main__":
    unittest.main()
