"""Check physical units, tangent conventions, raw precision and unsafe inputs."""
import copy
import json
from io import BytesIO
from types import SimpleNamespace
from decimal import Decimal
from pathlib import Path
from unittest import TestCase
from unittest.mock import MagicMock, patch
from PIL import Image

from scripts.verify_reports import samples
from . import oscilloscope_exp as exp
from .experiment_registry import validate_report
from .fill_sound_speed import FIELD_PATTERN
from .main import ReportHandler


class OscilloscopeReportTests(TestCase):
    def payload(self):
        return {"experimentId": exp.EXPERIMENT_ID, **copy.deepcopy(samples[exp.EXPERIMENT_ID])}

    def test_measurements_use_ms_khz_and_probe_factor(self):
        payload = self.payload()
        payload["parameters"]["probe_factor"] = "10"
        payload["data"]["voltage_divisions"][0] = "6.00"
        fields = validate_report(payload)
        self.assertEqual(Decimal(fields["voltage_pp_01"]), 30)
        self.assertEqual(Decimal(fields["period_ms_01"]), 2)
        self.assertEqual(Decimal(fields["frequency_khz_01"]), Decimal("0.5"))
        self.assertEqual(fields["voltage_divisions_01"], "6.00")
        # Calibration uses X1 regardless of the measurement probe setting.
        self.assertEqual(Decimal(fields["cal_voltage"]), Decimal("0.5"))
        self.assertEqual(Decimal(fields["cal_frequency"]), 1)
        self.assertEqual(Decimal(fields["cal_voltage_error"]), 0)

    def test_horizontal_tangencies_are_numerator(self):
        payload = self.payload()
        payload["data"]["reference_frequency"] = ["3", "1.5", "1", "0.75", "0.6"]
        payload["data"]["nx"] = ["2", "4", "6", "8", "10"]
        payload["data"]["ny"] = ["3"] * 5
        fields = validate_report(payload)
        for i in range(1, 6):
            self.assertEqual(Decimal(fields[f"lissajous_frequency_{i:02d}"]), 2)
        self.assertEqual(fields["frequency_ratio_03"], "2:1")
        self.assertEqual(Decimal(fields["lissajous_mean_khz"]), 2)
        self.assertEqual(Decimal(fields["lissajous_u_khz"]), 0)

    def test_rejects_zero_negative_nonfinite_and_fractional_counts(self):
        for key, value in (("time_scale", "0"), ("period_divisions", "-1"),
                           ("voltage_scale", "NaN"), ("nx", "1.5"),
                           ("ny", "0"), ("nx", "101")):
            with self.subTest(key=key, value=value):
                payload = self.payload()
                payload["data"][key][0] = value
                with self.assertRaises(ValueError):
                    validate_report(payload)
        payload = self.payload()
        payload["data"]["nx"].pop()
        with self.assertRaises(ValueError):
            validate_report(payload)

    def test_all_report_fields_exist_in_template(self):
        source = (Path(__file__).resolve().parents[1] / "tex/templates/oscilloscope.tex").read_text(encoding="utf-8")
        self.assertLessEqual(set(validate_report(self.payload())), set(FIELD_PATTERN.findall(source)))

    def test_three_originals_rejected_before_compilation(self):
        image_dir = MagicMock()
        image_dir.exists.return_value = True
        image_dir.iterdir.return_value = [MagicMock() for _ in range(3)]
        for path in image_dir.iterdir.return_value:
            path.is_file.return_value = True
        with patch.object(exp, "render") as compiler:
            with self.assertRaisesRegex(ValueError, "两张"):
                exp.render_report(self.payload(), image_dir=image_dir)
            compiler.assert_not_called()

    def test_upload_accepts_two_images_and_rejects_three(self):
        png = BytesIO()
        Image.new("RGB", (2, 2), "white").save(png, "PNG")
        for count in (2, 3):
            body = (b'--test-boundary\r\nContent-Disposition: form-data; name="payload"\r\n\r\n'
                    + json.dumps(self.payload()).encode() + b'\r\n')
            for i in range(count):
                body += (f'--test-boundary\r\nContent-Disposition: form-data; name="images"; filename="{i}.png"\r\n'
                         'Content-Type: image/png\r\n\r\n').encode() + png.getvalue() + b'\r\n'
            body += b'--test-boundary--\r\n'
            handler = SimpleNamespace(headers={"Content-Type": "multipart/form-data; boundary=test-boundary",
                                              "Content-Length": str(len(body)), "X-Report-Request": "1"},
                                      rfile=BytesIO(body))
            if count == 2:
                _payload, images = ReportHandler._read_submission(handler)
                self.assertEqual(len(images), 2)
            else:
                with self.assertRaisesRegex(ValueError, "两张"):
                    ReportHandler._read_submission(handler)
