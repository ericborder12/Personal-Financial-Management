import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category, Transaction


@pytest.mark.django_db
def test_dashboard_aggregation_excludes_transfers_from_totals():
    user = User.objects.create_user(email="dash@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc1 = Account.objects.create(user=user, name="Cash", initial_balance=2000000)
    acc2 = Account.objects.create(user=user, name="Bank", initial_balance=8000000)
    cat_in = Category.objects.get(user=user, name="Tiền lương", type="income")
    cat_ex = Category.objects.get(user=user, name="Ăn uống", type="expense")

    # Income: 15,000,000 | Expense: 3,000,000 | Transfer: 1,000,000
    Transaction.objects.create(user=user, type="income", amount=15000000, account=acc2, category=cat_in, date=date(2026, 11, 1))
    Transaction.objects.create(user=user, type="expense", amount=3000000, account=acc1, category=cat_ex, date=date(2026, 11, 2))
    Transaction.objects.create(user=user, type="transfer", amount=1000000, account=acc2, to_account=acc1, date=date(2026, 11, 3))

    res = client.get("/api/finance/dashboard/?year=2026&month=11")
    assert res.status_code == 200
    data = res.data
    assert data["monthly_income"] == 15000000
    assert data["monthly_expense"] == 3000000
    assert data["monthly_savings"] == 12000000
    assert data["total_balance"] == 22000000
    assert len(data["category_expenses"]) == 1
    assert data["category_expenses"][0]["category_name"] == "Ăn uống"
    assert data["category_expenses"][0]["amount"] == 3000000
    assert data["category_expenses"][0]["percentage"] == 100.0
    assert "monthly_trend" in data
    assert len(data["monthly_trend"]) == 6

    # Test Reports API
    rep = client.get("/api/finance/reports/?start_date=2026-11-01&end_date=2026-11-30")
    assert rep.status_code == 200
    assert rep.data["total_income"] == 15000000
    assert rep.data["total_expense"] == 3000000
    assert rep.data["net_savings"] == 12000000


@pytest.mark.django_db
def test_dashboard_empty_user():
    user = User.objects.create_user(email="empty@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.get("/api/finance/dashboard/")
    assert res.status_code == 200
    data = res.data
    assert data["monthly_income"] == 0
    assert data["monthly_expense"] == 0
    assert data["monthly_savings"] == 0
    assert data["total_balance"] == 0
    assert data["category_expenses"] == []
    assert len(data["monthly_trend"]) == 6
    assert data["recent_transactions"] == []


@pytest.mark.django_db
def test_reports_invalid_date_range():
    user = User.objects.create_user(email="rep_err@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.get("/api/finance/reports/?start_date=2026-12-01&end_date=2026-11-01")
    assert res.status_code == 400
