"""实验结果的末端有效数字处理；中间计算应始终使用未舍入值。"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_EVEN


@dataclass(frozen=True)
class FinishedResult:
    value: str
    uncertainty: str
    place: Decimal | None


def uncertainty_place(uncertainty: Decimal) -> Decimal | None:
    """返回不确定度的末位单位；首位为 1/2 时保留两位，其余一位。"""
    if not uncertainty.is_finite() or uncertainty < 0:
        raise ValueError("不确定度必须是非负有限数")
    if uncertainty == 0:
        return None
    exponent = uncertainty.adjusted()
    leading = uncertainty.scaleb(-exponent)
    significant_digits = 2 if leading < 3 else 1
    return Decimal(1).scaleb(exponent - significant_digits + 1)


def format_at_place(value: Decimal, place: Decimal | None) -> str:
    if not value.is_finite():
        raise ValueError("结果必须是有限数")
    if place is None:
        return format(value, "f")
    rounded = value.quantize(place, rounding=ROUND_HALF_EVEN)
    return format(abs(rounded) if rounded.is_zero() else rounded, "f")


def format_uncertainty(uncertainty: Decimal) -> str:
    place = uncertainty_place(uncertainty)
    return "0" if place is None else format_at_place(uncertainty, place)


def finish_result(value: Decimal, uncertainty: Decimal) -> FinishedResult:
    place = uncertainty_place(uncertainty)
    return FinishedResult(
        value=format_at_place(value, place),
        uncertainty="0" if place is None else format_at_place(uncertainty, place),
        place=place,
    )


def format_report_at_place(value: Decimal, place: Decimal | None,
                           exponent: int | None = None) -> str:
    """按指定末位输出；极大或极小量可共用一个科学计数法指数。"""
    if place is None:
        return f"{value:.6g}"
    if exponent is None:
        return format_at_place(value, place)
    return f"{format_at_place(value.scaleb(-exponent), place.scaleb(-exponent))}e{exponent:+d}"


def finish_report_result(value: Decimal, uncertainty: Decimal) -> FinishedResult:
    """将成品结果和不确定度对齐，并为跨多数量级的数值选紧凑记法。"""
    finished = finish_result(value, uncertainty)
    if finished.place is None:
        return FinishedResult(f"{value:.6g}", "0", None)
    reference = value if value else uncertainty
    exponent = reference.adjusted()
    if -4 <= exponent <= 6:
        return finished
    return FinishedResult(
        format_report_at_place(value, finished.place, exponent),
        format_report_at_place(uncertainty, finished.place, exponent),
        finished.place,
    )
