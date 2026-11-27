import pytest
from django.conf import settings
from django.core import mail
from rest_framework.test import APIClient

from accounts.models import User


def register(client, email="a@example.com", password="strongpass123"):
    return client.post(
        "/api/auth/register/", {"email": email, "password": password}, format="json"
    )


@pytest.mark.django_db
def test_register_creates_unverified_user_and_sends_verification(api_client):
    res = register(api_client)
    assert res.status_code == 202
    user = User.objects.get(email="a@example.com")
    assert user.is_active is True
    assert user.is_email_verified is False
    assert api_client.get("/api/auth/me/").status_code == 401
    assert len(mail.outbox) == 1
    assert "verify=1" in mail.outbox[0].body


@pytest.mark.django_db
def test_verification_email_content(api_client):
    register(api_client)
    email = mail.outbox[0]
    assert email.subject == "Xác thực email tài khoản"
    assert email.to == ["a@example.com"]
    assert email.from_email == settings.DEFAULT_FROM_EMAIL
    assert "verify=1" in email.body
    assert f"{settings.FRONTEND_URL}/?verify=1" in email.body
    assert "3 ngày" in email.body


@pytest.mark.django_db
def test_register_rejects_duplicate_email(api_client):
    user = User.objects.create_user(email="active@example.com", password="strongpass123")
    user.is_active = True
    user.save()
    res = register(api_client, email="active@example.com", password="newpass123456")
    assert res.status_code == 400
    assert "Email này đã được sử dụng." in res.json()["email"][0]


@pytest.mark.django_db
def test_register_rejects_existing_unverified_email_without_changing_password(api_client):
    res1 = register(api_client, email="pending@example.com", password="strongpass123")
    assert res1.status_code == 202
    user = User.objects.get(email="pending@example.com")
    assert user.is_active
    assert not user.is_email_verified
    assert user.check_password("strongpass123")

    res2 = register(api_client, email="pending@example.com", password="newstrongpass456")
    assert res2.status_code == 400
    user.refresh_from_db()
    assert user.check_password("strongpass123")
    assert not user.check_password("newstrongpass456")


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
def test_login_session_expiry_default_is_browser_close(api_client):
    User.objects.create_user(email="browser_close@example.com", password="strongpass123")
    res = api_client.post(
        "/api/auth/login/",
        {"email": "browser_close@example.com", "password": "strongpass123", "remember_me": False},
        format="json",
    )
    assert res.status_code == 200
    assert api_client.session.get_expire_at_browser_close() is True


@pytest.mark.django_db
def test_login_session_expiry_with_remember_me(api_client):
    User.objects.create_user(email="remember@example.com", password="strongpass123")
    res = api_client.post(
        "/api/auth/login/",
        {"email": "remember@example.com", "password": "strongpass123", "remember_me": True},
        format="json",
    )
    assert res.status_code == 200
    assert api_client.session.get_expire_at_browser_close() is False
    assert api_client.session.get_expiry_age() == settings.SESSION_COOKIE_AGE



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
    ).status_code == 400
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
def test_password_reset_email_content(api_client):
    user = User.objects.create_user(email="a@example.com", password="oldpass123")
    response = api_client.post(
        "/api/auth/password-reset/",
        {"email": user.email},
        format="json",
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    email = mail.outbox[0]
    assert email.subject == "Đặt lại mật khẩu"
    assert email.to == [user.email]
    assert "reset=1" in email.body
    assert f"{settings.FRONTEND_URL}/?reset=1" in email.body


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


@pytest.mark.django_db
def test_me_returns_profile_info(api_client):
    user = User.objects.create_user(
        email="profile@example.com", password="strongpass123", display_name="Nguyễn Văn A"
    )
    api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "strongpass123"},
        format="json",
    )
    res = api_client.get("/api/auth/me/")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "profile@example.com"
    assert data["display_name"] == "Nguyễn Văn A"
    assert "date_joined" in data


@pytest.mark.django_db
def test_patch_me_updates_display_name(api_client):
    user = User.objects.create_user(email="patch@example.com", password="strongpass123")
    api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "strongpass123"},
        format="json",
    )
    res = api_client.patch(
        "/api/auth/me/",
        {"display_name": "Tên Mới"},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["display_name"] == "Tên Mới"
    user.refresh_from_db()
    assert user.display_name == "Tên Mới"


@pytest.mark.django_db
def test_change_password_success(api_client):
    user = User.objects.create_user(email="pwd@example.com", password="oldpassword123")
    api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "oldpassword123"},
        format="json",
    )
    res = api_client.post(
        "/api/auth/change-password/",
        {"old_password": "oldpassword123", "new_password": "newstrongpassword456"},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["detail"] == "Đổi mật khẩu thành công."

    # User can still make authenticated requests (session kept alive)
    assert api_client.get("/api/auth/me/").status_code == 200

    # User can log in with new password
    api_client.post("/api/auth/logout/")
    res_login = api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "newstrongpassword456"},
        format="json",
    )
    assert res_login.status_code == 200


@pytest.mark.django_db
def test_change_password_wrong_old_password(api_client):
    user = User.objects.create_user(email="pwd2@example.com", password="oldpassword123")
    api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "oldpassword123"},
        format="json",
    )
    res = api_client.post(
        "/api/auth/change-password/",
        {"old_password": "wrongpassword", "new_password": "newstrongpassword456"},
        format="json",
    )
    assert res.status_code == 400
    assert "old_password" in res.json()


@pytest.mark.django_db
def test_change_password_weak_new_password(api_client):
    user = User.objects.create_user(email="pwd3@example.com", password="oldpassword123")
    api_client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "oldpassword123"},
        format="json",
    )
    res = api_client.post(
        "/api/auth/change-password/",
        {"old_password": "oldpassword123", "new_password": "123"},
        format="json",
    )
    assert res.status_code == 400
    assert "new_password" in res.json()


@pytest.mark.django_db
def test_google_login_missing_credential(api_client):
    res = api_client.post("/api/auth/google/", {}, format="json")
    assert res.status_code == 400
    assert "Thiếu mã xác thực Google" in res.json().get("detail", "")


@pytest.mark.django_db
def test_google_login_invalid_credential(api_client, monkeypatch):
    monkeypatch.setattr("accounts.views.verify_google_id_token", lambda token: None)
    res = api_client.post("/api/auth/google/", {"credential": "invalid-token"}, format="json")
    assert res.status_code == 400
    assert "không hợp lệ" in res.json().get("detail", "")


@pytest.mark.django_db
def test_google_login_new_user_success(api_client, monkeypatch):
    fake_google_data = {
        "email": "newgoogleuser@gmail.com",
        "name": "Minh Quân",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "aud": "mock-client-id",
    }
    monkeypatch.setattr("accounts.views.verify_google_id_token", lambda token: fake_google_data)

    res = api_client.post(
        "/api/auth/google/",
        {"credential": "valid-token", "remember_me": True},
        format="json",
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "newgoogleuser@gmail.com"
    assert data["display_name"] == "Minh Quân"

    user = User.objects.get(email="newgoogleuser@gmail.com")
    assert user.is_active is True
    assert api_client.get("/api/auth/me/").status_code == 200
    assert api_client.session.get_expire_at_browser_close() is False


@pytest.mark.django_db
def test_google_login_existing_inactive_user(api_client, monkeypatch):
    user = User.objects.create_user(email="existing@gmail.com", password="pwd", is_active=False)
    fake_google_data = {
        "email": "existing@gmail.com",
        "name": "Existing User",
        "email_verified": True,
    }
    monkeypatch.setattr("accounts.views.verify_google_id_token", lambda token: fake_google_data)

    res = api_client.post(
        "/api/auth/google/",
        {"credential": "valid-token", "remember_me": False},
        format="json",
    )
    assert res.status_code == 403
    user.refresh_from_db()
    assert user.is_active is False
    assert user.check_password("pwd")


@pytest.mark.django_db
def test_google_login_verifies_unverified_user_and_removes_password(api_client, monkeypatch):
    user = User.objects.create_user(
        email="existing@gmail.com",
        password="attacker-password",
        is_active=True,
        is_email_verified=False,
    )
    fake_google_data = {
        "email": "existing@gmail.com",
        "name": "Existing User",
        "email_verified": True,
    }
    monkeypatch.setattr("accounts.views.verify_google_id_token", lambda token: fake_google_data)

    response = api_client.post(
        "/api/auth/google/", {"credential": "valid-token"}, format="json"
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.is_email_verified is True
    assert user.has_usable_password() is False
    assert not user.check_password("attacker-password")


@pytest.mark.django_db
def test_verify_token_cannot_be_used_for_password_reset(api_client):
    register(api_client)
    user = User.objects.get(email="a@example.com")
    from urllib.parse import parse_qs, urlparse
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    token_data = {
        key: values[0]
        for key, values in parse_qs(urlparse(mail.outbox[0].body.splitlines()[-1]).query).items()
    }
    assert api_client.post("/api/auth/verify-email/", token_data, format="json").status_code == 200

    reset_response = api_client.post(
        "/api/auth/password-reset/confirm/",
        {**token_data, "password": "newpass123"},
        format="json",
    )

    assert reset_response.status_code == 400
    legacy_verify_data = {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": default_token_generator.make_token(user),
    }
    legacy_reset_response = api_client.post(
        "/api/auth/password-reset/confirm/",
        {**legacy_verify_data, "password": "anotherpass123"},
        format="json",
    )
    assert legacy_reset_response.status_code == 400
    user.refresh_from_db()
    assert not user.check_password("newpass123")
    assert not user.check_password("anotherpass123")


@pytest.mark.django_db
def test_verification_does_not_reactivate_disabled_user(api_client, monkeypatch):
    user = User.objects.create_user(
        email="disabled@example.com",
        password="strongpass123",
        is_active=False,
        is_email_verified=False,
    )
    monkeypatch.setattr("accounts.views.send_mail", lambda *args, **kwargs: 1)

    response = api_client.post(
        "/api/auth/verification-email/",
        {"email": user.email},
        format="json",
    )

    assert response.status_code == 200
    from accounts.views import email_verification_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    token_data = {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": email_verification_token_generator.make_token(user),
    }
    verification = api_client.post(
        "/api/auth/verify-email/", token_data, format="json"
    )
    assert verification.status_code == 200
    user.refresh_from_db()
    assert user.is_email_verified is True
    assert user.is_active is False


def test_google_token_rejected_when_client_id_is_missing(settings, monkeypatch):
    from accounts.views import verify_google_id_token

    settings.GOOGLE_CLIENT_ID = ""

    class GoogleResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def read(self):
            return b'{"iss":"https://accounts.google.com","aud":"other-client","email":"a@example.com","email_verified":true}'

    monkeypatch.setattr("accounts.views.urllib.request.urlopen", lambda *args, **kwargs: GoogleResponse())

    assert verify_google_id_token("valid-token") is None

