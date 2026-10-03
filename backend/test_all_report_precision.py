"""Every generated experiment reports paired results at the uncertainty place."""

import unittest
from decimal import Decimal

from scripts.verify_reports import samples
from .experiment_registry import validate_report


PAIRS = {
    "heat-capacity-ratio": [("gamma_result", "gamma_uncertainty")],
    "millikan": [(f"electron_charge_{method}", f"electron_charge_{method}_u")
                 for method in ("reverse", "graph", "ls")],
    "moment-of-inertia": [("torsion_constant", "torsion_constant_u"),
                           ("empty_inertia", "empty_inertia_u"),
                           ("experiment_tube", "experiment_tube_u"),
                           ("slider_experiment_5", "slider_experiment_5_u")],
    "young-modulus": [("young_modulus_pa", "young_uncertainty_pa")],
    "forced-vibration": [("free_period_mean_s", "free_period_u_s"),
                         ("natural_omega_rad_s", "natural_omega_u_rad_s"),
                         ("damping_beta_s_inv", "damping_beta_u_s_inv")],
    "focal-length": [(f"focus_{method}_mean_mm", f"focus_{method}_u_mm")
                     for method in ("single", "bessel", "auto", "concave")],
}


class AllReportPrecisionTests(unittest.TestCase):
    def test_every_experiment_aligns_final_results_to_uncertainty(self):
        for experiment_id, pairs in PAIRS.items():
            fields = validate_report({"experimentId": experiment_id, **samples[experiment_id]})
            for value_key, uncertainty_key in pairs:
                with self.subTest(experiment=experiment_id, value=value_key):
                    value = Decimal(fields[value_key])
                    uncertainty = Decimal(fields[uncertainty_key])
                    self.assertGreaterEqual(uncertainty, 0)
                    if uncertainty:
                        self.assertEqual(value.as_tuple().exponent,
                                         uncertainty.as_tuple().exponent)

    def test_input_readings_are_not_rounded_for_display(self):
        fields = validate_report({"experimentId": "heat-capacity-ratio",
                                  **samples["heat-capacity-ratio"]})
        self.assertEqual(fields["diameter_01"], samples["heat-capacity-ratio"]["data"]["diameter"][0])


if __name__ == "__main__":
    unittest.main()
