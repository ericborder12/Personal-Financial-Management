# Multi-user Auth + Postgres (Django) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển app tài chính từ single-user `localStorage` sang multi-user có đăng nhập, lưu dữ liệu trong Postgres, deploy trên Vercel + Neon.

**Architecture:** Monorepo `frontend/` (React 19 + Vite + Tailwind, gọi `/api` cùng origin) và `backend/` (Django 5.2 + DRF + session cookie/CSRF). Vercel Services route `/api/*`, `/admin/*`, `/static/*` vào Django và mọi path khác vào React. Postgres production là Neon; dev là Postgres 16 qua Docker Compose.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Django 5.2 LTS, Django REST Framework, psycopg 3, dj-database-url, pytest-django, Postgres 16, Vercel Services, Neon.

**Spec:** `docs/superpowers/specs/2026-10-29-multi-user-auth-design.md`

## Global Constraints

- Postgres everywhere; production dùng Neon pooled connection, dev dùng `postgres:16-alpine`.
- Xác thực bằng session cookie httpOnly + CSRF; **không** JWT trong `localStorage`.
- Mọi queryset lọc theo `request.user`; không tin dữ liệu client.
- Số tiền là số nguyên VND, `BigIntegerField`, `1 <= amount <= 9223372036854775807`.
- Tài khoản mới bắt đầu **rỗng**: không seed budget, `initial_balance = 0`.
- Import dữ liệu cũ chỉ một lần, all-or-nothing, server chặn bằng `imported_at`.
- UI tiếng Việt; giữ phong cách gradient indigo hiện tại.
- Frontend ở `frontend/`, backend ở `backend/`; API dưới `/api/`.
- V1 không có: social login, xác thực email, quên mật khẩu, rate limiting.
- Hash mật khẩu: PBKDF2 mặc định của Django.
- Python 3.12, Node 24; chạy lệnh từ thư mục gốc repo.

## Review Focus

1. **CSRF ở request ghi đầu tiên:** đăng ký ngay sau khi mở trang (chưa có GET nào) vẫn phải gửi được CSRF token, không bị 403.
2. **Truy cập chéo user bằng UUID đoán được:** user B xoá transaction của A phải nhận 404, không phải 403/204.
3. **Import lỗi giữa chừng:** payload sai không được để lại transaction/budget dở; import lần hai phải 409.
4. **Biên số tiền:** 0, âm, số lẻ, chuỗi, và giá trị > `2^63-1` phải bị từ chối bằng 400, không phải 500.
5. **Session hết hạn giữa form:** request ghi trả 401 thì UI quay về login, không âm thầm đóng modal như đã lưu.

---

### Task 1: Chuyển React vào `frontend/`

**Files:**
- Move: `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `eslint.config.js`, `public/`, `src/` → `frontend/`
- Modify: `.gitignore`

**Interfaces:**
- Produces: mọi lệnh frontend chạy từ `frontend/`; backend task sau ở `backend/`.

- [ ] **Step 1: Di chuyển file bằng git**

```bash
cd /home/ericborder12/finance-app
mkdir -p frontend
git mv index.html package.json package-lock.json vite.config.js eslint.config.js public src frontend/
rm -rf node_modules
```

- [ ] **Step 2: Cài dependency và build lại**

Run: `cd frontend && npm install && npm run build`
Expected: build thành công, tạo `frontend/dist/`.

- [ ] **Step 3: Lint baseline**

Run: `cd frontend && npm run lint`
Expected: không lỗi mới (warning cũ nếu có thì giữ nguyên).

- [ ] **Step 4: Cập nhật `.gitignore`**

Thêm vào cuối file:

```gitignore
# Backend / Python
backend/.venv/
__pycache__/
*.py[cod]
backend/db.sqlite3
backend/staticfiles/

# Env / Vercel
.env
.env.local
.vercel
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move React app into frontend/"
```

---

### Task 2: Django foundation, custom User, Profile, health endpoint

**Files:**
- Create: `backend/requirements.txt`, `backend/manage.py`, `backend/pytest.ini`, `backend/conftest.py`, `backend/.env.example`
- Create: `backend/config/{__init__,settings,urls,wsgi,asgi}.py`
- Create: `backend/accounts/{__init__,apps,models,admin}.py`
- Create: `backend/finance/{__init__,apps,models,signals,admin,urls,views}.py`
- Create: `backend/accounts/tests/__init__.py`, `backend/accounts/tests/test_models.py`
- Create: `backend/finance/tests/__init__.py`, `backend/finance/tests/test_health.py`
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: `accounts.User` (`USERNAME_FIELD="email"`, fields `email`, `display_name`), `finance.Profile` (`user`, `initial_balance`, `imported_at`), `finance.Transaction`, `finance.Budget`.
- Produces API: `GET /api/health/` → `200 {"status":"ok"}`.
- Produces fixtures: `api_client` (DRF `APIClient`).

- [ ] **Step 1: Viết test model và health (đang fail)**

`backend/accounts/tests/test_models.py`:

```python
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
```

`backend/finance/tests/test_health.py`:

```python
import pytest


@pytest.mark.django_db
def test_health_returns_ok(api_client):
    res = api_client.get("/api/health/")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest -q`
Expected: FAIL vì chưa có project/venv (`No such file or directory`).

- [ ] **Step 3: Tạo requirements, venv và project**

`backend/requirements.txt`:

```text
Django>=5.2,<5.3
djangorestframework>=3.15,<4
psycopg[binary]>=3.2,<4
dj-database-url>=2.2,<3
django-cors-headers>=4.4,<5
python-dotenv>=1.0,<2
pytest>=8,<9
pytest-django>=4.9,<5
```

Run:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/django-admin startproject config .
mkdir -p accounts finance
touch accounts/__init__.py finance/__init__.py
mkdir -p accounts/tests finance/tests
touch accounts/tests/__init__.py finance/tests/__init__.py
```

- [ ] **Step 4: Viết `settings.py` với Postgres qua `DATABASE_URL`**

Các giá trị bắt buộc:

```python
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = [h for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]
CSRF_TRUSTED_ORIGINS = [o for o in os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",") if o]

DATABASES = {
    "default": dj_database_url.parse(
        os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=0,
    )
}
if DATABASES["default"]["ENGINE"].endswith("postgresql"):
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

AUTH_USER_MODEL = "accounts.User"
INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "corsheaders", "rest_framework", "accounts", "finance",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["accounts.authentication.SessionAuthentication401"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}
CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o]
CORS_ALLOW_CREDENTIALS = True
LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_AGE = 1209600
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

`accounts/authentication.py` (dùng ngay từ Task 2, test ở Task 3):

```python
from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    def authenticate_header(self, request):
        return "Session"
```

- [ ] **Step 5: Viết model, manager, signal**

`accounts/models.py`: `User(AbstractUser)` với `username = None`, `email = EmailField(unique=True)`, `display_name = CharField(max_length=100, blank=True)`, `USERNAME_FIELD = "email"`, `REQUIRED_FIELDS = []`, `objects = UserManager()`.

`UserManager(BaseUserManager)` phải có `create_user(email, password=None, **extra_fields)` và `create_superuser(...)` (set `is_staff=True`, `is_superuser=True`), dùng `self.normalize_email(email)` và `user.set_password(password)`.

`finance/models.py`:

```python
class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    initial_balance = models.BigIntegerField(default=0)
    imported_at = models.DateTimeField(null=True, blank=True)

class Transaction(models.Model):
    TYPE_CHOICES = [("income", "Thu"), ("expense", "Chi")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.BigIntegerField()
    category = models.CharField(max_length=50)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [models.Index(fields=["user", "date"])]
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name="transaction_amount_positive")]
        ordering = ["-date", "-created_at"]

class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    category = models.CharField(max_length=50)
    limit = models.BigIntegerField()
    fixed = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "category"], name="unique_budget_per_user_category")]
```

`finance/signals.py` tạo Profile khi `created=True` bằng `get_or_create`; `finance/apps.py` import signal trong `ready()`.

- [ ] **Step 6: Đăng ký Django admin**

`accounts/admin.py`: `@admin.register(User)` class kế thừa `UserAdmin` nhưng bỏ `username` khỏi `fieldsets`/`add_fieldsets`, thêm `email`, `display_name`; `ordering = ("email",)`. `finance/admin.py`: đăng ký `Profile`, `Transaction`, `Budget` với `list_display` tối thiểu (`user`, `type`, `amount`, `date` cho Transaction; `user`, `category`, `limit` cho Budget).

- [ ] **Step 7: Health view + URLs**

`finance/views.py`:

```python
class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})
```

`backend/config/urls.py` include `finance.urls` dưới `api/`. `finance/urls.py` map `health/` → `HealthView`.

- [ ] **Step 8: pytest config, fixture, env example, compose**

`backend/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
```

`backend/conftest.py`:

```python
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()
```

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: finance
      POSTGRES_USER: finance
      POSTGRES_PASSWORD: finance
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`backend/.env.example`:

```dotenv
DEBUG=True
SECRET_KEY=change-me
DATABASE_URL=postgres://finance:finance@localhost:5432/finance
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

- [ ] **Step 9: Migrate trên Postgres dev**
```bash
docker compose up -d db
cp backend/.env.example backend/.env
cd backend
DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/python manage.py makemigrations accounts finance
DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/python manage.py migrate
```

Expected: migration tạo `accounts_user`, `finance_profile`, `finance_transaction`, `finance_budget`; không có lỗi `AUTH_USER_MODEL`.

- [ ] **Step 10: Chạy test**

Run: `cd backend && .venv/bin/pytest -q`
Expected: 3 passed.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(backend): Django project with custom user, finance models, health endpoint"
```

---

### Task 3: Auth API (register/login/logout/me/csrf)

**Files:**
- Create: `backend/accounts/serializers.py`, `backend/accounts/views.py`, `backend/accounts/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/accounts/tests/test_auth.py`

**Interfaces:**
- Consumes: `accounts.User`, `SessionAuthentication401`.
- Produces:
  - `POST /api/auth/register/` body `{email, password, display_name?}` → `201 {id, email, display_name}`
  - `POST /api/auth/login/` body `{email, password}` → `200 {id, email, display_name}`
  - `POST /api/auth/logout/` → `204`
  - `GET /api/auth/me/` → `200 {id, email, display_name}` hoặc `401`
  - `GET /api/auth/csrf/` → `200`, set cookie `csrftoken`
- Produces: email/password validation dùng `django.contrib.auth.password_validation.validate_password`.

- [ ] **Step 1: Viết test auth (đang fail)**

`backend/accounts/tests/test_auth.py`:

```python
import pytest
from rest_framework.test import APIClient
from accounts.models import User


def register(client, email="a@example.com", password="strongpass123"):
    return client.post("/api/auth/register/", {"email": email, "password": password}, format="json")


@pytest.mark.django_db
def test_register_creates_user_and_logs_in(api_client):
    res = register(api_client)
    assert res.status_code == 201
    assert res.json() == {"id": res.json()["id"], "email": "a@example.com", "display_name": ""}
    assert "password" not in res.json()
    assert api_client.get("/api/auth/me/").status_code == 200


@pytest.mark.django_db
def test_register_rejects_duplicate_email(api_client):
    register(api_client)
    assert register(api_client).status_code == 400


@pytest.mark.django_db
def test_register_rejects_weak_password(api_client):
    assert register(api_client, password="123").status_code == 400


@pytest.mark.django_db
def test_login_and_logout(api_client):
    User.objects.create_user(email="a@example.com", password="strongpass123")
    assert api_client.post("/api/auth/login/", {"email": "a@example.com", "password": "wrong"}, format="json").status_code == 400
    res = api_client.post("/api/auth/login/", {"email": "a@example.com", "password": "strongpass123"}, format="json")
    assert res.status_code == 200
    assert api_client.get("/api/auth/me/").status_code == 200
    assert api_client.post("/api/auth/logout/").status_code == 204
    assert api_client.get("/api/auth/me/").status_code == 401


@pytest.mark.django_db
def test_register_requires_csrf_when_enforced():
    client = APIClient(enforce_csrf_checks=True)
    payload = {"email": "csrf@example.com", "password": "strongpass123"}
    assert client.post("/api/auth/register/", payload, format="json").status_code == 403
    client.get("/api/auth/csrf/")
    token = client.cookies["csrftoken"].value
    res = client.post("/api/auth/register/", payload, format="json", HTTP_X_CSRFTOKEN=token)
    assert res.status_code == 201
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest accounts/tests/test_auth.py -q`
Expected: FAIL 404 vì chưa có route.

- [ ] **Step 3: Viết serializers**

`RegisterSerializer(serializers.Serializer)`: `email = EmailField()`, `password = CharField(write_only=True)`, `display_name = CharField(required=False, allow_blank=True, max_length=100)`. `validate_email` từ chối email đã tồn tại (case-insensitive bằng `User.objects.filter(email__iexact=...)`). `validate_password` gọi `validate_password(value)` và trả lỗi DRF. `create` dùng `User.objects.create_user(...)`.

`UserSerializer(serializers.ModelSerializer)`: `fields = ["id", "email", "display_name"]`, tất cả read-only.

- [ ] **Step 4: Viết views và urls**

- `RegisterView(APIView)`: `permission_classes=[AllowAny]`, `authentication_classes=[]`; validate, tạo user, `login(request, user)`, trả 201.
- `LoginView(APIView)`: `AllowAny`, `authentication_classes=[]`; `authenticate(request, username=email, password=password)`; sai → `400 {"detail": "Email hoặc mật khẩu không đúng."}`; đúng → `login`, trả `UserSerializer`.
- `LogoutView(APIView)`: `IsAuthenticated`; `logout(request)`; trả 204.
- `MeView(APIView)`: `IsAuthenticated`; trả `UserSerializer(request.user)`.
- `CsrfView(APIView)`: `AllowAny`, `authentication_classes=[]`, `@method_decorator(ensure_csrf_cookie)` hoặc `get_token(request)` để set cookie; trả `{"detail": "CSRF cookie set"}`.

`accounts/urls.py` map đúng 5 route ở Interfaces; `config/urls.py` thêm `path("api/", include("accounts.urls"))`.

- [ ] **Step 5: Chạy test auth**

Run: `cd backend && .venv/bin/pytest accounts/tests/test_auth.py -q`
Expected: 5 passed.

- [ ] **Step 6: Chạy toàn bộ test backend**

Run: `cd backend && .venv/bin/pytest -q`
Expected: tất cả pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): session-based register, login, logout, me, csrf"
```

---

### Task 4: Transactions API với phân quyền sở hữu

**Files:**
- Create: `backend/finance/serializers.py`
- Modify: `backend/finance/views.py`, `backend/finance/urls.py`
- Test: `backend/finance/tests/test_transactions.py`

**Interfaces:**
- Consumes: `Transaction`, session auth.
- Produces:
  - `GET /api/transactions/` → `200 [{id, type, amount, category, date, note, created_at}]` của user hiện tại, sort `-date, -created_at`
  - `POST /api/transactions/` body `{type, amount, category, date, note?}` → `201` item
  - `DELETE /api/transactions/<uuid>/` → `204`, không phải của mình → `404`
- Produces: `TransactionSerializer` với `amount = IntegerField(min_value=1, max_value=9223372036854775807)`.

- [ ] **Step 1: Viết test (đang fail)**

`backend/finance/tests/test_transactions.py`:

```python
import pytest
from accounts.models import User
from finance.models import Transaction


@pytest.fixture
def user(db):
    return User.objects.create_user(email="a@example.com", password="strongpass123")


@pytest.fixture
def other(db):
    return User.objects.create_user(email="b@example.com", password="strongpass123")


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


PAYLOAD = {"type": "expense", "amount": 50000, "category": "Ăn uống", "date": "2026-10-29", "note": "trưa"}


@pytest.mark.django_db
def test_create_and_list_own_transactions(auth_client):
    res = auth_client.post("/api/transactions/", PAYLOAD, format="json")
    assert res.status_code == 201
    assert res.json()["amount"] == 50000
    body = auth_client.get("/api/transactions/").json()
    assert len(body) == 1 and body[0]["category"] == "Ăn uống"


@pytest.mark.django_db
def test_user_cannot_see_or_delete_other_users_transaction(auth_client, other):
    tx = Transaction.objects.create(user=other, **PAYLOAD)
    assert auth_client.get("/api/transactions/").json() == []
    assert auth_client.delete(f"/api/transactions/{tx.id}/").status_code == 404
    assert Transaction.objects.filter(id=tx.id).exists()


@pytest.mark.django_db
def test_delete_own_transaction(auth_client, user):
    tx = Transaction.objects.create(user=user, **PAYLOAD)
    assert auth_client.delete(f"/api/transactions/{tx.id}/").status_code == 204
    assert not Transaction.objects.filter(id=tx.id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("amount", [0, -1, 1.5, "abc", 9223372036854775808])
def test_invalid_amount_returns_400(auth_client, amount):
    res = auth_client.post("/api/transactions/", {**PAYLOAD, "amount": amount}, format="json")
    assert res.status_code == 400


@pytest.mark.django_db
def test_unauthenticated_gets_401(api_client):
    assert api_client.get("/api/transactions/").status_code == 401
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest finance/tests/test_transactions.py -q`
Expected: FAIL 404.

- [ ] **Step 3: Viết serializer và views**

`TransactionSerializer(ModelSerializer)`: fields như Interfaces; `read_only_fields=["id", "created_at"]`; khai báo `amount` tường minh với `min_value`/`max_value`; `validate_type` chỉ nhận `income`/`expense`.

`TransactionListCreateView(generics.ListCreateAPIView)`: `get_queryset` lọc `user=self.request.user` và order; `perform_create` gọi `serializer.save(user=self.request.user)`.

`TransactionDetailView(generics.DestroyAPIView)`: `get_queryset` lọc theo user; DRF tự trả 404 khi UUID của người khác.

- [ ] **Step 4: Chạy test**

Run: `cd backend && .venv/bin/pytest finance/tests/test_transactions.py -q`
Expected: 9 passed (5 tham số + 4 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(finance): transactions API scoped to owner"
```

---

### Task 5: Budgets API (GET + PUT thay thế toàn bộ)

**Files:**
- Modify: `backend/finance/serializers.py`, `backend/finance/views.py`, `backend/finance/urls.py`
- Test: `backend/finance/tests/test_budgets.py`

**Interfaces:**
- Produces:
  - `GET /api/budgets/` → `200 [{category, limit, fixed}]`
  - `PUT /api/budgets/` body `[{category, limit, fixed}]` → `200` danh sách mới; thay thế toàn bộ budget của user trong một transaction.
- Produces: `BudgetSerializer` (`limit >= 0`), lỗi trùng `category` → `400 {"detail": "Danh mục bị trùng."}`.

- [ ] **Step 1: Viết test**

`backend/finance/tests/test_budgets.py`: dùng fixture `user`, `other`, `auth_client` như Task 4.

```python
import pytest
from finance.models import Budget

PAYLOAD = [{"category": "Ăn uống", "limit": 3000000, "fixed": False}]


@pytest.mark.django_db
def test_new_user_has_no_budgets(auth_client):
    assert auth_client.get("/api/budgets/").json() == []


@pytest.mark.django_db
def test_put_replaces_all_budgets(auth_client):
    assert auth_client.put("/api/budgets/", PAYLOAD, format="json").status_code == 200
    assert auth_client.put("/api/budgets/", [{"category": "Nhà ở", "limit": 2500000, "fixed": True}], format="json").status_code == 200
    body = auth_client.get("/api/budgets/").json()
    assert body == [{"category": "Nhà ở", "limit": 2500000, "fixed": True}]


@pytest.mark.django_db
def test_duplicate_category_returns_400(auth_client):
    bad = PAYLOAD * 2
    assert auth_client.put("/api/budgets/", bad, format="json").status_code == 400


@pytest.mark.django_db
def test_user_cannot_overwrite_other_users_budgets(auth_client, other):
    Budget.objects.create(user=other, category="Ăn uống", limit=1000)
    auth_client.put("/api/budgets/", PAYLOAD, format="json")
    assert Budget.objects.filter(user=other).count() == 1


@pytest.mark.django_db
def test_empty_put_clears_budgets(auth_client, user):
    Budget.objects.create(user=user, category="Ăn uống", limit=1000)
    assert auth_client.put("/api/budgets/", [], format="json").status_code == 200
    assert not Budget.objects.filter(user=user).exists()
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest finance/tests/test_budgets.py -q`
Expected: FAIL 404.

- [ ] **Step 3: Viết BudgetSerializer và BudgetView**

`BudgetView(APIView)`: GET trả budgets của user; PUT validate `many=True`, kiểm tra `len(categories) == len(set(categories))` trước khi ghi, rồi trong `transaction.atomic()`: `Budget.objects.filter(user=request.user).delete()` + `bulk_create` gắn `user=request.user`; trả danh sách sau khi lưu.

- [ ] **Step 4: Chạy test**

Run: `cd backend && .venv/bin/pytest finance/tests/test_budgets.py -q`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(finance): budgets API with replace-all semantics"
```

---

### Task 6: Profile API (initial balance)

**Files:**
- Modify: `backend/finance/serializers.py`, `backend/finance/views.py`, `backend/finance/urls.py`
- Test: `backend/finance/tests/test_profile.py`

**Interfaces:**
- Produces:
  - `GET /api/profile/` → `200 {initial_balance, imported_at}`
  - `PUT /api/profile/` body `{initial_balance}` → `200` object đầy đủ; `initial_balance >= 0`.
- Produces: helper `get_profile(user)` trả `Profile.objects.get_or_create(user=user)[0]` (dùng lại ở Task 7).

- [ ] **Step 1: Viết test**

```python
import pytest


@pytest.mark.django_db
def test_profile_defaults_to_zero(auth_client):
    assert auth_client.get("/api/profile/").json() == {"initial_balance": 0, "imported_at": None}


@pytest.mark.django_db
def test_update_initial_balance(auth_client):
    res = auth_client.put("/api/profile/", {"initial_balance": 1500000}, format="json")
    assert res.status_code == 200
    assert res.json()["initial_balance"] == 1500000
    assert auth_client.get("/api/profile/").json()["initial_balance"] == 1500000


@pytest.mark.django_db
def test_negative_balance_returns_400(auth_client):
    assert auth_client.put("/api/profile/", {"initial_balance": -1}, format="json").status_code == 400


@pytest.mark.django_db
def test_profile_is_per_user(auth_client, other):
    auth_client.put("/api/profile/", {"initial_balance": 1000}, format="json")
    assert other.profile.initial_balance == 0
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest finance/tests/test_profile.py -q`
Expected: FAIL 404.

- [ ] **Step 3: Viết ProfileSerializer, `get_profile`, ProfileView**

`initial_balance = IntegerField(min_value=0, max_value=9223372036854775807)`; `imported_at` read-only. `ProfileView` GET/PUT, PUT dùng `partial=True`.

- [ ] **Step 4: Chạy test**

Run: `cd backend && .venv/bin/pytest finance/tests/test_profile.py -q`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(finance): profile API for initial balance"
```

---

### Task 7: One-time legacy import

**Files:**
- Modify: `backend/finance/serializers.py`, `backend/finance/views.py`, `backend/finance/urls.py`
- Test: `backend/finance/tests/test_import.py`

**Interfaces:**
- Produces: `POST /api/import/` body `{transactions: [...], budgets: [...], initial_balance}` → `200 {transactions: <n>, budgets: <n>}`.
- Produces: `409 {"detail": "Tài khoản đã có dữ liệu, không thể nhập."}` khi đã có transaction, budget, `initial_balance != 0`, hoặc `imported_at != null`.
- Consumes: `get_profile(user)` từ Task 6.

- [ ] **Step 1: Viết test**

```python
import pytest
from finance.models import Budget, Transaction

PAYLOAD = {
    "transactions": [
        {"type": "expense", "amount": 50000, "category": "Ăn uống", "date": "2026-10-01", "note": "trưa"},
        {"type": "income", "amount": 1000000, "category": "Lương", "date": "2026-10-05", "note": ""},
    ],
    "budgets": [{"category": "Ăn uống", "limit": 3000000, "fixed": False}],
    "initial_balance": 500000,
}


@pytest.mark.django_db
def test_import_moves_everything(auth_client, user):
    res = auth_client.post("/api/import/", PAYLOAD, format="json")
    assert res.status_code == 200
    assert res.json() == {"transactions": 2, "budgets": 1}
    assert Transaction.objects.filter(user=user).count() == 2
    assert Budget.objects.filter(user=user).count() == 1
    user.profile.refresh_from_db()
    assert user.profile.initial_balance == 500000
    assert user.profile.imported_at is not None


@pytest.mark.django_db
def test_second_import_returns_409(auth_client):
    auth_client.post("/api/import/", PAYLOAD, format="json")
    assert auth_client.post("/api/import/", PAYLOAD, format="json").status_code == 409


@pytest.mark.django_db
def test_import_blocked_when_account_has_transaction(auth_client, user):
    Transaction.objects.create(user=user, type="expense", amount=1, category="Khác", date="2026-10-01")
    assert auth_client.post("/api/import/", PAYLOAD, format="json").status_code == 409


@pytest.mark.django_db
def test_invalid_payload_leaves_no_data(auth_client, user):
    bad = {**PAYLOAD, "transactions": [{**PAYLOAD["transactions"][0], "amount": -5}]}
    assert auth_client.post("/api/import/", bad, format="json").status_code == 400
    assert Transaction.objects.filter(user=user).count() == 0
    assert user.profile.imported_at is None


@pytest.mark.django_db
def test_import_is_atomic_on_write_failure(auth_client, user, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("boom")
    monkeypatch.setattr("finance.views.Budget.objects.bulk_create", boom)
    with pytest.raises(RuntimeError):
        auth_client.post("/api/import/", PAYLOAD, format="json")
    assert Transaction.objects.filter(user=user).count() == 0
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd backend && .venv/bin/pytest finance/tests/test_import.py -q`
Expected: FAIL 404.

- [ ] **Step 3: Viết serializers import**

`ImportTransactionSerializer(ModelSerializer)` fields `type, amount, category, date, note` (amount dùng cùng bound như Task 4).
`ImportBudgetSerializer(ModelSerializer)` fields `category, limit, fixed`.
`ImportSerializer(Serializer)`: ba field trên (`transactions`/`budgets` `many=True`, `required=False`, default `list`; `initial_balance` `min_value=0`), `validate_budgets` từ chối category trùng.

- [ ] **Step 4: Viết ImportView**

Kiểm tra điều kiện 409 **trước** khi validate/ghi. Nếu hợp lệ, trong `transaction.atomic()`: `bulk_create` transactions + budgets gắn `user`, cập nhật `profile.initial_balance`, set `profile.imported_at = timezone.now()`. Trả số bản ghi.

- [ ] **Step 5: Chạy test**

Run: `cd backend && .venv/bin/pytest finance/tests/test_import.py -q`
Expected: 5 passed.

- [ ] **Step 6: Chạy toàn bộ backend test**

Run: `cd backend && .venv/bin/pytest -q`
Expected: tất cả pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(finance): one-time atomic legacy import"
```

---

### Task 8: Vercel Services config + Neon deploy runbook

**Files:**
- Create: `vercel.json`
- Modify: `backend/config/settings.py` (chỉ nếu thiếu env production), `README.md`
- Test: `vercel.json` parse + `manage.py check`

**Interfaces:**
- Produces: route production: `/api/*`, `/admin/*`, `/static/*` → service `backend`; còn lại → `frontend`.

- [ ] **Step 1: Viết `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "frontend": { "root": "frontend/" },
    "backend": { "root": "backend/" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/admin/(.*)", "destination": { "service": "backend" } },
    { "source": "/static/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

- [ ] **Step 2: Viết README runbook**

README ghi rõ:

```bash
# Dev
docker compose up -d db
cd backend && cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
cd frontend && npm run dev

# Test
cd backend && .venv/bin/pytest -q
cd frontend && npm run lint && npm run build

# Vercel + Neon
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL production   # Neon pooled connection string
npx vercel env add SECRET_KEY production
npx vercel env add DEBUG production          # False
npx vercel env add ALLOWED_HOSTS production  # .vercel.app
npx vercel env add CSRF_TRUSTED_ORIGINS production  # https://<project>.vercel.app
npx vercel env pull .env.local
DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" backend/.venv/bin/python backend/manage.py migrate
npx vercel --prod
```

Ghi chú: migration chạy một lần từ máy local trước khi deploy; Vercel không tự migrate.

- [ ] **Step 3: Kiểm tra config và Django**

Run:

```bash
python3 -c "import json; json.load(open('vercel.json')); print('vercel.json ok')"
cd backend && .venv/bin/python manage.py check
```

Expected: `vercel.json ok`, `System check identified no issues`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(deploy): Vercel Services config and Neon runbook"
```

---

### Task 9: Frontend API client, auth context, login page

**Files:**
- Create: `frontend/src/api/client.js`, `frontend/src/auth/AuthContext.jsx`, `frontend/src/Root.jsx`, `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/main.jsx`, `frontend/vite.config.js`

**Interfaces:**
- Produces `api`:
  - `csrf()`, `me()`, `login({email,password})`, `register({email,password,display_name})`, `logout()`
  - `listTransactions()`, `createTransaction(data)`, `deleteTransaction(id)`
  - `getBudgets()`, `saveBudgets(list)`
  - `getProfile()`, `updateProfile({initial_balance})`
  - `importData({transactions,budgets,initial_balance})`
- Produces `useAuth()` → `{user, loading, login(email,password), register(email,password,display_name), logout()}`; `user = {id,email,display_name} | null`.
- Produces: mọi request gửi `credentials: "include"`, unsafe method gắn `X-CSRFToken` từ cookie `csrftoken`; response 401 phát event `auth:unauthorized`.

- [ ] **Step 1: Viết API client**

`frontend/src/api/client.js`: `const BASE = "/api"`; `class ApiError extends Error` giữ `status` và `data`; hàm `getCookie(name)`; hàm `request(path, {method="GET", body})`:
- JSON body → `Content-Type: application/json`
- method không thuộc `GET/HEAD/OPTIONS` → đọc `csrftoken` và set `X-CSRFToken`
- `fetch(BASE + path, {method, headers, credentials: "include", body})`
- 204 → `null`; parse JSON nếu content-type JSON
- `!res.ok` và `res.status === 401` → `window.dispatchEvent(new Event("auth:unauthorized"))`; throw `ApiError`
- `api` export đúng danh sách Interfaces.

`frontend/vite.config.js` thêm:

```js
server: {
  proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
},
```

- [ ] **Step 2: Viết AuthContext**

Bootstrap khi mount: `await api.csrf()` rồi `api.me()`; lỗi → `user = null`. Nghe `auth:unauthorized` → `setUser(null)`. `login`/`register` set user; `logout` gọi API rồi set null. `loading = user === undefined`.

- [ ] **Step 3: Viết Root và sửa main**

`Root.jsx`: `loading` → màn hình chờ đơn giản; `!user` → `<LoginPage />`; ngược lại `<App />`.

`main.jsx`:

```jsx
<StrictMode>
  <AuthProvider>
    <Root />
  </AuthProvider>
</StrictMode>
```

- [ ] **Step 4: Viết LoginPage**

Hai tab Đăng nhập / Đăng ký; field email, password, display_name (chỉ tab đăng ký); nút submit hiển thị "Đang xử lý..."; lỗi hiển thị tiếng Việt (`err.data?.detail` hoặc câu chung); phong cách gradient indigo/violet giống thẻ số dư; `autoComplete="email"` / `"current-password"` / `"new-password"`.

- [ ] **Step 5: Build và lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 6: Kiểm tra API bằng curl (backend chạy)**

Run:

```bash
curl -i http://localhost:8000/api/auth/csrf/
curl -i http://localhost:8000/api/auth/me/
```

Expected: csrf 200 có `Set-Cookie: csrftoken=...`; me 401.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(frontend): session API client, auth context, login page"
```

---

### Task 10: Transactions hook + async save form

**Files:**
- Modify: `frontend/src/hooks/useTransactions.js`
- Modify: `frontend/src/App.jsx`, `frontend/src/components/TransactionForm.jsx`
- Delete: `frontend/src/hooks/useLocalStorage.js` (sau Task 11, khi không còn import)

**Interfaces:**
- Produces `useTransactions()` → `{transactions, loading, error, addTransaction(data): Promise<Transaction>, deleteTransaction(id): Promise<void>, refresh(): Promise<void>}`.
- `addTransaction` throw `ApiError` khi fail; chỉ cập nhật state sau khi server trả thành công.

- [ ] **Step 1: Viết lại hook**

Bỏ toàn bộ `localStorage`. Load `api.listTransactions()` khi mount. `addTransaction` gọi `api.createTransaction`, prepend kết quả. `deleteTransaction` gọi API rồi filter. `refresh` tải lại danh sách.

- [ ] **Step 2: Sửa TransactionForm cho async**

Thêm state `saving` và `error`. `handleSubmit` thành `async`: chặn double-submit, `await onAdd(...)`, chỉ `onClose()` khi thành công; `catch` set `error = err.data?.detail || err.message`; `finally` set `saving=false`. Nút submit `disabled={saving}`, nhãn `saving ? "Đang lưu..." : "Lưu giao dịch"`. Hiển thị `error` trong khối `bg-rose-50 text-rose-700`.

- [ ] **Step 3: Sửa App**

Dùng `loading`/`error` của hook: khi `loading` hiện "Đang tải giao dịch..."; khi `error` hiện banner lỗi. Nút xoá: `onClick={() => deleteTransaction(t.id).catch((e) => window.alert(e.message))}`.

- [ ] **Step 4: Build và lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 5: Manual check (dev)**

Chạy backend + `cd frontend && npm run dev`; đăng nhập, thêm giao dịch, refresh trang → giao dịch còn; xoá → biến mất. Expected: đúng.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): transactions via API with async save"
```

---

### Task 11: Budgets + profile hooks, async BudgetEditor

**Files:**
- Modify: `frontend/src/hooks/useBudgets.js`
- Create: `frontend/src/hooks/useProfile.js`
- Delete: `frontend/src/hooks/useLocalStorage.js`
- Modify: `frontend/src/App.jsx`, `frontend/src/components/BudgetEditor.jsx`, `frontend/src/components/Summary.jsx` (chỉ nếu prop đổi)

**Interfaces:**
- Produces `useBudgets()` → `{budgets, loading, error, saveBudgets(next): Promise<void>, refresh(): Promise<void>}`; `budgets` dạng `{[category]: {limit, fixed}}`.
- Produces `useProfile()` → `{initialBalance, importedAt, loading, setInitialBalance(value), refresh(): Promise<void>}`; `setInitialBalance` debounce 500ms rồi `PUT /api/profile/`.
- Produces `onSave` của `BudgetEditor` là async.

- [ ] **Step 1: Viết lại useBudgets**

Load `api.getBudgets()` → map sang object. `saveBudgets(next)` chuyển object thành array `{category, limit, fixed}`, gọi `api.saveBudgets`, map kết quả về object. Không seed default.

- [ ] **Step 2: Viết useProfile**

Load `api.getProfile()` khi mount; `setInitialBalance(value)` set state ngay và debounce 500ms gọi `api.updateProfile({initial_balance: value})`; clear timeout khi unmount. `refresh` load lại.

- [ ] **Step 3: Sửa App**

Thay `useLocalStorage("finance-app:initial-balance", 0)` bằng `useProfile()`. Destructure `saveBudgets` từ `useBudgets`. Truyền `onSave={saveBudgets}` cho `BudgetEditor`. Xoá import `useLocalStorage`.

- [ ] **Step 4: Sửa BudgetEditor async**

`handleSave` thành async: `saving`/`error` state; `await onSave(result)`; chỉ `onClose()` khi thành công; lỗi hiển thị inline; nút "Lưu hạn mức" disabled khi saving.

- [ ] **Step 5: Xoá hook cũ và kiểm tra không còn import**

Run: `grep -rn "useLocalStorage" frontend/src`
Expected: không kết quả. Sau đó `rm frontend/src/hooks/useLocalStorage.js`.

- [ ] **Step 6: Build và lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 7: Manual check**

Đổi số dư ban đầu, rời input, refresh → số dư giữ nguyên. Sửa hạn mức, lưu, refresh → còn. Expected: đúng.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(frontend): budgets and profile via API, debounced balance"
```

---

### Task 12: Import dialog, logout header, 401 handling

**Files:**
- Create: `frontend/src/components/ImportDialog.jsx`
- Modify: `frontend/src/App.jsx`
- Test: manual

**Interfaces:**
- Consumes: `useAuth()` (`user`, `logout`), `useProfile()` (`importedAt`), `api.importData`.
- Produces: dialog tự đọc `finance-app:transactions`, `finance-app:budgets`, `finance-app:initial-balance` và cho chọn file JSON.

- [ ] **Step 1: Viết ImportDialog**

Đọc legacy:

```js
const LEGACY = {
  transactions: "finance-app:transactions",
  budgets: "finance-app:budgets",
  initialBalance: "finance-app:initial-balance",
};
```

Chuyển budgets object `{category: {limit, fixed}}` → array. `hasLegacy` = có transaction, có budget, hoặc `initial_balance > 0`. Nhận file JSON qua `<input type="file" accept="application/json">` với shape `{transactions, budgets, initial_balance}` (budgets cho phép cả object hoặc array).

Nút "Nhập dữ liệu": gọi `api.importData(payload)`; thành công → xoá 3 key localStorage, `window.location.reload()`; lỗi 409 → hiện "Tài khoản đã có dữ liệu."; lỗi khác → hiện message. Nút "Bỏ qua" đóng dialog nhưng **không** xoá localStorage.

- [ ] **Step 2: Hiển thị dialog trong App**

Chỉ render khi `importedAt === null` và legacy có dữ liệu. Sau khi import reload nên không cần state phức tạp.

- [ ] **Step 3: Header có user + đăng xuất**

`const { user, logout } = useAuth();` hiển thị `user.display_name || user.email`; nút "Đăng xuất" gọi `logout()` (bắt lỗi bằng alert).

- [ ] **Step 4: Rà 401**

Kiểm tra mọi chỗ gọi hook async đều `.catch` hoặc try/catch: `TransactionForm`, `BudgetEditor`, `deleteTransaction`, `logout`. Khi 401, event `auth:unauthorized` đưa `user` về null → Root hiện LoginPage.

- [ ] **Step 5: Build và lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 6: Manual check**

1. Trước khi login, dữ liệu localStorage cũ còn.
2. Đăng ký user mới → dialog import hiện; nhập → giao dịch/budget/số dư xuất hiện, localStorage bị xoá.
3. Đăng ký user thứ hai trên cùng browser → không thấy dữ liệu của user 1, không có dialog (localStorage đã xoá).
4. Xoá cookie/session rồi thao tác → quay về login.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(frontend): legacy import dialog, logout, 401 handling"
```

---

### Task 13: Full verification + README finalization

**Files:**
- Modify: `README.md`
- Test: toàn bộ

**Interfaces:**
- Produces: bằng chứng chạy được trên SQLite (test) và Postgres (dev), frontend build sạch.

- [ ] **Step 1: Chạy backend tests trên SQLite**

Run: `cd backend && .venv/bin/pytest -q`
Expected: tất cả pass.

- [ ] **Step 2: Chạy backend tests trên Postgres dev**

Run:

```bash
docker compose up -d db
cd backend
DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/pytest -q
```

Expected: tất cả pass, không lỗi kiểu dữ liệu Postgres.

- [ ] **Step 3: Kiểm tra migration sạch**

Run:

```bash
cd backend
DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/python manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

- [ ] **Step 4: Frontend lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 5: Smoke test API end-to-end bằng curl**

```bash
# Terminal 1: backend
cd backend && DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/python manage.py runserver

# Terminal 2
curl -c /tmp/finance-cookies -b /tmp/finance-cookies http://localhost:8000/api/auth/csrf/
TOKEN=$(grep csrftoken /tmp/finance-cookies | awk '{print $7}')
curl -c /tmp/finance-cookies -b /tmp/finance-cookies -H "X-CSRFToken: $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"strongpass123"}' http://localhost:8000/api/auth/register/
curl -c /tmp/finance-cookies -b /tmp/finance-cookies -H "X-CSRFToken: $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":50000,"category":"Ăn uống","date":"2026-10-29","note":"smoke"}' \
  http://localhost:8000/api/transactions/
curl -b /tmp/finance-cookies http://localhost:8000/api/transactions/
```

Expected: register 201, create 201, list có đúng 1 giao dịch của user vừa tạo.

- [ ] **Step 6: Cập nhật README**

README gồm: giới thiệu, kiến trúc `frontend/` + `backend/`, yêu cầu (Node 24, Python 3.12, Docker), setup dev, test, biến môi trường, deploy Vercel + Neon từ Task 8, ghi chú bảo mật (session cookie, CSRF, mỗi user chỉ thấy dữ liệu của mình), và giới hạn v1.

- [ ] **Step 7: Commit cuối**

```bash
git add -A
git commit -m "docs: setup, testing and Vercel/Neon deploy guide"
```

---

## Self-Review Notes

- **Spec coverage:** auth (Task 3), transactions/budgets/profile (4–6), import (7), Vercel + Neon (8), frontend login/auth/API/import (9–12), tests/verification (13). Non-goals không có task — đúng.
- **Type consistency:** `api` method names, `useAuth`/`useTransactions`/`useBudgets`/`useProfile` signatures, và response shapes được định nghĩa một lần ở Interfaces và dùng lại.
- **Review Focus tests:** CSRF → Task 3; cross-user → Tasks 4–6; import atomic/409 → Task 7; amount bounds → Task 4; session expiry → Task 12 Step 4 + Task 13 smoke.
