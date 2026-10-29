import pytest
from rest_framework.test import APIClient

from accounts.models import User


def register(client, email="a@example.com", password="strongpass123"):
    return client.post(
        "/api/auth/register/", {"email": email, "password": password}, format="json"
    )


@pytest.mark.django_db
def test_register_creates_user_and_logs_in(api_client):
    res = register(api_client)
    assert res.status_code == 201
    body = res.json()
    assert body == {"id": body["id"], "email": "a@example.com", "display_name": ""}
    assert "password" not in body
    assert api_client.get("/api/auth/me/").status_code == 200


@pytest.mark.django_db
def test_register_rejects_duplicate_email(api_client):
    register(api_client)
    assert register(api_client).status_code == 400


@pytest.mark.django_db
def test_register_rejects_weak_password(api_client):
    assert register(api_client, password="123").status_code == 400


@pytest.mark.django_db
def test_login_and_logout(api_client):
    User.objects.create_user(email="a@example.com", password="strongpass123")
    assert (
        api_client.post(
            "/api/auth/login/",
            {"email": "a@example.com", "password": "wrong"},
            format="json",
        ).status_code
        == 400
    )
    res = api_client.post(
        "/api/auth/login/",
        {"email": "a@example.com", "password": "strongpass123"},
        format="json",
    )
    assert res.status_code == 200
    assert api_client.get("/api/auth/me/").status_code == 200
    assert api_client.post("/api/auth/logout/").status_code == 204
    assert api_client.get("/api/auth/me/").status_code == 401


@pytest.mark.django_db
def test_register_requires_csrf_when_enforced():
    client = APIClient(enforce_csrf_checks=True)
    payload = {"email": "csrf@example.com", "password": "strongpass123"}
    assert client.post("/api/auth/register/", payload, format="json").status_code == 403
    client.get("/api/auth/csrf/")
    token = client.cookies["csrftoken"].value
    res = client.post(
        "/api/auth/register/", payload, format="json", HTTP_X_CSRFTOKEN=token
    )
    assert res.status_code == 201
