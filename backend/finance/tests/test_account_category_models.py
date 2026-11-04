import pytest
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_create_account_and_category():
    user = User.objects.create_user(email="test1@finance.test", password="pass")
    acc = Account.objects.create(user=user, name="Ví tiền mặt phụ", type="cash", initial_balance=500000)
    cat = Category.objects.create(user=user, name="Du lịch", type="expense", icon="plane", color="#EF4444")
    assert acc.current_balance == 500000
    assert cat.is_active is True
    # Verify default seeded categories also exist
    assert Category.objects.filter(user=user, name="Ăn uống").exists()

@pytest.mark.django_db
def test_seed_default_categories_for_user():
    user = User.objects.create_user(email="test2@finance.test", password="pass")
    assert Category.objects.filter(user=user, type="expense").count() >= 5
    assert Category.objects.filter(user=user, type="income").count() >= 2
