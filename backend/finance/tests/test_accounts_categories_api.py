import pytest
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_accounts_api_crud_and_computed_balance():
    user = User.objects.create_user(email="api_acc@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.post("/api/finance/accounts/", {
        "name": "Momo",
        "type": "ewallet",
        "initial_balance": 100000,
        "color": "#A21CAF",
        "icon": "wallet"
    })
    assert res.status_code == 201
    assert res.data["current_balance"] == 100000
    assert res.data["name"] == "Momo"

    list_res = client.get("/api/finance/accounts/")
    assert list_res.status_code == 200
    names = [a["name"] for a in list_res.data]
    assert "Momo" in names

@pytest.mark.django_db
def test_category_soft_delete():
    user = User.objects.create_user(email="api_cat@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    cat = Category.objects.create(user=user, name="Shopping", type="expense")

    del_res = client.delete(f"/api/finance/categories/{cat.id}/")
    assert del_res.status_code == 204
    cat.refresh_from_db()
    assert cat.is_active is False

    # Should not appear in active categories list
    list_res = client.get("/api/finance/categories/?type=expense")
    assert list_res.status_code == 200
    ids = [c["id"] for c in list_res.data]
    assert str(cat.id) not in ids
