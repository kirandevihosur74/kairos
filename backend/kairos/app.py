import io
import json
import logging
import secrets
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pypdf import PdfReader
from pypdf.errors import PyPdfError
from redis.exceptions import RedisError

from . import voice
from .config import Settings
from .ingest import canonical_url, is_luma, load_event
from .models import ConferenceInput, DraftEdit, DraftInput, NoteInput, Profile, TextImport, TriageInput
from .service import cards, make_draft, memory, now, person, profile, require, suggest, uid
from .store import FalkorStore, SQLiteStore

log = logging.getLogger(__name__)
FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "people.json"
MAX_UPLOAD = 2 * 1024 * 1024


def create_app(settings: Settings | None = None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        store = (
            FalkorStore(settings.falkordb_url, settings.graph_name)
            if settings.storage == "falkordb"
            else SQLiteStore(settings.sqlite_path)
        )
        app.state.store = store
        # A stopped process must not leave an apparently active job forever.
        for conference in store.all("conference"):
            if conference["stage"] not in {"ready", "failed"}:
                store.put(
                    "conference",
                    {
                        **conference,
                        "stage": "failed",
                        "error": "Ingestion interrupted; create a new conference.",
                    },
                )
        yield
        store.close()

    app = FastAPI(
        title="Kairos Career Networking API",
        version="0.1.0",
        lifespan=lifespan,
        description="Single-user backend MVP. Fixture people and template drafts are explicitly labeled.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-API-Key"],
    )

    @app.middleware("http")
    async def bound_body(request, call_next):
        # Count actual streamed bytes: Content-Length can be missing or inaccurate.
        if request.method in {"POST", "PUT", "PATCH"}:
            data = bytearray()
            limit = voice.MAX_AUDIO if request.url.path.endswith("/voice/transcribe") else MAX_UPLOAD
            async for chunk in request.stream():
                data.extend(chunk)
                if len(data) > limit + 64 * 1024:
                    return JSONResponse(status_code=413, content={"detail": "Request exceeds upload limit"})
            request._body = bytes(data)
        return await call_next(request)

    @app.exception_handler(RedisError)
    async def unavailable(request, exc):
        log.warning("Graph unavailable: %s", type(exc).__name__)
        return JSONResponse(status_code=503, content={"detail": "Graph database unavailable"})

    def auth(x_api_key: Annotated[str | None, Header()] = None):
        if settings.api_key and not secrets.compare_digest(x_api_key or "", settings.api_key):
            raise HTTPException(401, "Valid X-API-Key required")

    def store():
        return app.state.store

    api = "/api/v1"
    protected = [Depends(auth)]

    @app.get("/health")
    def health():
        store().ping()
        return {
            "status": "ok",
            "storage": store().engine,
            "single_user_demo": True,
            "ingestion": "fixture_and_luma"
            if settings.brightdata_api_key and settings.brightdata_zone
            else "fixture_only",
            # Luma pages need Bright Data; any other public event page also needs OpenAI for extraction.
            "live_sources": (["luma"] + (["any_public_page"] if settings.openai_api_key else []))
            if settings.brightdata_api_key and settings.brightdata_zone
            else [],
            "draft_generation": "openai" if settings.openai_api_key else "template",
            "voice_transcription": settings.openai_transcribe_model if settings.openai_api_key else None,
        }

    @app.get(api + "/profile", dependencies=protected)
    def get_profile():
        return profile(store())

    @app.post(api + "/onboarding", dependencies=protected)
    @app.put(api + "/profile", dependencies=protected)
    def save_profile(body: Profile):
        imported = require(store(), "import", body.import_id) if body.import_id else None
        value = {
            **body.model_dump(mode="json"),
            "id": "demo_user",
            "user_id": "demo_user",
            "confirmed_at": now(),
            "source": imported["source"] if imported else "manual",
        }
        return store().put("profile", value)

    def import_preview(text, source):
        value = {
            "id": uid("import"),
            "source": source,
            "suggested_profile": suggest(text),
            "extraction_mode": "keyword_suggestions",
            "requires_review": True,
            "created_at": now(),
        }
        store().put("import", value)
        return {**value, "import_id": value["id"]}

    @app.post(api + "/onboarding/import-text", dependencies=protected)
    def import_text(body: TextImport):
        return import_preview(body.text, body.source)

    @app.post(api + "/onboarding/resume", dependencies=protected)
    def import_resume(file: Annotated[UploadFile, File()]):
        data = file.file.read(MAX_UPLOAD + 1)
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, "Resume must be at most 2 MB")
        if not data.startswith(b"%PDF-"):
            raise HTTPException(422, "Upload a text-based PDF resume")
        try:
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted or len(reader.pages) > 10:
                raise ValueError("Unsupported PDF")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except (PyPdfError, ValueError, TypeError, KeyError, OSError):
            raise HTTPException(422, "Could not read PDF; paste resume text instead") from None
        if not text.strip() or len(text) > 30000:
            raise HTTPException(422, "Use a short text-based PDF or paste resume text; OCR is not supported")
        return import_preview(text, "resume_pdf")

    @app.post(api + "/conference", status_code=201, dependencies=protected)
    def create_conference(body: ConferenceInput):
        profile(store())
        live = body.data_mode == "live"
        url = canonical_url(str(body.url)) if live else str(body.url)
        cid = uid("conference")
        conference = {
            "id": cid,
            "conference_id": cid,
            "url": url,
            "name": body.name or "Demo conference",
            "stage": "loading",
            "people_found": 0,
            "data_mode": body.data_mode,
            "stale": False,
            "freshness": None,
            "source": None,
            "created_at": now(),
            "error": None,
        }
        store().put("conference", conference)
        try:
            if live:
                event, freshness = load_event(url, settings, now())
                people = event["people"]
                conference.update(
                    name=body.name or event["name"],
                    stale=freshness == "stale",
                    freshness=freshness,
                    source="luma" if is_luma(url) else "web",
                    collected_at=event["collected_at"],
                    start_at=event["start_at"],
                    end_at=event["end_at"],
                    city=event["city"],
                )
            else:
                # Fixture mode stores the URL for context only and performs no external requests.
                people = json.loads(FIXTURE_PATH.read_text())
            for p in people:
                store().put("person", {**p, "id": cid + ":" + p["id"], "conference_id": cid})
            conference.update(stage="ready", people_found=len(people))
        except HTTPException as exc:
            store().put("conference", {**conference, "stage": "failed", "error": exc.detail})
            raise
        except Exception:
            store().put("conference", {**conference, "stage": "failed", "error": "People loading failed"})
            raise
        store().put("conference", conference)
        return {**conference, "status_url": api + f"/conference/{cid}/status"}

    @app.get(api + "/conference/{cid}/status", dependencies=protected)
    def status(cid: str):
        return require(store(), "conference", cid)

    @app.get(api + "/conferences", dependencies=protected)
    def list_conferences():
        """Every event the user added, newest first, with per-event progress counts for a home screen."""
        s = store()
        interesting, met, pending = Counter(), {}, Counter()
        for t in s.all("triage"):
            if t["decision"] == "interesting":
                interesting[t["conference_id"]] += 1
        for n in s.all("note"):
            met.setdefault(n["conference_id"], set()).add(n["person_id"])
        for d in s.all("draft"):
            if d["status"] == "draft":
                pending[d["conference_id"]] += 1
        items = [
            {
                "conference_id": c["id"],
                "name": c["name"],
                "url": c["url"],
                "stage": c["stage"],
                "created_at": c["created_at"],
                "start_at": c.get("start_at"),
                "end_at": c.get("end_at"),
                "data_mode": c["data_mode"],
                "stale": c["stale"],
                "freshness": c.get("freshness"),
                "source": c.get("source"),
                "people_found": c["people_found"],
                "counts": {
                    "interesting": interesting[c["id"]],
                    "met": len(met.get(c["id"], ())),
                    "drafts_pending": pending[c["id"]],
                },
            }
            for c in s.all("conference")
        ]
        return sorted(items, key=lambda c: (c["created_at"], c["conference_id"]), reverse=True)

    @app.get(api + "/people", dependencies=protected)
    def get_people(
        conference_id: str, triage: Literal["interesting", "not_interesting", "all"] | None = None
    ):
        return cards(store(), conference_id, triage)

    @app.get(api + "/people/{pid}", dependencies=protected)
    def get_person(pid: str, conference_id: str):
        person(store(), pid, conference_id)
        return next(p for p in cards(store(), conference_id, "all") if p["id"] == pid)

    @app.get(api + "/people/{pid}/graph", dependencies=protected)
    def get_graph(pid: str, conference_id: str):
        return get_person(pid, conference_id)["why"]

    @app.get(api + "/people/{pid}/memory", dependencies=protected)
    def get_memory(pid: str, conference_id: str):
        """Graph memory: earlier meetings with this person at other events, and colleague conversations."""
        return memory(store(), person(store(), pid, conference_id))

    @app.post(api + "/triage", dependencies=protected)
    def triage(body: TriageInput):
        person(store(), body.person_id, body.conference_id)
        return store().put("triage", {**body.model_dump(), "id": body.person_id, "updated_at": now()})

    @app.post(api + "/met", status_code=201, dependencies=protected)
    def met(body: NoteInput):
        person(store(), body.person_id, body.conference_id)
        nid = uid("note")
        return store().put(
            "note",
            {
                "id": nid,
                "note_id": nid,
                "person_id": body.person_id,
                "conference_id": body.conference_id,
                "text": body.note,
                "created_at": now(),
            },
        )

    @app.post(api + "/voice/transcribe", dependencies=protected)
    def transcribe_voice(
        file: Annotated[UploadFile, File()],
        conference_id: Annotated[str | None, Form()] = None,
        person_id: Annotated[str | None, Form()] = None,
    ):
        """Speech-to-text for a voice note. Returns text to review; saves nothing (submit it via POST /met)."""
        if not settings.openai_api_key:
            raise HTTPException(503, "Voice notes need KAIROS_OPENAI_API_KEY")
        s = store()
        if person_id:
            if not conference_id:
                raise HTTPException(422, "person_id requires conference_id")
            person(s, person_id, conference_id)
        elif conference_id:
            require(s, "conference", conference_id)
        ext = voice.extension(file.filename, file.content_type)
        if ext not in voice.AUDIO_TYPES:
            raise HTTPException(422, "Record audio as webm, mp4/m4a, mp3 or wav")
        audio = file.file.read(voice.MAX_AUDIO + 1)
        if len(audio) > voice.MAX_AUDIO:
            raise HTTPException(413, "Voice note must be at most 10 MB")
        if not audio:
            raise HTTPException(422, "Empty recording")
        try:
            text = voice.transcribe(audio, ext, settings)
        except voice.TranscriptionError as exc:
            raise HTTPException(502, f"Transcription failed ({exc}); try again or type the note") from None
        if not text:
            raise HTTPException(422, "No speech detected; try again or type the note")
        candidates = []
        if conference_id and not person_id:
            people = [p for p in s.all("person") if p["conference_id"] == conference_id]
            fields = ("id", "name", "title", "company", "photo_url")
            candidates = [{f: p.get(f) for f in fields} for p in voice.mentioned(text, people)]
        return {
            "text": text,
            "model": settings.openai_transcribe_model,
            "conference_id": conference_id,
            "person_id": person_id,
            # People named in the note, so a mic tap from any screen can ask "Is this about Xinyu?"
            "person_candidates": candidates,
            "saved": False,
        }

    @app.get(api + "/priorities", dependencies=protected)
    def priorities(conference_id: str):
        return cards(store(), conference_id, "interesting")[:3]

    @app.post(api + "/followups/{pid}/draft", status_code=201, dependencies=protected)
    def draft(pid: str, body: DraftInput):
        value = make_draft(store(), pid, body, settings)
        value["draft_id"] = value["id"]
        return store().put("draft", value)

    @app.get(api + "/drafts", dependencies=protected)
    def list_drafts(conference_id: str | None = None, status: Literal["draft", "approved"] | None = None):
        """Drafts newest first, each with the person it is for, so a queue renders in one request."""
        s = store()
        if conference_id is not None:
            require(s, "conference", conference_id)
        people = {p["id"]: p for p in s.all("person")}
        rows = []
        for d in s.all("draft"):
            if (conference_id and d["conference_id"] != conference_id) or (status and d["status"] != status):
                continue
            p = people.get(d["person_id"], {})
            fields = ("id", "name", "title", "company", "photo_url")
            rows.append({**d, "person": {f: p.get(f) for f in fields}})
        return sorted(rows, key=lambda d: (d["created_at"], d["id"]), reverse=True)

    @app.get(api + "/drafts/{did}", dependencies=protected)
    def get_draft(did: str):
        return require(store(), "draft", did)

    @app.patch(api + "/drafts/{did}", dependencies=protected)
    def edit_draft(did: str, body: DraftEdit):
        value = require(store(), "draft", did)
        return store().put(
            "draft",
            {**value, **body.model_dump(), "status": "draft", "approved_at": None, "updated_at": now()},
        )

    @app.post(api + "/followups/{did}/approve", dependencies=protected)
    def approve(did: str, body: DraftEdit):
        value = require(store(), "draft", did)
        return store().put(
            "draft", {**value, **body.model_dump(), "status": "approved", "approved_at": now()}
        )

    return app


app = create_app()
