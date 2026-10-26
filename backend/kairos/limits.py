"""Usage limits that protect paid APIs (Bright Data, OpenAI) and the server from spam.

Regular users get a daily allowance per costly action and a per-minute request limit; a global daily
ceiling caps fresh Bright Data fetches across all of them. Admins are exempt (checked by the caller).
Counters are Redis keys in FalkorDB that expire on their own, so limits survive restarts and redeploys.
Without Redis (SQLite development mode) they are kept in memory.
"""

import threading
import time

from fastapi import HTTPException

from .logs import event as log_event

ACTIONS = {
    # action: (settings attribute with the daily limit, what the user is told)
    "event_fetch": ("limit_event_fetches_per_day", "You've added {limit} new events today"),
    "draft": ("limit_drafts_per_day", "You've written {limit} AI drafts today"),
    "voice": ("limit_voice_notes_per_day", "You've transcribed {limit} voice notes today"),
}


def seconds_until_tomorrow():
    now = time.gmtime()
    return 86400 - (now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec)


class Limiter:
    def __init__(self, redis, settings):
        self.redis = redis
        self.settings = settings
        self.memory = {}
        self.lock = threading.Lock()

    def _incr(self, key, ttl):
        if self.redis is not None:
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, ttl, nx=True)
            return pipe.execute()[0]
        with self.lock:
            count, expires = self.memory.get(key, (0, 0))
            if expires <= time.time():
                count, expires = 0, time.time() + ttl
            self.memory[key] = (count + 1, expires)
            return count + 1

    def _get(self, key):
        if self.redis is not None:
            return int(self.redis.get(key) or 0)
        count, expires = self.memory.get(key, (0, 0))
        return count if expires > time.time() else 0

    def _decr(self, key):
        if self.redis is not None:
            self.redis.decr(key)
        else:
            with self.lock:
                count, expires = self.memory.get(key, (0, 0))
                self.memory[key] = (max(count - 1, 0), expires)

    def hit_request(self, user):
        minute = int(time.time() // 60)
        if self._incr(f"kairos:rl:req:{user}:{minute}", 120) > self.settings.limit_requests_per_minute:
            log_event("limit.hit", 30, kind="requests", user=user)
            raise HTTPException(
                429, "You're going a bit fast. Wait a minute and try again.", headers={"Retry-After": "60"}
            )

    def spend(self, user, action):
        """Count one costly action; past the user's daily limit (or the global Bright Data ceiling), 429."""
        attribute, message = ACTIONS[action]
        limit = getattr(self.settings, attribute)
        day = time.strftime("%Y%m%d", time.gmtime())
        ttl = seconds_until_tomorrow() + 60
        retry = {"Retry-After": str(seconds_until_tomorrow())}
        key = f"kairos:rl:{action}:{user}:{day}"
        if self._incr(key, ttl) > limit:
            self._decr(key)  # a refused attempt is not usage
            log_event("limit.hit", 30, kind=action, user=user, limit=limit)
            raise HTTPException(429, message.format(limit=limit) + ". Try again tomorrow.", headers=retry)
        if action == "event_fetch":
            shared = f"kairos:rl:event_fetch:all:{day}"
            if self._incr(shared, ttl) > self.settings.limit_global_event_fetches_per_day:
                self._decr(shared)
                self._decr(key)
                log_event("limit.hit", 30, kind="global_event_fetch", user=user)
                raise HTTPException(
                    429,
                    "Kairos has reached today's limit for loading new events. "
                    "Events already loaded still work. Try again tomorrow.",
                    headers=retry,
                )

    def usage(self, user):
        day = time.strftime("%Y%m%d", time.gmtime())
        return {
            action: {"used": self._get(f"kairos:rl:{action}:{user}:{day}"), "limit": getattr(self.settings, attribute)}
            for action, (attribute, _) in ACTIONS.items()
        }
