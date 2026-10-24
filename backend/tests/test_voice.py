import io
import json

import pytest
from fastapi.testclient import TestClient
from kairos import voice
from kairos.app import create_app
from test_api import seed

AUDIO = b"\x1aE\xdf\xa3fake-webm-audio"


@pytest.fixture
def vclient(settings, monkeypatch):
    sent = []

    def fake_transcribe(audio, ext, s):
        sent.append((audio, ext))
        return fake_transcribe.text

    fake_transcribe.text = ""
    monkeypatch.setattr(voice, "transcribe", fake_transcribe)
    with TestClient(create_app(settings.model_copy(update={"openai_api_key": "k"}))) as client:
        yield client, fake_transcribe, sent


def upload(client, data=AUDIO, name="note.webm", ctype="audio/webm", **form):
    return client.post("/api/v1/voice/transcribe", files={"file": (name, data, ctype)}, data=form)


def test_voice_note_transcribes_and_suggests_mentioned_people_without_saving(vclient):
    client, fake, sent = vclient
    cid, people = seed(client)
    target = people[0]
    fake.text = f"Just met {target['name']}. We talked about queue backpressure; follow up Tuesday."
    response = upload(client, conference_id=cid)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["text"] == fake.text and body["saved"] is False
    assert [c["id"] for c in body["person_candidates"]] == [target["id"]]
    assert sent == [(AUDIO, "webm")]
    # Transcribing never creates a meeting note.
    assert client.get(f"/api/v1/people/{target['id']}", params={"conference_id": cid}).json()["notes"] == []


def test_voice_note_for_known_person_and_ios_m4a(vclient):
    client, fake, sent = vclient
    cid, people = seed(client)
    fake.text = "Great chat about Postgres."
    body = upload(client, name="blob", ctype="audio/x-m4a", conference_id=cid, person_id=people[0]["id"]).json()
    assert (body["person_id"], body["person_candidates"]) == (people[0]["id"], [])
    assert sent[-1][1] == "m4a"
    other = client.post("/api/v1/conference", json={"url": "https://example.invalid/other"}).json()["id"]
    assert upload(client, conference_id=other, person_id=people[0]["id"]).status_code == 404


def test_voice_note_rejections(vclient, settings):
    client, fake, _ = vclient
    assert upload(client, name="note.txt", ctype="text/plain").status_code == 422
    assert upload(client, data=b"").status_code == 422
    assert upload(client, data=b"0" * (voice.MAX_AUDIO + 1)).status_code == 413
    fake.text = ""
    assert "No speech" in upload(client).json()["detail"]
    with TestClient(create_app(settings)) as plain:
        assert upload(plain).status_code == 503


def test_mentioned_needs_full_name_or_unique_first_name():
    people = [
        {"id": "1", "name": "Xinyu Qu"},
        {"id": "2", "name": "Alex Morgan"},
        {"id": "3", "name": "Alex Chen"},
        {"id": "4", "name": "Al Li"},
    ]
    found = voice.mentioned("Talked to Xinyu, then alex chen. Alex again. Al was there.", people)
    assert [p["id"] for p in found] == ["1", "3"]  # "Alex" alone is ambiguous; "Al" is too short


def test_transcribe_sends_multipart_to_openai(monkeypatch, settings):
    captured = {}

    class Response(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    def fake_urlopen(request, timeout):
        captured.update(url=request.full_url, body=request.data, headers=dict(request.header_items()))
        return Response(json.dumps({"text": " hello ", "languages": [{"code": "en"}]}).encode())

    monkeypatch.setattr(voice.urllib.request, "urlopen", fake_urlopen)
    settings = settings.model_copy(update={"openai_api_key": "k"})
    assert voice.transcribe(AUDIO, "webm", settings) == "hello"
    assert captured["url"] == voice.TRANSCRIBE_ENDPOINT
    assert b'name="model"\r\n\r\ngpt-transcribe' in captured["body"]
    assert b'filename="note.webm"' in captured["body"] and AUDIO in captured["body"]
    assert captured["headers"]["Content-type"].startswith("multipart/form-data; boundary=")
