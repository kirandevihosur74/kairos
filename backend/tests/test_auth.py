import base64
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from kairos import ingest, voice
from kairos.app import create_app
from kairos.auth import ClerkVerifier
from test_api import PROFILE
from test_ingest import luma_page

HOST = "example.clerk.accounts.dev"
PUBLISHABLE = "pk_test_" + base64.b64encode((HOST + "$").encode()).decode()
ORIGIN = "https://kairos.example"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeJWKS:
    """Stands in for Clerk's JWKS endpoint: serves the test key."""

    def get_signing_key_from_jwt(self, token):
        return type("SigningKey", (), {"key": KEY.public_key()})()


class FakeDirectory:
    def __init__(self, emails):
        self.emails = emails

    def verified_emails(self, user):
        return self.emails.get(user, set())


def token(user, key=KEY, **overrides):
    now = int(time.time())
    claims = {"sub": user, "iss": "https://" + HOST, "iat": now, "nbf": now - 5, "exp": now + 60, "azp": ORIGIN}
    claims.update(overrides)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm="RS256")


def bearer(user, **overrides):
    return {"Authorization": "Bearer " + token(user, **overrides)}


@pytest.fixture
def clerk(settings, tmp_path, monkeypatch):
    settings = settings.model_copy(
        update={
            "auth_mode": "clerk",
            "clerk_publishable_key": PUBLISHABLE,
            "frontend_origin": ORIGIN,
            "admin_emails": "admin@example.com",
            "limit_voice_notes_per_day": 2,
            "limit_event_fetches_per_day": 2,
            "limit_global_event_fetches_per_day": 3,
            "limit_requests_per_minute": 1000,
            "openai_api_key": "k",
            "brightdata_api_key": "k",
            "brightdata_zone": "z",
            "snapshot_dir": tmp_path / "snap",
        }
    )
    monkeypatch.setattr(voice, "transcribe", lambda audio, ext, s: "Met someone great.")
    monkeypatch.setattr(ingest, "fetch", lambda url, api_key, zone, timeout=60: luma_page())
    verifier = ClerkVerifier(PUBLISHABLE, [ORIGIN], jwks_client=FakeJWKS())
    directory = FakeDirectory({"user_admin": {"admin@example.com"}})
    with TestClient(create_app(settings, verifier=verifier, directory=directory)) as client:
        yield client


def test_requests_need_a_valid_clerk_session(clerk):
    assert clerk.get("/health").status_code == 200  # public
    assert clerk.get("/api/v1/profile").status_code == 401
    assert clerk.get("/api/v1/profile", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401
    assert clerk.get("/api/v1/profile", headers={"Authorization": "Bearer " + token("u1", key=OTHER_KEY)}).status_code == 401
    now = int(time.time())
    assert clerk.get("/api/v1/profile", headers=bearer("u1", exp=now - 120, iat=now - 300, nbf=now - 300)).status_code == 401
    assert clerk.get("/api/v1/profile", headers=bearer("u1", iss="https://evil.example")).status_code == 401
    assert clerk.get("/api/v1/profile", headers=bearer("u1", azp="https://evil.example")).status_code == 401
    # A valid session reaches the API (409: this new user has not onboarded yet).
    assert clerk.get("/api/v1/profile", headers=bearer("u1")).status_code == 409
    # Same-origin requests may carry the token in Clerk's __session cookie instead.
    clerk.cookies.set("__session", token("u1"))
    assert clerk.get("/api/v1/profile").status_code == 409
    clerk.cookies.clear()


def test_each_user_has_their_own_memory(clerk):
    a, b = bearer("user_a"), bearer("user_b")
    assert clerk.post("/api/v1/onboarding", json={**PROFILE, "name": "Alice"}, headers=a).status_code == 200
    created = clerk.post("/api/v1/conference", json={"url": "https://example.invalid/e"}, headers=a)
    assert created.status_code == 201, created.text
    cid = created.json()["id"]
    assert clerk.get("/api/v1/profile", headers=b).status_code == 409
    assert clerk.get("/api/v1/conferences", headers=b).json() == []
    assert clerk.get("/api/v1/people", params={"conference_id": cid}, headers=b).status_code == 404
    assert clerk.get("/api/v1/profile", headers=a).json()["name"] == "Alice"
    assert [c["conference_id"] for c in clerk.get("/api/v1/conferences", headers=a).json()] == [cid]


def audio(client, headers):
    return client.post("/api/v1/voice/transcribe", files={"file": ("n.webm", b"\x1aEaudio", "audio/webm")}, headers=headers)


def test_daily_limits_apply_to_users_but_not_admins(clerk):
    user, admin = bearer("user_c"), bearer("user_admin")
    assert [audio(clerk, user).status_code for _ in range(3)] == [200, 200, 429]
    refused = audio(clerk, user)
    assert "voice notes today" in refused.json()["detail"] and int(refused.headers["Retry-After"]) > 0
    assert [audio(clerk, admin).status_code for _ in range(4)] == [200] * 4
    me = clerk.get("/api/v1/me", headers=user).json()
    assert me["admin"] is False and me["usage"]["voice"] == {"used": 2, "limit": 2}
    assert clerk.get("/api/v1/me", headers=admin).json() == {"user_id": "user_admin", "admin": True, "usage": None}


def add(client, headers, url):
    return client.post("/api/v1/conference", json={"url": url, "data_mode": "live"}, headers=headers)


def test_only_fresh_event_fetches_count_and_the_global_ceiling_holds(clerk):
    first, second, admin = bearer("user_d"), bearer("user_e"), bearer("user_admin")
    for headers in (first, second, admin):
        clerk.post("/api/v1/onboarding", json=PROFILE, headers=headers)
    assert add(clerk, first, "https://luma.com/one").status_code == 201
    # The same page again is a cached snapshot: free, for this user and for anyone else.
    assert add(clerk, first, "https://luma.com/one").status_code == 201
    assert add(clerk, second, "https://luma.com/one").status_code == 201
    assert add(clerk, first, "https://luma.com/two").status_code == 201
    refused = add(clerk, first, "https://luma.com/three")
    assert refused.status_code == 429 and "new events today" in refused.json()["detail"]
    assert clerk.get("/api/v1/conferences", headers=first).json()[0]["url"] != "https://luma.com/three"
    # Global ceiling: 2 fresh fetches so far; the next one is the last allowed today across users.
    assert add(clerk, second, "https://luma.com/four").status_code == 201
    shared = add(clerk, second, "https://luma.com/five")
    assert shared.status_code == 429 and "today's limit for loading new events" in shared.json()["detail"]
    assert add(clerk, admin, "https://luma.com/six").status_code == 201  # admins are not limited


def test_per_minute_request_limit(clerk, monkeypatch):
    clerk.app.state.limiter.settings = clerk.app.state.limiter.settings.model_copy(
        update={"limit_requests_per_minute": 3}
    )
    user = bearer("user_f")
    assert [clerk.get("/api/v1/conferences", headers=user).status_code for _ in range(4)] == [200, 200, 200, 429]
    assert clerk.get("/api/v1/conferences", headers=bearer("user_admin")).status_code == 200
