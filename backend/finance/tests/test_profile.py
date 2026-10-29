import pytest


@pytest.mark.django_db
def test_profile_defaults_to_zero(auth_client):
    assert auth_client.get("/api/profile/").json() == {
        "initial_balance": 0,
        "imported_at": None,
    }


@pytest.mark.django_db
def test_update_initial_balance(auth_client):
    res = auth_client.put("/api/profile/", {"initial_balance": 1500000}, format="json")
    assert res.status_code == 200
    assert res.json()["initial_balance"] == 1500000
    assert auth_client.get("/api/profile/").json()["initial_balance"] == 1500000


@pytest.mark.django_db
def test_negative_balance_returns_400(auth_client):
    assert (
        auth_client.put(
            "/api/profile/", {"initial_balance": -1}, format="json"
        ).status_code
        == 400
    )


@pytest.mark.django_db
def test_profile_is_per_user(auth_client, other):
    auth_client.put("/api/profile/", {"initial_balance": 1000}, format="json")
    assert other.profile.initial_balance == 0
