"""Optional lens measurements and variable instrument export regressions."""
from copy import deepcopy
from io import BytesIO
import re
import unittest
from unittest.mock import patch

from openpyxl import load_workbook

from .experiment_registry import validate_report
from .focal_length_exp import render_report as render_lens
from .forced_vibration_exp import uploaded_template
from .table_uploads import parse_table
from .test_table_uploads import resonance_export, sample
from scripts.verify_reports import samples


class VariableReadingTests(unittest.TestCase):
    def test_two_trial_export_with_shifted_header_and_blank_free_pair(self):
        workbook = load_workbook(BytesIO(resonance_export()))
        sheet = workbook.active
        sheet.delete_rows(54, 5)
        for row in range(75, 78):
            for col in 'ABDFH':
                sheet[f'{col}{row}'] = None
        sheet['G38'] = sheet['H38'] = None
        output = BytesIO()
        workbook.save(output)
        workbook.close()
        parsed = parse_table('forced-vibration', 'variable.xlsx', output.getvalue())
        self.assertEqual({key: len(values) for key, values in parsed['data'].items()},
                         dict(free_angle=89, free_period=89, damped_peak=20, damped_period=2,
                              drive_period=17, amplitude=17, phase=17))
        fields = validate_report({'experimentId': 'forced-vibration', **parsed})
        source = uploaded_template(89, 2, 17)
        markers = re.findall(r'\\Field(?:\[[^]]*\])?\{([^}]+)\}', source)
        self.assertFalse([key for key in markers if key not in fields and key not in ('experiment', 'student', 'student_id', 'group', 'date')])
        self.assertIn('table_drive_period_17', source)
        self.assertNotIn('table_drive_period_18', source)
        self.assertNotIn('free_angle_90', source)

    def test_attached_copy_imports_actual_record_counts(self):
        path = sample('副本BEGZ000001*.xlsx')
        if path is None:
            self.skipTest('user XLSX unavailable')
        parsed = parse_table('forced-vibration', path.name, path.read_bytes())
        self.assertEqual(len(parsed['data']['free_period']), 89)
        self.assertEqual(len(parsed['data']['damped_period']), 2)
        self.assertEqual(len(parsed['data']['drive_period']), 17)
        self.assertTrue(validate_report({'experimentId': 'forced-vibration', **parsed}))

    def test_variable_counts_must_stay_paired(self):
        for key in ('free_period', 'damped_peak', 'amplitude'):
            payload = {'experimentId': 'forced-vibration', **deepcopy(samples['forced-vibration'])}
            payload['data'][key].pop()
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_report(payload)

    def test_optional_concave_can_be_omitted_or_blank_but_not_partial(self):
        payload = {'experimentId': 'focal-length', **deepcopy(samples['focal-length'])}
        for key in list(payload['data']):
            if key.startswith('concave_'):
                del payload['data'][key]
        fields = validate_report(payload)
        self.assertIn('focus_auto_mean_mm', fields)
        self.assertNotIn('focus_concave_mean_mm', fields)
        with patch('backend.focal_length_exp.render') as render:
            render_lens(payload, None, None)
            source = render.call_args.kwargs['template_source']
            self.assertNotIn('concave_', source)
            self.assertNotIn('凹透镜', source)
            self.assertIn('focus_auto_mean_mm', source)
        for key in ('concave_object', 'concave_lens', 'concave_image'):
            payload['data'][key] = [''] * 5
        self.assertEqual(validate_report(payload), fields)
        payload['data']['concave_object'][0] = '100'
        with self.assertRaises(ValueError):
            validate_report(payload)
