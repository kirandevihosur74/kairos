"""Run one full demo against the local API; creates a new fixture conference."""

import os

import httpx

base = os.getenv("KAIROS_BASE_URL", "http://127.0.0.1:8000")
with httpx.Client(base_url=base, headers={"X-API-Key": os.getenv("KAIROS_API_KEY", "")}) as c:

    def post(path, body):
        response = c.post("/api/v1" + path, json=body)
        response.raise_for_status()
        return response.json()

    post(
        "/onboarding",
        {
            "name": "Demo job seeker",
            "target_roles": ["Backend engineer"],
            "skills": ["Python"],
            "interests": ["python", "distributed systems"],
            "background": "I build APIs.",
        },
    )
    conference = post("/conference", {"url": "https://example.invalid/demo"})
    response = c.get("/api/v1/people", params={"conference_id": conference["id"]})
    response.raise_for_status()
    people = response.json()
    selection = {"conference_id": conference["id"], "person_id": people[0]["id"]}
    post("/triage", {**selection, "decision": "interesting"})
    post("/met", {**selection, "note": "We discussed Python API performance."})
    draft = post(f"/followups/{people[0]['id']}/draft", {"conference_id": conference["id"]})
    approved = post(
        f"/followups/{draft['id']}/approve", {k: draft[k] for k in ("subject", "body", "linkedin_message")}
    )
    print(f"{len(people)} fictional people; template draft {approved['status']}; nothing sent.")
