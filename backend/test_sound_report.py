import tempfile
import unittest
from pathlib import Path
from .fill_sound_speed import COVER_PATTERN, FIELD_PATTERN, PLOT_PATTERN, TEMPLATE
from .experiment_registry import validate_report

try:
    from .speed_of_sound_exp import REPORT_INFO_FIELDS, TEMPLATE_REPORT_INFO_FIELDS, report_fields
except ImportError:
    from speed_of_sound_exp import REPORT_INFO_FIELDS, TEMPLATE_REPORT_INFO_FIELDS, report_fields


def sample_payload():
    positions = [str(index * 5) for index in range(20)]
    return {
        "experimentId": "speed-of-sound",
        "data": {"resonance": positions, "phase": positions},
        "parameters": {
            "res_t_start": "20.0", "res_t_end": "22.0", "res_frequency": "35.0", "res_frequency_error": "0.1",
            "phase_t_start": "20.0", "phase_t_end": "20.0", "phase_frequency": "34.0", "phase_frequency_error": "0.1",
            "caliper_error": "0.02",
        },
        "reportInfo": {"student": "测试学生", "student_id": "20260001", "group": "1", "date": "2026-09-30", "partner": "测试同学"},
    }


class SoundReportTests(unittest.TestCase):
    def test_all_calculated_fields(self):
        fields = report_fields(sample_payload())
        self.assertEqual(fields["res_lambda_avg"], "10.000")
        self.assertEqual(fields["res_t_avg"], "21.00")
        self.assertEqual(fields["res_u_f"], "0.06")
        self.assertEqual(fields["res_speed"], "350.0")
        self.assertEqual(fields["phase_speed"], "340.0")
        self.assertEqual(fields["final_speed"], "345.0")
        self.assertEqual(fields["res_u_v"], "0.7")
        self.assertEqual(fields["res_speed_result"], "350.0")
        self.assertEqual(fields["res_u_v_result"], "0.7")
        self.assertEqual(fields["student"], "测试学生")
        self.assertEqual(fields["student_id"], "20260001")
        self.assertNotIn("partner", fields)
        for prefix in ("res", "phase"):
            for suffix in ("u_r_f", "u_r_v", "u_v", "speed_theory", "error_percent", "u_r_v_percent"):
                self.assertIn(f"{prefix}_{suffix}", fields)
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn(r"\thispagestyle{record}", template)
        self.assertIn("请将教师签字的实验原始数据记录单", template)
        required = set(FIELD_PATTERN.findall(template)) | set(COVER_PATTERN.findall(template))
        self.assertEqual(required - set(fields) - {"experiment"}, set())
        self.assertLessEqual(TEMPLATE_REPORT_INFO_FIELDS, required)
        self.assertIn("partner", REPORT_INFO_FIELDS)  # 旧任务可继续读取，但不改变模板版式。
        self.assertNotIn("partner", required)

    def test_missing_or_invalid_parameters_rejected(self):
        payload = sample_payload()
        del payload["parameters"]["res_frequency"]
        with self.assertRaises(ValueError):
            report_fields(payload)
        payload = sample_payload()
        payload["parameters"]["phase_frequency"] = "0"
        with self.assertRaises(ValueError):
            report_fields(payload)
        payload = sample_payload()
        payload["parameters"]["res_t_start"] = "-300"
        with self.assertRaises(ValueError):
            report_fields(payload)

    def test_queued_job_from_previous_version_still_renders(self):
        payload = sample_payload()
        del payload["parameters"]
        fields = report_fields(payload)
        self.assertEqual(fields["res_lambda_avg"], "10.000")
        self.assertNotIn("res_speed", fields)

    def test_student_id_and_image_pages_fill_template(self):
        from .fill_sound_speed import fill_report
        with tempfile.TemporaryDirectory() as directory:
            tex = fill_report(report_fields(sample_payload()), Path(directory) / "report.tex",
                              image_files=["original_01.jpg", "original_02.jpg"])
            content = tex.read_text(encoding="utf-8")
            self.assertIn(r"\SetField{student_id}{20260001}", content)
            self.assertNotIn(r"\SetField{partner}", content)
            self.assertIn(r"\reportimagestrue", content)
            self.assertIn(r"\includegraphics[width=\textwidth,height=19cm,keepaspectratio]{original_01.jpg}", content)
            self.assertRegex(content, r"\\end\{center\}\s+\\clearpage\s+\\thispagestyle\{record\}")
            self.assertNotIn("\\clearpage\n\\thispagestyle{record}\n\\bindingline[3.03]\n"
                             "\\begin{center}\n{\\heiti 原始数据记录（第 1 张）", content)
            self.assertNotIn("原始数据图片插入区", content)

    def test_all_templates_use_record_page_for_first_uploaded_image(self):
        from .fill_sound_speed import fill_report
        templates = Path(__file__).resolve().parents[1] / "tex" / "templates"
        with tempfile.TemporaryDirectory() as directory:
            for template in sorted(templates.glob("*.tex")):
                if template.name == "physics_report_base.tex":
                    continue
                with self.subTest(template=template.name):
                    fields = {key: " (1,2)" for key in PLOT_PATTERN.findall(
                        template.read_text(encoding="utf-8"))}
                    empty = fill_report(fields, Path(directory) / "empty.tex", template)
                    uploaded = fill_report(fields, Path(directory) / "uploaded.tex", template,
                                           image_files=["original_01.jpg"])
                    empty_source = empty.read_text(encoding="utf-8")
                    uploaded_source = uploaded.read_text(encoding="utf-8")
                    self.assertNotIn(r"\reportimagestrue", empty_source)
                    self.assertIn(r"\reportimagestrue", uploaded_source)
                    self.assertIn(r"\thispagestyle{record}" if template.name == "speed-of-sound.tex"
                                  else r"\ReportRecord", uploaded_source)
                    self.assertNotIn("\\clearpage\n\\thispagestyle{record}\n\\begin{center}",
                                     uploaded_source)

    def test_scientific_number_gets_math_field(self):
        from .fill_sound_speed import fill_report
        template = Path(__file__).resolve().parents[1] / "tex" / "templates" / "millikan.tex"
        with tempfile.TemporaryDirectory() as directory:
            tex = fill_report({"electron_charge_reverse": "1.616e-19",
                               "charge_graph_points": " (1,2)",
                               "charge_graph_fit_points": " (1,2)"},
                              Path(directory) / "report.tex", template)
            self.assertIn(r"\SetField{math_electron_charge_reverse}{1.616\times 10^{-19}}",
                          tex.read_text(encoding="utf-8"))

    def test_registry_dispatches_and_rejects_unknown_experiment(self):
        self.assertEqual(validate_report(sample_payload())["student_id"], "20260001")
        payload = sample_payload()
        payload["experimentId"] = "unimplemented-experiment"
        with self.assertRaisesRegex(ValueError, "不支持的实验"):
            validate_report(payload)


if __name__ == "__main__":
    unittest.main()
