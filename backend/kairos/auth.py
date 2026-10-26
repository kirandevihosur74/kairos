"""Clerk session-token verification and per-user identity.

The frontend sends the Clerk session token as `Authorization: Bearer <token>` (or the same-origin
`__session` cookie). We verify it ourselves, following Clerk's manual JWT verification guide: RS256
signature against the instance's JWKS, `exp`/`nbf` with a small leeway, the issuer (the instance's
Frontend API), and `azp` against our own origins when present. The user id is the `sub` claim.

Each user's data lives in its own graph (see `user_scope`), so a verified id is the only thing that
selects whose memory a request can read or write.
"""

import base64
import contextvars
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt

from .logs import event as log_event

# The verified user for the current request. None outside a request (health checks, startup).
current_user: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_user", default=None)

LOCAL_USER = "local"


class AuthError(Exception):
    pass


def frontend_api(publishable_key):
    """Clerk publishable keys encode the instance's Frontend API host: pk_<env>_<base64("host$")>."""
    match = re.fullmatch(r"pk_(test|live)_([A-Za-z0-9+/=_-]+)", publishable_key or "")
    if not match:
        raise ValueError("KAIROS_CLERK_PUBLISHABLE_KEY is missing or not a Clerk publishable key")
    encoded = match.group(2)
    host = base64.b64decode(encoded + "=" * (-len(encoded) % 4)).decode().rstrip("$")
    if not re.fullmatch(r"[A-Za-z0-9.-]+", host):
        raise ValueError("Clerk publishable key does not decode to a host name")
    return host


class ClerkVerifier:
    def __init__(self, publishable_key, authorized_parties=(), jwks_client=None):
        self.issuer = "https://" + frontend_api(publishable_key)
        self.parties = {p.rstrip("/") for p in authorized_parties if p}
        # Keys are cached and refetched on rotation (an unknown `kid`).
        self.jwks = jwks_client or jwt.PyJWKClient(self.issuer + "/.well-known/jwks.json", cache_keys=True)

    def user_id(self, token):
        try:
            key = self.jwks.get_signing_key_from_jwt(token).key
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=self.issuer,
                leeway=5,
                options={"require": ["exp", "nbf", "iat", "iss", "sub"], "verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise AuthError(type(exc).__name__) from None
        azp = claims.get("azp")
        if azp and self.parties and azp.rstrip("/") not in self.parties:
            raise AuthError("Token issued for another site")
        if claims.get("sts") == "pending":
            raise AuthError("Session has pending tasks")
        return claims["sub"]


def bearer_token(authorization, session_cookie):
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return session_cookie or None


def user_scope(user):
    """A storage-safe suffix for a user id (Clerk ids are like user_2abcXYZ)."""
    safe = re.sub(r"[^A-Za-z0-9_]", "_", user)
    if not safe or len(safe) > 80:
        raise AuthError("Unusable user id")
    return safe


class ClerkDirectory:
    """Looks up a user's verified email addresses through Clerk's Backend API, to recognise admins.

    Only verified addresses count, so nobody becomes an admin by typing someone else's email. Results
    are cached for a while; a lookup failure means "not an admin" (limits apply), never the reverse.
    """

    API = "https://api.clerk.com/v1/users/"
    TTL = 600

    def __init__(self, secret_key):
        self.secret_key = secret_key
        self.cache = {}

    def verified_emails(self, user):
        hit = self.cache.get(user)
        if hit and time.monotonic() - hit[0] < self.TTL:
            return hit[1]
        emails = self._fetch(user)
        if emails is None:
            return set()  # lookup failed: limits apply now, and the next request retries
        self.cache[user] = (time.monotonic(), emails)
        return emails

    def _fetch(self, user):
        if not self.secret_key:
            return None
        request = urllib.request.Request(
            self.API + urllib.parse.quote(user, safe=""), headers={"Authorization": f"Bearer {self.secret_key}"}
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json.loads(response.read())
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            log_event("auth.directory_failed", 30, error=type(exc).__name__)
            return None
        return {
            address["email_address"].casefold()
            for address in data.get("email_addresses") or []
            if (address.get("verification") or {}).get("status") == "verified" and address.get("email_address")
        }
