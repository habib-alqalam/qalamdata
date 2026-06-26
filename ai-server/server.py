#!/usr/bin/env python3
"""QalamData Sovereign AI server.

Proxies analysis requests to a LOCAL Ollama instance running on this UAE machine.
No property data leaves the premises -> demonstrable data sovereignty.
Python standard library only (no pip installs) for maximum demo reliability.
"""
import json
import os
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = os.environ.get("QALAM_MODEL", "qwen2.5:7b")
HOST = os.environ.get("QALAM_HOST", "127.0.0.1")
PORT = int(os.environ.get("QALAM_PORT", "8077"))
LOCATION = os.environ.get("QALAM_LOCATION", "On-premise node \u00b7 United Arab Emirates")


def _load_anthropic_key():
    """Read the Anthropic key from env or a local key file. Never logged."""
    k = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if k:
        return k
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    candidates = [
        os.environ.get("QALAM_ANTHROPIC_KEY_FILE", ""),
        os.path.join(root, "ANTHROPIC_API_KEY.ENV"),
        os.path.join(root, "anthropic api key.env"),
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            try:
                raw = open(c, "r", encoding="utf-8-sig").read().strip()
            except Exception:
                continue
            for line in raw.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line and "KEY" in line.upper():
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
                return line.strip().strip('"').strip("'")
    return ""


ANTHROPIC_API_KEY = _load_anthropic_key()
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

SYSTEM = (
    "You are QalamData, a senior UAE real-estate analyst working from Dubai Land Department "
    "and Abu Dhabi (Bayanat) open data. Turn the raw parcel/area statistics you are given into "
    "clear, decision-grade advice for investors, brokers and planners. Be specific and cite the "
    "numbers you are given. Never invent data you were not given. Output concise markdown."
)


def build_prompt(payload):
    emirate = payload.get("emirate", "UAE")
    scope = payload.get("scope", "market")
    title = payload.get("title", "")
    context = payload.get("context", {})
    question = (payload.get("question") or "").strip()
    ctx = json.dumps(context, ensure_ascii=False, indent=2)
    default_ask = {
        "market": "Give an executive read of this market: strengths, risks, and where the opportunity is.",
        "area": "Assess this area for an investor: liquidity, ownership profile, risks, and a clear recommendation.",
        "parcel": "Assess this specific parcel: what it is, ownership/registration status, and due-diligence flags.",
    }.get(scope, "Analyze this data and advise.")
    ask = question or default_ask
    return (
        f"## Subject\nEmirate: {emirate}\nScope: {scope}\nName: {title}\n\n"
        f"## Data (authoritative - analyze only this)\n```json\n{ctx}\n```\n\n"
        f"## Task\n{ask}\n\n"
        "Respond with exactly these sections:\n"
        "**Executive read** (2-3 sentences)\n"
        "**Key signals** (3-5 bullets that cite the numbers)\n"
        "**Risk flags** (1-3 bullets)\n"
        "**Recommendation** (decision-grade, 1-2 sentences)\n"
    )


def call_ollama(prompt, model):
    body = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 600},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return (data.get("response") or "").strip()


def call_anthropic(task, model):
    body = json.dumps({
        "model": model,
        "max_tokens": 800,
        "temperature": 0.3,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": task}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    parts = data.get("content", []) or []
    return "".join(b.get("text", "") for b in parts if b.get("type") == "text").strip()


def _fmt_types(types):
    items = types or []
    return ", ".join(f"{t.get('name')} ({t.get('count')})" for t in items[:3]) or "n/a"


def template_analysis(payload):
    """Deterministic fallback so the live endpoint always returns useful output."""
    scope = payload.get("scope", "market")
    c = payload.get("context", {}) or {}
    emirate = payload.get("emirate", "UAE")
    title = payload.get("title", "")
    if scope == "area":
        fh = c.get("freehold_pct", 0) or 0
        reg = c.get("registered_pct", 0) or 0
        liq = "high" if fh >= 60 else "moderate" if fh >= 25 else "limited (mostly granted/citizen housing)"
        return (
            f"**Executive read** — {title} in {emirate} holds {c.get('parcels', '?')} parcels and "
            f"{c.get('buildings', '?')} buildings, with {fh}% freehold and {reg}% registered. "
            f"Investor liquidity here is {liq}.\n\n"
            f"**Key signals**\n"
            f"- Freehold share {fh}% — {'expat-investable' if fh >= 25 else 'predominantly national/granted'}\n"
            f"- Registration {reg}% — {'clean title pipeline' if reg >= 90 else 'verify registration status'}\n"
            f"- Avg plot {c.get('avg_parcel_area_sqm', '?')} sqm; dominant types: {_fmt_types(c.get('top_property_types'))}\n\n"
            f"**Risk flags**\n"
            f"- {'Low freehold limits resale pool to nationals' if fh < 25 else 'Standard investment-zone diligence applies'}\n\n"
            f"**Recommendation** — "
            + ("Prioritise for expat-facing investment products." if fh >= 60
               else "Suitable for end-user / citizen-housing strategies; confirm ownership eligibility before acquisition.")
        )
    if scope == "parcel":
        fh = c.get("is_free_hold")
        reg = c.get("is_registered")
        fhy = fh in (1, "1", "1.00", True)
        regy = reg in (1, "1", "1.00", True)
        return (
            f"**Executive read** — Parcel {c.get('parcel_id', '?')} ({c.get('property_type_en', '?')}) in "
            f"{c.get('area_name_en', title)}, {emirate}; plot {c.get('actual_area', '?')} sqm.\n\n"
            f"**Key signals**\n"
            f"- Tenure: {'Freehold' if fhy else 'Non-freehold / granted'}\n"
            f"- Registration: {'Registered' if regy else 'Not registered'}\n"
            f"- Project: {c.get('project_name_en') or c.get('master_project_en') or 'n/a'}\n\n"
            f"**Risk flags**\n- "
            + ("Confirm title deed and service charges." if fhy else "Confirm ownership eligibility and transfer restrictions.")
            + "\n\n**Recommendation** — "
            + ("Proceed to standard due diligence." if (fhy and regy) else "Resolve registration/tenure status before commitment.")
        )
    return (
        f"**Executive read** — {emirate} market: {c.get('freehold_pct', '?')}% freehold and "
        f"{c.get('registered_pct', '?')}% registered across the dataset.\n\n"
        f"**Key signals**\n"
        f"- Dominant property types: {_fmt_types(c.get('top_property_types'))}\n"
        f"- Registration depth indicates "
        + ("a mature, title-clean market" if (c.get('registered_pct', 0) or 0) >= 90 else "pockets needing verification")
        + "\n\n**Risk flags**\n- Aggregated view; drill into specific areas before acting.\n\n"
        f"**Recommendation** — Use area-level analysis to target "
        + ("freehold investment zones." if (c.get('freehold_pct', 0) or 0) >= 30 else "end-user demand corridors.")
    )


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, ngrok-skip-browser-warning")

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/health"):
            models, ok = [], False
            try:
                with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=4) as r:
                    models = [m.get("name") for m in json.loads(r.read()).get("models", [])]
                    ok = True
            except Exception:
                ok = False
            return self._json(200, {"status": "ok", "ollama": ok, "models": models, "model": DEFAULT_MODEL, "anthropic": bool(ANTHROPIC_API_KEY), "location": LOCATION})
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/api/analyze"):
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:
            return self._json(400, {"error": "invalid json"})
        model = payload.get("model") or DEFAULT_MODEL
        task = build_prompt(payload)
        t0 = time.time()
        use_claude = model.lower().startswith("claude")

        if use_claude and ANTHROPIC_API_KEY:
            try:
                text = call_anthropic(task, model)
                if not text:
                    raise RuntimeError("empty response")
                return self._json(200, {
                    "engine": "anthropic-cloud", "model": model, "sovereign": False,
                    "location": "Anthropic Claude (cloud)", "latency_ms": int((time.time() - t0) * 1000),
                    "analysis": text,
                })
            except Exception:
                pass  # fall back to sovereign on-prem

        ollama_model = DEFAULT_MODEL if use_claude else model
        try:
            text = call_ollama(SYSTEM + "\n\n" + task, ollama_model)
            if not text:
                raise RuntimeError("empty response from model")
            return self._json(200, {
                "engine": "ollama-onprem", "model": ollama_model, "sovereign": True,
                "location": LOCATION, "latency_ms": int((time.time() - t0) * 1000),
                "analysis": text,
            })
        except Exception as e:
            return self._json(200, {
                "engine": "template", "model": None, "sovereign": False,
                "location": LOCATION, "latency_ms": int((time.time() - t0) * 1000),
                "analysis": template_analysis(payload), "error": str(e),
            })

    def log_message(self, *args):
        return


def prewarm():
    """Load the default model into memory so the first real request is fast."""
    try:
        body = json.dumps({"model": DEFAULT_MODEL, "prompt": "ok", "stream": False,
                           "options": {"num_predict": 1}}).encode("utf-8")
        req = urllib.request.Request(f"{OLLAMA_URL}/api/generate", data=body,
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=180).read()
        print(f"[prewarm] {DEFAULT_MODEL} loaded")
    except Exception as e:
        print(f"[prewarm] skipped: {e}")


if __name__ == "__main__":
    print(f"QalamData Sovereign AI -> http://{HOST}:{PORT}  (Ollama: {OLLAMA_URL}, model: {DEFAULT_MODEL}, anthropic: {'on' if ANTHROPIC_API_KEY else 'off'})")
    threading.Thread(target=prewarm, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
