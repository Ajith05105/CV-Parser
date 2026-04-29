import io
import json
import os
from datetime import datetime, timezone

import gspread
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.oauth2.service_account import Credentials
from pypdf import PdfReader
from vertexai import init as vertex_init
from vertexai.generative_models import GenerationConfig, GenerativeModel

load_dotenv()

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
SA_PATH = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
MAX_BYTES = 5 * 1024 * 1024

HEADERS = [
    "timestamp", "name", "email", "phone", "summary",
    "experience", "education", "skills", "projects",
    "github", "linkedin", "style_name", "theme",
    "primary_color", "font_preference", "status",
]

SYSTEM_PROMPT = """You are a CV parser. Extract structured information from the provided CV text.
Return ONLY valid JSON with no preamble, no markdown, no backticks.
Use exactly this schema:
{
  "name": "full name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "summary": "professional summary or objective, 2-3 sentences",
  "experience": [
    {"company": "company name", "role": "job title", "duration": "start - end dates", "description": "key responsibilities and achievements, 2-3 sentences"}
  ],
  "education": [
    {"institution": "university or school name", "degree": "degree and field of study", "duration": "start - end dates"}
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "projects": [
    {"name": "project name", "description": "what it does and tech used, 1-2 sentences", "url": "project url or empty string"}
  ],
  "github": "github profile url or empty string",
  "linkedin": "linkedin profile url or empty string"
}
If a field has no information in the CV, use an empty string or empty array.
Never hallucinate or invent information not present in the CV."""

vertex_init(project=PROJECT, location=LOCATION)
_model = GenerativeModel("gemini-2.5-flash", system_instruction=SYSTEM_PROMPT)
_gen_config = GenerationConfig(temperature=0.1, response_mime_type="application/json")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text(file: UploadFile, data: bytes) -> str:
    name = (file.filename or "").lower()
    ctype = (file.content_type or "").lower()
    if name.endswith(".pdf") or "pdf" in ctype:
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if name.endswith(".txt") or ctype.startswith("text/"):
        return data.decode("utf-8", errors="ignore")
    raise HTTPException(status_code=400, detail="Only PDF and plain text files are supported.")


def parse_with_gemini(text: str) -> dict:
    prompt = f"Parse the following CV:\n\n{text}"
    last_err = None
    for _ in range(2):
        resp = _model.generate_content(prompt, generation_config=_gen_config)
        raw = (resp.text or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            last_err = e
    raise HTTPException(status_code=500, detail=f"Gemini returned invalid JSON: {last_err}")


def write_to_sheet(parsed: dict, style: dict, email: str) -> None:
    if not (SHEET_ID and SA_PATH):
        raise RuntimeError("Sheets not configured")
    creds = Credentials.from_service_account_file(
        SA_PATH,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    client = gspread.authorize(creds)
    ws = client.open_by_key(SHEET_ID).sheet1
    first = ws.row_values(1)
    if first != HEADERS:
        if not first:
            ws.append_row(HEADERS, value_input_option="RAW")
        else:
            ws.update("A1", [HEADERS])
    row = [
        datetime.now(timezone.utc).isoformat(),
        parsed.get("name", ""),
        email or parsed.get("email", ""),
        parsed.get("phone", ""),
        parsed.get("summary", ""),
        json.dumps(parsed.get("experience", []), ensure_ascii=False),
        json.dumps(parsed.get("education", []), ensure_ascii=False),
        ", ".join(parsed.get("skills", []) or []),
        json.dumps(parsed.get("projects", []), ensure_ascii=False),
        parsed.get("github", ""),
        parsed.get("linkedin", ""),
        style.get("style_name", ""),
        style.get("theme", ""),
        style.get("primary_color", ""),
        style.get("font_preference", ""),
        "pending",
    ]
    ws.append_row(row, value_input_option="RAW")


@app.post("/parse")
async def parse(
    file: UploadFile = File(...),
    style: str = Form(...),
    email: str = Form(...),
):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit.")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    try:
        style_obj = json.loads(style)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid style JSON.")

    text = extract_text(file, data)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")

    parsed = parse_with_gemini(text)

    warning = None
    try:
        write_to_sheet(parsed, style_obj, email)
    except Exception as e:
        import traceback; traceback.print_exc()
        warning = f"Saved parse but failed to write to sheet: {e}"

    return {"parsed": parsed, "warning": warning}


@app.exception_handler(HTTPException)
async def http_handler(_, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.get("/health")
def health():
    return {"ok": True}
