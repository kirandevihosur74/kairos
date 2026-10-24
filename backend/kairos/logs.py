"""Workflow logging: one line per event, to stdout and a rotating file that `backend/watch_logs.py` follows.

Lines look like `2026-10-24T15:02:11 INFO  ingest.fetch.ok url=https://... ms=842 bytes=385943 rid=3f2a1c`.
Personal content (note text, transcripts, resumes, drafts) and secrets are never logged, only sizes and ids.
"""

import contextvars
import logging
import logging.handlers
import time
from pathlib import Path

request_id = contextvars.ContextVar("request_id", default="-")
log = logging.getLogger("kairos")


class _Format(logging.Formatter):
    def format(self, record):
        stamp = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(record.created))
        line = f"{stamp} {record.levelname:<5} {record.getMessage()} rid={request_id.get()}"
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


def setup(level="INFO", path=Path("backend/data/logs/kairos.log")):
    if getattr(log, "_kairos_ready", False):
        return
    log.setLevel(level.upper())
    log.propagate = False
    handlers = [logging.StreamHandler()]
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.handlers.RotatingFileHandler(path, maxBytes=5_000_000, backupCount=3))
    for handler in handlers:
        handler.setFormatter(_Format())
        log.addHandler(handler)
    log._kairos_ready = True


def event(name, level=logging.INFO, **fields):
    """Log a workflow event with key=value fields. Values are shortened; never pass personal text."""
    parts = [name] + [f"{k}={_short(v)}" for k, v in fields.items() if v is not None]
    log.log(level, " ".join(parts))


def _short(value):
    text = str(value).replace("\n", " ")
    return text if len(text) <= 160 else text[:157] + "..."


class Timer:
    """`with Timer() as t: ...` then `t.ms` for durations in log fields."""

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.ms = round((time.perf_counter() - self.start) * 1000)
        return False
