# Hub71 Hackathon Project

AI PropTech challenge workspace for Hub71 Abu Dhabi.

## Submission Checklist (Deadline: 16:30)

Use this repository with the GitHub Issue Form at .github/ISSUE_TEMPLATE/submission.yml.

Required for submission:
- Repository link
- Live deployed app link
- Short video walkthrough (1 to 3 minutes)
- Problem statement and impact summary

## What This Project Delivers

- FastAPI backend for property intelligence endpoints
- Simple self-explanatory dashboard for judges
- Clear architecture, walkthrough, and demo script
- Deployment guide with primary and fallback options
- Multi-agent orchestration docs via copilot.md

## Quick Start (Local)

1. Create and activate a Python 3.11+ virtual environment.
2. Install dependencies:
   - pip install -r app/api/requirements.txt
3. Run API:
   - uvicorn app.api.main:app --reload --port 8000
4. Open dashboard:
   - open app/ui/index.html in browser
5. Set API base URL in dashboard if needed (default: http://127.0.0.1:8000).

## Core Endpoints

- GET /health
- GET /api/problem-definition
- GET /api/impact-model
- POST /api/analyze-parcel

## Judging Criteria Alignment

- Problem definition: docs/walkthrough.md
- Execution quality: docs/architecture.md + modular app structure
- Use of AI: /api/analyze-parcel scoring and insight generation
- Demo clarity: docs/demo_script.md + self-guided dashboard
- Impact: /api/impact-model + README summary

## Repository Structure

- app/api: FastAPI backend
- app/ui: judge-facing dashboard
- docs: architecture and demo content
- deployment: deployment playbook
- agents: director + worker playbooks
- .github/ISSUE_TEMPLATE: hackathon submission form

## Notes

- Replace placeholder links in the issue form before submission.
- Keep a final 1 to 3 minute video URL ready before 16:30.
