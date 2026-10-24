from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException

from . import drafting


def now():
    return datetime.now(UTC).isoformat()


def uid(prefix):
    return f"{prefix}_{uuid4().hex}"


def require(store, kind, key):
    value = store.get(kind, key)
    if value is None:
        raise HTTPException(404, f"{kind.capitalize()} not found")
    return value


def profile(store):
    value = store.get("profile", "demo_user")
    if not value:
        raise HTTPException(409, "Complete onboarding first")
    return value


def person(store, pid, cid):
    require(store, "conference", cid)
    value = require(store, "person", pid)
    if value["conference_id"] != cid:
        raise HTTPException(404, "Person not found in this conference")
    return value


def notes_for(store, pid):
    return sorted(
        (n for n in store.all("note") if n["person_id"] == pid), key=lambda n: (n["created_at"], n["id"])
    )


def cards(store, cid, triage=None):
    conference = require(store, "conference", cid)
    if conference["stage"] != "ready":
        raise HTTPException(409, "Conference data is not ready")
    user = profile(store)
    people = [p for p in store.all("person") if p["conference_id"] == cid]
    matches = store.matches(user, people)
    decisions = {v["person_id"]: v["decision"] for v in store.all("triage") if v["conference_id"] == cid}
    notes = store.all("note")
    result = []
    for p in people:
        decision = decisions.get(p["id"])
        if triage is None and decision == "not_interesting":
            continue
        if triage not in {None, "all"} and decision != triage:
            continue
        topics = matches.get(p["id"], [])
        nodes = [
            {"id": user["id"], "label": user["name"], "type": "User"},
            {"id": "goal:" + user["id"], "label": ", ".join(user["target_roles"]), "type": "Goal"},
            {"id": p["id"], "label": p["name"], "type": "Person"},
        ]
        edges = [{"from": user["id"], "to": "goal:" + user["id"], "label": "HAS_GOAL"}]
        for topic in topics:
            tid = "topic:" + topic
            nodes.append({"id": tid, "label": topic, "type": "Topic"})
            edges.extend(
                [
                    {"from": "goal:" + user["id"], "to": tid, "label": "TARGETS"},
                    {"from": p["id"], "to": tid, "label": "INTERESTED_IN"},
                ]
            )
        pn = sorted((n for n in notes if n["person_id"] == p["id"]), key=lambda n: (n["created_at"], n["id"]))
        reason = ("Shared career interests: " + ", ".join(topics)) if topics else "No matching interests yet."
        result.append(
            {
                **p,
                "score": len(topics) / len(user["interests"]),
                "why": {"sentence": reason, "nodes": nodes, "edges": edges},
                "who": who(p),
                "next_step": f"Ask about their work in {topics[0]}."
                if topics
                else "Review their work before reaching out.",
                "notes": [{**n, "date": n["created_at"]} for n in pn],
                "met": {"date": pn[-1]["created_at"]} if pn else None,
                "triage": decision,
                "warm_intro": None,
                "reachability": None,
                "fun_fact": None,
                "talks": [],
                "signals": [],
                "openers": [],
            }
        )
    return sorted(result, key=lambda p: (-p["score"], p["id"]))


# Deliberately conservative, deterministic suggestions. These are not an AI interpretation.
VOCABULARY = (
    "python",
    "javascript",
    "typescript",
    "java",
    "rust",
    "go",
    "react",
    "fastapi",
    "django",
    "postgresql",
    "sql",
    "docker",
    "kubernetes",
    "distributed systems",
    "backend",
    "machine learning",
)


def suggest(text):
    import re

    found = [word for word in VOCABULARY if re.search(r"(?<!\w)" + re.escape(word) + r"(?!\w)", text.lower())]
    return {"skills": found, "interests": [], "target_roles": [], "background": text[:5000]}


def _template(p, user, ns, request):
    grounding = [
        {"id": "profile:demo_user", "type": "profile", "text": user["background"]},
        {"id": p["id"], "type": "person", "text": who(p), "sources": p["sources"]},
    ]
    role = ", ".join(user["target_roles"])[:300]
    opening = f"I’m exploring {role} roles and came across your work as {who(p)}."
    if request.kind != "introduction":
        opening = f"Thanks for speaking with me. My note from our conversation: “{ns[-1]['text'][:500]}”"
        grounding.append({"id": ns[-1]["id"], "type": "note", "text": ns[-1]["text"]})
    ask = "Would you be open to a brief conversation about your work and what skills your team values?"
    if request.kind == "referral":
        ask = f"I’m interested in this opening: {request.job_url}. If you feel my background is a fit, would you be comfortable considering a referral?"
        grounding.append(_job(request))
    elif request.kind == "follow_up":
        ask = "Would you be open to staying in touch as I explore opportunities in this area?"
    body = f"Hi {p['name']},\n\n{opening}\n\nI’m interested in {role} roles. {user['background'][:1500]}\n\n{ask}\n\nThanks,\n{user['name']}"
    return {
        "subject": "Following up on our conversation"
        if request.kind != "introduction"
        else "Connecting about your work",
        "body": body,
        "linkedin_message": f"Hi {p['name']}, {opening[:300]} {ask}",
        "grounded_on": grounding,
    }


def who(p):
    return f"{p['title']} at {p['company']}" if p.get("company") else p["title"]


def _job(request):
    return {"id": "job", "type": "user_supplied_job", "text": request.job_description, "url": str(request.job_url)}


def _ai_context(p, user, ns, request):
    """Everything the model may use, each item with an id it can cite. Introductions get no notes."""
    notes = [] if request.kind == "introduction" else [{"id": n["id"], "text": n["text"], "created_at": n["created_at"]} for n in ns]
    job = _job(request) if request.job_url else None
    context = {
        "kind": request.kind,
        "job_seeker": {
            "id": "profile:demo_user",
            **{k: user.get(k) for k in ("name", "target_roles", "skills", "interests", "background", "location_preferences")},
        },
        "person": {
            "id": p["id"],
            **{k: p.get(k) for k in ("name", "title", "company", "event_role", "topics", "bio")},
        },
        "notes": notes,
        "job": job and {"id": "job", "url": job["url"], "description": job["text"]},
    }
    grounding = [
        {"id": "profile:demo_user", "type": "profile", "text": user["background"]},
        {"id": p["id"], "type": "person", "text": who(p), "sources": p["sources"]},
        *({"id": n["id"], "type": "note", "text": n["text"]} for n in notes),
        *([job] if job else []),
    ]
    context["context_items"] = [{"id": g["id"], "type": g["type"]} for g in grounding]
    return context, grounding


def make_draft(store, pid, request, settings=None):
    p = person(store, pid, request.conference_id)
    user = profile(store)
    ns = notes_for(store, pid)
    if request.kind == "follow_up" and not ns:
        raise HTTPException(409, "Add a meeting note first, or choose introduction")
    if request.kind == "referral" and (not request.job_url or not request.job_description):
        raise HTTPException(422, "Referral requests require a job URL and description")
    if request.kind == "referral" and not ns:
        raise HTTPException(
            409, "Add a meeting note before requesting a referral; otherwise choose introduction"
        )
    ai_ready = bool(settings and settings.openai_api_key)
    if request.generation == "ai" and not ai_ready:
        raise HTTPException(503, "AI drafting is not configured; set KAIROS_OPENAI_API_KEY or use template")
    content, mode, model, note = _template(p, user, ns, request), "template", None, None
    if ai_ready and request.generation != "template":
        context, grounding = _ai_context(p, user, ns, request)
        try:
            ai = drafting.generate(context, settings)
        except drafting.DraftingError as exc:
            if request.generation == "ai":
                raise HTTPException(502, f"AI drafting failed ({exc}); retry or use template") from None
            # Visible fallback: the draft is labeled template, with the reason, never passed off as AI.
            note = f"AI drafting unavailable ({exc}); showing template draft"
        else:
            content = {**ai, "grounded_on": grounding}
            mode, model = "ai", settings.openai_model
    return {
        "id": uid("draft"),
        "person_id": pid,
        "conference_id": request.conference_id,
        "kind": request.kind,
        "subject": content["subject"],
        "body": content["body"],
        "linkedin_message": content["linkedin_message"],
        "grounded_on": content["grounded_on"],
        "cited": content.get("cited", []),
        "status": "draft",
        "generation_mode": mode,
        "model": model,
        "generation_note": note,
        "data_mode": p["data_mode"],
        "created_at": now(),
        "approved_at": None,
    }
