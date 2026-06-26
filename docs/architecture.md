# Architecture

## Overview

This workspace ships a lightweight AI PropTech stack optimized for hackathon judging speed:
- FastAPI backend for domain logic and AI-style scoring
- Static UI dashboard for instant clarity
- Markdown-based governance for collaboration and submission

## Components

- app/api/main.py
  - API contracts
  - Request validation
  - Scoring and explainable insight generation
- app/src/domain.py
  - Domain constants and scoring functions
  - Reusable business logic
- app/ui
  - Self-explanatory judge dashboard
  - API endpoint controls and response rendering

## Data Flow

1. Judge opens dashboard.
2. Dashboard calls API endpoints.
3. API computes risk/opportunity and impact estimate.
4. Dashboard presents explanation and suggested action.

## AI Usage

Current implementation uses explainable heuristic AI scoring to:
- Evaluate parcel opportunity profile
- Generate confidence level and recommendations
- Surface transparent factors for judging clarity

## Scalability Path

- Replace heuristic scorer with model endpoint
- Add authentication and usage telemetry
- Add persistent data store and event pipeline

## Reliability

- Health endpoint for uptime checks
- Strong request schema with Pydantic
- Deterministic and debuggable scoring outputs
