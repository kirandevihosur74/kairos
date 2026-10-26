import json

from test_drafting import ai, note  # noqa: F401  (ai is a fixture)


def new_conference(client, name):
    body = {"url": "https://example.invalid/" + name.replace(" ", "-"), "name": name}
    cid = client.post("/api/v1/conference", json=body).json()["conference_id"]
    people = client.get("/api/v1/people", params={"conference_id": cid, "triage": "all"}).json()
    return cid, {p["name"]: p for p in people}


def memory(client, cid, pid):
    response = client.get(f"/api/v1/people/{pid}/memory", params={"conference_id": cid})
    assert response.status_code == 200, response.text
    return response.json()


def add_colleague(client, cid, template, name):
    """A second person at the same company, as ingestion would store them."""
    value = {**template, "id": f"{cid}:colleague", "name": name, "conference_id": cid}
    client.app.state.base.put("person", value)
    return value["id"]


def test_memory_links_earlier_meetings_and_colleagues_across_events(ai):  # noqa: F811
    client, cid1, people1, _, _ = ai
    alex1 = next(p for p in people1 if p["name"] == "Alex Morgan")
    note(client, cid1, alex1["id"], "Alex explained their queue backpressure design.")
    first = client.post(f"/api/v1/followups/{alex1['id']}/draft", json={"conference_id": cid1}).json()
    edit = {k: first[k] for k in ("subject", "body", "linkedin_message")}
    client.post(f"/api/v1/followups/{first['id']}/approve", json=edit)

    cid2, people2 = new_conference(client, "QCon SF")
    alex2, sam2 = people2["Alex Morgan"], people2["Sam Rivera"]
    riley = add_colleague(client, cid2, alex2, "Riley Example")
    note(client, cid2, riley, "Riley said the platform team is hiring backend engineers.")

    remembered = memory(client, cid2, alex2["id"])
    by_type = {}
    for item in remembered["items"]:
        by_type.setdefault(item["type"], []).append(item)
    assert set(by_type) == {"earlier_meeting", "earlier_message", "colleague_conversation"}
    earlier = by_type["earlier_meeting"][0]
    assert earlier["text"] == "Alex explained their queue backpressure design."
    assert earlier["conference"]["id"] == cid1
    assert earlier["path"] == ["Alex Morgan", "SAME_PERSON", "Demo conference"]
    colleague = by_type["colleague_conversation"][0]
    assert colleague["person"]["name"] == "Riley Example"
    assert colleague["path"] == ["Alex Morgan", "WORKS_AT", "Example Build Co", "WORKS_AT", "Riley Example"]
    # A colleague with no recorded interaction is not memory, and other companies stay unconnected.
    assert memory(client, cid2, sam2["id"])["items"] == []
    assert client.get(f"/api/v1/people/{alex2['id']}/memory", params={"conference_id": cid1}).status_code == 404


def test_ai_draft_receives_and_cites_graph_memory(ai):  # noqa: F811
    client, cid1, people1, fake, calls = ai
    alex1 = next(p for p in people1 if p["name"] == "Alex Morgan")
    nid = note(client, cid1, alex1["id"], "Alex explained their queue backpressure design.")
    cid2, people2 = new_conference(client, "QCon SF")
    alex2 = people2["Alex Morgan"]

    response = client.post(
        f"/api/v1/followups/{alex2['id']}/draft", json={"conference_id": cid2, "kind": "introduction"}
    )
    assert response.status_code == 201, response.text
    context = json.loads(calls[-1]["messages"][1]["content"])
    assert [m["id"] for m in context["memory"]] == ["memory:" + nid]
    assert context["notes"] == []  # introductions still get no notes about this event
    grounding = {g["id"]: g for g in response.json()["grounded_on"]}
    assert grounding["memory:" + nid]["type"] == "memory"
    assert grounding["memory:" + nid]["path"] == ["Alex Morgan", "SAME_PERSON", "Demo conference"]
