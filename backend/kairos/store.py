"""Two explicit stores. SQLite is a local development substitute, not FalkorDB."""

import json
import sqlite3
from contextlib import closing
from pathlib import Path

KINDS = {
    "profile": "User",
    "conference": "Conference",
    "person": "Person",
    "triage": "Triage",
    "note": "Note",
    "draft": "Draft",
    "import": "Import",
}


def name_key(value):
    """Normalized key for matching a company or a person's name across events."""
    return " ".join((value or "").casefold().split())


class SQLiteStore:
    engine = "sqlite"

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = str(path)
        with closing(self.connect()) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS records (kind TEXT, id TEXT, payload TEXT, PRIMARY KEY(kind,id))"
            )
            db.commit()

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def put(self, kind, value):
        with closing(self.connect()) as db, db:
            db.execute(
                "INSERT INTO records VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload",
                (kind, value["id"], json.dumps(value)),
            )
        return value

    def get(self, kind, key):
        with closing(self.connect()) as db:
            row = db.execute("SELECT payload FROM records WHERE kind=? AND id=?", (kind, key)).fetchone()
        return json.loads(row[0]) if row else None

    def all(self, kind):
        with closing(self.connect()) as db:
            rows = db.execute("SELECT payload FROM records WHERE kind=? ORDER BY id", (kind,)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def matches(self, profile, people):
        wanted = set(profile["interests"])
        return {p["id"]: sorted(wanted.intersection(p["topics"])) for p in people}

    def related(self, person):
        """(relation, other person) pairs: same company, or the same name at another event."""
        company, name = name_key(person.get("company")), name_key(person["name"])
        found = []
        for other in self.all("person"):
            if other["id"] == person["id"]:
                continue
            if name_key(other["name"]) == name:
                if other["conference_id"] != person["conference_id"]:
                    found.append(("same_person", other))
            elif company and name_key(other.get("company")) == company:
                found.append(("same_company", other))
        return found

    def ping(self):
        with closing(self.connect()) as db:
            db.execute("SELECT 1")

    def close(self):
        pass


class FalkorStore:
    engine = "falkordb"

    def __init__(self, url, name, db=None):
        from falkordb import FalkorDB
        from redis.exceptions import ConnectionError as RedisConnectionError

        self.owns_db = db is None
        if db is not None:
            # Another graph on an already-open connection (one graph per user).
            self.db = db
            self.graph = db.select_graph(name)
            self.ping()
            return
        for attempt in range(3):
            self.db = FalkorDB.from_url(url, socket_timeout=5, socket_connect_timeout=5)
            self.graph = self.db.select_graph(name)
            try:
                self.ping()
                return
            except (AttributeError, RedisConnectionError, OSError):
                # A freshly opened connection is occasionally dropped before its first reply; reconnect.
                self.db.connection.close()
                if attempt == 2:
                    raise

    def put(self, kind, value):
        label = KINDS[kind]  # fixed allowlist; all user values are query parameters
        params = {"id": value["id"], "payload": json.dumps(value)}
        query = f"MERGE (n:{label} {{id:$id}}) SET n.payload=$payload "
        if kind == "profile":
            params["topics"] = value["interests"]
            query += """
            MERGE (n)-[:HAS_GOAL]->(g:Goal {id:$id})
            WITH n,g OPTIONAL MATCH (g)-[old:TARGETS]->() DELETE old
            WITH DISTINCT n,g
            FOREACH (topic IN $topics | MERGE (t:Topic {name:topic}) MERGE (g)-[:TARGETS]->(t))
            """
        elif kind == "person":
            company = name_key(value.get("company"))
            params.update(
                topics=value["topics"],
                cid=value["conference_id"],
                name_key=name_key(value["name"]),
                companies=[{"key": company, "name": value["company"].strip()}] if company else [],
            )
            query += """
            SET n.name_key=$name_key
            MERGE (c:Conference {id:$cid}) MERGE (n)-[:APPEARS_AT]->(c)
            WITH n OPTIONAL MATCH (n)-[old:INTERESTED_IN|WORKS_AT]->() DELETE old
            WITH DISTINCT n
            FOREACH (topic IN $topics | MERGE (t:Topic {name:topic}) MERGE (n)-[:INTERESTED_IN]->(t))
            FOREACH (co IN $companies | MERGE (k:Company {key:co.key}) SET k.name=co.name MERGE (n)-[:WORKS_AT]->(k))
            """
        elif kind in {"note", "triage", "draft"}:
            params.update(uid="demo_user", pid=value["person_id"], cid=value["conference_id"])
            query += """
            MERGE (u:User {id:$uid}) MERGE (u)-[:OWNS]->(n)
            MERGE (p:Person {id:$pid}) MERGE (n)-[:ABOUT]->(p)
            MERGE (c:Conference {id:$cid}) MERGE (n)-[:IN_CONFERENCE]->(c)
            """
        self.graph.query(query, params)
        return value

    def get(self, kind, key):
        rows = self.graph.ro_query(
            f"MATCH (n:{KINDS[kind]} {{id:$id}}) RETURN n.payload", {"id": key}
        ).result_set
        return json.loads(rows[0][0]) if rows and rows[0][0] else None

    def all(self, kind):
        rows = self.graph.ro_query(
            f"MATCH (n:{KINDS[kind]}) WHERE n.payload IS NOT NULL RETURN n.payload ORDER BY n.id"
        ).result_set
        return [json.loads(row[0]) for row in rows]

    def matches(self, profile, people):
        if not people:
            return {}
        rows = self.graph.ro_query(
            """
            MATCH (u:User {id:$uid})-[:HAS_GOAL]->(:Goal)-[:TARGETS]->(t:Topic)
                  <-[:INTERESTED_IN]-(p:Person)-[:APPEARS_AT]->(:Conference {id:$cid})
            RETURN p.id, collect(DISTINCT t.name)
        """,
            {"uid": profile["id"], "cid": people[0]["conference_id"]},
        ).result_set
        return {row[0]: sorted(row[1]) for row in rows}

    def related(self, person):
        """Graph memory hops: colleagues via (Person)-[:WORKS_AT]->(Company)<-[:WORKS_AT]-(Person),
        and the same person (by normalized name) appearing at a different event."""
        params = {"pid": person["id"], "cid": person["conference_id"], "name_key": name_key(person["name"])}
        same_person = self.graph.ro_query(
            """
            MATCH (o:Person {name_key:$name_key})-[:APPEARS_AT]->(c:Conference)
            WHERE o.id <> $pid AND c.id <> $cid
            RETURN DISTINCT o.payload
            """,
            params,
        ).result_set
        colleagues = self.graph.ro_query(
            """
            MATCH (:Person {id:$pid})-[:WORKS_AT]->(:Company)<-[:WORKS_AT]-(o:Person)
            WHERE o.id <> $pid AND o.name_key <> $name_key
            RETURN DISTINCT o.payload
            """,
            params,
        ).result_set
        return [("same_person", json.loads(r[0])) for r in same_person] + [
            ("same_company", json.loads(r[0])) for r in colleagues
        ]

    def ping(self):
        self.graph.query("RETURN 1")

    def close(self):
        if self.owns_db:
            self.db.connection.close()
