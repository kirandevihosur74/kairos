from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException


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
                "who": f"{p['title']} at {p['company']}",
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


def make_draft(store, pid, request):
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
    grounding = [
        {"id": "profile:demo_user", "type": "profile", "text": user["background"]},
        {"id": pid, "type": "person", "text": f"{p['title']} at {p['company']}", "sources": p["sources"]},
    ]
    role = ", ".join(user["target_roles"])[:300]
    opening = f"I’m exploring {role} roles and came across your work as {p['title']} at {p['company']}."
    if request.kind != "introduction":
        opening = f"Thanks for speaking with me. My note from our conversation: “{ns[-1]['text'][:500]}”"
        grounding.append({"id": ns[-1]["id"], "type": "note", "text": ns[-1]["text"]})
    ask = "Would you be open to a brief conversation about your work and what skills your team values?"
    if request.kind == "referral":
        ask = f"I’m interested in this opening: {request.job_url}. If you feel my background is a fit, would you be comfortable considering a referral?"
        grounding.append(
            {
                "id": "job",
                "type": "user_supplied_job",
                "text": request.job_description,
                "url": str(request.job_url),
            }
        )
    elif request.kind == "follow_up":
        ask = "Would you be open to staying in touch as I explore opportunities in this area?"
    body = f"Hi {p['name']},\n\n{opening}\n\nI’m interested in {role} roles. {user['background'][:1500]}\n\n{ask}\n\nThanks,\n{user['name']}"
    return {
        "id": uid("draft"),
        "person_id": pid,
        "conference_id": request.conference_id,
        "kind": request.kind,
        "subject": "Following up on our conversation"
        if request.kind != "introduction"
        else "Connecting about your work",
        "body": body,
        "linkedin_message": f"Hi {p['name']}, {opening[:300]} {ask}",
        "grounded_on": grounding,
        "status": "draft",
        "generation_mode": "template",
        "data_mode": p["data_mode"],
        "created_at": now(),
        "approved_at": None,
    }
