# Personal Finance Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, multi-tenant personal finance management web application featuring accounts, custom categories, income/expense/transfer transactions, monthly category budgets, analytics reports, and a responsive dashboard.

**Architecture:** Extend existing Django 5.2 + DRF backend with modular models (`Account`, `Category`, `Transaction`, `Budget`) and dynamic single-source-of-truth SQL aggregations for account balances and monthly cash flows. Rebuild the frontend with React 19, Tailwind CSS v4, and Lucide icons, providing a responsive Swiss-style UI (Sidebar, Topbar, Metric Cards, Charts, and Data Tables).

**Tech Stack:** Python 3.12, Django 5.2, Django REST Framework, PostgreSQL 16, pytest-django, React 19, Vite, Tailwind CSS v4.

**Spec:** [docs/superpowers/specs/2026-11-04-personal-finance-management-design.md](file:///home/ericborder12/finance-app/docs/superpowers/specs/2026-11-04-personal-finance-management-design.md)

---

## Global Constraints

- Python 3.12+, Django 5.2, DRF, PostgreSQL 16 (dev container on port 5432).
- Node 24+, React 19, Vite, Tailwind CSS v4.
- All monetary amounts stored as `BigIntegerField` in VNĐ (positive integers for transactions, initial balances ≥ 0).
- Multi-user isolation enforced on all queries using `filter(user=request.user)`.
- Internal transfer transactions must **never** contribute to income or expense totals in financial summaries.
- Deleting a category that has transactions must use soft-delete (`is_active = False`) to preserve past audit logs.
- `total_balance` on the dashboard is the current all-time net worth across active accounts as of today.
- `GET /api/finance/dashboard/?year=YYYY&month=MM` returns current month scalars, `monthly_trend` (last 6 months of income/expense for the bar chart), category expenses, recent transactions, and budget progress.
- `GET /api/finance/budgets/?year=YYYY&month=MM` lists all active expense categories with their budget limit (0 if unconfigured) and spent amount.

---

## Review Focus

1. **Negative or zero transaction amounts:** Reject with 400 Bad Request; constraint `amount > 0` must hold in DB and serializer.
2. **Transfer between the exact same account:** Reject with 400 Bad Request when `account == to_account`.
3. **Cross-user account or category reference:** When creating a transaction, verifying that `account`, `to_account`, and `category` belong to the authenticated user.
4. **Soft-deleted category behavior:** Soft-deleted categories must be excluded from transaction creation options, but must remain visible with proper names in past transaction records and historic reports.
5. **Transfer balance consistency:** Deleting or modifying a transfer transaction must reflect immediately on both source and destination account balances without manual reconciliation.
6. **Data migration for existing records:** For any user with existing transactions, the migration synthesizes a default "Tiền mặt" (`cash`) account with `initial_balance = Profile.initial_balance` and binds orphan transactions to it.

---

## Tasks

### Task 1: Account and Category Models with Default Seeding

**Files:**
- Modify: `backend/finance/models.py`
- Create: `backend/finance/signals.py`
- Create: `backend/finance/tests/test_account_category_models.py`

**Interfaces:**
- Produces: `Account(user, name, type, initial_balance, color, icon, is_active)`
- Produces: `Category(user, name, type, icon, color, is_default, is_active)`
- Produces: Signal `seed_default_categories(user)`

- [ ] **Step 1: Write failing tests for Account and Category models and seeding**

```python
# backend/finance/tests/test_account_category_models.py
import pytest
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_create_account_and_category():
    user = User.objects.create_user(email="test1@finance.test", password="pass")
    acc = Account.objects.create(user=user, name="Ví tiền mặt", type="cash", initial_balance=500000)
    cat = Category.objects.create(user=user, name="Ăn uống", type="expense", icon="utensils", color="#EF4444")
    assert acc.current_balance == 500000
    assert cat.is_active is True

@pytest.mark.django_db
def test_seed_default_categories_for_user():
    from finance.signals import seed_default_categories
    user = User.objects.create_user(email="test2@finance.test", password="pass")
    seed_default_categories(user)
    assert Category.objects.filter(user=user, type="expense").count() >= 5
    assert Category.objects.filter(user=user, type="income").count() >= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_account_category_models.py -q`
Expected: FAIL with `ImportError: cannot import name 'Account'`

- [ ] **Step 3: Implement Account and Category in `backend/finance/models.py` and `signals.py`**

Define `Account` and `Category` models with UUID primary key, appropriate indexes, `is_active=True`, and `seed_default_categories(user)` helper. Create and apply migration:
`backend/.venv/bin/python backend/manage.py makemigrations finance && backend/.venv/bin/python backend/manage.py migrate`

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_account_category_models.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/models.py backend/finance/signals.py backend/finance/migrations/ backend/finance/tests/
git commit -m "feat(finance): add Account and Category models with default category seeding"
```

---

### Task 2: Transaction Model Refactor for Transfers & Integrity Constraints

**Files:**
- Modify: `backend/finance/models.py`
- Modify: `backend/finance/tests/test_transaction_models.py`

**Interfaces:**
- Consumes: `Account`, `Category` from Task 1
- Produces: `Transaction(user, type, amount, account, to_account, category, date, note)` with `current_balance` on `Account`

- [ ] **Step 1: Write failing tests for Transactions & Account Balance computation**

```python
# backend/finance/tests/test_transaction_models.py
import pytest
from datetime import date
from accounts.models import User
from finance.models import Account, Category, Transaction

@pytest.mark.django_db
def test_account_balance_reflects_income_expense_and_transfer():
    user = User.objects.create_user(email="tx@finance.test", password="pass")
    cash = Account.objects.create(user=user, name="Tiền mặt", type="cash", initial_balance=1000000)
    bank = Account.objects.create(user=user, name="Vietcombank", type="bank", initial_balance=5000000)
    salary_cat = Category.objects.create(user=user, name="Lương", type="income")
    food_cat = Category.objects.create(user=user, name="Ăn uống", type="expense")

    Transaction.objects.create(user=user, type="income", amount=2000000, account=bank, category=salary_cat, date=date.today())
    Transaction.objects.create(user=user, type="expense", amount=200000, account=cash, category=food_cat, date=date.today())
    Transaction.objects.create(user=user, type="transfer", amount=500000, account=bank, to_account=cash, date=date.today())

    assert cash.current_balance == 1000000 - 200000 + 500000  # 1,300,000
    assert bank.current_balance == 5000000 + 2000000 - 500000  # 6,500,000
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_transaction_models.py -q`
Expected: FAIL

- [ ] **Step 3: Implement updated Transaction model and Account.current_balance property**

Update `Transaction` model with `to_account` (ForeignKey to Account, null=True, blank=True), `category` (ForeignKey to Category, null=True, blank=True), and add clean validation ensuring `to_account != account` when `type == 'transfer'`. Add property/queryset annotation for `Account.current_balance`.
Generate and run migrations.

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_transaction_models.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/models.py backend/finance/migrations/ backend/finance/tests/
git commit -m "feat(finance): update Transaction model with transfer support and computed account balance"
```

---

### Task 3: Account and Category REST APIs

**Files:**
- Create: `backend/finance/serializers.py` (AccountSerializer, CategorySerializer)
- Modify: `backend/finance/views.py` (AccountViewSet/APIViews, CategoryViewSet/APIViews)
- Modify: `backend/finance/urls.py`
- Create: `backend/finance/tests/test_accounts_categories_api.py`

**Interfaces:**
- Produces: `GET /api/finance/accounts/`, `POST /api/finance/accounts/`, `DELETE /api/finance/accounts/{id}/`
- Produces: `GET /api/finance/categories/`, `POST /api/finance/categories/`, `DELETE /api/finance/categories/{id}/`

- [ ] **Step 1: Write failing tests for Accounts and Categories APIs**

```python
# backend/finance/tests/test_accounts_categories_api.py
import pytest
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_accounts_api_crud_and_computed_balance():
    user = User.objects.create_user(email="api_acc@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.post("/api/finance/accounts/", {"name": "Momo", "type": "ewallet", "initial_balance": 100000, "color": "#A21CAF", "icon": "wallet"})
    assert res.status_code == 201
    assert res.data["current_balance"] == 100000

    list_res = client.get("/api/finance/accounts/")
    assert len(list_res.data) == 1

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_accounts_categories_api.py -q`
Expected: FAIL

- [ ] **Step 3: Implement Account & Category Serializers and Views in `backend/finance`**

Implement DRF serializers with `current_balance` read-only field, and viewsets filtering strictly by `user=request.user`, `is_active=True`. Override `destroy` on Category and Account to perform soft-delete (`instance.is_active = False; instance.save()`).

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_accounts_categories_api.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/serializers.py backend/finance/views.py backend/finance/urls.py backend/finance/tests/
git commit -m "feat(finance): implement Account and Category REST APIs"
```

---

### Task 4: Transaction & Transfer REST APIs

**Files:**
- Modify: `backend/finance/serializers.py` (TransactionSerializer)
- Modify: `backend/finance/views.py` (TransactionViewSet/ListCreateAPIView)
- Create: `backend/finance/tests/test_transactions_api.py`

**Interfaces:**
- Consumes: `Account`, `Category`, `Transaction`
- Produces: `GET /api/finance/transactions/` (paginated, filtered), `POST /api/finance/transactions/` (handles income, expense, transfer)

- [ ] **Step 1: Write failing tests for Transactions API including Transfers**

```python
# backend/finance/tests/test_transactions_api.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_transactions_api.py -q`
Expected: FAIL

- [ ] **Step 3: Implement TransactionSerializer and TransactionViewSet in `backend/finance`**

Validate that `amount > 0`, `account` belongs to `request.user`, `to_account` belongs to `request.user` and `to_account != account` when `type == 'transfer'`. Add filtering by `type`, `account`, `category`, `start_date`, `end_date`, and full-text keyword search on `note`.

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_transactions_api.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/serializers.py backend/finance/views.py backend/finance/tests/
git commit -m "feat(finance): implement Transaction REST API with Transfer support and validation"
```

---

### Task 5: Budget Model, Monthly Progress, & Threshold Alert APIs

**Files:**
- Modify: `backend/finance/models.py` (Budget model update)
- Modify: `backend/finance/serializers.py`
- Modify: `backend/finance/views.py`
- Create: `backend/finance/tests/test_budgets_api.py`

**Interfaces:**
- Produces: `GET /api/finance/budgets/?month=11&year=2026`, `POST /api/finance/budgets/`

- [ ] **Step 1: Write failing tests for Budget tracking & calculation**

```python
# backend/finance/tests/test_budgets_api.py
import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category, Transaction, Budget

@pytest.mark.django_db
def test_budget_spent_amount_and_percentage():
    user = User.objects.create_user(email="budget@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc = Account.objects.create(user=user, name="Cash", initial_balance=5000000)
    cat = Category.objects.create(user=user, name="Ăn uống", type="expense")

    budget = Budget.objects.create(user=user, category=cat, limit=1000000, year=2026, month=11)
    Transaction.objects.create(user=user, type="expense", amount=850000, account=acc, category=cat, date=date(2026, 11, 2))

    res = client.get("/api/finance/budgets/?year=2026&month=11")
    assert res.status_code == 200
    item = res.data[0]
    assert item["spent"] == 850000
    assert item["percentage"] == 85.0
    assert item["status"] == "warning"  # 80-99%: warning, >=100%: danger, <80%: safe
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_budgets_api.py -q`
Expected: FAIL

- [ ] **Step 3: Implement Budget model fields (`year`, `month`, `limit`), serializer and view**

Add `spent`, `remaining`, `percentage`, and `status` annotations computed from `Transaction` expenses of the matching category within the given month/year.

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_budgets_api.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/models.py backend/finance/serializers.py backend/finance/views.py backend/finance/tests/
git commit -m "feat(finance): implement monthly Budget tracking and status calculations"
```

---

### Task 6: Dashboard & Analytics Aggregation API

**Files:**
- Modify: `backend/finance/views.py` (DashboardView, ReportsView)
- Modify: `backend/finance/urls.py`
- Create: `backend/finance/tests/test_dashboard_api.py`

**Interfaces:**
- Produces: `GET /api/finance/dashboard/?year=2026&month=11`

- [ ] **Step 1: Write failing tests for Dashboard Summary API**

```python
# backend/finance/tests/test_dashboard_api.py
import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category, Transaction

@pytest.mark.django_db
def test_dashboard_aggregation_excludes_transfers_from_totals():
    user = User.objects.create_user(email="dash@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    acc1 = Account.objects.create(user=user, name="Cash", initial_balance=2000000)
    acc2 = Account.objects.create(user=user, name="Bank", initial_balance=8000000)
    cat_in = Category.objects.create(user=user, name="Lương", type="income")
    cat_ex = Category.objects.create(user=user, name="Ăn uống", type="expense")

    # Income: 15,000,000 | Expense: 3,000,000 | Transfer: 1,000,000
    Transaction.objects.create(user=user, type="income", amount=15000000, account=acc2, category=cat_in, date=date(2026, 11, 1))
    Transaction.objects.create(user=user, type="expense", amount=3000000, account=acc1, category=cat_ex, date=date(2026, 11, 2))
    Transaction.objects.create(user=user, type="transfer", amount=1000000, account=acc2, to_account=acc1, date=date(2026, 11, 3))

    res = client.get("/api/finance/dashboard/?year=2026&month=11")
    assert res.status_code == 200
    data = res.data
    assert data["monthly_income"] == 15000000
    assert data["monthly_expense"] == 3000000
    assert data["monthly_savings"] == 12000000
    assert data["total_balance"] == 10000000 + 15000000 - 3000000  # 22,000,000
    assert len(data["category_expenses"]) == 1
    assert data["category_expenses"][0]["category_name"] == "Ăn uống"
    assert "monthly_trend" in data
    assert len(data["monthly_trend"]) == 6

    # Test Reports API
    rep = client.get("/api/finance/reports/?start_date=2026-11-01&end_date=2026-11-30")
    assert rep.status_code == 200
    assert rep.data["total_income"] == 15000000
    assert rep.data["total_expense"] == 3000000
```

- [ ] **Step 2: Run test to verify it fails**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_dashboard_api.py -q`
Expected: FAIL

- [ ] **Step 3: Implement DashboardView and ReportsView in `backend/finance/views.py`**

Use single-pass ORM aggregations (`Sum(Case(When(type='income', then='amount'), default=0))`, etc.) to calculate summary stats, category expense breakdown, and recent transactions. Register endpoint in `backend/finance/urls.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest tests/test_dashboard_api.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/finance/views.py backend/finance/urls.py backend/finance/tests/
git commit -m "feat(finance): implement Dashboard and Analytics aggregation API"
```

---

### Task 7: Frontend API Client and Modular Finance Hooks

**Files:**
- Create: `frontend/src/api/finance.js`
- Create: `frontend/src/hooks/useFinance.js`

**Interfaces:**
- Produces: `api.accounts`, `api.categories`, `api.transactions`, `api.budgets`, `api.dashboard`
- Produces: `useFinanceDashboard()`, `useAccounts()`, `useTransactions()`, `useBudgets()`

- [ ] **Step 1: Write API client functions with CSRF and error handling**

Implement `getDashboardData(year, month)`, `getAccounts()`, `createAccount(data)`, `getCategories(type)`, `getTransactions(params)`, `createTransaction(data)`, `getBudgets(year, month)`, `setBudget(data)` in `frontend/src/api/finance.js`.

- [ ] **Step 2: Implement state management hook `useFinance.js`**

Create custom hooks managing loading states, caching, and optimistic refreshes upon transaction or account mutations.

- [ ] **Step 3: Verify build and linting**

Run: `cd frontend && npm run lint && npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/finance.js frontend/src/hooks/useFinance.js
git commit -m "feat(frontend): create finance API client and state hooks"
```

---

### Task 8: App Layout Shell (Sidebar, Header, User Menu, Dark Mode)

**Files:**
- Create: `frontend/src/components/layout/AppShell.jsx`
- Create: `frontend/src/components/layout/Sidebar.jsx`
- Create: `frontend/src/components/layout/Header.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: Topbar with user profile, theme toggle (Dark/Light), active route indicator, Quick "+ Giao dịch" button.
- Produces: Responsive sidebar navigation (Tổng quan, Giao dịch, Tài khoản, Danh mục, Ngân sách, Báo cáo).

- [ ] **Step 1: Implement SVG icons and theme state**

Implement lightweight SVG icon set (Home, Receipt, Wallet, Folder, Target, Chart, Settings, LogOut, Sun, Moon, Plus).

- [ ] **Step 2: Implement Sidebar & Header components**

Implement Sidebar with active route styling (`bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400`), collapsible mobile drawer, and Header with avatar and quick transaction trigger.

- [ ] **Step 3: Integrate AppShell into `App.jsx`**

Wire navigation state and render active view based on selected tab.

- [ ] **Step 4: Verify build and linting**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/App.jsx
git commit -m "feat(frontend): implement responsive AppShell, Sidebar, and Header"
```

---

### Task 9: Dashboard View (Metric Cards, Charts, Recent Transactions, Budget Progress)

**Files:**
- Create: `frontend/src/pages/DashboardPage.jsx`
- Create: `frontend/src/components/dashboard/StatCard.jsx`
- Create: `frontend/src/components/dashboard/ExpenseCategoryChart.jsx`
- Create: `frontend/src/components/dashboard/BudgetProgressWidget.jsx`

**Interfaces:**
- Consumes: `useFinanceDashboard(year, month)`
- Produces: Interactive Dashboard matching the ASCII wireframe with Stat Cards (Tổng số dư, Thu nhập tháng, Chi tiêu tháng, Tiết kiệm), SVG Donut chart for category distribution, Budget progress list, and Recent Transactions table.

- [ ] **Step 1: Implement StatCard and summary grid**

Build modern metric cards with delta indicators and formatted currency (`Intl.NumberFormat('vi-VN')`).

- [ ] **Step 2: Implement lightweight SVG Donut / Bar chart for category expenses**

Create SVG-based chart component showing percentage share of expense categories with color-coded legends.

- [ ] **Step 3: Implement BudgetProgressWidget and RecentTransactions list**

Show top 5 category budgets with progress bars (colored emerald <80%, amber 80-99%, rose ≥100%) and transaction list with quick delete action.

- [ ] **Step 4: Assemble `DashboardPage.jsx` and verify build**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DashboardPage.jsx frontend/src/components/dashboard/
git commit -m "feat(frontend): build complete DashboardPage matching design wireframe"
```

---

### Task 10: Accounts & Internal Transfer View

**Files:**
- Create: `frontend/src/pages/AccountsPage.jsx`
- Create: `frontend/src/components/accounts/AccountCard.jsx`
- Create: `frontend/src/components/accounts/TransferModal.jsx`
- Create: `frontend/src/components/accounts/AccountModal.jsx`

**Interfaces:**
- Consumes: `/api/finance/accounts/`, `/api/finance/transactions/`
- Produces: Account balance cards (Tiền mặt, Ngân hàng, Ví điện tử), "Chuyển tiền" modal allowing transfer from Account A to Account B.

- [ ] **Step 1: Implement AccountCard and Account creation modal**

Show initial balance, calculated current balance, type badge, color icon, and edit/archive options.

- [ ] **Step 2: Implement TransferModal**

Provide form selecting Source Account, Destination Account (excluding source), Amount, Date, and Note. Send payload to `POST /api/finance/transactions/` with `type='transfer'`.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AccountsPage.jsx frontend/src/components/accounts/
git commit -m "feat(frontend): implement AccountsPage with AccountCard and TransferModal"
```

---

### Task 11: Transactions Management View (List, Filter, Search, Pagination, Modal)

**Files:**
- Create: `frontend/src/pages/TransactionsPage.jsx`
- Create: `frontend/src/components/transactions/TransactionTable.jsx`
- Create: `frontend/src/components/transactions/TransactionFilterBar.jsx`
- Create: `frontend/src/components/transactions/TransactionModal.jsx`

**Interfaces:**
- Consumes: `/api/finance/transactions/`
- Produces: Data table with sorting, pagination, search by keyword, date range filters, category filter, account filter, and unified Create/Edit transaction modal (Thu nhập / Chi tiêu / Chuyển khoản).

- [ ] **Step 1: Implement TransactionFilterBar and TransactionTable**

Render tabular list with badges: Green for Income (`+`), Red for Expense (`-`), Purple for Transfer (`⇄`). Support pagination (20 items/page).

- [ ] **Step 2: Implement TransactionModal with tabbed Type selection**

Switch form fields dynamically: If Transfer, show Source and Destination account pickers; if Income/Expense, show Account and Category pickers.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TransactionsPage.jsx frontend/src/components/transactions/
git commit -m "feat(frontend): implement TransactionsPage with advanced filtering and CRUD modal"
```

---

### Task 12: Budgets & Categories Views

**Files:**
- Create: `frontend/src/pages/BudgetsPage.jsx`
- Create: `frontend/src/pages/CategoriesPage.jsx`
- Create: `frontend/src/components/budgets/BudgetCard.jsx`
- Create: `frontend/src/components/budgets/BudgetModal.jsx`

**Interfaces:**
- Consumes: `/api/finance/budgets/`, `/api/finance/categories/`
- Produces: Budget cards with progress bars and threshold warnings; Category manager with Income/Expense tabs, icon & color selection, and soft delete.

- [ ] **Step 1: Implement BudgetsPage with monthly limit setup**

Display total budget vs total spent in month; list cards per category with progress bars and warning alerts.

- [ ] **Step 2: Implement CategoriesPage with soft-delete modal**

Manage categories with quick add, color palette picker, and archive confirmation.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/BudgetsPage.jsx frontend/src/pages/CategoriesPage.jsx frontend/src/components/budgets/
git commit -m "feat(frontend): implement BudgetsPage and CategoriesPage"
```

---

### Task 13: End-to-End Integration & Verification

**Files:**
- Create: `backend/finance/tests/test_e2e_finance_flow.py`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Validates the entire application flow across backend and frontend.

- [ ] **Step 1: Write comprehensive backend integration test**

```python
# backend/finance/tests/test_e2e_finance_flow.py
import pytest
from datetime import date
from rest_framework.test import APIClient
from accounts.models import User
from finance.models import Account, Category

@pytest.mark.django_db
def test_full_personal_finance_lifecycle():
    user = User.objects.create_user(email="lifecycle@finance.test", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)

    # 1. Create Accounts
    acc_cash = client.post("/api/finance/accounts/", {"name": "Tiền mặt", "type": "cash", "initial_balance": 1000000}).data
    acc_bank = client.post("/api/finance/accounts/", {"name": "Vietcombank", "type": "bank", "initial_balance": 10000000}).data

    # 2. Categories
    cat_food = Category.objects.create(user=user, name="Ăn uống", type="expense")
    cat_salary = Category.objects.create(user=user, name="Lương", type="income")

    # 3. Income & Expense
    client.post("/api/finance/transactions/", {"type": "income", "amount": 20000000, "account": acc_bank["id"], "category": str(cat_salary.id), "date": str(date.today())})
    client.post("/api/finance/transactions/", {"type": "expense", "amount": 2500000, "account": acc_cash["id"], "category": str(cat_food.id), "date": str(date.today())})

    # 4. Transfer
    client.post("/api/finance/transactions/", {"type": "transfer", "amount": 3000000, "account": acc_bank["id"], "to_account": acc_cash["id"], "date": str(date.today())})

    # 5. Set Budget & check progress
    client.post("/api/finance/budgets/", {"category": str(cat_food.id), "limit": 3000000, "year": date.today().year, "month": date.today().month})
    budget_res = client.get(f"/api/finance/budgets/?year={date.today().year}&month={date.today().month}").data
    assert budget_res[0]["spent"] == 2500000
    assert budget_res[0]["status"] == "warning"  # 2.5m / 3m = 83.3%

    # 6. Dashboard metrics
    dash = client.get(f"/api/finance/dashboard/?year={date.today().year}&month={date.today().month}").data
    assert dash["monthly_income"] == 20000000
    assert dash["monthly_expense"] == 2500000
    assert dash["monthly_savings"] == 17500000
    assert dash["total_balance"] == (1000000 - 2500000 + 3000000) + (10000000 + 20000000 - 3000000)  # 28,500,000
```

- [ ] **Step 2: Run all backend tests**

Run: `set -a && source .env && set +a && cd backend && .venv/bin/pytest -q`
Expected: All tests pass (100%).

- [ ] **Step 3: Run frontend build and linter**

Run: `cd frontend && npm run lint && npm run build`
Expected: Build passes with 0 warnings or errors.

- [ ] **Step 4: Commit**

```bash
git add backend/ frontend/ docs/
git commit -m "feat: complete Personal Finance Management system integration"
```
