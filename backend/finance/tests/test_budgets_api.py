import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category, Transaction, Budget

@pytest.mark.django_db
def test_budget_spent_amount_and_percentage():
    user = User.objects.create_user(email="budget@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc = Account.objects.create(user=user, name="Cash", initial_balance=5000000)
    cat = Category.objects.get(user=user, name="Ăn uống", type="expense")

    budget = Budget.objects.create(user=user, category=cat, limit=1000000, year=2026, month=11)
    Transaction.objects.create(user=user, type="expense", amount=850000, account=acc, category=cat, date=date(2026, 11, 2))

    res = client.get("/api/finance/budgets/?year=2026&month=11")
    assert res.status_code == 200
    # find the item for "Ăn uống"
    item = next(b for b in res.data if b["category_id"] == str(cat.id))
    assert item["spent"] == 850000
    assert item["percentage"] == 85.0
    assert item["status"] == "warning"  # 80-99%: warning, >=100%: danger, <80%: safe

@pytest.mark.django_db
def test_set_budget_via_api():
    user = User.objects.create_user(email="budget_set@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    cat = Category.objects.get(user=user, name="Ăn uống", type="expense")

    post_res = client.post("/api/finance/budgets/", {
        "category": str(cat.id),
        "limit": 3000000,
        "year": 2026,
        "month": 11
    })
    assert post_res.status_code in (200, 201)
    b = Budget.objects.get(user=user, category=cat, year=2026, month=11)
    assert b.limit == 3000000
