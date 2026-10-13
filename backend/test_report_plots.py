"""Regression checks for report diagrams generated from submitted readings."""

import copy
import re
import unittest
from pathlib import Path

from .experiment_registry import validate_report
from .fill_sound_speed import PLOT_PATTERN
from scripts.verify_reports import samples


ROOT = Path(__file__).resolve().parents[1]


def fields_for(experiment_id, sample=None):
    sample = sample or samples[experiment_id]
    return validate_report({"experimentId": experiment_id, **sample})


class ReportPlotTests(unittest.TestCase):
    def test_every_plot_marker_has_calculated_coordinates(self):
        for experiment_id, sample in samples.items():
            template = ROOT / "tex" / "templates" / f"{experiment_id}.tex"
            content = template.read_text(encoding="utf-8")
            self.assertNotIn("裁自原资料", content)
            markers = set(PLOT_PATTERN.findall(content))
            fields = fields_for(experiment_id, sample)
            for marker in markers:
                self.assertIn(marker, fields, (experiment_id, marker))
                self.assertRegex(fields[marker], r"^\([-+\d.eE]+,[-+\d.eE]+\)")

    def test_millikan_graph_changes_with_voltage(self):
        original = fields_for("millikan")
        changed = copy.deepcopy(samples["millikan"])
        changed["data"]["voltage"][0] = str(float(changed["data"]["voltage"][0]) * 1.1)
        updated = fields_for("millikan", changed)
        self.assertNotEqual(original["charge_graph_points"], updated["charge_graph_points"])
        self.assertEqual(len(re.findall(r"\([^()]+\)", updated["charge_graph_points"])), 8)

    def test_other_required_graphs_use_all_readings(self):
        expected = {
            "moment-of-inertia": {"slider_graph_points": 4, "slider_graph_theory_points": 4},
            "young-modulus": {"young_graph_points": 10, "young_graph_line": 2,
                              "young_graph_a": 1, "young_graph_b": 1},
            "forced-vibration": {"damped_graph_points": 10, "amplitude_graph_points": 15,
                                 "phase_graph_points": 15},
        }
        for experiment_id, markers in expected.items():
            fields = fields_for(experiment_id)
            for marker, count in markers.items():
                self.assertEqual(len(re.findall(r"\([^()]+\)", fields[marker])), count,
                                 (experiment_id, marker))


if __name__ == "__main__":
    unittest.main()
