"""End-to-end smoke test: real Luma event via Bright Data -> graph/store -> cards -> notes -> AI draft -> persistence.

Spends real Bright Data and OpenAI credits. Run against throwaway data, e.g.
KAIROS_SQLITE_PATH=/tmp/k.sqlite3 KAIROS_SNAPSHOT_DIR=/tmp/snap, restarting the server between phases.

Usage: smoke_live.py <phase1|phase2> <state.json> <snapshot_dir>
phase1 runs the whole flow against a fresh server; phase2 runs after a server restart and checks persistence.
"""

import json
import os
import sys
import time
from pathlib import Path

import httpx

BASE = os.getenv("KAIROS_BASE_URL", "http://127.0.0.1:8000")
EVENT = "https://luma.com/fig-knsb?tk=should-be-stripped"
CANON = "https://luma.com/fig-knsb"
phase, state_path, snap_dir = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
results = []


def check(label, ok, detail=""):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {label}" + (f" — {detail}" if detail else ""))


c = httpx.Client(base_url=BASE, timeout=180)


def api(method, path, **kw):
    r = c.request(method, "/api/v1" + path, **kw)
    if r.status_code >= 400:
        print(f"  ! {method} {path} -> {r.status_code}: {r.text[:300]}")
    return r


if phase == "phase1":
    health = c.get("/health").json()
    check("health: Luma ingestion enabled", health["ingestion"] == "fixture_and_luma", str(health))
    check("health: OpenAI drafting enabled", health["draft_generation"] == "openai")

    profile = {
        "name": "Demo job seeker",
        "target_roles": ["Backend engineer"],
        "skills": ["Python", "FastAPI"],
        "interests": ["software engineering", "ai", "backend", "distributed systems"],
        "background": "I build Python backend APIs and want to work on AI infrastructure.",
        "location_preferences": ["San Francisco"],
    }
    check("onboarding saved", api("POST", "/onboarding", json=profile).status_code == 200)

    t0 = time.time()
    r = api("POST", "/conference", json={"url": EVENT, "data_mode": "live"})
    elapsed = time.time() - t0
    conf = r.json() if r.status_code == 201 else {}
    check("live conference created via Bright Data", r.status_code == 201, f"{elapsed:.1f}s")
    if r.status_code != 201:
        sys.exit(1)
    cid = conf["conference_id"]
    check("invite token stripped from stored URL", conf["url"] == CANON, conf["url"])
    check("real event name parsed", conf["name"] == "Fig AI Design Makeathon 2026", conf["name"])
    check("people found (judges + hosts)", conf["people_found"] >= 5, str(conf["people_found"]))
    check("conference data_mode live, not stale", conf["data_mode"] == "live" and conf["stale"] is False)
    check("event dates stored", bool(conf.get("start_at")) and bool(conf.get("end_at")),
          f"{conf.get('start_at')} → {conf.get('end_at')}")

    snaps = list(snap_dir.glob("*.json"))
    check("snapshot written to disk", len(snaps) == 1, ", ".join(s.name for s in snaps))
    snap_mtime = snaps[0].stat().st_mtime if snaps else None

    people = api("GET", "/people", params={"conference_id": cid}).json()
    check("ranked cards returned", len(people) == conf["people_found"], f"{len(people)} cards")
    print("  Top cards:")
    for p in people[:5]:
        print(f"    {p['score']:.2f}  {p['name']} — {p['who']}  | {p['why']['sentence']}")
    names = {p["name"] for p in people}
    check("no guest-list people ingested", all(p.get("event_role") in {"judge", "host"} for p in people))
    check("every card has real source + collection time",
          all(p["sources"][0]["url"] == CANON and p["sources"][0]["collected_at"] for p in people))
    check("cards labeled live data", all(p["data_mode"] == "live" and p["source"] == "luma" for p in people))
    top = people[0]
    check("top match has a real shared interest", top["score"] > 0, f"{top['name']} {top['score']:.2f}")
    node_ids = {n["id"] for n in top["why"]["nodes"]}
    check("why-graph edges reference returned nodes",
          all(e["from"] in node_ids and e["to"] in node_ids for e in top["why"]["edges"]))
    check("graph endpoint matches card", api("GET", f"/people/{top['id']}/graph",
          params={"conference_id": cid}).json() == top["why"])

    sel = {"conference_id": cid, "person_id": top["id"]}
    check("shortlist (triage interesting)", api("POST", "/triage", json={**sel, "decision": "interesting"}).status_code == 200)
    second = people[1]
    check("skip second person", api("POST", "/triage", json={"conference_id": cid, "person_id": second["id"],
          "decision": "not_interesting"}).status_code == 200)
    check("skipped person hidden from default list",
          second["id"] not in {p["id"] for p in api("GET", "/people", params={"conference_id": cid}).json()})
    note = "Talked about how their team serves model inference behind Python APIs; they suggested I look at their infra roles."
    check("meeting note saved", api("POST", "/met", json={**sel, "note": note}).status_code == 201)
    check("priorities include shortlisted person",
          top["id"] in {p["id"] for p in api("GET", "/priorities", params={"conference_id": cid}).json()})

    intro = api("POST", f"/followups/{second['id']}/draft", json={"conference_id": cid, "kind": "introduction"})
    t0 = time.time()
    fu = api("POST", f"/followups/{top['id']}/draft", json={"conference_id": cid, "kind": "follow_up", "generation": "ai"})
    d = fu.json() if fu.status_code == 201 else {}
    check("AI follow-up draft generated", fu.status_code == 201 and d.get("generation_mode") == "ai",
          f"{time.time() - t0:.1f}s mode={d.get('generation_mode')}")
    if d:
        print("  Subject:", d["subject"])
        print("  Body:\n    " + d["body"].replace("\n", "\n    "))
        print("  LinkedIn:", d["linkedin_message"])
        print("  grounded_on:", d["grounded_on"])
        check("draft status is draft (not sent)", d["status"] == "draft")
    check("introduction draft created", intro.status_code == 201, intro.json().get("generation_mode", ""))

    edit = {k: d[k] for k in ("subject", "body", "linkedin_message")}
    edit["body"] += "\n\nP.S. Edited by me before sending."
    ap = api("POST", f"/followups/{d['id']}/approve", json=edit).json()
    check("draft approved with edited content", ap["status"] == "approved" and ap["body"].endswith("before sending."))

    confs = api("GET", "/conferences").json()
    mine = next(x for x in confs if x["conference_id"] == cid)
    check("GET /conferences counts", mine["counts"] == {"interesting": 1, "met": 1, "drafts_pending": 1}, str(mine["counts"]))

    state_path.write_text(json.dumps({"cid": cid, "pid": top["id"], "skipped": second["id"], "draft": d["id"],
                                      "approved_body": ap["body"], "people_found": conf["people_found"],
                                      "snap_mtime": snap_mtime, "note": note}))

elif phase == "phase2":
    s = json.loads(state_path.read_text())
    cid = s["cid"]
    st = api("GET", f"/conference/{cid}/status").json()
    check("conference persisted across restart", st.get("stage") == "ready" and st["people_found"] == s["people_found"])
    p = api("GET", f"/people/{s['pid']}", params={"conference_id": cid}).json()
    check("note persisted across restart", [n["text"] for n in p["notes"]] == [s["note"]])
    check("triage persisted across restart", p["triage"] == "interesting")
    skipped = api("GET", f"/people/{s['skipped']}", params={"conference_id": cid}).json()
    check("skip persisted across restart", skipped["triage"] == "not_interesting")
    dr = api("GET", f"/drafts/{s['draft']}").json()
    check("approved draft persisted across restart", dr["status"] == "approved" and dr["body"] == s["approved_body"])
    check("conference list persisted", any(x["conference_id"] == cid for x in api("GET", "/conferences").json()))

    t0 = time.time()
    r = api("POST", "/conference", json={"url": EVENT, "data_mode": "live"})
    snap = next(snap_dir.glob("*.json"))
    check("re-adding event reuses snapshot (no new Bright Data call)",
          r.status_code == 201 and snap.stat().st_mtime == s["snap_mtime"], f"{time.time() - t0:.2f}s")
    check("reused event has same people", r.json().get("people_found") == s["people_found"])

print(f"\n{phase}: {sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
