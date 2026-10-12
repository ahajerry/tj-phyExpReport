"""Instrument imports and edited raw readings use the same report calculations."""
from copy import deepcopy
from decimal import Decimal
from pathlib import Path
import unittest
from unittest.mock import Mock

from scripts.verify_reports import samples
from .editable_instrument_data import editable_import, normalize_millikan, normalize_torsion
from .experiment_registry import validate_report
from .main import ReportHandler
from .table_uploads import parse_table


def torsion_sample():
    previous = deepcopy(samples["moment-of-inertia"])
    old = previous["parameters"]
    data = previous["data"]
    for key, parameter in (("cylinder", "diameter_cylinder_mm"), ("tube_inner", "diameter_tube_inner_mm"),
                           ("tube_outer", "diameter_tube_outer_mm"), ("ball", "diameter_ball_mm"), ("rod", "length_rod_mm")):
        value = Decimal(old[parameter]) / 10
        data[f"size_{key}_cm"] = [str(value + offset) for offset in (Decimal("-.001"), Decimal(0), Decimal(".001"))]
    parameters = {f"mass_{key}_kg": str(Decimal(old[f"mass_{key}_g"]) / 1000) for key in ("cylinder", "tube", "ball", "rod")}
    parameters.update({"slider_mass_1_kg": str(Decimal(old["slider_mass_g"]) / 1000),
                       "slider_mass_2_kg": str(Decimal(old["slider_mass_g"]) / 1000),
                       "slider_pair_inertia_scaled": str(Decimal(old["slider_self_inertia"]) * 20000)})
    return {"experimentId": "moment-of-inertia", "data": data, "parameters": parameters}


class EditableInstrumentTests(unittest.TestCase):
    def test_oil_import_preserves_each_voltage_and_optional_zero(self):
        content = ("当前电压,平衡电压,时间,电荷量\n" + "".join(
            f"0,{100 * (drop + 1) + trial},{10 * (drop + 1) + trial},\n"
            for drop in range(3) for trial in range(4))).encode()
        parsed = {"experimentId": "millikan", **parse_table("millikan", "data.csv", content)}
        editable = {"experimentId": "millikan", **editable_import(parsed)}
        self.assertEqual(editable["data"]["balance_voltage"][:4], ["100", "101", "102", "103"])
        self.assertEqual(editable["data"]["current_voltage"][:4], ["0"] * 4)
        self.assertEqual(validate_report(editable), validate_report(parsed))
        editable["data"]["balance_voltage"][3] = "203"
        editable["data"]["instrument_charge"][0] = "1.60e-19"
        normalized = normalize_millikan(editable)
        self.assertEqual(normalized["data"]["voltage"][0], "126.5")
        self.assertEqual(normalized["sourceTables"][0]["rows"][3][3], "203")
        self.assertNotEqual(validate_report(editable)["charge_01"], validate_report(parsed)["charge_01"])
        charge = validate_report(editable)["charge_01"]
        editable["data"]["instrument_charge"][0] = "9.99e-19"
        self.assertEqual(validate_report(editable)["charge_01"], charge)

    def test_oil_rejects_incomplete_group_and_invalid_optional_record(self):
        content = ("当前电压,平衡电压,时间\n" + "0,100,10\n" * 12).encode()
        editable = {"experimentId": "millikan", **editable_import({"experimentId": "millikan", **parse_table("millikan", "data.csv", content)})}
        for key, index, value in (("fall_time", 5, ""), ("balance_voltage", 11, "0"), ("instrument_charge", 1, "NaN"), ("balance_voltage", 31, "100")):
            changed = deepcopy(editable)
            changed["data"][key][index] = value
            with self.subTest(key=key, index=index), self.assertRaises(ValueError):
                validate_report(changed)

    def test_torsion_raw_sizes_and_units_match_previous_calculation(self):
        payload = torsion_sample()
        fields = validate_report(payload)
        original = validate_report({"experimentId": "moment-of-inertia", **samples["moment-of-inertia"]})
        for key in ("torsion_constant", "experiment_tube", "experiment_ball", "slider_experiment_20"):
            self.assertEqual(fields[key], original[key])
        payload["data"]["size_cylinder_cm"][2] = "11.500"
        updated = validate_report(payload)
        self.assertNotEqual(updated["torsion_constant"], fields["torsion_constant"])
        normalized = normalize_torsion(payload)
        self.assertEqual(normalized["geometryReadings"]["cylinder"][2], "11.500")
        self.assertEqual(normalized["sourceTables"][0]["rows"][0][-1], "11.500")
        payload["parameters"]["slider_mass_2_kg"] = "0.5000"
        self.assertEqual(normalize_torsion(payload)["sourceTables"][2]["rows"][0][1], "0.5000")

    def test_torsion_rejects_missing_dimensions_and_negative_pair_inertia(self):
        for key, value in (("size_cylinder_cm", ["10", "10"]), ("size_tube_inner_cm", ["100"] * 3)):
            changed = torsion_sample()
            changed["data"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_report(changed)
        changed = torsion_sample()
        changed["parameters"]["slider_pair_inertia_scaled"] = "-1"
        with self.assertRaises(ValueError):
            validate_report(changed)

    def test_import_endpoint_returns_both_instrument_forms_without_queue_jobs(self):
        for experiment_id, pattern in (("millikan", "密里根油滴.csv"), ("moment-of-inertia", "NB00000002*.xlsx")):
            path = next(Path("D:/ProgramData/QQDownloads").glob(pattern), None)
            if path is None:
                continue
            parsed = {"experimentId": experiment_id, **parse_table(experiment_id, path.name, path.read_bytes())}
            handler = Mock()
            handler.path = "/api/reports/import-table"
            handler._identity.return_value = ("visitor", False)
            handler._read_submission.return_value = (parsed, [])
            ReportHandler.do_POST(handler)
            status, editable, _ = handler._json.call_args.args
            self.assertEqual(status, 200)
            handler.queue.create.assert_not_called()
            result = validate_report({"experimentId": experiment_id, **editable})
            original = validate_report(parsed)
            # Raw voltage/size precision is retained; calculated results agree.
            key = "electron_charge_ls" if experiment_id == "millikan" else "torsion_constant"
            self.assertEqual(result[key], original[key])


if __name__ == "__main__":
    unittest.main()
