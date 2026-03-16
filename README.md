# GrAInt — AI Grant Proposal Assistant

GrAInt helps academics draft structured grant proposals using OpenAI's GPT-4o-mini. Fill in your research topic, objectives, methodology, and funding call details — GrAInt generates all six proposal sections in real time, which you can then edit, revise with AI feedback, and export.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square) ![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-646CFF?style=flat-square) ![Stack](https://img.shields.io/badge/AI-GPT--4o--mini-412991?style=flat-square)

## Features

- **Live generation** — sections stream in one by one as the AI writes them
- **In-line editing** — manually edit any section directly in the browser
- **AI revision** — provide feedback on a section and let the AI rewrite it
- **Full-proposal review** — get structured critique across coherence, rigour, impact, and alignment with the funding call
- **Export** — download as DOCX or TXT
- **History** — all proposals saved locally; reload and continue working at any time

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Backend

```bash
cd backend
cp .env.example .env        # then add your OPENAI_API_KEY to .env
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API runs on `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> In development, Vite proxies all `/api` requests to the FastAPI server automatically.

## Project structure

```
GrAInt/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── prompts/
│   │   └── Prompts.json     # All LLM prompt templates
│   ├── core/
│   │   ├── generator.py     # OpenAI calls
│   │   ├── database.py      # SQLite persistence
│   │   └── prompts.py       # Prompt loader
│   └── api/
│       └── routes.py        # REST + SSE endpoints
└── frontend/
    └── src/
        ├── pages/           # NewProposal, ProposalDetail, History
        ├── components/      # Layout, SectionCard, StatusBadge
        └── api/index.js     # API client
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `OPENAI_BASE_URL` | No | Custom API endpoint (e.g. Azure OpenAI) |

## Production build

```bash
cd frontend && npm run build        # outputs to frontend/dist/
cd ../backend && python -m uvicorn main:app
```

FastAPI will serve the compiled frontend automatically — only one process needed.

## Customising prompts

All prompt templates live in `backend/prompts/Prompts.json`. Edit the `sections` entries to change how each section is written, or modify `general_writer` / `consistency_checker` to adjust the AI's persona and review style. No code changes required.
