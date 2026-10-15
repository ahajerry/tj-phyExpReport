import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from . import structured_report


class DeploymentAssetsTests(unittest.TestCase):
    def test_missing_template_fails_before_creating_workdir(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_templates = Path(directory) / "tex" / "templates"
            work = Path(directory) / "work"
            with patch.object(structured_report, "TEMPLATE_DIR", missing_templates), \
                 patch.object(structured_report, "WORK_DIR", work):
                with self.assertRaisesRegex(RuntimeError, "部署缺少报告模板资源.*millikan.tex"):
                    structured_report.render({}, "millikan", "密立根油滴实验")
            self.assertFalse(work.exists())


if __name__ == "__main__":
    unittest.main()
