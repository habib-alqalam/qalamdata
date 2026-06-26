Set-Location "$PSScriptRoot\.."
python -m pip install -r app/api/requirements.txt
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
