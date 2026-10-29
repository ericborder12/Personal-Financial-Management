import pytest

from finance.models import Budget, Transaction

PAYLOAD = {
    "transactions": [
        {
            "type": "expense",
            "amount": 50000,
            "category": "Ăn uống",
            "date": "2026-10-01",
            "note": "trưa",
        },
        {
            "type": "income",
            "amount": 1000000,
            "category": "Lương",
            "date": "2026-10-05",
            "note": "",
        },
    ],
    "budgets": [{"category": "Ăn uống", "limit": 3000000, "fixed": False}],
    "initial_balance": 500000,
}


@pytest.mark.django_db
def test_import_moves_everything(auth_client, user):
    res = auth_client.post("/api/import/", PAYLOAD, format="json")
    assert res.status_code == 200
    assert res.json() == {"transactions": 2, "budgets": 1}
    assert Transaction.objects.filter(user=user).count() == 2
    assert Budget.objects.filter(user=user).count() == 1
    user.profile.refresh_from_db()
    assert user.profile.initial_balance == 500000
    assert user.profile.imported_at is not None


@pytest.mark.django_db
def test_second_import_returns_409(auth_client):
    auth_client.post("/api/import/", PAYLOAD, format="json")
    assert auth_client.post("/api/import/", PAYLOAD, format="json").status_code == 409


@pytest.mark.django_db
def test_import_blocked_when_account_has_transaction(auth_client, user):
    Transaction.objects.create(
        user=user, type="expense", amount=1, category="Khác", date="2026-10-01"
    )
    assert auth_client.post("/api/import/", PAYLOAD, format="json").status_code == 409


@pytest.mark.django_db
def test_invalid_payload_leaves_no_data(auth_client, user):
    bad = {
        **PAYLOAD,
        "transactions": [{**PAYLOAD["transactions"][0], "amount": -5}],
    }
    assert auth_client.post("/api/import/", bad, format="json").status_code == 400
    assert Transaction.objects.filter(user=user).count() == 0
    assert user.profile.imported_at is None


@pytest.mark.django_db
def test_import_is_atomic_on_write_failure(auth_client, user, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("finance.views.Budget.objects.bulk_create", boom)
    with pytest.raises(RuntimeError):
        auth_client.post("/api/import/", PAYLOAD, format="json")
    assert Transaction.objects.filter(user=user).count() == 0
