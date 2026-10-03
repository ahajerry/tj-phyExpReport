import unittest
from decimal import Decimal

from .result_precision import finish_report_result, finish_result, format_at_place, format_uncertainty


class ResultPrecisionTests(unittest.TestCase):
    def test_one_or_two_leading_digits_keep_two_significant_digits(self):
        self.assertEqual(finish_result(Decimal("12.3456"), Decimal("0.01234")).value, "12.346")
        self.assertEqual(finish_result(Decimal("12.3456"), Decimal("0.01234")).uncertainty, "0.012")
        self.assertEqual(format_uncertainty(Decimal("0.299")), "0.30")

    def test_other_leading_digits_keep_one_and_align_value(self):
        self.assertEqual(finish_result(Decimal("12.3456"), Decimal("0.03456")).value, "12.35")
        self.assertEqual(finish_result(Decimal("12.3456"), Decimal("0.03456")).uncertainty, "0.03")
        self.assertEqual(finish_result(Decimal("1254"), Decimal("120")).value, "1250")
        self.assertEqual(format_uncertainty(Decimal("0.0999")), "0.10")

    def test_zero_and_invalid_uncertainty(self):
        self.assertEqual(finish_result(Decimal("12.340"), Decimal(0)).value, "12.340")
        self.assertEqual(format_uncertainty(Decimal(0)), "0")
        with self.assertRaises(ValueError):
            format_uncertainty(Decimal("-0.1"))

    def test_round_half_even_once_for_values_and_uncertainty(self):
        place = Decimal("0.1")
        for original, expected in (
            ("1.24", "1.2"), ("1.26", "1.3"),
            ("1.25", "1.2"), ("1.35", "1.4"),
            ("1.2501", "1.3"), ("-1.25", "-1.2"),
            ("-1.35", "-1.4"), ("-0.04", "0.0"),
        ):
            with self.subTest(original=original):
                self.assertEqual(format_at_place(Decimal(original), place), expected)
        self.assertEqual(format_at_place(Decimal("1250"), Decimal("1E+2")), "1200")
        self.assertEqual(format_at_place(Decimal("1350"), Decimal("1E+2")), "1400")
        self.assertEqual(format_uncertainty(Decimal("0.45")), "0.4")
        self.assertEqual(format_uncertainty(Decimal("0.35")), "0.4")
        self.assertEqual(format_uncertainty(Decimal("0.245")), "0.24")
        self.assertEqual(format_uncertainty(Decimal("0.255")), "0.26")
        self.assertEqual(format_uncertainty(Decimal("0.25001")), "0.25")
        self.assertEqual(finish_result(Decimal("1.25"), Decimal("1.2")).value, "1.2")

    def test_scientific_report_values_share_the_uncertainty_place(self):
        small = finish_report_result(Decimal("1.61622e-19"), Decimal("1.08091e-21"))
        self.assertEqual((small.value, small.uncertainty), ("1.616e-19", "0.011e-19"))
        large = finish_report_result(Decimal("5.54227e11"), Decimal("1.16841e10"))
        self.assertEqual((large.value, large.uncertainty), ("5.54e+11", "0.12e+11"))


if __name__ == "__main__":
    unittest.main()
