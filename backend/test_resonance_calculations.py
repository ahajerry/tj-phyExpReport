"""Reference-method regressions: amplitude correction, phase quadrant and peak axis."""
from copy import deepcopy
from decimal import Decimal
from math import log, pi
import re
import unittest

from .experiment_registry import validate_report
from .report_calculations import resonance_period_at_amplitude
from .table_uploads import parse_table
from .test_table_uploads import resonance_export, sample
from scripts.verify_reports import samples


class ResonanceCalculationTests(unittest.TestCase):
    def test_lookup_sorts_averages_duplicates_and_never_extrapolates(self):
        angles = list(map(Decimal, [150, 50, 100, 100]))
        periods = list(map(Decimal, ['1.5', '1.7', '1.58', '1.62']))
        lookup = lambda a: resonance_period_at_amplitude(angles, periods, Decimal(a))
        self.assertEqual(lookup(100), Decimal('1.60'))
        self.assertEqual(lookup(125), Decimal('1.55'))
        self.assertEqual(lookup(50), Decimal('1.7'))
        self.assertIsNone(lookup(49))
        self.assertIsNone(lookup(151))

    def test_phase_quadrants_peak_ties_and_normalized_axis(self):
        payload = {'experimentId': 'forced-vibration', **deepcopy(samples['forced-vibration'])}
        data = payload['data']
        data['free_period'] = ['1.5'] * 10
        data['drive_period'] = ['1.6', '1.5', '1.4'] * 5
        data['amplitude'] = ['90', '100', '100'] + ['80'] * 12
        data['phase'] = ['30', '90', '150'] * 5
        fields = validate_report(payload)
        self.assertEqual(float(fields['resonance_period_s']), 1.45)
        self.assertEqual(fields['peak_point_count'], '2')
        self.assertAlmostEqual(float(fields['frequency_ratio_01']), 1.45/1.6, places=5)
        self.assertEqual(float(fields['normalized_amplitude_01']), .81)
        self.assertGreater(float(fields['theoretical_phase_01']), -90)
        self.assertEqual(float(fields['theoretical_phase_02']), -90)
        self.assertLess(float(fields['theoretical_phase_03']), -90)
        self.assertEqual(float(fields['signed_phase_03']), -150)
        self.assertEqual(fields['table_phase_reading_03'], '150.0')
        self.assertGreater(float(fields['table_phase_calculated_03']), 90)
        points = re.findall(r'\(([^,]+),([^\)]+)\)', fields['phase_graph_points'])
        self.assertEqual(float(points[0][1]), -30)
        self.assertNotIn('free_period_u_s', fields)
        self.assertNotIn('natural_omega_u_rad_s', fields)
        self.assertAlmostEqual(float(fields['resonance_omega_rad_s']), 2*pi/1.45, places=4)

    def test_out_of_range_keeps_measurements_and_marks_theory_unavailable(self):
        payload = {'experimentId': 'forced-vibration', **parse_table('forced-vibration', 'data.xlsx', resonance_export())}
        payload['data']['amplitude'][0] = '200'
        fields = validate_report(payload)
        self.assertEqual(fields['matched_period_01'], '需补测')
        self.assertEqual(fields['theoretical_phase_01'], '需补测')
        self.assertEqual(float(fields['peak_amplitude_deg']), 200)
        self.assertEqual(fields['theoretical_resonance_omega_rad_s'], '不适用')

    def test_group_mean_uncertainty_and_phase_input_validation(self):
        payload = {'experimentId': 'forced-vibration', **parse_table('forced-vibration', 'data.xlsx', resonance_export())}
        fields = validate_report(payload)
        betas = [log(2)/(5*t) for t in (1.5, 1.6, 1.7)]
        center = sum(betas)/3
        expected = (sum((v-center)**2 for v in betas)/6)**.5
        self.assertAlmostEqual(float(fields['damping_beta_u_s_inv']), expected, delta=0.0005)
        payload['data']['phase'][0] = '181'
        with self.assertRaisesRegex(ValueError, '180'):
            validate_report(payload)
        with self.assertRaisesRegex(ValueError, '180'):
            parse_table('forced-vibration', 'data.xlsx', resonance_export({'H63': 181}))

    def test_user_file_matches_reference_corrected_phase(self):
        path = sample('BEGZ000001*.xlsx')
        if path is None:
            self.skipTest('user XLSX unavailable')
        fields = validate_report({'experimentId': 'forced-vibration', **parse_table('forced-vibration', path.name, path.read_bytes())})
        self.assertAlmostEqual(float(fields['matched_period_14']), 1.5546)
        self.assertAlmostEqual(float(fields['theoretical_phase_14']), -87.40495, places=3)
        self.assertEqual(float(fields['signed_phase_14']), -89)
        self.assertAlmostEqual(float(fields['resonance_period_s']), 1.55675, places=5)
        self.assertAlmostEqual(float(fields['frequency_ratio_14']), 1.55675/1.5559, places=5)


if __name__ == '__main__':
    unittest.main()
