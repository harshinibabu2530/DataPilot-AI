"""
app.py — InsightForge AI (DataPilot AI)
Python FastAPI microservice — internal only, called by the Node.js gateway.
Runs on port 5001. Do NOT expose this service directly to the internet.
"""

import os
import json
import uuid
import traceback
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, StreamingResponse
from werkzeug.utils import secure_filename
import pandas as pd
import io

from config import Config
from modules.file_handler import FileHandler
from modules.data_cleaner import DataCleaner
from modules.eda_engine import EDAEngine
from modules.domain_processor import DomainProcessor
from modules.dashboard_generator import DashboardGenerator
from modules.ai_insights import AIInsightsEngine
from modules.chatbot import ChatbotEngine
from modules.pdf_reporter import PDFReporter
import modules.supabase_client as supa

# ── App Setup ──────────────────────────────────────────────────────── #
app = FastAPI(title="DataPilot AI Python Microservice", version="1.0.0")

# Ensure upload & report dirs exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.REPORT_OUTPUT_DIR, exist_ok=True)

# In-memory session store: session_id → { df, eda, domain, etc. }
SESSIONS: dict[str, dict] = {}


# ── Helpers ────────────────────────────────────────────────────────── #
def _json_safe(obj):
    """Make a dict JSON-serializable (handle NaN, inf, numpy types)."""
    import numpy as np
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(i) for i in obj]
    if isinstance(obj, float):
        if obj != obj or obj == float("inf") or obj == float("-inf"):
            return None
        return obj
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj) if (obj == obj) else None
    if isinstance(obj, np.ndarray):
        return _json_safe(obj.tolist())
    return obj


def _get_session(session_id: str) -> dict | None:
    return SESSIONS.get(session_id)


def _require_session(session_id: str):
    session = _get_session(session_id)
    is_historical_missing = False

    if not session:
        # Attempt dynamic auto-restoration from Supabase
        if Config.has_supabase():
            try:
                print(f"[Session Restore] Session {session_id} not found in memory. Attempting auto-restoration...")
                meta = supa.get_dataset_metadata(session_id)
                if meta:
                    if meta.get("upload_path"):
                        storage_path = meta["upload_path"]
                        storage_key = storage_path.split("datasets/")[-1]
                        print(f"[Session Restore] Downloading file from storage path: {storage_key}")
                        raw_bytes = supa.download_file_from_storage(storage_key)
                        if raw_bytes:
                            # Parse DataFrame
                            parsed = FileHandler.parse_bytes(raw_bytes, meta["dataset_name"])
                            df = parsed["dataframe"]
                            
                            # Populate session state
                            SESSIONS[session_id] = {
                                "df_original": df.copy(),
                                "df_clean": df.copy(),
                                "df": df.copy(),
                                "filename": meta["dataset_name"],
                                "file_type": meta["file_type"],
                                "domain": meta.get("domain_type", "generic"),
                                "eda": {},
                                "cleaning_report": {},
                                "domain_results": {},
                                "insights": [],
                                "dashboard": {},
                                "chat_history": [],
                            }
                            print(f"[Session Restore] Successfully restored session {session_id} ({len(df)} rows)!")
                        else:
                            print(f"[Session Restore] Failed to download raw bytes for {session_id}.")
                            is_historical_missing = True
                    else:
                        print(f"[Session Restore] No storage path found for dataset ID: {session_id}")
                        is_historical_missing = True
                else:
                    print(f"[Session Restore] No metadata found for dataset ID: {session_id}")
            except Exception as restore_err:
                print(f"[Session Restore] Error during auto-restoration: {restore_err}")
                traceback.print_exc()

    # Re-fetch session after potential restoration
    session = _get_session(session_id)
    if not session:
        if is_historical_missing:
            error_msg = "Historical dataset file not found in storage. Since this file was uploaded before recent system updates, please re-upload the CSV/Excel file to start a new analysis session."
        else:
            error_msg = "Session not found. Please upload a file first."
        return None, JSONResponse({"error": error_msg}, status_code=400)
    return session, None


def _error(msg: str, code: int = 400):
    return JSONResponse({"error": msg}, status_code=code)


# ── Routes ─────────────────────────────────────────────────────────── #

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "llm_configured": Config.has_llm(),
        "supabase_configured": Config.has_supabase(),
        "llm_provider": Config.LLM_PROVIDER,
    }


# ── 1. UPLOAD ──────────────────────────────────────────────────────── #
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), session_id: str = Form(None)):
    try:
        if not file.filename:
            return _error("Empty filename.")

        ext = FileHandler.get_extension(file.filename)
        if ext not in Config.ALLOWED_EXTENSIONS:
            return _error(f"File type '.{ext}' not supported.")

        # Read file bytes
        raw_bytes = await file.read()
        if not raw_bytes:
            return _error("Uploaded file is empty.")

        # Parse directly from raw bytes (avoids EOF issues with BytesIO)
        parsed = FileHandler.parse_bytes(raw_bytes, file.filename)
        df: pd.DataFrame = parsed["dataframe"]

        # Use passed session_id or generate a new random one
        sid = session_id if (session_id and session_id.strip()) else str(uuid.uuid4())

        # Automatically detect domain from column structure
        detected_domain = DomainProcessor.detect_domain(df)

        SESSIONS[sid] = {
            "df_original": df.copy(),
            "df_clean": df.copy(),
            "df": df.copy(),
            "filename": parsed["filename"],
            "file_type": parsed["file_type"],
            "domain": detected_domain,
            "eda": {},
            "cleaning_report": {},
            "domain_results": {},
            "insights": [],
            "dashboard": {},
            "chat_history": [],
        }

        # Optional: upload raw bytes to Supabase storage (never blocks upload)
        storage_path = None
        if Config.has_supabase():
            try:
                path = f"{sid}/{secure_filename(parsed['filename'])}"
                storage_path = supa.upload_file_to_storage(raw_bytes, path, f"application/{ext}")
                if session_id and session_id.strip():
                    supa.update_dataset_upload_path(sid, storage_path)
            except Exception as supa_err:
                print(f"[Supabase] Non-fatal storage error: {supa_err}")
                storage_path = None

        preview = FileHandler.get_preview(df, n=10)

        return {
            "session_id": sid,
            "filename": parsed["filename"],
            "file_type": ext,
            "row_count": parsed["row_count"],
            "column_count": parsed["column_count"],
            "columns": parsed["columns"],
            "dtypes": parsed["dtypes"],
            "preview": _json_safe(preview),
            "storage_path": storage_path,
            "domain": detected_domain,
        }

    except ValueError as e:
        return _error(str(e))
    except Exception as e:
        traceback.print_exc()
        return _error(f"Upload failed: {str(e)}", 500)


# ── 2. CLEAN ───────────────────────────────────────────────────────── #
@app.post("/api/clean")
async def clean_data(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        session, err = _require_session(session_id)
        if err:
            return err

        df = session["df_original"].copy()
        cleaner = DataCleaner(df)
        df_clean, report = cleaner.clean()

        session["df_clean"] = df_clean
        session["df"] = df_clean
        session["cleaning_report"] = report

        preview = FileHandler.get_preview(df_clean, n=10)

        return {
            "session_id": session_id,
            "cleaning_report": _json_safe(report),
            "cleaned_shape": list(df_clean.shape),
            "preview": _json_safe(preview),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Cleaning failed: {str(e)}", 500)


# ── 3. EDA ─────────────────────────────────────────────────────────── #
@app.post("/api/eda")
async def run_eda(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        engine = EDAEngine(df)
        eda_results = engine.run_full_eda()

        # Generate recommendations and inject into eda_results["overview"]["recommendations"]
        try:
            from modules.ai_insights import AIInsightsEngine
            insights_engine = AIInsightsEngine(df, session.get("domain", "generic"), eda_results)
            recs = insights_engine.generate_recommendations()
            eda_results["overview"]["recommendations"] = recs
            print(f"[app.py /api/eda] Generated {len(recs)} Recommendations.")
        except Exception as e:
            print(f"[app.py /api/eda] Recommendations generation failed: {e}")
            eda_results["overview"]["recommendations"] = []

        session["eda"] = eda_results

        # Note: Node gateway already persists the EDA report to Supabase via saveEdaReport
        return {
            "session_id": session_id,
            "eda": _json_safe(eda_results),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"EDA failed: {str(e)}", 500)


# ── 4. DOMAIN ──────────────────────────────────────────────────────── #
@app.post("/api/domain")
async def apply_domain(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        domain = body.get("domain", "generic").lower()
        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        domain_results = DomainProcessor.process(df, domain)

        session["domain"] = domain
        session["domain_results"] = domain_results

        # Regenerate recommendations for the new domain type!
        if "eda" in session:
            try:
                from modules.ai_insights import AIInsightsEngine
                insights_engine = AIInsightsEngine(df, domain, session["eda"])
                recs = insights_engine.generate_recommendations()
                session["eda"]["overview"]["recommendations"] = recs
                print(f"[app.py /api/domain] Regenerated {len(recs)} Recommendations for domain: {domain}")
            except Exception as e:
                print(f"[app.py /api/domain] Failed to regenerate recommendations: {e}")

        return {
            "session_id": session_id,
            "domain": domain,
            "domain_results": _json_safe(domain_results),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Domain processing failed: {str(e)}", 500)


# ── 5. DASHBOARD ───────────────────────────────────────────────────── #
@app.post("/api/dashboard")
async def generate_dashboard(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        domain = session.get("domain", "generic")
        generator = DashboardGenerator(df, domain)
        dashboard_data = generator.generate()

        session["dashboard"] = dashboard_data

        return {
            "session_id": session_id,
            "dashboard": _json_safe(dashboard_data),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Dashboard generation failed: {str(e)}", 500)


# ── 6. INSIGHTS ────────────────────────────────────────────────────── #
@app.post("/api/insights")
async def generate_insights(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        domain = session.get("domain", "generic")
        eda = session.get("eda", {})

        engine = AIInsightsEngine(df, domain, eda)
        insights = engine.generate_insights()
        
        # Generate recommendations and synchronize session state
        try:
            recs = engine.generate_recommendations()
            if "eda" in session:
                session["eda"]["overview"]["recommendations"] = recs
            session["recommendations"] = recs
            print(f"[app.py /api/insights] Generated {len(recs)} Recommendations.")
        except Exception as e:
            print(f"[app.py /api/insights] Recommendations generation failed: {e}")
            recs = []

        # Generate storytelling executive narrative
        try:
            narrative = engine.generate_executive_narrative(
                cleaning_report=session.get("cleaning_report", {}),
                domain_results=session.get("domain_results", {})
            )
            narrative_insight = {
                "title": "Executive AI Storytelling Narrative",
                "description": narrative,
                "type": "narrative",
                "priority": "high"
            }
            insights.append(narrative_insight)
            session["narrative"] = narrative
        except Exception as e:
            print(f"[app.py /api/insights] Failed to generate/inject narrative: {e}")
            session["narrative"] = None

        session["insights"] = insights

        return {
            "session_id": session_id,
            "insights": _json_safe(insights),
            "recommendations": _json_safe(recs),
            "count": len(insights),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Insight generation failed: {str(e)}", 500)


# ── 7. CHAT ────────────────────────────────────────────────────────── #
@app.post("/api/chat")
async def chat(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        message = body.get("message", "").strip()

        if not message:
            return _error("Message is required.")

        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        domain = session.get("domain", "generic")
        history = session.get("chat_history", [])

        bot = ChatbotEngine(df, domain)
        result = bot.chat(message, history)

        # Update history
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": result["reply"]})
        session["chat_history"] = history[-20:]  # Keep last 20 messages

        # Note: Node gateway already persists the chat Q&A to Supabase via saveChatMessage
        return {
            "session_id": session_id,
            "reply": result["reply"],
            "data": _json_safe(result.get("data")),
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Chat failed: {str(e)}", 500)


# ── 8. PDF REPORT ──────────────────────────────────────────────────── #
@app.post("/api/report")
async def generate_report(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])

        reporter = PDFReporter(
            df=df,
            eda_results=session.get("eda", {}),
            domain_results=session.get("domain_results", {}),
            insights=session.get("insights", []),
            dashboard_data=session.get("dashboard", {}),
            cleaning_report=session.get("cleaning_report", {}),
            filename=session.get("filename", "report"),
        )
        pdf_bytes = reporter.generate()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="datapilot_report_{session_id[:8]}.pdf"'
            },
        )

    except Exception as e:
        traceback.print_exc()
        return _error(f"Report generation failed: {str(e)}", 500)


# ── 11. EXPLAIN CHART ──────────────────────────────────────────────── #
@app.post("/api/explain-chart")
async def explain_chart(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        chart_title = body.get("chart_title", "Chart")
        chart_type = body.get("chart_type", "line")
        series_data = body.get("series_data", [])
        clicked_point = body.get("clicked_point")
        domain = body.get("domain")

        # Session is optional but highly helpful to extract baseline domain context
        active_domain = domain or "generic"
        if session_id:
            session, err = _require_session(session_id)
            if not err and session:
                active_domain = domain or session.get("domain", "generic")

        from modules.chart_explainer import ChartExplainer
        explainer = ChartExplainer()
        explanation = explainer.explain_chart(
            chart_title=chart_title,
            chart_type=chart_type,
            series_data=series_data,
            clicked_point=clicked_point,
            domain=active_domain
        )

        return {
            "explanation": explanation
        }

    except Exception as e:
        traceback.print_exc()
        return _error(f"Chart explanation failed: {str(e)}", 500)


# ── 12. GENERATE SQL ────────────────────────────────────────────────── #
@app.post("/api/generate-sql")
async def generate_sql(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        question = body.get("question", "").strip()

        if not question:
            return _error("Question is required.")

        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        domain = session.get("domain", "generic")

        from modules.sql_generator import SQLGenerator
        generator = SQLGenerator(df=df, domain=domain)
        result = generator.generate_sql(question)

        return _json_safe(result)

    except Exception as e:
        traceback.print_exc()
        return _error(f"SQL generation failed: {str(e)}", 500)


# ── 10. PREDICT ────────────────────────────────────────────────────── #
@app.post("/api/predict")
async def run_predict(req: Request):
    try:
        body = await req.json()
        session_id = body.get("session_id")
        prediction_type = body.get("prediction_type", "timeseries") # "timeseries" | "churn"
        target_col = body.get("target_col")
        date_col = body.get("date_col")
        algorithm = body.get("algorithm", "prophet")
        horizon = int(body.get("horizon", 30))

        if not target_col:
            return _error("Target column is required.")

        session, err = _require_session(session_id)
        if err:
            return err

        df = session.get("df", session["df_original"])
        
        # Initialize the predictive engine
        from modules.predictive_engine import PredictiveEngine
        engine = PredictiveEngine(df)

        if prediction_type == "timeseries":
            pred_results = engine.run_time_series_forecast(
                target_col=target_col,
                date_col=date_col,
                algorithm=algorithm,
                horizon_days=horizon
            )
        else:
            pred_results = engine.run_churn_prediction(
                target_col=target_col
            )

        # Store predictions in the session's eda results
        if "eda" not in session or not session["eda"]:
            session["eda"] = {"overview": {}}
        elif "overview" not in session["eda"]:
            session["eda"]["overview"] = {}
        
        session["eda"]["overview"]["predictions"] = pred_results

        return {
            "session_id": session_id,
            "predictions": _json_safe(pred_results)
        }

    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return _error(f"Prediction failed: {str(e)}", 500)


# ── 9. SESSION INFO ────────────────────────────────────────────────── #
@app.get("/api/session/{session_id}")
def get_session_info(session_id: str):
    session = _get_session(session_id)
    if not session:
        return _error("Session not found.", 404)
    return {
        "session_id": session_id,
        "filename": session.get("filename"),
        "file_type": session.get("file_type"),
        "domain": session.get("domain"),
        "shape": list(session["df"].shape) if "df" in session else None,
        "has_eda": bool(session.get("eda")),
        "has_insights": bool(session.get("insights")),
        "has_dashboard": bool(session.get("dashboard")),
        "chat_messages": len(session.get("chat_history", [])),
    }


# ── Run ──────────────────────────────────────────────────────── #
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  DataPilot AI — Python FastAPI Microservice")
    print(f"  Port     : 5001")
    print(f"  LLM      : {'OK – ' + Config.LLM_PROVIDER.upper() if Config.has_llm() else 'NO – rule-based fallback'}")
    print(f"  Supabase : {'OK – Connected' if Config.has_supabase() else 'NO – local session mode'}")
    print("=" * 60)
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
