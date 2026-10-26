from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KAIROS_", env_file=".env", extra="ignore")
    storage: Literal["sqlite", "falkordb"] = "sqlite"
    sqlite_path: Path = Path("backend/data/kairos.sqlite3")
    falkordb_url: str = "redis://localhost:6379"
    graph_name: str = "kairos"
    frontend_origin: str = "http://localhost:3000"
    api_key: str = ""
    # "clerk": every API request needs a verified Clerk session and each user gets their own graph.
    # "none": local development and tests only; everything belongs to one local user.
    auth_mode: Literal["clerk", "none"] = "clerk"
    clerk_publishable_key: str = ""
    # Origins allowed in a token's azp claim (comma-separated); defaults to frontend_origin.
    clerk_authorized_parties: str = ""
    # Backend API key, used only to read a user's verified emails to recognise admins.
    clerk_secret_key: str = ""
    # Comma-separated emails with no usage limits.
    admin_emails: str = ""
    # Daily limits per regular user, and a daily ceiling on fresh Bright Data fetches for all of them.
    limit_event_fetches_per_day: int = 3
    limit_drafts_per_day: int = 20
    limit_voice_notes_per_day: int = 30
    limit_requests_per_minute: int = 120
    limit_global_event_fetches_per_day: int = 30
    brightdata_api_key: str = ""
    brightdata_zone: str = ""
    snapshot_dir: Path = Path("backend/data/snapshots")
    snapshot_max_age_hours: float = 24
    openai_api_key: str = ""
    openai_model: str = "gpt-6-astra"
    openai_timeout: float = 30
    # Speech-to-text model for voice notes (whisper-1 still works but is deprecated by OpenAI).
    openai_transcribe_model: str = "gpt-transcribe"
    # Workflow logs go to stdout and this file; follow them live with `uv run python backend/watch_logs.py`.
    log_level: str = "INFO"
    log_file: Path | None = Path("backend/data/logs/kairos.log")

    @field_validator("openai_model")
    @classmethod
    def default_model(cls, value):
        # An empty KAIROS_OPENAI_MODEL= line in .env means "use the default", not "no model".
        return value.strip() or "gpt-6-astra"
