import pytest
from django.core import mail
from rest_framework.test import APIClient

from accounts.models import User


def register(client, email="a@example.com", password="strongpass123"):
    return client.post(
        "/api/auth/register/", {"email": email, "password": password}, format="json"
    )


@pytest.mark.django_db
def test_register_creates_inactive_user_and_sends_verification(api_client):
    res = register(api_client)
    assert res.status_code == 202
    assert User.objects.get(email="a@example.com").is_active is False
    assert api_client.get("/api/auth/me/").status_code == 401
    assert len(mail.outbox) == 1
    assert "verify=1" in mail.outbox[0].body


@pytest.mark.django_db
def test_register_rejects_duplicate_email(api_client):
    register(api_client)
    assert register(api_client).status_code == 400


@pytest.mark.django_db
def test_register_rejects_weak_password(api_client):
    assert register(api_client, password="123").status_code == 400


@pytest.mark.django_db
def test_registration_rolls_back_if_email_cannot_be_sent(api_client, monkeypatch):
    monkeypatch.setattr("accounts.views.send_mail", lambda *args, **kwargs: 0)
    response = register(api_client)
    assert response.status_code == 503
    assert not User.objects.filter(email="a@example.com").exists()


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
def test_email_verification_enables_login(api_client):
    register(api_client)
    user = User.objects.get(email="a@example.com")
    assert (
        api_client.post(
            "/api/auth/login/",
            {"email": user.email, "password": "strongpass123"},
            format="json",
        ).json()["detail"]
        == "Vui lòng xác thực email trước khi đăng nhập."
    )
    link = mail.outbox[-1].body.splitlines()[-1]
    query = link.split("?", 1)[1]
    from urllib.parse import parse_qs

    token_data = {key: values[0] for key, values in parse_qs(query).items()}
    response = api_client.post(
        "/api/auth/verify-email/",
        {"uid": token_data["uid"], "token": token_data["token"]},
        format="json",
    )
    assert response.status_code == 200
    assert api_client.post(
        "/api/auth/verify-email/",
        {"uid": token_data["uid"], "token": token_data["token"]},
        format="json",
    ).status_code == 200
    assert api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "strongpass123"},
        format="json",
    ).status_code == 200


@pytest.mark.django_db
def test_password_reset_changes_password_and_token_is_single_use(api_client):
    user = User.objects.create_user(email="a@example.com", password="oldpass123")
    response = api_client.post(
        "/api/auth/password-reset/",
        {"email": user.email},
        format="json",
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    from urllib.parse import parse_qs, urlparse

    token_data = {
        key: values[0]
        for key, values in parse_qs(urlparse(mail.outbox[0].body.splitlines()[-1]).query).items()
    }
    payload = {**token_data, "password": "newpass123"}
    assert (
        api_client.post(
            "/api/auth/password-reset/confirm/", payload, format="json"
        ).status_code
        == 200
    )
    user.refresh_from_db()
    assert user.check_password("newpass123")
    assert (
        api_client.post(
            "/api/auth/password-reset/confirm/", payload, format="json"
        ).status_code
        == 400
    )


@pytest.mark.django_db
def test_password_reset_request_does_not_disclose_unknown_email(api_client):
    response = api_client.post(
        "/api/auth/password-reset/",
        {"email": "missing@example.com"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["detail"] == (
        "Nếu email thuộc tài khoản đã xác thực, hướng dẫn sẽ được gửi."
    )


@pytest.mark.django_db
def test_unverified_user_can_request_another_verification_email(api_client):
    register(api_client)
    mail.outbox.clear()
    response = api_client.post(
        "/api/auth/verification-email/",
        {"email": "a@example.com"},
        format="json",
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 1


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
    assert res.status_code == 202
