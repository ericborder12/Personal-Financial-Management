import json
import os
import urllib.request
import urllib.error
from datetime import date
from django.utils import timezone
from django.db.models import Sum

from .models import Account, Transaction, Budget, SavingsDeposit


class AIConfigurationError(Exception):
    pass


class AIUpstreamError(Exception):
    pass


def format_currency_vnd(amount):
    return f"{amount:,.0f} ₫".replace(",", ".")


def build_user_financial_context(user):
    # Accounts and Balances
    accounts = Account.objects.filter(user=user, is_active=True).exclude(type="savings")
    total_balance = sum(acc.current_balance for acc in accounts)

    # Active Savings Deposits
    active_savings = SavingsDeposit.objects.filter(user=user, is_settled=False)
    total_savings = sum(s.amount for s in active_savings)

    # Current month spending & income
    today = timezone.now().date()
    start_of_month = date(today.year, today.month, 1)

    month_txs = Transaction.objects.filter(user=user, date__gte=start_of_month, date__lte=today)
    month_income = month_txs.filter(type="income").aggregate(s=Sum("amount"))["s"] or 0
    month_expense = month_txs.filter(type="expense").aggregate(s=Sum("amount"))["s"] or 0

    # Top expense categories
    expense_by_cat = (
        month_txs.filter(type="expense", category__isnull=False)
        .values("category__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")[:3]
    )
    top_categories = [
        f"{c['category__name']}: {format_currency_vnd(c['total'])}"
        for c in expense_by_cat
    ]

    # Budgets
    budgets = Budget.objects.filter(user=user, year=today.year, month=today.month)
    budget_count = budgets.count()

    # Savings details
    savings_list = [
        f"- {s.bank_name}: {format_currency_vnd(s.amount)} (Kỳ hạn {s.term_months} tháng, {s.interest_rate}%/năm, đáo hạn {s.maturity_date})"
        for s in active_savings
    ]

    display_name = getattr(user, "display_name", "") or getattr(user, "email", "Người dùng")

    return {
        "display_name": display_name,
        "total_balance": total_balance,
        "total_savings": total_savings,
        "month_income": month_income,
        "month_expense": month_expense,
        "top_categories": top_categories,
        "budget_count": budget_count,
        "savings_list": savings_list,
    }


def build_system_prompt(user):
    ctx = build_user_financial_context(user)

    top_cat_text = ", ".join(ctx["top_categories"]) if ctx["top_categories"] else "Chưa có danh mục chi tiêu"
    savings_text = "\n".join(ctx["savings_list"]) if ctx["savings_list"] else "Chưa có sổ tiết kiệm nào."

    system_prompt = f"""Bạn là Trợ lý Thông minh & Chuyên gia Tư vấn Tài chính Cá nhân của ứng dụng FinanceFlow.
Người dùng hiện tại: {ctx['display_name']}

=== DỮ LIỆU TÀI CHÍNH HIỆN TẠI CỦA NGƯỜI DÙNG ===
- Tổng số dư khả dụng (tiền mặt, ngân hàng, ví điện tử): {format_currency_vnd(ctx['total_balance'])}
- Tổng tiền gửi tiết kiệm có kỳ hạn: {format_currency_vnd(ctx['total_savings'])}
- Thu nhập trong tháng này: {format_currency_vnd(ctx['month_income'])}
- Chi tiêu trong tháng này: {format_currency_vnd(ctx['month_expense'])}
- Các danh mục chi nhiều nhất tháng: {top_cat_text}
- Số ngân sách đang theo dõi trong tháng: {ctx['budget_count']}
- Các sổ tiết kiệm đang hoạt động:
{savings_text}

=== HƯỚNG DẪN CÁC TÍNH NĂNG CỦA FINANCEFLOW ===
1. Tổng quan (Dashboard): Thống kê tổng tài sản, dòng tiền tháng, danh mục chi tiêu, tình hình ngân sách và các giao dịch gần nhất.
2. Sổ giao dịch: Xem lịch sử thu, chi, chuyển tiền. Hỗ trợ tìm kiếm, lọc theo ngày/loại/khoảng tiền, xuất dữ liệu. Nút "+ Giao dịch mới" để thêm nhanh.
3. Tài khoản tiền: Quản lý các ví (Tiền mặt, Ngân hàng, Ví điện tử). Hỗ trợ xem số dư từng tài khoản.
4. Sổ tiết kiệm (Mới): Quản lý sổ tiết kiệm ngân hàng (lãi suất, kỳ hạn, ngày đáo hạn, tiền lãi dự kiến). Cho phép mở sổ (tự động luân chuyển tiền), tất toán sổ (hoàn gốc và nhận lãi vào tài khoản). Kèm theo Máy tính lãi suất nhanh (Savings Calculator) để thử nghiệm các gói gửi tiền.
5. Danh mục thu chi: Tùy chỉnh danh mục chi tiêu/thu nhập với màu sắc và biểu tượng riêng.
6. Ngân sách tháng: Thiết lập hạn mức chi tiêu cho từng danh mục để nhận cảnh báo khi vượt mức.
7. Báo cáo & Phân tích: Biểu đồ trực quan so sánh thu chi theo thời gian, tỷ trọng danh mục chi tiêu.

=== NGUYÊN TẮC TƯ VẤN TÀI CHÍNH ===
1. Quy tắc 50/30/20: 50% nhu cầu thiết yếu (nhà ở, ăn uống, đi lại), 30% sở thích/mong muốn, 20% tiết kiệm & đầu tư.
2. Với các câu hỏi cụ thể (ví dụ: lương 10 triệu, tiền nhà 4 triệu): Hãy phân tích tỷ lệ (tiền nhà 40% là khá cao so với mức 30% lý tưởng), chỉ ra cụ thể nên giảm ở đâu (ăn ngoài, mua sắm không thiết yếu), và gợi ý số tiền tiết kiệm khả thi (ví dụ 1 - 1.5 triệu/tháng).
3. Đưa ra lời khuyên thực tế, thân thiện bằng tiếng Việt, có số liệu và gạch đầu dòng rõ ràng.
4. Nếu người dùng hỏi về tài chính cá nhân của họ trong app, hãy dựa vào số liệu thực tế phía trên để đưa ra đánh giá chính xác.
"""
    return system_prompt


def request_cloudflare_api(account_id, api_token, model, payload):
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        raise AIUpstreamError(f"Cloudflare AI API Error ({e.code}): {err_body}")
    except Exception as e:
        raise AIUpstreamError(f"Lỗi kết nối tới Cloudflare AI: {str(e)}")


def call_cloudflare_ai(messages, user):
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.environ.get("CLOUDFLARE_API_TOKEN")
    model = os.environ.get("CLOUDFLARE_AI_MODEL", "@cf/meta/llama-3.1-8b-instruct")

    if not account_id or not api_token:
        raise AIConfigurationError(
            "Chưa cấu hình CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_API_TOKEN trong file .env của backend. "
            "Vui lòng thêm thông tin tài khoản Cloudflare Workers AI để kích hoạt tính năng này."
        )

    system_prompt = build_system_prompt(user)

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            formatted_messages.append({
                "role": msg["role"],
                "content": str(msg["content"]),
            })

    payload = {"messages": formatted_messages}
    data = request_cloudflare_api(account_id, api_token, model, payload)

    # Cloudflare Workers AI returns { "result": { "response": "..." }, "success": true }
    result = data.get("result", {})
    if isinstance(result, dict) and "response" in result:
        return result["response"]
    elif isinstance(data, dict) and "response" in data:
        return data["response"]
    return str(result)
