"""Regressions for the official torsion apparatus mounting configurations."""

from copy import deepcopy
from decimal import Decimal
from math import pi, sqrt
import unittest

from scripts.verify_reports import samples
from .moment_of_inertia_exp import report_fields


class MomentOfInertiaTests(unittest.TestCase):
    def screenshot_payload(self):
        payload = {"experimentId": "moment-of-inertia",
                   **deepcopy(samples["moment-of-inertia"])}
        for key, values in {
            "disk": ["13.33", "13.34", "13.33"],
            "cylinder": ["11.41", "11.42", "11.41"],
            "tube": ["13.49", "13.51", "13.52"],
            "ball": ["12.14", "12.14", "12.12"],
            "rod": ["19.57", "19.58", "19.57"],
        }.items():
            payload["data"][f"time_{key}"] = values
        payload["parameters"].update({
            "mass_cylinder_g": "716.6", "diameter_cylinder_mm": "99.70",
            "mass_tube_g": "699.8", "diameter_tube_outer_mm": "99.653",
            "diameter_tube_inner_mm": "79.82", "mass_ball_g": "870",
            "diameter_ball_mm": "130.927", "mass_rod_g": "131.8",
            "length_rod_mm": "599.833",
        })
        return payload

    def test_screenshot_ball_and_rod_do_not_subtract_disk(self):
        fields = report_fields(self.screenshot_payload())
        self.assertAlmostEqual(float(fields["experiment_ball"]), 0.0015274, delta=1e-7)
        self.assertAlmostEqual(float(fields["error_ball"]), 2.41, delta=0.02)
        self.assertAlmostEqual(float(fields["experiment_rod"]), 0.0039746, delta=5e-7)
        self.assertLess(float(fields["error_rod"]), 1)
        self.assertAlmostEqual(float(fields["experiment_tube"]), 0.0014316, delta=1e-7)
        self.assertEqual(Decimal(fields["error_cylinder"]), 0)

    def test_equal_disk_and_ball_periods_still_give_nonzero_ball_inertia(self):
        payload = self.screenshot_payload()
        payload["data"]["time_disk"] = ["20"] * 3
        payload["data"]["time_cylinder"] = ["20"] * 3
        payload["data"]["time_ball"] = ["10"] * 3
        payload["data"]["time_rod"] = ["10"] * 3
        payload["data"]["slider_time_5"] = ["5"] * 3
        fields = report_fields(payload)
        for key in ("experiment_ball", "experiment_rod", "slider_experiment_5"):
            self.assertEqual(Decimal(fields[key]), Decimal(fields["empty_inertia"]))

    def test_direct_mount_uncertainties_follow_independent_kappa_and_period(self):
        payload = self.screenshot_payload()
        fields = report_fields(payload)
        kappa = float(fields["torsion_constant"])
        ukappa = float(fields["torsion_constant_u"])
        for key in ("ball", "rod", "slider_5"):
            if key.startswith("slider"):
                period_key, result_key = "slider_period_5", "slider_experiment_5"
            else:
                period_key, result_key = f"period_{key}", f"experiment_{key}"
            period = float(fields[period_key])
            uperiod = float(fields[f"{period_key}_u"])
            expected = sqrt((kappa*period*uperiod/(2*pi*pi))**2
                            + (period*period*ukappa/(4*pi*pi))**2)
            # Output pairs retain two significant uncertainty digits.
            self.assertAlmostEqual(float(fields[f"{result_key}_u"])/expected, 1, delta=0.06)


if __name__ == "__main__":
    unittest.main()
