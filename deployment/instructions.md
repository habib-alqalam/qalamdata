# Deployment Instructions

## Local Run

1. Python 3.11+
2. pip install -r app/api/requirements.txt
3. uvicorn app.api.main:app --host 0.0.0.0 --port 8000
4. Serve app/ui via any static server or open index.html directly

Automation script:
- deployment/start_local.ps1

## Primary Deployment Option (Render)

### API Service
- Runtime: Python
- Build command: pip install -r app/api/requirements.txt
- Start command: uvicorn app.api.main:app --host 0.0.0.0 --port $PORT

Render blueprint:
- deployment/render.yaml

### UI Service
- Static site from app/ui
- Set API_BASE_URL in app.js to deployed API URL

## Fallback Option (Railway)

- Deploy API with same start command
- Host UI on GitHub Pages or Netlify

## Production Checks

- /health returns status ok
- UI can call POST /api/analyze-parcel
- Submission issue includes final live links

## Pre-Submission (Before 16:30)

- Verify repository visibility
- Verify deployed app URL opens without login
- Verify video URL is public and 1 to 3 minutes
