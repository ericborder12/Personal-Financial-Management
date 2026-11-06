import datetime
import pytest
from django.contrib.auth import get_user_model
from finance.models import Account, SavingsDeposit

User = get_user_model()


@pytest.mark.django_db
def test_savings_deposit_calculation():
    user = User.objects.create_user(email="test@example.com", password="password123")
    deposit = SavingsDeposit.objects.create(
        user=user,
        bank_name="Vietcombank",
        amount=50000000,
        start_date=datetime.date(2026, 1, 1),
        term_months=6,
        interest_rate=6.00,
        payout_type="end_of_term",
    )
    # 50,000,000 * (6.00 / 100) * (6 / 12) = 1,500,000
    assert deposit.estimated_interest == 1500000
    assert deposit.maturity_date == datetime.date(2026, 7, 1)
