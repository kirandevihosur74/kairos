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
    brightdata_api_key: str = ""
    brightdata_zone: str = ""
    snapshot_dir: Path = Path("backend/data/snapshots")
    snapshot_max_age_hours: float = 24
    openai_api_key: str = ""
    openai_model: str = "gpt-6-astra"
    openai_timeout: float = 30

    @field_validator("openai_model")
    @classmethod
    def default_model(cls, value):
        # An empty KAIROS_OPENAI_MODEL= line in .env means "use the default", not "no model".
        return value.strip() or "gpt-6-astra"
