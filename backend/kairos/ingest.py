"""Live event ingestion: one supported source (public Luma event pages) via Bright Data Web Unlocker.

Only people the page presents in a professional event role are kept: listed judges and hosts.
Guest lists are never ingested. Each fetch is snapshotted; a failed fetch falls back to the last
snapshot, labeled stale.
"""

import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import HTTPException

BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/request"
LUMA_HOSTS = {"luma.com", "www.luma.com", "lu.ma"}

# Canonical topic -> phrases matched (whole words, case-insensitive) in a person's role text.
TOPICS = {
    "ai": ("ai", "artificial intelligence", "gemini", "openai"),
    "machine learning": ("machine learning", "ml"),
    "agents": ("agent", "agents"),
    "product design": ("product design", "product designer"),
    "ux": ("ux", "user experience"),
    "product management": ("product manager", "product management", "product lead"),
    "software engineering": ("software engineer", "engineer", "engineering"),
    "design engineering": ("design engineering", "design engineer"),
    "creative technology": ("creative technologist", "creative technology"),
    "strategy": ("strategy", "business growth"),
    "education": ("university", "educator", "academy"),
    "startups": ("startup", "startups", "co-founder", "founder"),
    "knowledge systems": ("knowledge systems",),
    # Backend-career topics, so the "I'm looking for backend roles" persona can match real people.
    "backend": ("backend", "back-end", "back end", "api", "apis"),
    "infrastructure": ("infrastructure", "infra", "devops", "sre", "site reliability", "cloud", "platform engineering"),
    "distributed systems": ("distributed systems", "distributed system", "scalability", "scalable systems"),
    "data engineering": ("data engineering", "data engineer", "data platform", "database", "databases"),
}


class FetchError(Exception):
    pass


def canonical_url(url):
    """Drop query and fragment: Luma `tk` parameters are personal invite tokens."""
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.hostname not in LUMA_HOSTS:
        raise HTTPException(422, "Live ingestion supports public https://luma.com event pages only")
    slug = parts.path.strip("/")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", slug):
        raise HTTPException(422, "Use a Luma event URL such as https://luma.com/<event>")
    return f"https://luma.com/{slug}"


def topics_for(text):
    lowered = text.lower()
    return sorted(
        topic
        for topic, phrases in TOPICS.items()
        if any(re.search(r"(?<!\w)" + re.escape(p) + r"(?!\w)", lowered) for p in phrases)
    )


def fetch(url, api_key, zone, timeout=60):
    body = json.dumps({"zone": zone, "url": url, "format": "raw"}).encode()
    request = urllib.request.Request(
        BRIGHTDATA_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise FetchError(type(exc).__name__) from None


def _text(node):
    if node.get("type") == "text":
        return node.get("text", "")
    if node.get("type") == "hard_break":
        return "\n"
    inner = "".join(_text(child) for child in node.get("content", []))
    return inner + ("\n" if node.get("type") in {"paragraph", "heading", "list_item"} else "")


def _judges(description):
    lines = [line.strip() for line in _text(description).splitlines()]
    try:
        start = next(i for i, line in enumerate(lines) if re.fullmatch(r"(meet the )?judges", line.lower()))
    except StopIteration:
        return []
    judges = []
    for line in lines[start + 1 :]:
        if not line:
            continue  # pages separate judges with empty paragraphs
        match = re.fullmatch(r"(.{1,80}?)\s+[—–-]\s+(.+)", line)
        if not match:
            if judges:
                break  # first non-matching line after the list ends it
            continue
        name, role = match.groups()
        current = role.split(";")[0].strip()
        title, _, company = current.partition(" @ ")
        # "Product Lead @ Microsoft, building agents" -> company "Microsoft"; the full text stays in bio.
        company = company.split(",")[0]
        judges.append({"name": name.strip(), "title": title.strip(), "company": company.strip(), "bio": role})
    return judges


def parse_luma(html, url, collected_at):
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise FetchError("No event data on page")
    try:
        data = json.loads(match.group(1))["props"]["pageProps"]["initialData"]["data"]
        event = data["event"]
    except (ValueError, KeyError, TypeError):
        raise FetchError("Unrecognized event page") from None
    if event.get("visibility") != "public":
        raise FetchError("Event is not public")
    organizer = (data.get("calendar") or {}).get("name") or ""
    source = [{"url": url, "collected_at": collected_at}]
    people = []
    for judge in _judges(data.get("description_mirror") or {}):
        people.append(
            {
                **judge,
                "event_role": "judge",
                "linkedin_url": None,
                "photo_url": None,
                "topics": topics_for(judge["bio"]),
            }
        )
    for host in data.get("hosts") or []:
        if host.get("name") == organizer:
            continue  # the organizing account, not a person
        handle = host.get("linkedin_handle") or ""
        people.append(
            {
                "name": host["name"],
                "title": "Event host",
                "company": organizer,
                "bio": host.get("bio_short") or "",
                "event_role": "host",
                "linkedin_url": f"https://www.linkedin.com/{handle.strip('/')}"
                if handle.startswith("/in/")
                else None,
                "photo_url": host.get("avatar_url"),
                "topics": topics_for(host.get("bio_short") or ""),
            }
        )
    for p in people:
        p.update(
            id="luma_" + hashlib.sha256((p["event_role"] + p["name"]).encode()).hexdigest()[:12],
            source="luma",
            data_mode="live",
            # Named on the event page only; identity is not cross-checked against other sources.
            match_confidence="low",
            stale=False,
            sources=source,
        )
    return {
        "name": event.get("name") or "Luma event",
        "start_at": event.get("start_at"),
        "end_at": event.get("end_at"),
        "city": (event.get("geo_address_info") or {}).get("city_state"),
        "url": url,
        "collected_at": collected_at,
        "people": people,
    }


def snapshot_path(directory: Path, url):
    return directory / ("luma_" + url.rsplit("/", 1)[-1] + ".json")


def load_event(url, settings, collected_at):
    """Event people are the same for every user, so one fetch per event is cached and reused.

    Returns (event, stale). A fresh snapshot skips the fetch; a failed fetch falls back to any snapshot.
    """
    path = snapshot_path(settings.snapshot_dir, url)
    if path.exists() and time.time() - path.stat().st_mtime < settings.snapshot_max_age_hours * 3600:
        return json.loads(path.read_text()), False
    try:
        if not settings.brightdata_api_key or not settings.brightdata_zone:
            raise FetchError("Bright Data is not configured")
        event = parse_luma(fetch(url, settings.brightdata_api_key, settings.brightdata_zone), url, collected_at)
    except FetchError as exc:
        if not path.exists():
            raise HTTPException(502, f"Could not load event ({exc}) and no snapshot exists") from None
        event = json.loads(path.read_text())
        for p in event["people"]:
            p["stale"] = True
        return event, True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(event, indent=1))
    return event, False
