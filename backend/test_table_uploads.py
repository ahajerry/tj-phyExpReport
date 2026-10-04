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


SOURCE_DIR = Path("D:/ProgramData/QQDownloads")


def sample(pattern):
    return next(SOURCE_DIR.glob(pattern), None)


class TableUploadTests(unittest.TestCase):
    def test_millikan_csv_sample_has_eight_complete_drops(self):
        path = sample("密里根油滴.csv")
        if path is None:
            self.skipTest("user CSV is unavailable")
        parsed = parse_table("millikan", path.name, path.read_bytes())
        self.assertEqual(parsed["data"]["voltage"][0], "122.925")
        self.assertEqual(parsed["data"]["voltage"][8:], ["", ""])
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
