import json

import pytest
from fastapi.testclient import TestClient
from kairos import drafting, ingest
from kairos.app import create_app
from test_api import seed


def reply(content, finish_reason="stop", refusal=None):
    message = {"content": json.dumps(content) if isinstance(content, dict) else content, "refusal": refusal}
    return {"choices": [{"message": message, "finish_reason": finish_reason}]}


GOOD = {
    "subject": "Great talking about queues",
    "body": "Hi Alex,\n\nThanks for the chat about Kafka.\n\nKiran",
    "linkedin_message": "Hi Alex, thanks for the chat about Kafka. Can we stay in touch?",
    "grounded_on": ["profile:demo_user", "made-up-id"],
}


@pytest.fixture
def ai(settings, monkeypatch):
    calls = []

    def fake_complete(payload, api_key, timeout):
        calls.append(payload)
        if fake_complete.error:
            raise drafting.DraftingError(fake_complete.error)
        return fake_complete.response

    fake_complete.error = None
    fake_complete.response = reply(GOOD)
    monkeypatch.setattr(drafting, "complete", fake_complete)
    settings = settings.model_copy(update={"openai_api_key": "k", "openai_model": "test-model"})
    with TestClient(create_app(settings)) as client:
        cid, people = seed(client)
        yield client, cid, people, fake_complete, calls


def note(client, cid, pid, text):
    response = client.post("/api/v1/met", json={"conference_id": cid, "person_id": pid, "note": text})
    assert response.status_code == 201, response.text
    return response.json()["note_id"]


def draft(client, cid, pid, **body):
    return client.post(f"/api/v1/followups/{pid}/draft", json={"conference_id": cid, **body})


def sent_context(calls):
    messages = calls[-1]["messages"]
    assert messages[0]["role"] == "system" and messages[1]["role"] == "user"
    return json.loads(messages[1]["content"])


def test_ai_follow_up_is_grounded_scoped_and_labeled(ai):
    client, cid, people, _, calls = ai
    target, other = people[0]["id"], people[1]["id"]
    first = note(client, cid, target, "Talked about Kafka consumer lag.")
    second = note(client, cid, target, "They suggested I read their team's blog.")
    note(client, cid, other, "Unrelated conversation.")
    response = draft(client, cid, target, kind="follow_up")
    assert response.status_code == 201, response.text
    value = response.json()
    assert (value["generation_mode"], value["model"], value["generation_note"]) == ("ai", "test-model", None)
    assert value["subject"] == GOOD["subject"]
    assert value["cited"] == ["profile:demo_user"]  # unknown ids the model invents are dropped
    assert {g["id"] for g in value["grounded_on"]} == {"profile:demo_user", target, first, second}
    context = sent_context(calls)
    assert [n["text"] for n in context["notes"]] == [
        "Talked about Kafka consumer lag.",
        "They suggested I read their team's blog.",
    ]
    assert context["person"]["id"] == target and context["job"] is None
    assert calls[-1]["response_format"]["json_schema"]["strict"] is True
    assert calls[-1]["model"] == "test-model"
    # Edit and approval behave exactly as for template drafts.
    edited = {"subject": "S", "body": "B", "linkedin_message": "L"}
    did = value["draft_id"]
    assert client.post(f"/api/v1/followups/{did}/approve", json=edited).json()["status"] == "approved"
    assert client.patch(f"/api/v1/drafts/{did}", json=edited).json()["status"] == "draft"


def test_introduction_never_sends_notes(ai):
    client, cid, people, _, calls = ai
    pid = people[0]["id"]
    note(client, cid, pid, "Private recollection.")
    assert draft(client, cid, pid, kind="introduction").status_code == 201
    context = sent_context(calls)
    assert context["notes"] == [] and context["kind"] == "introduction"
    assert "Private recollection." not in calls[-1]["messages"][1]["content"]


def test_referral_sends_user_supplied_job(ai):
    client, cid, people, _, calls = ai
    pid = people[0]["id"]
    note(client, cid, pid, "They mentioned their platform team.")
    response = draft(
        client, cid, pid, kind="referral", job_url="https://jobs.example.invalid/1", job_description="Backend role"
    )
    assert response.status_code == 201, response.text
    assert sent_context(calls)["job"] == {
        "id": "job",
        "url": "https://jobs.example.invalid/1",
        "description": "Backend role",
    }
    assert "job" in {g["id"] for g in response.json()["grounded_on"]}


@pytest.mark.parametrize(
    "failure",
    [
        {"error": "OpenAI HTTP 429"},
        {"response": reply("not json")},
        {"response": reply(GOOD, finish_reason="length")},
        {"response": reply(None, refusal="no")},
        {"response": reply({**GOOD, "body": ""})},
    ],
)
def test_auto_falls_back_to_labeled_template(ai, failure):
    client, cid, people, fake, _ = ai
    fake.error, fake.response = failure.get("error"), failure.get("response", fake.response)
    response = draft(client, cid, people[0]["id"], kind="introduction")
    assert response.status_code == 201, response.text
    value = response.json()
    assert value["generation_mode"] == "template" and value["model"] is None
    assert value["generation_note"].startswith("AI drafting unavailable")


def test_explicit_ai_fails_loudly_and_template_skips_the_model(ai):
    client, cid, people, fake, calls = ai
    pid = people[0]["id"]
    fake.error = "TimeoutError"
    response = draft(client, cid, pid, kind="introduction", generation="ai")
    assert response.status_code == 502 and "TimeoutError" in response.json()["detail"]
    before = len(calls)
    value = draft(client, cid, pid, kind="introduction", generation="template").json()
    assert value["generation_mode"] == "template" and value["generation_note"] is None
    assert len(calls) == before


def test_ai_output_is_clipped_to_editable_limits(ai):
    client, cid, people, fake, _ = ai
    fake.response = reply({**GOOD, "subject": "x" * 500, "linkedin_message": "y" * 5000})
    value = draft(client, cid, people[0]["id"], kind="introduction").json()
    assert len(value["subject"]) == 200 and len(value["linkedin_message"]) == 3000
    assert client.post(
        f"/api/v1/followups/{value['draft_id']}/approve",
        json={k: value[k] for k in ("subject", "body", "linkedin_message")},
    ).status_code == 200


def test_without_key_drafts_are_template_and_ai_is_refused(client):
    cid, people = seed(client)
    pid = people[0]["id"]
    assert client.get("/health").json()["draft_generation"] == "template"
    assert draft(client, cid, pid, kind="introduction").json()["generation_mode"] == "template"
    response = draft(client, cid, pid, kind="introduction", generation="ai")
    assert response.status_code == 503


def test_health_reports_openai_when_configured(ai):
    client = ai[0]
    assert client.get("/health").json()["draft_generation"] == "openai"


def test_backend_topics_match_role_text():
    assert ingest.topics_for("Staff Backend Engineer @ Example; scaling distributed systems on cloud infra") == [
        "backend",
        "distributed systems",
        "infrastructure",
        "software engineering",
    ]
