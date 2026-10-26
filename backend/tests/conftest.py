"""Shared fixtures: every behavioral test runs against SQLite and, when configured, real FalkorDB."""

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from kairos.app import create_app
from kairos.config import Settings


@pytest.fixture(params=["sqlite", pytest.param("falkordb", marks=pytest.mark.graph)])
def settings(request, tmp_path):
    if request.param == "falkordb" and not os.getenv("TEST_FALKORDB_URL"):
        pytest.skip("Set TEST_FALKORDB_URL to run real graph integration tests")
    value = Settings(
        storage=request.param,
        sqlite_path=tmp_path / "test.sqlite3",
        falkordb_url=os.getenv("TEST_FALKORDB_URL", "redis://localhost:6379"),
        graph_name="test_" + uuid4().hex,
        api_key="",
        auth_mode="none",
        log_file=None,  # keep test runs out of the live workflow log
        _env_file=None,
    )
    yield value
    if request.param == "falkordb":
        from falkordb import FalkorDB

        db = FalkorDB.from_url(value.falkordb_url)
        if value.graph_name in db.list_graphs():  # tests that never start the app create no graph
            db.select_graph(value.graph_name).delete()
        db.connection.close()


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c:
        yield c
