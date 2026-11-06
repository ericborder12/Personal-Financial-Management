import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Transaction, SavingsDeposit, Category


@pytest.mark.django_db
def test_savings_deposit_crud_and_transfer():
    user = User.objects.create_user(email="savings_user@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    # User has a checking account with 50,000,000 VND
    source_acc = Account.objects.create(
        user=user, name="Tài khoản VCB", type="bank", initial_balance=50000000
    )

    # 1. POST /api/finance/savings/
    res = client.post(
        "/api/finance/savings/",
        {
            "bank_name": "Vietcombank",
            "source_account": str(source_acc.id),
            "amount": 20000000,
            "start_date": str(date(2026, 1, 1)),
            "term_months": 6,
            "interest_rate": 6.00,
            "payout_type": "end_of_term",
            "notes": "Sổ 6 tháng lãi suất tốt",
        },
    )
    assert res.status_code == 201
    data = res.json()
    deposit_id = data["id"]
    assert data["estimated_interest"] == 600000
    assert data["maturity_date"] == "2026-07-01"

    # Source account balance should be reduced to 30,000,000
    source_acc.refresh_from_db()
    assert source_acc.current_balance == 30000000

    # Ensure NO expense transaction was created! (only transfer)
    assert Transaction.objects.filter(user=user, type="expense").count() == 0
    assert Transaction.objects.filter(user=user, type="transfer").count() == 1

    # 2. GET /api/finance/savings/
    res_list = client.get("/api/finance/savings/")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert len(list_data["results"]) == 1
    assert list_data["summary"]["total_deposit"] == 20000000
    assert list_data["summary"]["total_estimated_interest"] == 600000
    assert list_data["summary"]["active_count"] == 1

    # 3. POST /api/finance/savings/<id>/settle/
    dest_acc = Account.objects.create(
        user=user, name="Ví tiền mặt", type="cash", initial_balance=5000000
    )
    res_settle = client.post(
        f"/api/finance/savings/{deposit_id}/settle/",
        {
            "destination_account": str(dest_acc.id),
            "actual_interest": 600000,
        },
    )
    assert res_settle.status_code == 200
    settle_data = res_settle.json()
    assert settle_data["is_settled"] is True
    assert settle_data["actual_interest"] == 600000
    assert settle_data["settled_amount"] == 20600000

    # Check destination balance: 5M + 20M (principal) + 600k (interest) = 25,600,000
    dest_acc.refresh_from_db()
    assert dest_acc.current_balance == 25600000

    # Verify interest is recorded under income
    income_tx = Transaction.objects.filter(user=user, type="income").first()
    assert income_tx is not None
    assert income_tx.amount == 600000

    # 4. DELETE /api/finance/savings/<id>/
    # When deleting settled deposit, records remain intact
    res_del = client.delete(f"/api/finance/savings/{deposit_id}/")
    assert res_del.status_code == 204
    assert SavingsDeposit.objects.filter(id=deposit_id).count() == 0
