"""实验报告注册表：队列和 HTTP 层只通过实验 ID 分发。"""

from __future__ import annotations

try:
    from . import (speed_of_sound_exp, heat_capacity_ratio_exp, millikan_exp,
                   moment_of_inertia_exp, young_modulus_exp,
                   forced_vibration_exp, focal_length_exp, oscilloscope_exp)
except ImportError:
    import speed_of_sound_exp
    import heat_capacity_ratio_exp
    import millikan_exp
    import moment_of_inertia_exp
    import young_modulus_exp
    import forced_vibration_exp
    import focal_length_exp
    import oscilloscope_exp


EXPERIMENTS = {
    module.EXPERIMENT_ID: module for module in (
        speed_of_sound_exp, heat_capacity_ratio_exp, millikan_exp,
        moment_of_inertia_exp, young_modulus_exp,
        forced_vibration_exp, focal_length_exp, oscilloscope_exp,
    )
}


def experiment_for(payload: object):
    if not isinstance(payload, dict):
        raise ValueError("报告数据必须是对象")
    experiment_id = payload.get("experimentId")
    experiment = EXPERIMENTS.get(experiment_id) if isinstance(experiment_id, str) else None
    if experiment is None:
        raise ValueError(f"不支持的实验：{experiment_id}")
    return experiment


def validate_report(payload: object):
    return experiment_for(payload).report_fields(payload)


def render_report(payload: object, progress, image_dir):
    return experiment_for(payload).render_report(payload, progress, image_dir)
