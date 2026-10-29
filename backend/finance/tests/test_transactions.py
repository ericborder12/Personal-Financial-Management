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
    assert body["count"] == 1 and body["results"][0]["category"] == "Ăn uống"


@pytest.mark.django_db
def test_user_cannot_see_or_delete_other_users_transaction(auth_client, other):
    tx = Transaction.objects.create(user=other, **PAYLOAD)
    assert auth_client.get("/api/transactions/").json()["results"] == []
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


@pytest.mark.django_db
def test_list_filters_searches_orders_and_paginates(auth_client, user):
    for amount, category, note, date in [
        (100, "Khác", "cà phê", "2026-10-01"),
        (500, "Ăn uống", "bữa trưa", "2026-10-02"),
        (900, "Ăn uống", "bữa tối", "2026-10-03"),
    ]:
        Transaction.objects.create(
            user=user,
            type="expense",
            amount=amount,
            category=category,
            note=note,
            date=date,
        )

    response = auth_client.get(
        "/api/transactions/?category=%C4%82n%20u%E1%BB%91ng&min_amount=400&ordering=amount&page_size=1"
    )
    assert response.status_code == 200
    assert response.json()["count"] == 2
    assert response.json()["results"][0]["amount"] == 500
    assert response.json()["next"]

    searched = auth_client.get("/api/transactions/?search=c%C3%A0%20ph%C3%AA")
    assert searched.json()["count"] == 1
    assert searched.json()["results"][0]["amount"] == 100


@pytest.mark.django_db
def test_list_rejects_invalid_filter_ranges(auth_client):
    assert (
        auth_client.get("/api/transactions/?min_amount=500&max_amount=100").status_code
        == 400
    )


@pytest.mark.django_db
def test_list_filters_by_date_range(auth_client, user):
    for date in ["2026-10-01", "2026-10-15", "2026-10-31"]:
        Transaction.objects.create(
            user=user, type="expense", amount=100, category="Khác", date=date
        )
    response = auth_client.get(
        "/api/transactions/?start_date=2026-10-10&end_date=2026-10-20"
    )
    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["date"] == "2026-10-15"


@pytest.mark.django_db
def test_transaction_summary_aggregates_all_pages(auth_client, user):
    Transaction.objects.create(
        user=user, type="income", amount=1000, category="Lương", date="2026-10-05"
    )
    Transaction.objects.create(
        user=user, type="expense", amount=200, category="Ăn uống", date="2026-10-07"
    )
    Transaction.objects.create(
        user=user, type="expense", amount=300, category="Ăn uống", date="2026-09-30"
    )
    response = auth_client.get("/api/transactions/summary/?month=2026-10")
    assert response.status_code == 200
    assert response.json() == {
        "income": 1000,
        "expense": 500,
        "month_income": 1000,
        "month_expense": 200,
        "income_through_month": 1000,
        "expense_before_month": 300,
        "spent_by_category": {"Ăn uống": 200},
    }
