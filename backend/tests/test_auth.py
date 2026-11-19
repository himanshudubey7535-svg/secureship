from tests.conftest import register


def test_register_returns_token(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["username"] == "alice" and body["token"]


def test_duplicate_email_rejected(client):
    register(client)
    assert register(client, username="bob").status_code == 409


def test_short_password_rejected(client):
    assert register(client, password="short").status_code == 422


def test_login_success_and_failure(client):
    register(client)
    ok = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["token"]
    bad = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/api/scans").status_code == 401
    assert client.get("/api/scans", headers={"Authorization": "Bearer junk"}).status_code == 401
