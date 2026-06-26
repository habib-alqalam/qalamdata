from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.src.domain import (
    ParcelInput,
    compute_opportunity_score,
    confidence_from_score,
    recommendation_from_score,
)


app = FastAPI(title="Hub71 AI PropTech API", version="1.0.0")


class AnalyzeParcelRequest(BaseModel):
    parcel_id: str = Field(..., min_length=1)
    is_registered: bool
    is_free_hold: bool
    building_density: float = Field(..., ge=0.0, le=1.0)
    transit_access_score: float = Field(..., ge=0.0, le=1.0)
    estimated_demand_index: float = Field(..., ge=0.0, le=1.0)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "hub71-ai-proptech-api"}


@app.get("/api/problem-definition")
def problem_definition() -> dict:
    return {
        "problem": "Property investment and development decisions are slowed by fragmented signals.",
        "stakeholders": ["developers", "asset managers", "brokers", "urban planning teams"],
        "outcome": "Faster parcel prioritization with explainable AI guidance.",
    }


@app.get("/api/impact-model")
def impact_model() -> dict:
    return {
        "decision_cycle_reduction_estimate": "25% to 40%",
        "portfolio_screening_efficiency_gain": "20% to 35%",
        "explainability": "Each recommendation includes transparent factors.",
    }


@app.post("/api/analyze-parcel")
def analyze_parcel(request: AnalyzeParcelRequest) -> dict:
    parcel = ParcelInput(
        parcel_id=request.parcel_id,
        is_registered=request.is_registered,
        is_free_hold=request.is_free_hold,
        building_density=request.building_density,
        transit_access_score=request.transit_access_score,
        estimated_demand_index=request.estimated_demand_index,
    )

    score = compute_opportunity_score(parcel)

    return {
        "parcel_id": parcel.parcel_id,
        "opportunity_score": score,
        "confidence": confidence_from_score(score),
        "recommendation": recommendation_from_score(score, parcel.is_registered),
        "factors": {
            "is_registered": parcel.is_registered,
            "is_free_hold": parcel.is_free_hold,
            "building_density": parcel.building_density,
            "transit_access_score": parcel.transit_access_score,
            "estimated_demand_index": parcel.estimated_demand_index,
        },
    }
