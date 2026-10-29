import pytest

from finance.models import Budget

PAYLOAD = [{"category": "Ăn uống", "limit": 3000000, "fixed": False}]


@pytest.mark.django_db
def test_new_user_has_no_budgets(auth_client):
    assert auth_client.get("/api/budgets/").json() == []


@pytest.mark.django_db
def test_put_replaces_all_budgets(auth_client):
    assert auth_client.put("/api/budgets/", PAYLOAD, format="json").status_code == 200
    assert (
        auth_client.put(
            "/api/budgets/",
            [{"category": "Nhà ở", "limit": 2500000, "fixed": True}],
            format="json",
        ).status_code
        == 200
    )
    body = auth_client.get("/api/budgets/").json()
    assert body == [{"category": "Nhà ở", "limit": 2500000, "fixed": True}]


@pytest.mark.django_db
def test_duplicate_category_returns_400(auth_client):
    bad = PAYLOAD * 2
    assert auth_client.put("/api/budgets/", bad, format="json").status_code == 400


@pytest.mark.django_db
def test_user_cannot_overwrite_other_users_budgets(auth_client, other):
    Budget.objects.create(user=other, category="Ăn uống", limit=1000)
    auth_client.put("/api/budgets/", PAYLOAD, format="json")
    assert Budget.objects.filter(user=other).count() == 1


@pytest.mark.django_db
def test_empty_put_clears_budgets(auth_client, user):
    Budget.objects.create(user=user, category="Ăn uống", limit=1000)
    assert auth_client.put("/api/budgets/", [], format="json").status_code == 200
    assert not Budget.objects.filter(user=user).exists()
