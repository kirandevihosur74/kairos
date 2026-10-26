import io
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from kairos.app import create_app
from kairos.config import Settings
from pypdf import PdfWriter

PROFILE = {
    "name": "Kiran",
    "target_roles": ["Backend engineer"],
    "skills": ["Python"],
    "interests": ["Python", "Distributed Systems"],
    "background": "I build APIs.",
}


def seed(client):
    response = client.post("/api/v1/onboarding", json=PROFILE)
    assert response.status_code == 200, response.text
    response = client.post("/api/v1/conference", json={"url": "https://example.invalid/event"})
    assert response.status_code == 201, response.text
    cid = response.json()["conference_id"]
    response = client.get("/api/v1/people", params={"conference_id": cid})
    assert response.status_code == 200, response.text
    return cid, response.json()


def test_career_ranking_and_profile_update(client):
    cid, people = seed(client)
    assert len(people) == 5
    assert people[0]["name"] == "Alex Morgan"
    assert people[0]["score"] == 1
    assert all(p["data_mode"] == "fixture" for p in people)
    for p in people:
        nodes = {n["id"] for n in p["why"]["nodes"]}
        assert all(e["from"] in nodes and e["to"] in nodes for e in p["why"]["edges"])
    response = client.put("/api/v1/profile", json={**PROFILE, "interests": ["kubernetes"]})
    assert response.status_code == 200
    updated = client.get("/api/v1/people", params={"conference_id": cid}).json()
    assert updated[0]["name"] == "Taylor Chen"
    assert next(p for p in updated if p["name"] == "Alex Morgan")["score"] == 0


def test_triage_scope_and_reset(client):
    cid, people = seed(client)
    pid = people[0]["id"]
    data = {"person_id": pid, "conference_id": cid, "decision": "interesting"}
    assert client.post("/api/v1/triage", json=data).status_code == 200
    assert len(client.get("/api/v1/priorities", params={"conference_id": cid}).json()) == 1
    assert client.post("/api/v1/triage", json={**data, "decision": "not_interesting"}).status_code == 200
    assert len(client.get("/api/v1/people", params={"conference_id": cid}).json()) == 4
    assert client.post("/api/v1/triage", json={**data, "decision": None}).status_code == 200
    assert len(client.get("/api/v1/people", params={"conference_id": cid}).json()) == 5
    other = client.post("/api/v1/conference", json={"url": "https://example.invalid/other"}).json()["id"]
    assert client.post("/api/v1/triage", json={**data, "conference_id": other}).status_code == 404
    assert client.get(f"/api/v1/people/{pid}", params={"conference_id": other}).status_code == 404
    assert client.get("/api/v1/people", params={"conference_id": "absent"}).status_code == 404


def test_notes_and_drafts_persist(settings):
    with TestClient(create_app(settings)) as c:
        cid, people = seed(c)
        pid = people[0]["id"]
        assert c.post(f"/api/v1/followups/{pid}/draft", json={"conference_id": cid}).status_code == 409
        for note in ["Talked about API performance", "They suggested learning Postgres"]:
            assert (
                c.post("/api/v1/met", json={"conference_id": cid, "person_id": pid, "note": note}).status_code
                == 201
            )
        draft = c.post(f"/api/v1/followups/{pid}/draft", json={"conference_id": cid}).json()
        assert draft["generation_mode"] == "template"
        assert "They suggested learning Postgres" in draft["body"]
        did = draft["id"]
        edit = {"subject": "Thanks!", "body": "My edited email", "linkedin_message": "My edited message"}
        approved = c.post(f"/api/v1/followups/{did}/approve", json=edit).json()
        assert approved["status"] == "approved"
        assert approved["body"] == edit["body"]
    with TestClient(create_app(settings)) as c:
        p = c.get(f"/api/v1/people/{pid}", params={"conference_id": cid}).json()
        assert [n["text"] for n in p["notes"]] == [
            "Talked about API performance",
            "They suggested learning Postgres",
        ]
        assert c.get(f"/api/v1/drafts/{did}").json()["status"] == "approved"
        edited = c.patch(f"/api/v1/drafts/{did}", json=edit).json()
        assert edited["status"] == "draft" and edited["approved_at"] is None


def test_parallel_notes_are_not_lost(client):
    cid, people = seed(client)

    def add(i):
        return client.post(
            "/api/v1/met", json={"conference_id": cid, "person_id": people[0]["id"], "note": f"Note {i}"}
        ).status_code

    with ThreadPoolExecutor(max_workers=4) as pool:
        assert list(pool.map(add, range(8))) == [201] * 8
    p = client.get(f"/api/v1/people/{people[0]['id']}", params={"conference_id": cid}).json()
    assert len(p["notes"]) == 8


def test_import_requires_confirmation(client):
    preview = client.post(
        "/api/v1/onboarding/import-text",
        json={"source": "assistant_summary", "text": "I use Python and PostgreSQL."},
    ).json()
    assert preview["requires_review"]
    assert preview["suggested_profile"]["skills"] == ["python", "postgresql"]
    assert client.get("/api/v1/profile").status_code == 409
    assert client.post("/api/v1/onboarding", json={**PROFILE, "import_id": preview["id"]}).status_code == 200
    # A stale import (e.g. from before a data reset) never blocks saving the reviewed profile.
    stale = client.post("/api/v1/onboarding", json={**PROFILE, "import_id": "missing"})
    assert stale.status_code == 200 and stale.json()["import_id"] is None


def test_resume_validation(client):
    assert (
        client.post("/api/v1/onboarding/resume", files={"file": ("resume.pdf", b"not a PDF")}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/onboarding/resume", files={"file": ("big.pdf", b"%PDF-" + b"x" * 2097152)}
        ).status_code
        == 413
    )
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    stream = io.BytesIO()
    writer.write(stream)
    assert (
        client.post("/api/v1/onboarding/resume", files={"file": ("blank.pdf", stream.getvalue())}).status_code
        == 422
    )


def test_invalid_input_and_no_unimplemented_live_claim(client):
    assert client.post("/api/v1/onboarding", json={**PROFILE, "interests": []}).status_code == 422
    assert client.post("/api/v1/onboarding", json={**PROFILE, "name": "   "}).status_code == 422
    seed(client)
    # Without extraction configured, a non-Luma live page is refused, never simulated.
    assert (
        client.post(
            "/api/v1/conference", json={"url": "https://example.com", "data_mode": "live"}
        ).status_code
        == 503
    )
    assert (
        client.post(
            "/api/v1/conference", json={"url": "http://127.0.0.1:8000/admin", "data_mode": "live"}
        ).status_code
        == 422
    )
    assert client.get("/health").json()["ingestion"] == "fixture_only"


def test_referral_is_grounded_and_intro_does_not_invent_meeting(client):
    cid, people = seed(client)
    pid = people[0]["id"]
    payload = {"conference_id": cid, "kind": "introduction"}
    intro = client.post(f"/api/v1/followups/{pid}/draft", json=payload).json()
    assert "Thanks for speaking" not in intro["body"]
    payload["kind"] = "referral"
    assert client.post(f"/api/v1/followups/{pid}/draft", json=payload).status_code == 422
    payload.update(job_url="https://example.invalid/jobs/1", job_description="Backend role building APIs")
    assert client.post(f"/api/v1/followups/{pid}/draft", json=payload).status_code == 409
    client.post(
        "/api/v1/met", json={"conference_id": cid, "person_id": pid, "note": "Discussed backend roles"}
    )
    draft = client.post(f"/api/v1/followups/{pid}/draft", json=payload).json()
    assert any(g["type"] == "user_supplied_job" for g in draft["grounded_on"])


def test_api_key(tmp_path):
    with TestClient(
        create_app(Settings(sqlite_path=tmp_path / "auth.db", api_key="demo-secret", auth_mode="none", log_file=None, _env_file=None))
    ) as c:
        assert c.get("/api/v1/profile").status_code == 401
        assert (
            c.post("/api/v1/onboarding", json=PROFILE, headers={"X-API-Key": "demo-secret"}).status_code
            == 200
        )
        assert c.get("/api/v1/profile", headers={"X-API-Key": "wrong"}).status_code == 401


def test_large_profile_still_produces_editable_draft(client):
    cid, people = seed(client)
    client.put(
        "/api/v1/profile", json={**PROFILE, "background": "x" * 5000, "target_roles": ["r" * 200] * 10}
    )
    pid = people[0]["id"]
    client.post("/api/v1/met", json={"conference_id": cid, "person_id": pid, "note": "n" * 4000})
    response = client.post(f"/api/v1/followups/{pid}/draft", json={"conference_id": cid})
    draft = response.json()
    edit = {key: draft[key] for key in ("subject", "body", "linkedin_message")}
    assert client.post(f"/api/v1/followups/{draft['id']}/approve", json=edit).status_code == 200


def test_text_pdf_import(client):
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
    )
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 50 700 Td (Python backend engineer) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    pdf = io.BytesIO()
    writer.write(pdf)
    response = client.post("/api/v1/onboarding/resume", files={"file": ("resume.pdf", pdf.getvalue())})
    assert response.status_code == 200, response.text
    assert "python" in response.json()["suggested_profile"]["skills"]
    assert client.get("/api/v1/profile").status_code == 409


def test_conferences_list_with_counts(client):
    assert client.get("/api/v1/conferences").json() == []
    cid, people = seed(client)
    other = client.post("/api/v1/conference", json={"url": "https://example.invalid/other"}).json()["conference_id"]
    first, second = people[0]["id"], people[1]["id"]
    for pid in (first, second):
        triage = {"conference_id": cid, "person_id": pid, "decision": "interesting"}
        assert client.post("/api/v1/triage", json=triage).status_code == 200
    for _ in range(2):  # two notes about one person count as one person met
        client.post("/api/v1/met", json={"conference_id": cid, "person_id": first, "note": "Talked about queues."})
    pending = client.post(f"/api/v1/followups/{first}/draft", json={"conference_id": cid, "kind": "follow_up"})
    approved = client.post(f"/api/v1/followups/{first}/draft", json={"conference_id": cid, "kind": "follow_up"}).json()
    assert pending.status_code == 201
    edit = {key: approved[key] for key in ("subject", "body", "linkedin_message")}
    assert client.post(f"/api/v1/followups/{approved['id']}/approve", json=edit).status_code == 200

    items = {c["conference_id"]: c for c in client.get("/api/v1/conferences").json()}
    assert set(items) == {cid, other}
    assert items[cid]["counts"] == {"interesting": 2, "met": 1, "drafts_pending": 1}
    assert items[other]["counts"] == {"interesting": 0, "met": 0, "drafts_pending": 0}
    assert items[cid]["people_found"] == len(people)
    assert {"name", "url", "stage", "created_at", "start_at", "end_at", "data_mode"} <= set(items[cid])


def test_drafts_list_joins_person_and_filters(client):
    cid, people = seed(client)
    first, second = people[0], people[1]
    client.post("/api/v1/met", json={"conference_id": cid, "person_id": first["id"], "note": "Talked about queues."})
    follow = client.post(f"/api/v1/followups/{first['id']}/draft", json={"conference_id": cid}).json()
    intro = client.post(
        f"/api/v1/followups/{second['id']}/draft", json={"conference_id": cid, "kind": "introduction"}
    ).json()
    edit = {key: follow[key] for key in ("subject", "body", "linkedin_message")}
    client.post(f"/api/v1/followups/{follow['id']}/approve", json=edit)

    rows = client.get("/api/v1/drafts", params={"conference_id": cid}).json()
    assert {r["id"] for r in rows} == {follow["id"], intro["id"]}
    by_id = {r["id"]: r for r in rows}
    assert by_id[follow["id"]]["status"] == "approved"
    assert by_id[intro["id"]]["person"] == {
        "id": second["id"],
        "name": second["name"],
        "title": second["title"],
        "company": second["company"],
        "photo_url": second["photo_url"],
    }
    pending = client.get("/api/v1/drafts", params={"conference_id": cid, "status": "draft"}).json()
    assert [r["id"] for r in pending] == [intro["id"]]
    assert client.get("/api/v1/drafts", params={"conference_id": "absent"}).status_code == 404
    assert len(client.get("/api/v1/drafts").json()) == 2  # every event when no conference is given


def test_event_url_without_scheme_is_accepted(client):
    seed(client)
    response = client.post("/api/v1/conference", json={"url": "example.invalid/event"})
    assert response.status_code == 201, response.text
    assert response.json()["url"] == "https://example.invalid/event"


def test_adding_the_same_event_again_reopens_it(client):
    cid, people = seed(client)
    client.post("/api/v1/triage", json={"conference_id": cid, "person_id": people[0]["id"], "decision": "interesting"})
    again = client.post("/api/v1/conference", json={"url": "https://www.example.invalid/event/"})
    assert again.status_code == 201
    assert again.json()["conference_id"] == cid  # same page: same event, shortlist kept
    assert [c["conference_id"] for c in client.get("/api/v1/conferences").json()] == [cid]
    other = client.post("/api/v1/conference", json={"url": "https://example.invalid/other"}).json()
    assert other["conference_id"] != cid
