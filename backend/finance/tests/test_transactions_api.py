import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_create_transfer_via_api():
    user = User.objects.create_user(email="tx_api@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc1 = Account.objects.create(user=user, name="A", initial_balance=1000000)
    acc2 = Account.objects.create(user=user, name="B", initial_balance=500000)

    res = client.post("/api/finance/transactions/", {
        "type": "transfer",
        "amount": 200000,
        "account": str(acc1.id),
        "to_account": str(acc2.id),
        "date": str(date.today()),
        "note": "Chuyển tiền tiết kiệm"
    })
    assert res.status_code == 201

    acc1.refresh_from_db()
    acc2.refresh_from_db()
    assert acc1.current_balance == 800000
    assert acc2.current_balance == 700000

@pytest.mark.django_db
def test_reject_transfer_to_same_account():
    user = User.objects.create_user(email="tx_err@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc = Account.objects.create(user=user, name="A", initial_balance=1000000)

    res = client.post("/api/finance/transactions/", {
        "type": "transfer",
        "amount": 100000,
        "account": str(acc.id),
        "to_account": str(acc.id),
        "date": str(date.today())
    })
    assert res.status_code == 400

@pytest.mark.django_db
def test_reject_cross_user_account():
    u1 = User.objects.create_user(email="u1@finance.test", password="pass")
    u2 = User.objects.create_user(email="u2@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=u1)
    acc_u2 = Account.objects.create(user=u2, name="Victim", initial_balance=1000000)

    res = client.post("/api/finance/transactions/", {
        "type": "expense",
        "amount": 50000,
        "account": str(acc_u2.id),
        "date": str(date.today())
    })
    assert res.status_code == 400
