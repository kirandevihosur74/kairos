import json
import os

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from kairos import ingest
from kairos.app import create_app
from test_api import PROFILE

COLLECTED = "2026-10-24T00:00:00+00:00"


def paragraph(text):
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]}


def luma_page(visibility="public"):
    """Synthetic Luma page with fictional people, shaped like the real __NEXT_DATA__ payload."""
    data = {
        "event": {
            "name": "Example AI Makeathon",
            "visibility": visibility,
            "start_at": "2026-11-07T17:30:00.000Z",
            "end_at": "2026-11-10T07:45:00.000Z",
            "geo_address_info": {"city_state": "San Francisco, CA"},
        },
        "calendar": {"name": "Example Studio"},
        "hosts": [
            {"name": "Riley Host", "linkedin_handle": "/in/riley-example", "bio_short": "", "avatar_url": None},
            {"name": "Example Studio", "linkedin_handle": None, "bio_short": ""},
        ],
        "featured_guests": [{"name": "Private Guest", "linkedin_handle": "/in/private"}],
        "description_mirror": {
            "type": "doc",
            "content": [
                paragraph("Build with AI."),
                paragraph("Meet the Judges"),
                paragraph("Avery Example — Applied AI Engineer @ Example Labs; ex-Startup Co"),
                paragraph("Casey Example — UX Designer @ Example Retail"),
                paragraph("Drew Example — Principal Product Manager, AI @ Example Cars"),
                paragraph("More judges will be announced soon."),
                paragraph("Prizes — swag @ the venue"),
            ],
        },
    }
    payload = json.dumps({"props": {"pageProps": {"initialData": {"kind": "event", "data": data}}}})
    return f'<html><script id="__NEXT_DATA__" type="application/json">{payload}</script></html>'


def test_parse_luma_keeps_judges_and_hosts_only():
    event = ingest.parse_luma(luma_page(), "https://luma.com/example", COLLECTED)
    people = {p["name"]: p for p in event["people"]}
    assert set(people) == {"Avery Example", "Casey Example", "Drew Example", "Riley Host"}
    avery = people["Avery Example"]
    assert (avery["title"], avery["company"], avery["event_role"]) == (
        "Applied AI Engineer",
        "Example Labs",
        "judge",
    )
    assert avery["topics"] == ["ai", "software engineering", "startups"]
    assert people["Casey Example"]["topics"] == ["ux"]
    assert people["Drew Example"]["topics"] == ["ai", "product management"]
    assert people["Riley Host"]["linkedin_url"] == "https://www.linkedin.com/in/riley-example"
    assert all(p["data_mode"] == "live" and p["sources"][0]["collected_at"] == COLLECTED for p in people.values())
    with pytest.raises(ingest.FetchError):
        ingest.parse_luma(luma_page("private"), "https://luma.com/example", COLLECTED)


def test_canonical_url_strips_invite_token_and_rejects_other_sites():
    assert ingest.canonical_url("https://luma.com/fig-knsb?tk=secret") == "https://luma.com/fig-knsb"
    assert ingest.canonical_url("https://lu.ma/fig-knsb#x") == "https://luma.com/fig-knsb"
    for bad in ["https://example.com/event", "http://luma.com/x", "https://luma.com/a/b"]:
        with pytest.raises(HTTPException) as caught:
            ingest.canonical_url(bad)
        assert caught.value.status_code == 422


@pytest.fixture
def live(settings, tmp_path, monkeypatch):
    calls = []

    def fake_fetch(url, api_key, zone, timeout=60):
        calls.append(url)
        if fake_fetch.fail:
            raise ingest.FetchError("HTTPError")
        return luma_page()

    fake_fetch.fail = False
    monkeypatch.setattr(ingest, "fetch", fake_fetch)
    settings = settings.model_copy(
        update={"brightdata_api_key": "k", "brightdata_zone": "z", "snapshot_dir": tmp_path / "snap"}
    )
    with TestClient(create_app(settings)) as client:
        assert client.post("/api/v1/onboarding", json={**PROFILE, "interests": ["AI", "UX"]}).status_code == 200
        yield client, fake_fetch, calls, settings


def add_event(client):
    return client.post(
        "/api/v1/conference", json={"url": "https://luma.com/example?tk=secret", "data_mode": "live"}
    )


def test_live_conference_ranks_judges_and_reuses_cache(live):
    client, fetcher, calls, settings = live
    response = add_event(client)
    assert response.status_code == 201, response.text
    conference = response.json()
    assert conference["url"] == "https://luma.com/example"
    assert (conference["name"], conference["people_found"], conference["stale"]) == (
        "Example AI Makeathon",
        4,
        False,
    )
    people = client.get("/api/v1/people", params={"conference_id": conference["id"]}).json()
    # Avery (ai) and Casey (ux) tie at 0.5; ties sort by stable person ID, so compare as a set.
    assert {p["name"] for p in people[:2]} == {"Avery Example", "Casey Example"}
    why = {p["name"]: p["why"]["sentence"] for p in people}
    assert why["Avery Example"] == "Shared career interests: ai"
    assert why["Casey Example"] == "Shared career interests: ux"
    assert client.get("/health").json()["ingestion"] == "fixture_and_luma"
    # Event data is the same for every user: a second add within the freshness window does not refetch.
    assert add_event(client).status_code == 201
    assert calls == ["https://luma.com/example"]


def test_failed_fetch_falls_back_to_stale_snapshot(live):
    client, fetcher, calls, settings = live
    assert add_event(client).status_code == 201
    path = ingest.snapshot_path(settings.snapshot_dir, "https://luma.com/example")
    os.utime(path, (0, 0))  # expire the cache
    fetcher.fail = True
    conference = add_event(client).json()
    assert conference["stale"] is True
    people = client.get("/api/v1/people", params={"conference_id": conference["id"]}).json()
    assert all(p["stale"] for p in people)
    path.unlink()
    response = add_event(client)
    assert response.status_code == 502
    assert "no snapshot" in response.json()["detail"]


def test_judges_separated_by_blank_paragraphs_are_all_kept():
    # Real Luma pages put an empty paragraph between judges; the list must not end at the first blank line.
    description = {
        "type": "doc",
        "content": [
            paragraph("Meet the Judges"),
            paragraph("Avery Example — Product Lead @ Example Labs, building agents; ex-Startup Co"),
            {"type": "paragraph", "content": []},
            paragraph("Casey Example — UX Designer @ Example Retail"),
            {"type": "paragraph", "content": []},
            paragraph("Drew Example — Software Engineer @ Example AI"),
            {"type": "paragraph", "content": []},
            paragraph("More judges will be announced soon."),
        ],
    }
    judges = ingest._judges(description)
    assert [j["name"] for j in judges] == ["Avery Example", "Casey Example", "Drew Example"]
    assert (judges[0]["title"], judges[0]["company"]) == ("Product Lead", "Example Labs")
    assert "building agents" in judges[0]["bio"]
