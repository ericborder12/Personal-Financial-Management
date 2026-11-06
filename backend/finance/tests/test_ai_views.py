import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, SavingsDeposit
from finance.ai_service import build_user_financial_context, build_system_prompt


@pytest.mark.django_db
def test_ai_qa_unauthenticated():
    client = APIClient()
    res = client.post("/api/finance/ai/qa/", {"messages": [{"role": "user", "content": "Hello"}]})
    assert res.status_code in (401, 403)


@pytest.mark.django_db
def test_ai_qa_missing_credentials():
    user = User.objects.create_user(email="ai_user@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    with patch.dict("os.environ", {}, clear=True):
        res = client.post(
            "/api/finance/ai/qa/",
            {"messages": [{"role": "user", "content": "Tư vấn tài chính"}]},
            format="json",
        )
        assert res.status_code == 503
        data = res.json()
        assert "CLOUDFLARE_ACCOUNT_ID" in data.get("detail", "") or "CLOUDFLARE_API_TOKEN" in data.get("detail", "")


@pytest.mark.django_db
def test_ai_service_context_builder():
    user = User.objects.create_user(email="context_user@finance.test", password="pass", display_name="Nguyễn Văn A")
    Account.objects.create(user=user, name="Ví tiền", type="cash", initial_balance=10000000)
    SavingsDeposit.objects.create(
        user=user,
        bank_name="Vietcombank",
        amount=30000000,
        start_date="2026-01-01",
        term_months=6,
        interest_rate=6.0,
    )

    ctx = build_user_financial_context(user)
    assert ctx["display_name"] == "Nguyễn Văn A"
    assert ctx["total_balance"] == 10000000
    assert ctx["total_savings"] == 30000000

    prompt = build_system_prompt(user)
    assert "FinanceFlow" in prompt
    assert "10.000.000" in prompt
    assert "Vietcombank" in prompt


@pytest.mark.django_db
def test_ai_qa_mocked_success():
    user = User.objects.create_user(email="ai_success@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    fake_env = {
        "CLOUDFLARE_ACCOUNT_ID": "mock-acc-id",
        "CLOUDFLARE_API_TOKEN": "mock-token",
        "CLOUDFLARE_AI_MODEL": "@cf/meta/llama-3.1-8b-instruct",
    }

    mock_cf_response = {
        "result": {
            "response": "Chào bạn, với mức lương 10 triệu và tiền nhà 4 triệu..."
        },
        "success": True,
    }

    with patch.dict("os.environ", fake_env):
        with patch("finance.ai_service.request_cloudflare_api", return_value=mock_cf_response):
            res = client.post(
                "/api/finance/ai/qa/",
                {
                    "messages": [
                        {"role": "user", "content": "Lương 10 triệu thì chi tiêu sao?"}
                    ]
                },
                format="json",
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "success"
            assert "10 triệu" in data["reply"]
