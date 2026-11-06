# AI Q&A Assistant & Bank Savings Deposits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloudflare Workers AI-powered personal financial & app guidance Q&A assistant along with a full-featured Bank Savings (Term Deposit) tracker and interactive interest calculator to FinanceFlow.

**Architecture:** Django backend exposes secure REST endpoints for managing `SavingsDeposit` records (with ledger transfers preventing distorted expense statistics) and an AI Q&A endpoint that gathers user financial context into a system prompt before calling Cloudflare Workers AI. React frontend provides dedicated sidebar tabs for "Sổ tiết kiệm" and "Trợ lý AI & Hỏi đáp".

**Tech Stack:** Django 5.2, Django REST Framework, Python 3.12, SQLite/PostgreSQL, Cloudflare Workers AI REST API (`@cf/meta/llama-3.1-8b-instruct`), React 19, Tailwind CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-11-06-ai-qa-savings-design.md`

## Global Constraints
- `SavingsDeposit` fund transfers must use `type="transfer"` so source account balance drops without impacting `type="expense"` monthly budgets or expense charts.
- Cloudflare credentials (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`) are exclusively accessed on the Django backend; never exposed to the frontend client.
- The AI endpoint must return helpful, informative errors if Cloudflare credentials are missing rather than a 500 crash.
- All new and existing views must enforce DRF `IsAuthenticated` permissions.
- All frontend pages must support both Light and Dark modes with responsive mobile layouts.

## Review Focus
1. Creating a savings deposit with a source account correctly reduces the source account's `current_balance` without adding any `expense` records.
2. Settling a savings deposit restores principal to the chosen destination account via transfer and records actual interest received as `income`.
3. Early settlement allows custom entry of `actual_interest` without forcing full term interest.
4. Calling `/api/finance/ai/qa/` without Cloudflare credentials configured returns a clean HTTP 503/400 with actionable setup guidance.
5. Deleting an active savings deposit rolls back or deletes its associated transfer transaction so user funds are not lost.

---

### Task 1: SavingsDeposit Model & Migration

**Files:**
- Modify: `backend/finance/models.py`
- Create: `backend/finance/migrations/0002_savings_deposit.py` (via `makemigrations`)
- Test: `backend/finance/tests/test_savings_models.py`

**Interfaces:**
- Consumes: `Account`, `User` from `finance.models` and `django.contrib.auth`
- Produces: `SavingsDeposit` model with properties `maturity_date` and `estimated_interest`, plus `Account.ACCOUNT_TYPES` updated with `("savings", "Sổ tiết kiệm")`.

- [ ] **Step 1: Write tests for SavingsDeposit model**
Create `backend/finance/tests/test_savings_models.py`:
```python
import datetime
import pytest
from django.contrib.auth import get_user_model
from finance.models import Account, SavingsDeposit

User = get_user_model()

@pytest.mark.django_db
def test_savings_deposit_calculation():
    user = User.objects.create_user(username="testuser", email="test@example.com")
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
```

- [ ] **Step 2: Run test to verify it fails**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_savings_models.py -q`
Expected: FAIL (ImportError / model not found)

- [ ] **Step 3: Implement SavingsDeposit in `backend/finance/models.py`**
- Add `("savings", "Sổ tiết kiệm")` to `Account.ACCOUNT_TYPES`.
- Add `SavingsDeposit` model with `bank_name`, `amount`, `start_date`, `term_months`, `interest_rate`, `payout_type`, `source_account`, `savings_account`, `is_settled`, `settled_at`, `actual_interest`, `settled_amount`, `notes`, `created_at`.
- Add `@property maturity_date` and `@property estimated_interest`.
- Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/python backend/manage.py makemigrations finance`

- [ ] **Step 4: Run test to verify it passes**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_savings_models.py -q`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/finance/models.py backend/finance/migrations/ backend/finance/tests/test_savings_models.py
git commit -m "feat(finance): add SavingsDeposit model and migration"
```

---

### Task 2: SavingsDeposit Serializers, Views & Settlement Logic

**Files:**
- Modify: `backend/finance/serializers.py`
- Modify: `backend/finance/views.py`
- Modify: `backend/finance/urls.py`
- Test: `backend/finance/tests/test_savings_views.py`

**Interfaces:**
- Consumes: `SavingsDeposit`, `Account`, `Transaction`, `Category`
- Produces: `SavingsDepositSerializer`, `SavingsDepositViewSet` mounted at `/api/finance/savings/` with custom action `POST /api/finance/savings/<id>/settle/`.

- [ ] **Step 1: Write tests for Savings Deposit API endpoints**
Create `backend/finance/tests/test_savings_views.py` verifying:
1. `GET /api/finance/savings/` returns user deposits and summary stats.
2. `POST /api/finance/savings/` creates deposit and transfers amount from `source_account` to a savings `Account` without increasing `expense`.
3. `POST /api/finance/savings/<id>/settle/` returns principal to destination account and creates an `income` transaction for `actual_interest`.
4. `DELETE /api/finance/savings/<id>/` reverts/cleans up the transfer transaction.

- [ ] **Step 2: Run test to verify it fails**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_savings_views.py -q`
Expected: FAIL (404 on `/api/finance/savings/`)

- [ ] **Step 3: Implement Serializers, ViewSet & URLs**
- In `backend/finance/serializers.py`: create `SavingsDepositSerializer` exposing computed fields `maturity_date` and `estimated_interest`.
- In `backend/finance/views.py`: create `SavingsDepositViewSet(ModelViewSet)`:
  - `get_queryset()` filtered to `request.user`.
  - Override `list()` to return `{ "results": data, "summary": { "total_deposit": ..., "total_estimated_interest": ..., "active_count": ..., "maturing_soon_count": ... } }`.
  - In `perform_create()`: if `source_account` provided, ensure user has an `Account(type="savings", name="Sổ tiết kiệm")`, create a `Transaction(type="transfer", account=source, to_account=savings_acc, amount=amount)` and store reference.
  - Action `@action(detail=True, methods=["post"]) def settle(self, request, pk=None)`:
    - Receives `destination_account_id` and `actual_interest`.
    - Creates transfer from savings account back to destination account for principal.
    - If `actual_interest > 0`, gets or creates `Category(type="income", name="Lãi tiết kiệm")` and creates `Transaction(type="income", account=destination, category=cat, amount=actual_interest)`.
    - Marks `is_settled=True`, sets `settled_at=timezone.now().date()`, `actual_interest`, `settled_amount = amount + actual_interest`.
  - In `perform_destroy()`: clean up associated transfer transaction if active.
- Register `router.register(r"savings", SavingsDepositViewSet, basename="savings")` in `backend/finance/urls.py`.

- [ ] **Step 4: Run test to verify it passes**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_savings_views.py -q`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/finance/serializers.py backend/finance/views.py backend/finance/urls.py backend/finance/tests/test_savings_views.py
git commit -m "feat(finance): add SavingsDeposit API with automated transfer & settlement"
```

---

### Task 3: Context-Aware Cloudflare Workers AI Endpoint

**Files:**
- Create: `backend/finance/ai_service.py`
- Create: `backend/finance/ai_views.py`
- Modify: `backend/finance/urls.py`
- Test: `backend/finance/tests/test_ai_views.py`

**Interfaces:**
- Consumes: `request.user`, financial data models (`Account`, `Transaction`, `Budget`, `SavingsDeposit`), environment variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`.
- Produces: `POST /api/finance/ai/qa/` returning `{ "reply": "...", "status": "success" }`.

- [ ] **Step 1: Write tests for AI Q&A endpoint**
Create `backend/finance/tests/test_ai_views.py`:
- Test unauthenticated access returns 401/403.
- Test missing credentials returns graceful 503/400 with helpful configuration message instead of crashing.
- Test mocked Cloudflare Workers AI response returns 200 with formatted reply.
- Test that system prompt generated by `ai_service.py` contains user financial overview (e.g. balance, expenses).

- [ ] **Step 2: Run test to verify it fails**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_ai_views.py -q`
Expected: FAIL

- [ ] **Step 3: Implement `ai_service.py` and `ai_views.py`**
- `backend/finance/ai_service.py`:
  - `build_user_financial_context(user)`: computes total cash/bank/savings balances, month's income & expense, top 3 expense categories, budget status, active savings deposits.
  - `build_system_prompt(user)`: bundles FinanceFlow manual (feature navigation & actions) + financial principles (50/30/20, expense reduction advice, emergency fund) + user financial summary.
  - `call_cloudflare_ai(messages, user)`: calls Cloudflare Workers AI endpoint `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}` with `urllib.request` or `requests`.
- `backend/finance/ai_views.py`:
  - `AIQAView(APIView)`: permission `IsAuthenticated`. Validates `messages` array in body, calls `call_cloudflare_ai()`, handles timeouts and missing credentials gracefully.
- Register `path("ai/qa/", AIQAView.as_view(), name="ai-qa")` in `backend/finance/urls.py`.

- [ ] **Step 4: Run test to verify it passes**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest backend/finance/tests/test_ai_views.py -q`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/finance/ai_service.py backend/finance/ai_views.py backend/finance/urls.py backend/finance/tests/test_ai_views.py
git commit -m "feat(ai): add context-aware Cloudflare AI Q&A endpoint"
```

---

### Task 4: Frontend API Clients, Icons & Navigation

**Files:**
- Modify: `frontend/src/api/finance.js`
- Create: `frontend/src/api/ai.js`
- Modify: `frontend/src/components/common/Icons.jsx`
- Modify: `frontend/src/components/layout/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `client` from `api/client.js`
- Produces: `financeApi.getSavings()`, `createSaving()`, `settleSaving()`, `deleteSaving()`; `aiApi.askQA(messages)`; `IconVault`, `IconSparkles`; tabs `savings` and `qa` in `Sidebar.jsx` and `App.jsx`.

- [ ] **Step 1: Add API functions & Icons**
- In `frontend/src/api/finance.js`: add methods `getSavings()`, `createSaving(payload)`, `settleSaving(id, payload)`, `deleteSaving(id)`.
- Create `frontend/src/api/ai.js`: export `aiApi = { askQA: (messages) => client.post("/api/finance/ai/qa/", { messages }) }`.
- In `frontend/src/components/common/Icons.jsx`: add `IconVault` (piggy bank / safe) and `IconSparkles` (bot / AI sparkles).

- [ ] **Step 2: Update Sidebar & App navigation**
- In `frontend/src/components/layout/Sidebar.jsx`: add:
  - `{ id: "savings", label: "Sổ tiết kiệm", icon: IconVault }`
  - `{ id: "qa", label: "Trợ lý AI & Hỏi đáp", icon: IconSparkles }`
- In `frontend/src/App.jsx`: add imports and rendering when `activeTab === "savings"` and `activeTab === "qa"`.

- [ ] **Step 3: Run frontend lint & build to verify syntax**
Run: `cd frontend && npm run lint`
Expected: PASS (or only existing warnings)

- [ ] **Step 4: Commit**
```bash
git add frontend/src/api/ frontend/src/components/common/Icons.jsx frontend/src/components/layout/Sidebar.jsx frontend/src/App.jsx
git commit -m "feat(ui): add savings and AI Q&A navigation tabs and api clients"
```

---

### Task 5: Bank Savings Management & Calculator Page

**Files:**
- Create: `frontend/src/pages/SavingsPage.jsx`
- Create: `frontend/src/components/savings/SavingsModal.jsx`
- Create: `frontend/src/components/savings/SettleModal.jsx`
- Create: `frontend/src/components/savings/SavingsCalculator.jsx`

**Interfaces:**
- Consumes: `financeApi`, `useAccounts`, `formatVND`
- Produces: Complete Savings page with overview stat cards, active/settled deposits list, add deposit modal, settlement modal, and interactive savings calculator.

- [ ] **Step 1: Implement `SavingsCalculator.jsx`**
- Interactive sliders & inputs: Số tiền gửi (VND), Kỳ hạn (1, 3, 6, 9, 12, 18, 24, 36 tháng), Lãi suất (%/năm), Hình thức nhận lãi (Cuối kỳ / Hàng tháng).
- Live calculation cards: Tổng lãi dự kiến, Tổng nhận khi đáo hạn, Lãi trung bình mỗi tháng.
- Breakdown schedule table displaying month-by-month accrual.

- [ ] **Step 2: Implement `SavingsModal.jsx` and `SettleModal.jsx`**
- `SavingsModal.jsx`: Select source `Account`, Bank name, Amount, Start date, Term (months), Interest rate (%/year), Payout type, Notes. Previews maturity date and expected interest in real-time.
- `SettleModal.jsx`: Displays deposit info, maturity status, allows selecting destination `Account`, displays calculated interest, allows editing `actual_interest` (with helper for early withdrawal).

- [ ] **Step 3: Implement `SavingsPage.jsx`**
- Top summary cards: Tổng tiền gửi (active), Tiền lãi dự kiến, Số lượng sổ đang gửi, Sổ sắp đến hạn (< 30 ngày).
- Segmented control to switch between "Danh sách sổ tiết kiệm" and "Máy tính lãi suất nhanh".
- Action button "[+ Mở sổ tiết kiệm mới]".
- Grid/table of deposits with badge for status (Đang gửi / Đã tất toán), bank icon/color, maturity countdown, and actions ("Tất toán", "Xóa").

- [ ] **Step 4: Run frontend build to verify compilation**
Run: `cd frontend && npm run build`
Expected: Build succeeds without error.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/SavingsPage.jsx frontend/src/components/savings/
git commit -m "feat(ui): add bank savings management and interactive calculator"
```

---

### Task 6: AI Q&A Assistant Page

**Files:**
- Create: `frontend/src/pages/QAPage.jsx`

**Interfaces:**
- Consumes: `aiApi`, `useAuth`, `IconSparkles`
- Produces: Interactive Q&A chat interface with quick suggestion chips, message history, markdown/formatted text rendering, loading states, and reset chat button.

- [ ] **Step 1: Implement `QAPage.jsx`**
- Welcome card introducing FinanceFlow AI Assistant.
- Suggested prompt chips:
  - "Lương 10 triệu, tiền nhà 4 triệu thì phân bổ chi tiêu sao?"
  - "Làm thế nào để thêm một giao dịch chi tiêu mới?"
  - "Đánh giá tình hình chi tiêu tháng này của tôi"
  - "Quy tắc 50/30/20 là gì và áp dụng thế nào?"
  - "Tôi có nên gửi tiết kiệm 6 tháng hay 12 tháng?"
- Chat stream container displaying user messages (right, blue) and AI responses (left, slate/indigo with AI badge).
- Clean text formatting for lists, bullet points, and highlighted numbers.
- Typing / thinking loading state.
- Input box with Send button, Enter to send, Shift+Enter for new line.
- Clear chat button to wipe conversation and restart.
- Banner warning if API returns missing credentials with explanation of how to add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to `backend/.env`.

- [ ] **Step 2: Run frontend build to verify compilation**
Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/QAPage.jsx
git commit -m "feat(ui): add AI Q&A chat page with suggestions and markdown formatting"
```

---

### Task 7: Full System Verification, Git Commit & Push

**Files:**
- Test all backend tests (`backend/finance/tests/`)
- Test frontend build & lint
- Update `README.md` and `.env.example` with `CLOUDFLARE_*` variables

- [ ] **Step 1: Run complete backend pytest suite**
Run: `DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 backend/.venv/bin/pytest -v`
Expected: All tests pass.

- [ ] **Step 2: Run frontend tests & build**
Run: `cd frontend && npm run lint && npm run build`
Expected: Clean build without errors.

- [ ] **Step 3: Update documentation and env examples**
- In `backend/.env.example` and root `.env.example`: document `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`.
- In `README.md`: mention the AI Q&A Assistant and Bank Savings features.

- [ ] **Step 4: Commit and Push to remote repository**
Run:
```bash
git add .
git commit -m "feat: complete AI Q&A assistant and bank savings term deposits with Cloudflare AI"
git push origin <branch>
```
Expected: Successfully pushed to GitHub.
