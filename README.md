# Personal Financial Management

Ứng dụng quản lý tài chính cá nhân: React + Vite ở `frontend/`, Django REST Framework ở `backend/`, dữ liệu trong Postgres. Mỗi tài khoản có giao dịch, hạn mức và số dư riêng.

## Kiến trúc

- `frontend/` — React 19, Vite, Tailwind. Gọi API qua `/api` cùng origin.
- `backend/` — Django 5.2, DRF, session cookie + CSRF.
- `docker-compose.yml` — Postgres 16 cho dev.
- Production: Vercel Services (frontend + backend trong một project) và Neon Postgres.

## Yêu cầu

- Node 24+
- Python 3.12+
- Docker (cho Postgres dev)
- Vercel CLI 50.38+ (khi deploy)

## Dev

```bash
# 1. Postgres
docker compose up -d db

# 2. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py runserver

# 3. Frontend (terminal khác)
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite proxy `/api` sang `http://localhost:8000`, nên cookie/CSRF hoạt động như cùng origin.

## Test

```bash
# Backend trên SQLite tạm (không cần Docker)
cd backend
DATABASE_URL=sqlite:////tmp/finance-test.sqlite3 .venv/bin/pytest -q

# Backend trên Postgres dev
docker compose up -d db
DATABASE_URL=postgres://finance:finance@localhost:5432/finance .venv/bin/pytest -q

# Kiểm tra migration còn thiếu
DATABASE_URL=postgres://finance:finance@localhost:5432/finance \
  .venv/bin/python manage.py makemigrations --check --dry-run

# Frontend
cd ../frontend
npm run lint && npm run build
```

Biến môi trường truyền trực tiếp trên dòng lệnh sẽ ghi đè giá trị trong `backend/.env`.

## Biến môi trường backend

| Biến | Mô tả |
| --- | --- |
| `DEBUG` | `True` khi dev, `False` trên production |
| `SECRET_KEY` | Khóa bí mật Django |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` |
| `ALLOWED_HOSTS` | Danh sách host, phân tách bằng dấu phẩy |
| `CSRF_TRUSTED_ORIGINS` | Origin được tin cậy, ví dụ `https://app.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | Chỉ cần khi frontend chạy khác origin |

## Deploy Vercel + Neon

1. Tạo project trên [Neon](https://neon.tech), lấy **pooled connection string**.
2. Đăng nhập và link project Vercel:

```bash
npx vercel login
npx vercel link
```

3. Thêm biến môi trường cho Production (và Preview nếu cần):

```bash
npx vercel env add DATABASE_URL production
npx vercel env add SECRET_KEY production
npx vercel env add DEBUG production          # False
npx vercel env add ALLOWED_HOSTS production  # .vercel.app
npx vercel env add CSRF_TRUSTED_ORIGINS production  # https://<project>.vercel.app
```

4. Chạy migration một lần từ máy local (Vercel không tự migrate):

```bash
npx vercel env pull .env.local --environment production
export DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' .env.local | tr -d '"')"
backend/.venv/bin/python backend/manage.py migrate
```

5. Deploy:

```bash
npx vercel --prod
```

`vercel.json` dùng Vercel Services: `/api/*`, `/admin/*`, `/static/*` vào Django; mọi path khác vào React. Vì cùng domain nên session cookie và CSRF hoạt động mà không cần CORS. Vercel tự chạy `collectstatic` khi thấy `STATIC_ROOT` và phục vụ file tĩnh qua CDN.

## Nhập dữ liệu cũ

Dữ liệu bản cũ nằm trong `localStorage` với các key `finance-app:transactions`, `finance-app:budgets`, `finance-app:initial-balance`. Sau khi đăng nhập lần đầu, nếu còn dữ liệu, app hiện hộp thoại nhập một lần:

- **Nhập dữ liệu**: gửi lên server, xoá 3 key localStorage rồi tải lại trang.
- **Bỏ qua**: đóng hộp thoại, không xoá dữ liệu; tải lại trang sẽ hỏi lại.
- Có thể chọn file JSON `{ "transactions": [...], "budgets": [...], "initial_balance": 0 }` thay cho dữ liệu trình duyệt.
- Mỗi tài khoản chỉ nhập được một lần; nếu đã có dữ liệu, server trả `409`.

## Bảo mật

- Mật khẩu băm bằng PBKDF2 mặc định của Django.
- Session cookie httpOnly; không lưu token trong `localStorage`.
- Mọi API lọc dữ liệu theo user đang đăng nhập.
- Request ghi cần CSRF token.

## Giới hạn v1

- Chưa có xác thực email, quên mật khẩu, đăng nhập mạng xã hội, rate limiting.
- Chưa có phân trang giao dịch.
