from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KAIROS_", env_file=".env", extra="ignore")
    storage: Literal["sqlite", "falkordb"] = "sqlite"
    sqlite_path: Path = Path("backend/data/kairos.sqlite3")
    falkordb_url: str = "redis://localhost:6379"
    graph_name: str = "kairos"
    frontend_origin: str = "http://localhost:3000"
    api_key: str = ""
