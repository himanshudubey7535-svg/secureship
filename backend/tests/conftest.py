import os

# Must be set before any app module is imported.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REPORTS_DIR"] = os.path.join(os.path.dirname(__file__), "_reports")

import pytest
from fastapi.testclient import TestClient

import app.models  # noqa: F401
from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


def register(client, username="alice", email="alice@example.com", password="password123"):
    return client.post("/api/auth/register",
                       json={"username": username, "email": email, "password": password})


@pytest.fixture
def auth_headers(client):
    token = register(client).json()["token"]
    return {"Authorization": f"Bearer {token}"}


SAMPLE_TRIVY = {
    "Results": [{
        "Target": "debian",
        "Vulnerabilities": [
            {"VulnerabilityID": "CVE-2024-0001", "PkgName": "openssl", "InstalledVersion": "1.0",
             "FixedVersion": "1.1", "Severity": "CRITICAL", "Title": "Bad bug",
             "Description": "desc", "References": ["https://example.com/1"]},
            {"VulnerabilityID": "CVE-2024-0002", "PkgName": "zlib", "InstalledVersion": "2.0",
             "Severity": "HIGH", "Title": "Another"},
            {"VulnerabilityID": "CVE-2024-0003", "PkgName": "curl", "InstalledVersion": "7.0",
             "Severity": "LOW"},
        ],
    }]
}
