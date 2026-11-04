import pytest
from datetime import date
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from accounts.models import User
from finance.models import Account, Category, Transaction

@pytest.mark.django_db
def test_account_balance_reflects_income_expense_and_transfer():
    user = User.objects.create_user(email="tx@finance.test", password="pass")
    cash = Account.objects.create(user=user, name="Tiền mặt", type="cash", initial_balance=1000000)
    bank = Account.objects.create(user=user, name="Vietcombank", type="bank", initial_balance=5000000)
    salary_cat = Category.objects.get(user=user, name="Tiền lương", type="income")
    food_cat = Category.objects.get(user=user, name="Ăn uống", type="expense")

    Transaction.objects.create(user=user, type="income", amount=2000000, account=bank, category=salary_cat, date=date.today())
    Transaction.objects.create(user=user, type="expense", amount=200000, account=cash, category=food_cat, date=date.today())
    Transaction.objects.create(user=user, type="transfer", amount=500000, account=bank, to_account=cash, date=date.today())

    assert cash.current_balance == 1000000 - 200000 + 500000  # 1,300,000
    assert bank.current_balance == 5000000 + 2000000 - 500000  # 6,500,000

@pytest.mark.django_db
def test_transfer_validation():
    user = User.objects.create_user(email="val@finance.test", password="pass")
    acc = Account.objects.create(user=user, name="Ví", type="cash", initial_balance=1000000)
    tx = Transaction(user=user, type="transfer", amount=500000, account=acc, to_account=acc, date=date.today())
    with pytest.raises(ValidationError):
        tx.clean()
