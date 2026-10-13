"""Statistics and unit conversions required by the screenshot-based report."""
import copy
from decimal import Decimal as D
from math import pi
import re
import unittest

from .young_modulus_exp import report_fields
from scripts.verify_reports import samples


class YoungModulusTests(unittest.TestCase):
    def payload(self):
        p = {"experimentId": "young-modulus", **copy.deepcopy(samples["young-modulus"])}
        diameters = p["data"].pop("diameter")
        p["data"]["diameter_initial"] = ["0.012"] * 5
        p["data"]["diameter_final"] = [str(D(x)+D("0.012")) for x in diameters]
        p["parameters"].update(diameter_error_mm="0.004", scale_error_cm="0.05")
        return p

    def test_statistics_and_full_uncertainty_budget(self):
        fields = report_fields(self.payload())
        self.assertEqual(D(fields["diameter_square_sum"]), D("200"))
        self.assertEqual(D(fields["difference_square_sum"]), 0)
        self.assertEqual(D(fields["diameter_02"]), D(".31"))
        self.assertEqual(D(fields["load_displacement_10"]), D("4.5"))
        self.assertEqual(D(fields["load_mass_01"]), 0)
        self.assertEqual(D(fields["difference_mass_kg"]), D("2.5"))
        da = 1.14*(.0002/20)**.5
        du = (da**2 + .004**2/3)**.5
        lu = .05/(3**.5)
        relative = (.001**2+.002**2+.004**2+4*(du/.3)**2+(lu/2.5)**2)**.5
        expected = 8*1*1*9.794*2.5/(pi*.0003**2*.05*.025)
        # A leading 3 is retained to one significant digit by the existing rule.
        self.assertAlmostEqual(float(fields["young_relative_percent"]), relative*100, delta=.5)
        self.assertAlmostEqual(float(fields["young_modulus_pa"])/expected, 1, delta=.003)
        self.assertAlmostEqual(float(fields["young_uncertainty_pa"])/(expected*relative), 1, delta=.05)

    def test_graph_uses_net_load_and_distinct_points_on_line(self):
        payload = self.payload()
        payload["data"]["load_up"][4] = "12.1"
        fields = report_fields(payload)
        graph = lambda name: [(D(x), D(y)) for x,y in re.findall(r"\(([^,]+),([^\)]+)\)", fields[name])]
        points = graph("young_graph_points")
        a, b = graph("young_graph_a")[0], graph("young_graph_b")[0]
        self.assertEqual(len(points), 10)
        self.assertNotIn(a, points)
        self.assertNotIn(b, points)
        slope = (b[1]-a[1])/(b[0]-a[0])
        self.assertAlmostEqual(float(slope), float(fields["graph_slope_kg_cm"]), delta=.002)
        payload["parameters"]["preload_kg"] = "2"
        self.assertEqual(report_fields(payload)["young_graph_points"], fields["young_graph_points"])

    def test_instrument_errors_remain_with_identical_repeats(self):
        payload = self.payload()
        payload["data"]["diameter_final"] = ["0.312"] * 5
        fields = report_fields(payload)
        self.assertEqual(D(fields["diameter_u_a"]), 0)
        self.assertGreater(D(fields["diameter_mean_u_mm"]), 0)
        self.assertGreater(D(fields["difference_mean_u_cm"]), 0)
        self.assertGreater(D(fields["young_uncertainty_pa"]), 0)

    def test_decreasing_scale_readings_and_legacy_payload(self):
        payload = self.payload()
        original = report_fields(payload)
        for key in ("load_up", "load_down"):
            payload["data"][key] = [str(30-D(x)) for x in payload["data"][key]]
        self.assertEqual(report_fields(payload)["young_modulus_pa"], original["young_modulus_pa"])
        legacy = {"experimentId": "young-modulus", **copy.deepcopy(samples["young-modulus"])}
        self.assertEqual(report_fields(legacy)["young_modulus_pa"], original["young_modulus_pa"])

    def test_invalid_measurements_and_errors(self):
        for key, value in (("diameter_error_mm", "-.004"), ("scale_error_cm", "-.05"),
                           ("wire_length_cm", "0"), ("preload_kg", "-1")):
            payload = self.payload()
            payload["parameters"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                report_fields(payload)
        payload = self.payload()
        payload["data"]["diameter_final"][0] = "0.001"
        with self.assertRaises(ValueError):
            report_fields(payload)


if __name__ == "__main__":
    unittest.main()
