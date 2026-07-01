# Agentic Video Editor

Production-oriented fork of an AI-assisted video pipeline. Feed raw footage and a creative brief; a coordinated agent ensemble handles scene detection, shot selection, trimming, rendering, and quality review.

The **CLI** is the primary, fully supported interface. **AVE Studio** (Next.js + FastAPI) provides an experimental non-linear editor shell with optional Redis-backed persistence.

---

## Feature Highlights

| Capability | Description |
|------------|-------------|
| Agent pipeline | Director, Trim Refiner, Editor, and Reviewer agents orchestrated from YAML manifests |
| Preprocessing | Automatic scene detection, transcription, and searchable footage indexing |
| Retry loop | Reviewer-driven quality gate with configurable thresholds and versioned outputs |
| Style templates | Structured YAML guidance for pacing, overlays, and segment structure |
| AVE Studio | Web UI with timeline, monitors, inspector, and live job streaming |
| Persistence | Optional Redis layer for job snapshots (Python) and Studio cache (TypeScript) |
| Configurable security | CORS and filesystem browse roots controlled via environment variables |

---

## Architecture

```mermaid
flowchart TB
    subgraph Input
        Footage[Raw footage folder]
        Brief[Creative brief JSON]
        Pipeline[Pipeline YAML]
    end

    subgraph Core["Python core"]
        Pre[Preprocess\nSceneDetect + Whisper]
        Runner[Pipeline runner]
        Director[Director agent]
        Trim[Trim Refiner]
        Editor[Editor / FFmpeg]
        Reviewer[Reviewer agent]
    end

    subgraph Output
        MP4[Rendered MP4]
        Scores[Review scores]
    end

    Footage --> Pre
    Pre --> Runner
    Brief --> Runner
    Pipeline --> Runner
    Runner --> Director --> Trim --> Editor --> Reviewer
    Reviewer -->|score below threshold| Director
    Editor --> MP4
    Reviewer --> Scores
```

### Web stack

```mermaid
flowchart LR
    Browser[Browser\nNext.js Studio]
    NextAPI[Next.js API routes\n/cache]
    FastAPI[FastAPI backend]
    Redis[(Redis\noptional)]
    Pipeline[Pipeline runner]

    Browser -->|REST + WebSocket| FastAPI
    Browser --> NextAPI
    NextAPI --> Redis
    FastAPI --> Redis
    FastAPI --> Pipeline
```

---

## Workflow

```mermaid
sequenceDiagram
    participant User
    participant CLI as ave CLI
    participant Pre as Preprocess
    participant Run as Pipeline runner
    participant Out as output/

    User->>CLI: ave edit --footage-dir ... --brief ...
    CLI->>Pre: Build footage index
    Pre-->>CLI: footage_index.json
    CLI->>Run: Execute pipeline YAML
    loop Until review passes or max retries
        Run->>Run: Director → Trim → Editor → Reviewer
    end
    Run-->>Out: final_video_vN.mp4
    CLI-->>User: Summary + review scores
```

---

## Installation

### Prerequisites

- Python 3.11+
- FFmpeg on `PATH`
- [Google AI API key](https://aistudio.google.com/apikey)
- Node.js 20+ and pnpm (Studio only)
- Redis 7+ (optional, for persistence)

### Python setup

```bash
git clone https://github.com/your-org/agentic-video-editor.git
cd agentic-video-editor

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -e ".[dev]"
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv sync
source .venv/bin/activate
```

### Studio setup

```bash
cd src/web/studio
pnpm install
```

### Environment

```bash
cp .env.example .env
# Edit GOOGLE_API_KEY and optional Redis settings
```

Environment variables are loaded automatically by the CLI and FastAPI app.

---

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `GOOGLE_API_KEY` | — | Required for Gemini agents |
| `AVE_LOG_LEVEL` | `INFO` | Logging verbosity |
| `AVE_OUTPUT_DIR` | `output` | Render output directory |
| `AVE_CORS_ORIGINS` | `http://localhost:3000,...` | Allowed browser origins |
| `AVE_BROWSE_ROOTS` | `~` | Comma-separated roots for `/api/browse` |
| `REDIS_ENABLED` | `true` | Toggle Redis features |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |
| `REDIS_KEY_PREFIX` | `ave:` | Key namespace prefix |
| `NEXT_PUBLIC_API_URL` | `` | Override FastAPI base URL in Studio |

See `.env.example` for the full list including Redis tuning options.

---

## Usage (CLI)

```bash
ave edit \
  --footage-dir /path/to/footage \
  --brief '{"product": "My Product", "audience": "Women 25-45", "tone": "authentic", "duration_seconds": 30}' \
  --pipeline pipelines/ugc-ad.yaml \
  --style styles/dtc-testimonial.yaml
```

Briefs may be inline JSON or a path to a `.json` file. Outputs land in `output/` with versioned filenames when the reviewer triggers retries.

### Creative brief schema

```json
{
  "product": "Product name",
  "audience": "Target demographic",
  "tone": "energetic, calm, professional",
  "duration_seconds": 30,
  "style_ref": "styles/dtc-testimonial.yaml"
}
```

---

## Development

### Run the CLI

```bash
ave edit --footage-dir ./footage --brief brief.json
```

### Run AVE Studio

Terminal 1 — FastAPI:

```bash
uvicorn src.web.app:app --reload --port 8000
```

Terminal 2 — Next.js:

```bash
cd src/web/studio
pnpm dev --port 3000
```

Open http://localhost:3000

### Quality commands

```bash
# Python
ruff check src tests
pytest tests/ -q

# Studio
cd src/web/studio
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## Testing

| Suite | Scope |
|-------|-------|
| `pytest tests/` | Web API routes, config, browse sandboxing, captions |
| `pnpm test` (studio) | Redis config and client utilities |

Core pipeline integration tests are intentionally deferred — they require Gemini credentials and FFmpeg fixtures.

---

## Project Structure

```
agentic-video-editor/
├── docs/internal/       # Maintainer audit notes
├── pipelines/           # YAML pipeline manifests
├── styles/              # Director style templates
├── src/
│   ├── config/          # Environment-driven settings
│   ├── agents/          # Gemini ADK agents
│   ├── models/          # Shared Pydantic schemas
│   ├── pipeline/        # Preprocess + runner
│   ├── tools/           # Agent tool functions
│   ├── main.py          # CLI entry point
│   └── web/
│       ├── app.py       # FastAPI application
│       ├── jobs.py      # Background job registry
│       ├── persistence/ # Optional Redis job snapshots
│       └── studio/      # Next.js frontend
└── tests/
```

Structure decisions are documented in `docs/internal/STRUCTURE.md`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `GOOGLE_API_KEY` errors | Missing or invalid key | Set in `.env` or export in shell |
| Browse returns 403 | Path outside `AVE_BROWSE_ROOTS` | Add parent directory to roots |
| Redis unavailable | Server not running | Start Redis or set `REDIS_ENABLED=false` |
| FFmpeg not found | Binary not on PATH | Install FFmpeg and verify with `ffmpeg -version` |
| Studio cannot reach API | Wrong proxy target | Set `NEXT_PUBLIC_API_URL=http://localhost:8000` |

Check Redis connectivity from Studio:

```bash
curl http://localhost:3000/api/cache/status
```

---

## FAQ

**Is the web UI production-ready?**  
No. AVE Studio is experimental. Use the CLI for reliable workflows.

**Do I need Redis?**  
No. The app runs without Redis; persistence and cache features degrade gracefully.

**Can I add custom agents?**  
Implement an agent under `src/agents/` and reference it in a pipeline YAML manifest.

**How are retries versioned?**  
Each reviewer-triggered retry writes `{name}_v{N}.mp4` so you can compare iterations.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Run `ruff check`, `pytest`, and Studio `pnpm lint && pnpm typecheck && pnpm test`.
3. Keep commits focused; include tests for behavioral changes.
4. Open a pull request with a clear summary and test plan.

---

## License

MIT
