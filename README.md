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
cd backend && .venv/bin/pytest -q
cd frontend && npm run lint && npm run build
```

Backend test dùng Postgres từ `backend/.env`; nếu không có `DATABASE_URL` thì fallback SQLite.

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
npx vercel env pull .env.local
DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" \
  backend/.venv/bin/python backend/manage.py migrate
```

5. Deploy:

```bash
npx vercel --prod
```

`vercel.json` dùng Vercel Services: `/api/*`, `/admin/*`, `/static/*` vào Django; mọi path khác vào React. Vì cùng domain nên session cookie và CSRF hoạt động mà không cần CORS.

## Bảo mật

- Mật khẩu băm bằng PBKDF2 mặc định của Django.
- Session cookie httpOnly; không lưu token trong `localStorage`.
- Mọi API lọc dữ liệu theo user đang đăng nhập.
- Request ghi cần CSRF token.

## Giới hạn v1

- Chưa có xác thực email, quên mật khẩu, đăng nhập mạng xã hội, rate limiting.
- Chưa có phân trang giao dịch.
