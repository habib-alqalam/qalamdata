from dataclasses import dataclass


@dataclass
class ParcelInput:
    parcel_id: str
    is_registered: bool
    is_free_hold: bool
    building_density: float
    transit_access_score: float
    estimated_demand_index: float


def clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    return max(min_value, min(max_value, value))


def compute_opportunity_score(parcel: ParcelInput) -> int:
    density = clamp(parcel.building_density)
    transit = clamp(parcel.transit_access_score)
    demand = clamp(parcel.estimated_demand_index)

    base = 40.0
    base += density * 20.0
    base += transit * 20.0
    base += demand * 20.0
    base += 5.0 if parcel.is_registered else -5.0
    base += 5.0 if parcel.is_free_hold else 0.0

    return int(round(max(0.0, min(100.0, base))))


def confidence_from_score(score: int) -> str:
    if score >= 75:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


def recommendation_from_score(score: int, is_registered: bool) -> str:
    if score >= 75:
        return "Prioritize premium tenant targeting and fast-track execution."
    if score >= 50:
        if not is_registered:
            return "Prioritize registration readiness before commercial rollout."
        return "Proceed with phased optimization and targeted leasing strategy."
    return "Hold for risk mitigation and collect more market evidence."
