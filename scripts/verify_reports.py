"""Smoke-check every report schema against its template and calculation path."""
from pathlib import Path
from decimal import Decimal
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from urllib.request import HTTPCookieProcessor, Request, build_opener
import json
import shutil
import sys
import threading
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from experiment_registry import EXPERIMENTS  # noqa: E402
from fill_sound_speed import fill_report  # noqa: E402
from main import ReportHandler  # noqa: E402
from report_queue import ReportQueue  # noqa: E402
from experiment_registry import render_report, validate_report  # noqa: E402


def strings(values):
    return [format(value, ".12g") if isinstance(value, float) else str(value) for value in values]


samples = {
    "speed-of-sound": {
        "data": {key: strings([round(20+i*4.3, 1) for i in range(20)]) for key in ("resonance", "phase")},
        "parameters": {
            "caliper_error": "0.02", "res_t_start": "20", "res_t_end": "21",
            "res_frequency": "40", "res_frequency_error": "0.01",
            "phase_t_start": "20", "phase_t_end": "21",
            "phase_frequency": "40", "phase_frequency_error": "0.01",
        },
    },
    "heat-capacity-ratio": {
        "data": {"diameter": strings([8, 8.01, 7.99, 8.02, 8]), "period": strings([2.4, 2.41, 2.39, 2.4, 2.42])},
        "parameters": {"mass_g": "2", "volume_l": "2.650", "pressure_start_kpa": "101.2", "pressure_end_kpa": "101.3",
                       "diameter_zero_mm": "0", "diameter_error_mm": "0.005", "mass_error_g": "0.01",
                       "period_error_s": "0.01", "pressure_error_kpa": "0.1", "volume_error_l": "0.01"},
    },
    "millikan": {
        "data": {"voltage": strings([300 + i*20 for i in range(10)]),
                 **{f"time_{j}": strings([round(8+i/3+j/10, 2) for i in range(10)]) for j in range(1, 5)}},
        "parameters": {},
    },
    "moment-of-inertia": {
        "data": {**{f"time_{key}": strings([value, value+.1, value-.1]) for key, value in
                     (("disk", 24), ("cylinder", 15), ("tube", 16.7), ("ball", 13.47), ("rod", 25.74))},
                 **{f"slider_time_{x}": strings([value, value+.05, value-.05]) for x, value in
                    ((5, 15.20), (10, 20.62), (15, 27.37), (20, 34.68))}},
        "parameters": {"mass_cylinder_g": "250", "diameter_cylinder_mm": "50", "mass_tube_g": "200",
                       "diameter_tube_outer_mm": "60", "diameter_tube_inner_mm": "40",
                       "mass_ball_g": "100", "diameter_ball_mm": "60", "mass_rod_g": "150",
                       "length_rod_mm": "200", "slider_mass_g": "50", "slider_self_inertia": "0.000001"},
    },
    "young-modulus": {
        "data": {"load_up": strings([10+i*.5 for i in range(10)]),
                 "load_down": strings([10.02+i*.5 for i in range(10)]),
                 "diameter": strings([.30, .31, .30, .29, .30])},
        "parameters": {"mass_step_kg": ".5", "preload_kg": ".5", "wire_length_cm": "100",
                       "mirror_distance_cm": "100", "lever_arm_cm": "5", "gravity_ms2": "9.794",
                       "reference_modulus_pa": "1.85e11"},
    },
    "forced-vibration": {
        "data": {"free_angle": strings([160-i*10 for i in range(10)]),
                 "free_period": strings([1.5+i*.001 for i in range(10)]),
                 "damped_peak": strings([40-i*3 for i in range(10)]), "damped_period": ["1.52"],
                 "drive_period": strings([1.3+i*.03 for i in range(15)]),
                 "amplitude": strings([5+10/(1+abs(i-7)) for i in range(15)]),
                 "phase": strings([20+i*10 for i in range(15)])},
        "parameters": {"damping_setting": "2"},
    },
    "focal-length": {
        "data": {"object_distance": strings([200, 210, 220]), "image_distance": strings([200, 190, 180]),
                 "bessel_length": strings([500]*5), "bessel_separation": strings([220, 218, 222, 219, 221]),
                 "auto_object": strings([100]*5), "auto_lens": strings([200, 201, 199, 200, 200]),
                 "concave_object": strings([240]*5), "concave_lens": strings([200]*5),
                 "concave_image": strings([300, 301, 299, 300, 300])},
        "parameters": {},
    },
}


class QuietReportHandler(ReportHandler):
    def log_message(self, *_args):
        pass


def main():
    assert set(samples) == set(EXPERIMENTS), "样例未覆盖所有后端实验"
    selected = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    if selected is not None:
        assert selected in samples, f"未知实验：{selected}"
    output = ROOT / "output" / "report-review"
    output.mkdir(parents=True, exist_ok=True)
    payloads = {
        experiment_id: {"experimentId": experiment_id,
                        "reportInfo": {"student": "测试学生", "student_id": "20260001",
                                       "group": "1", "date": "2026-10-02"}, **sample}
        for experiment_id, sample in samples.items()
    }
    (output / "sample-data.json").write_text(
        json.dumps(payloads, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for experiment_id, payload in payloads.items():
        if selected is not None and experiment_id != selected:
            continue
        module = EXPERIMENTS[experiment_id]
        fields = validate_report(payload)
        if experiment_id == "moment-of-inertia":
            assert Decimal(fields["period_disk"]) == Decimal("1.2")
            assert Decimal(fields["period_cylinder"]) == Decimal("1.5")
            assert Decimal(fields["slider_period_5"]) == Decimal("3.04")
        template = (ROOT / "声速测定.tex" if experiment_id == "speed-of-sound"
                    else ROOT / "tex" / "templates" / f"{experiment_id}.tex")
        result = fill_report(fields, output / f"{experiment_id}.tex", template,
                             experiment_title=module.TITLE)
        assert result.exists()
        print(experiment_id, len(fields), "fields OK", flush=True)
    if "--render" not in sys.argv:
        return

    queue_dir = output / f".queue-{uuid.uuid4().hex}"
    queue = ReportQueue(validate_report, render_report, queue_dir)
    QuietReportHandler.queue = queue
    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietReportHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    browser = build_opener(HTTPCookieProcessor(CookieJar()))
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        for experiment_id, payload in payloads.items():
            if selected is not None and experiment_id != selected:
                continue
            request = Request(base + "/api/reports/jobs",
                              data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                              headers={"Content-Type": "application/json"}, method="POST")
            created = json.load(browser.open(request, timeout=10))
            job_id = created["id"]
            deadline = time.monotonic() + 180
            while time.monotonic() < deadline:
                job = json.load(browser.open(base + f"/api/reports/jobs/{job_id}", timeout=10))
                if job["status"] in ("done", "failed"):
                    break
                time.sleep(0.2)
            assert job["status"] == "done", f"{experiment_id}: {job['status']} {job['error']}"
            pdf = browser.open(base + f"/api/reports/jobs/{job_id}/download", timeout=10).read()
            assert pdf.startswith(b"%PDF-")
            target = output / f"{experiment_id}.pdf"
            target.write_bytes(pdf)
            print(experiment_id, len(pdf), "HTTP -> queue -> PDF OK", flush=True)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
        queue.close()
        assert queue_dir.resolve().is_relative_to(output.resolve())
        shutil.rmtree(queue_dir)


if __name__ == "__main__":
    main()
