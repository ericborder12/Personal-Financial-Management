import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Category


@pytest.mark.django_db
def test_full_personal_finance_lifecycle():
    user = User.objects.create_user(email="lifecycle@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    # 1. Verify default account and categories seeded on user creation
    acc_list_res = client.get("/api/finance/accounts/")
    assert acc_list_res.status_code == 200
    assert len(acc_list_res.data) >= 1  # Default "Tiền mặt" created by signal

    # 2. Create additional accounts: Cash and Bank
    acc_cash_res = client.post("/api/finance/accounts/", {
        "name": "Tiền trong ví",
        "type": "cash",
        "initial_balance": 1000000,
    })
    assert acc_cash_res.status_code == 201
    acc_cash = acc_cash_res.data

    acc_bank_res = client.post("/api/finance/accounts/", {
        "name": "Vietcombank",
        "type": "bank",
        "initial_balance": 10000000,
    })
    assert acc_bank_res.status_code == 201
    acc_bank = acc_bank_res.data

    # 3. Retrieve default categories
    cat_food = Category.objects.get(user=user, name="Ăn uống", type="expense")
    cat_salary = Category.objects.get(user=user, name="Tiền lương", type="income")

    # 4. Income: Receive 20,000,000 salary into Vietcombank
    inc_res = client.post("/api/finance/transactions/", {
        "type": "income",
        "amount": 20000000,
        "account": acc_bank["id"],
        "category": str(cat_salary.id),
        "date": str(date.today()),
        "note": "Lương tháng này",
    })
    assert inc_res.status_code == 201

    # 5. Expense: Spend 2,500,000 on Food from Cash
    exp_res = client.post("/api/finance/transactions/", {
        "type": "expense",
        "amount": 2500000,
        "account": acc_cash["id"],
        "category": str(cat_food.id),
        "date": str(date.today()),
        "note": "Ăn uống liên hoan",
    })
    assert exp_res.status_code == 201

    # 6. Internal Transfer: Transfer 3,000,000 from Bank to Cash
    trf_res = client.post("/api/finance/transactions/", {
        "type": "transfer",
        "amount": 3000000,
        "account": acc_bank["id"],
        "to_account": acc_cash["id"],
        "date": str(date.today()),
        "note": "Rút tiền chi tiêu",
    })
    assert trf_res.status_code == 201

    # Verify Account Balances
    acc_detail_bank = client.get(f"/api/finance/accounts/{acc_bank['id']}/").data
    # Bank: initial (10M) + income (20M) - transfer out (3M) = 27M
    assert acc_detail_bank["current_balance"] == 27000000

    acc_detail_cash = client.get(f"/api/finance/accounts/{acc_cash['id']}/").data
    # Cash: initial (1M) - expense (2.5M) + transfer in (3M) = 1.5M
    assert acc_detail_cash["current_balance"] == 1500000

    # 7. Set Monthly Budget for Food: limit = 3,000,000 VNĐ
    budget_post = client.post("/api/finance/budgets/", {
        "category": str(cat_food.id),
        "limit": 3000000,
        "year": date.today().year,
        "month": date.today().month,
    })
    assert budget_post.status_code == 201

    # Check Budget Progress
    budget_res = client.get(f"/api/finance/budgets/?year={date.today().year}&month={date.today().month}").data
    food_budget = next(b for b in budget_res if b["category_id"] == str(cat_food.id))
    assert food_budget["spent"] == 2500000
    assert food_budget["remaining"] == 500000
    # 2,500,000 / 3,000,000 = 83.3% -> status is "warning" (>= 80% and < 100%)
    assert food_budget["status"] == "warning"
    assert food_budget["percentage"] == 83.3

    # 8. Dashboard Analytics & Aggregation
    dash = client.get(f"/api/finance/dashboard/?year={date.today().year}&month={date.today().month}").data
    assert dash["monthly_income"] == 20000000
    assert dash["monthly_expense"] == 2500000
    assert dash["monthly_savings"] == 17500000
    # Total balance = 27M + 1.5M + 0 (default seed) = 28.5M
    assert dash["total_balance"] == 28500000
    assert len(dash["category_expenses"]) == 1
    assert dash["category_expenses"][0]["amount"] == 2500000

    # 9. Reports Analytics
    rep = client.get(f"/api/finance/reports/?start_date={date.today()}&end_date={date.today()}").data
    assert rep["total_income"] == 20000000
    assert rep["total_expense"] == 2500000
    assert rep["net_savings"] == 17500000
