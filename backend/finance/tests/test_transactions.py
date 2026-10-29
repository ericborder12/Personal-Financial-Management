import pytest

from finance.models import Transaction

PAYLOAD = {
    "type": "expense",
    "amount": 50000,
    "category": "Ăn uống",
    "date": "2026-10-29",
    "note": "trưa",
}


@pytest.mark.django_db
def test_create_and_list_own_transactions(auth_client):
    res = auth_client.post("/api/transactions/", PAYLOAD, format="json")
    assert res.status_code == 201
    assert res.json()["amount"] == 50000
    body = auth_client.get("/api/transactions/").json()
    assert len(body) == 1 and body[0]["category"] == "Ăn uống"


@pytest.mark.django_db
def test_user_cannot_see_or_delete_other_users_transaction(auth_client, other):
    tx = Transaction.objects.create(user=other, **PAYLOAD)
    assert auth_client.get("/api/transactions/").json() == []
    assert auth_client.delete(f"/api/transactions/{tx.id}/").status_code == 404
    assert Transaction.objects.filter(id=tx.id).exists()


@pytest.mark.django_db
def test_delete_own_transaction(auth_client, user):
    tx = Transaction.objects.create(user=user, **PAYLOAD)
    assert auth_client.delete(f"/api/transactions/{tx.id}/").status_code == 204
    assert not Transaction.objects.filter(id=tx.id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("amount", [0, -1, 1.5, "abc", 9223372036854775808])
def test_invalid_amount_returns_400(auth_client, amount):
    res = auth_client.post(
        "/api/transactions/", {**PAYLOAD, "amount": amount}, format="json"
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_unauthenticated_gets_401(api_client):
    assert api_client.get("/api/transactions/").status_code == 401
