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
from .fill_sound_speed import FIELD_PATTERN, fill_report
from .main import ReportHandler


class OscilloscopeReportTests(TestCase):
    def payload(self):
        return {"experimentId": exp.EXPERIMENT_ID, **copy.deepcopy(samples[exp.EXPERIMENT_ID])}

    def test_measurements_use_ms_hz_and_probe_factor(self):
        payload = self.payload()
        payload["parameters"]["probe_factor"] = "10"
        payload["data"]["voltage_divisions"][0] = "6.00"
        fields = validate_report(payload)
        self.assertEqual(Decimal(fields["voltage_pp_01"]), 30)
        self.assertEqual(Decimal(fields["period_ms_01"]), Decimal("0.58"))
        self.assertEqual(Decimal(fields["frequency_hz_01"]), Decimal("1724.14"))
        self.assertEqual(fields["voltage_divisions_01"], "6.00")

    def test_horizontal_tangencies_are_numerator(self):
        payload = self.payload()
        payload["data"]["reference_frequency"] = ["3", "1.5", "1", "0.75"]
        payload["data"]["nx"] = ["2", "4", "6", "8"]
        payload["data"]["ny"] = ["3"] * 4
        fields = validate_report(payload)
        for i in range(1, 5):
            self.assertEqual(Decimal(fields[f"lissajous_frequency_{i:02d}"]), 2)
        self.assertEqual(fields["frequency_ratio_03"], "2:1")
        self.assertEqual(Decimal(fields["lissajous_mean_khz"]), 2)
        self.assertEqual(Decimal(fields["lissajous_u_khz"]), 0)

    def test_photo_readings_and_sine_row(self):
        fields = validate_report(self.payload())
        self.assertEqual(Decimal(fields["voltage_pp_01"]), Decimal("2.75"))
        self.assertEqual(Decimal(fields["voltage_pp_04"]), Decimal("0.72"))
        self.assertEqual(Decimal(fields["period_ms_02"]), Decimal("0.062"))
        self.assertEqual(Decimal(fields["sine_frequency_khz"]), Decimal("16.129"))
        for i, expected in enumerate(("16.232", "16.232", "16.2315", "16.2315"), 1):
            self.assertEqual(Decimal(fields[f"lissajous_frequency_{i:02d}"]), Decimal(expected))

    def test_rejects_old_waveform_and_lissajous_counts(self):
        for key, count in (("voltage_scale", 7), ("reference_frequency", 5)):
            payload = self.payload()
            payload["data"][key] = ["1"] * count
            with self.assertRaisesRegex(ValueError, "4 个读数"):
                validate_report(payload)

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

    def test_lissajous_plots_use_each_submitted_row(self):
        payload = self.payload()
        payload["data"]["nx"] = ["5", "7", "4", "2"]
        payload["data"]["ny"] = ["2", "3", "6", "5"]
        template = Path(__file__).resolve().parents[1] / "tex/templates/oscilloscope.tex"
        with patch.object(Path, "write_text") as write:
            fill_report(validate_report(payload), template.with_name("test-filled.tex"), template)
            source = write.call_args.args[0]
        self.assertIn(r"\csname reportfield@nx_\index\endcsname", source)
        self.assertIn(r"\csname reportfield@ny_\index\endcsname", source)
        self.assertIn(r"samples=\plotSamples", source)
        self.assertNotIn("1/1/0/{1:1}", source)
        for index, ratio in enumerate(("5:2", "7:3", "2:3", "2:5"), 1):
            self.assertIn(rf"\SetField{{frequency_ratio_{index:02d}}}{{{ratio}}}", source)
            for key in ("nx", "ny"):
                self.assertIn(rf"\SetField{{{key}_{index:02d}}}{{{payload['data'][key][index - 1]}}}", source)

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
