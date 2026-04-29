# CV-Parser

Workshop intake app for GDGC Auckland: attendees upload a CV, pick a portfolio
style, and we parse the CV with Gemini (Vertex AI) and log the result to a
Google Sheet for live portfolio generation.

```
portfolio-intake/
├── frontend/   # React + Vite + Tailwind (CDN)
└── backend/    # FastAPI + Vertex AI + gspread
```

## Local development

### 1. Backend

```bash
cd portfolio-intake/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then fill in real values
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health

### 2. Frontend

```bash
cd portfolio-intake/frontend
npm install
cp .env.example .env       # leave VITE_API_URL=http://localhost:8000 for local
npm run dev
```

Open http://localhost:5173.

## Google Cloud setup

### Vertex AI / Gemini
1. Enable the **Vertex AI API** on your GCP project.
2. Note your project ID and region (e.g. `us-central1`).
3. The service account below also needs the **Vertex AI User**
   (`roles/aiplatform.user`) role.

### Service account for Sheets + Vertex
1. Google Cloud Console → IAM & Admin → Service Accounts → **Create**.
2. Grant `Vertex AI User`.
3. Open the new service account → Keys → **Add key → JSON**. Save the file
   as `portfolio-intake/backend/service-account.json` (it is git-ignored).
4. Copy the service account email (looks like `name@project.iam.gserviceaccount.com`).

### Google Sheet
1. Create a new Google Sheet. Copy its ID from the URL
   (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`).
2. **Share the sheet with the service account email** as Editor.
3. Headers are written automatically on first submission.

## Environment variables

### Backend (`portfolio-intake/backend/.env`)

| Name | Description |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID running Vertex AI |
| `GOOGLE_CLOUD_LOCATION` | Vertex region, e.g. `us-central1` |
| `GOOGLE_SHEET_ID` | ID of the target Google Sheet |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to the service account JSON key |

### Frontend (`portfolio-intake/frontend/.env`)

| Name | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the FastAPI backend |

## Running both servers

In two terminals:

```bash
# terminal 1
cd portfolio-intake/backend && uvicorn main:app --reload --port 8000

# terminal 2
cd portfolio-intake/frontend && npm run dev
```

## Deployment

### Backend — Cloud Run

```bash
cd portfolio-intake/backend
gcloud run deploy portfolio-intake \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_SHEET_ID=...
```

For the service account JSON on Cloud Run, prefer attaching the runtime
service account to the Cloud Run service (so `gspread` can authenticate
without a key file). If you must ship the JSON, mount it via Secret Manager
and set `GOOGLE_SERVICE_ACCOUNT_JSON` to the mounted path.

### Frontend — Netlify

1. New site from Git → pick the repo, base directory `portfolio-intake/frontend`.
2. Build command: `npm run build`. Publish directory: `dist`.
3. Add environment variable `VITE_API_URL` set to the Cloud Run URL.

## Reviewer workflow

The Sheet has a `status` column that defaults to `pending`. Reviewers change it
to `approved` or `rejected` to gate downstream portfolio generation.
