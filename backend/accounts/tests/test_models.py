import pytest
from accounts.models import User


@pytest.mark.django_db
def test_create_user_hashes_password_and_creates_profile():
    user = User.objects.create_user(email="a@example.com", password="strongpass123")
    assert user.email == "a@example.com"
    assert user.check_password("strongpass123")
    assert user.profile.initial_balance == 0
    assert user.profile.imported_at is None


@pytest.mark.django_db
def test_create_superuser_sets_flags():
    admin = User.objects.create_superuser(email="admin@example.com", password="strongpass123")
    assert admin.is_staff is True
    assert admin.is_superuser is True
