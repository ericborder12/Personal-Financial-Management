# Thiết kế: Đăng nhập đa người dùng + Postgres (Django)

Ngày: 2026-10-29
Trạng thái: Chờ duyệt

## 1. Mục tiêu và lý do

Ứng dụng hiện tại là SPA React (Vite + Tailwind v4) quản lý thu chi cá nhân, toàn bộ dữ liệu nằm trong `localStorage` và chỉ dùng được cho một người trên một máy. Mục tiêu là biến nó thành ứng dụng nhiều người dùng: mỗi người có tài khoản riêng và **chỉ thấy dữ liệu của chính mình**, dữ liệu lưu trong Postgres dùng chung.

Backend chọn **Django + Django REST Framework + Postgres** vì Django có sẵn auth hoàn chỉnh (user, hash mật khẩu, session, phân quyền), ORM và migrations, admin panel — giảm phần phải tự viết và tự chịu rủi ro bảo mật so với tự ghép Node. Đây là lựa chọn người dùng đã chốt sau khi so sánh với Supabase và Node tự ghép.

## 2. Mục tiêu (Goals)

- Đăng ký, đăng nhập, đăng xuất bằng email + mật khẩu.
- Mỗi người dùng có transactions, budgets và số dư ban đầu riêng; server là nơi quyết định quyền truy cập.
- Dữ liệu lưu bền trong Postgres, không còn phụ thuộc `localStorage` cho dữ liệu tài chính.
- Giữ nguyên giao diện và trải nghiệm React hiện tại; thêm trang đăng nhập và chặn truy cập khi chưa đăng nhập.
- Nhập (import) một lần dữ liệu `localStorage` hiện có vào tài khoản đầu tiên đăng nhập.
- Có Django admin để quản trị/kiểm tra dữ liệu.
- Có test backend cho auth, phân quyền dữ liệu và CRUD.

## 3. Không làm trong phiên bản này (Non-goals)

- Đăng nhập mạng xã hội (Google/Facebook), magic link.
- Xác thực email và luồng quên/đặt lại mật khẩu qua email (Django đã có sẵn hạ tầng; sẽ bật khi có SMTP).
- Chia sẻ ngân sách/giao dịch giữa nhiều người, tài khoản gia đình.
- Đa tiền tệ, ứng dụng mobile, đồng bộ realtime.
- Phân trang/lọc nâng cao danh sách giao dịch (chỉ làm nếu dữ liệu lớn).

## 4. Anti-goals (làm ra cũng coi như thất bại)

- Lưu token/mật khẩu trong `localStorage`.
- Chỉ ẩn dữ liệu ở UI nhưng API vẫn trả dữ liệu người khác.
- Mỗi lần refresh lại phải đăng nhập lại (session phải bền hợp lý).
- Phá vỡ giao diện tiếng Việt và cách tính ngân sách hiện tại.

## 5. Ràng buộc

- Frontend hiện có: React 19, Vite 8, Tailwind 4; giữ nguyên code, chuyển vào thư mục `frontend/`.
- Backend mới: Python 3.12+, Django 5.2 LTS, DRF, Postgres 16. Thêm thư mục `backend/`.
- Giao diện tiếng Việt, số tiền VND là số nguyên (BigInteger).
- Dev local chạy được bằng Docker Compose cho Postgres + `runserver` + `vite`.
- Production deploy trên **Vercel** (domain miễn phí `*.vercel.app`) + **Neon** (Postgres managed, free tier); Docker Compose dùng cho dev local.

## 6. Phương án đã cân nhắc

| Phương án | Kết luận |
|---|---|
| Supabase (Postgres + auth + RLS) | Loại: nhanh nhưng phụ thuộc vendor, RLS dễ sai và khó gỡ lỗi. |
| Node API + Postgres + auth tự ghép | Loại: phải tự làm session/hash/reset/rate-limit, nhiều rủi ro bảo mật hơn. |
| **Django + DRF + Postgres** | **Chọn.** Auth có sẵn, self-host được, đúng Postgres. Đánh đổi: thêm runtime Python và phải quản server. |

## 7. Quyết định kỹ thuật (của người thiết kế, cần người dùng kiểm tra)

1. **Xác thực bằng session cookie** (httpOnly, SameSite=Lax, Secure khi production) + CSRF token, không dùng JWT trong localStorage. Lý do: an toàn hơn với XSS, DRF hỗ trợ sẵn, phù hợp SPA cùng domain khi deploy.
2. **Email là định danh đăng nhập**, dùng custom User model (`AbstractUser`, bỏ username, `USERNAME_FIELD = "email"`). Phải tạo trước migration đầu tiên.
3. **`initial_balance`** đặt trong model `Profile` (OneToOne với User), không lưu trong localStorage.
4. **Số tiền** dùng `BigIntegerField` (VND, không phần lẻ).
5. **Import dữ liệu cũ** (một lần, client khởi xướng):
   - Hiển thị hộp thoại khi trình duyệt còn key `finance-app:transactions`, `finance-app:budgets` hoặc `finance-app:initial-balance`, **và** tài khoản đang đăng nhập có `imported_at = null`. Server kiểm tra lại: trả 409 nếu tài khoản đã có giao dịch hoặc đã import — không tin client.
   - Gửi cả transactions, budgets và initial_balance trong **một** request; server ghi trong `transaction.atomic`, thành công thì set `imported_at`. Không thể import lần hai.
   - Vì tài khoản mới bắt đầu rỗng (mục 10), import là thay thế trạng thái rỗng, không merge. Có dữ liệu sẵn → 409.
   - Chỉ xoá key `localStorage` sau khi API trả 200, và hiển thị số bản ghi đã nhập.
   - `localStorage` gắn với origin. Nếu dữ liệu cũ nằm ở origin khác với bản deploy, hộp thoại cho phép chọn file JSON export từ app cũ và import qua cùng endpoint.
6. **Không bật** xác thực email/reset mật khẩu trong v1.
7. **Rate limiting đăng nhập**: chưa làm trong v1, ghi nhận là việc tiếp theo.
8. **Monorepo `frontend/` + `backend/`**: chuyển React hiện tại vào `frontend/`, backend ở `backend/`. Vercel Services cần hai service cùng cấp.
9. **Postgres local qua Docker Compose**; cấu hình qua biến môi trường trong `.env` (không commit).
10. **Tài khoản mới bắt đầu rỗng** — không seed budget mặc định như bản `localStorage` cũ. Người dùng tự thiết lập hoặc import dữ liệu cũ. Lý do: tránh xung đột với import và tránh áp hạn mức "Nhà ở 2,5 triệu" cho người mới.
11. **Hành vi khi ghi dữ liệu**: modal giữ mở, hiện trạng thái đang lưu khi gọi API; thành công mới đóng; lỗi hiện inline và giữ nguyên dữ liệu đã nhập (không optimistic để tránh mất giao dịch người dùng tưởng đã lưu). `initial_balance` lưu khi blur hoặc debounce 500ms, không gọi API mỗi lần gõ phím.
12. **Deploy trên Vercel + Neon**: Vercel phục vụ React static và Django qua Python serverless function; database là Postgres managed của Neon (free tier). Vercel không chạy Postgres/Docker thường trú, nên Docker chỉ dùng cho dev local.
13. **Migrations chạy tay hoặc trong CI** trước khi deploy, không chạy trong cold start của serverless.
14. **Hash mật khẩu dùng PBKDF2 mặc định của Django** (đủ an toàn cho v1); Argon2 để sau, không ảnh hưởng tính năng.

## 8. Kiến trúc và cấu trúc thư mục

```
finance-app/
├── frontend/                 # React hiện tại (chuyển vào đây)
│   ├── src/
│   │   ├── api/client.js     # NEW: fetch wrapper + CSRF
│   │   ├── auth/AuthContext.jsx  # NEW: trạng thái đăng nhập
│   │   ├── pages/LoginPage.jsx   # NEW: đăng nhập / đăng ký
│   │   ├── components/ImportDialog.jsx  # NEW
│   │   └── hooks/*           # SỬA: gọi API thay cho localStorage
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── manage.py
│   ├── config/               # settings, urls, wsgi/asgi
│   ├── accounts/             # custom User, register/login/logout/me
│   ├── finance/              # Transaction, Budget, Profile, import
│   ├── requirements.txt
│   └── .env.example
├── vercel.json               # NEW: Vercel Services (frontend + backend)
├── docker-compose.yml        # NEW: Postgres cho dev
└── .gitignore
```

## 9. Mô hình dữ liệu

**User** (`accounts.User`, kế thừa `AbstractUser`)
- `email` (unique, dùng để đăng nhập), `password` (hash), `display_name` (tuỳ chọn), `is_active`, `is_staff`.

**Profile** (OneToOne User, tạo tự động khi đăng ký)
- `initial_balance` BigInteger, mặc định 0.
- `imported_at` DateTimeField null — đánh dấu đã import dữ liệu cũ, chặn import lần hai.

**Transaction**
- `id` UUID (primary key), `user` FK → User (on_delete CASCADE, có index), `type` (`income`/`expense`), `amount` BigInteger (> 0), `category` CharField, `date` DateField, `note` CharField (blank), `created_at` DateTimeField.
- Index `(user, date)`; ràng buộc amount > 0 ở serializer/DB check.

**Budget**
- `user` FK → User, `category` CharField, `limit` BigInteger, `fixed` Boolean.
- Unique `(user, category)`.

Mọi truy vấn luôn lọc `user=request.user`; xoá giao dịch kiểm tra quyền sở hữu (trả 404 nếu không phải của mình).

## 10. API (dưới `/api/`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/auth/csrf/` | Lấy CSRF cookie cho SPA |
| POST | `/api/auth/register/` | `{email, password, display_name?}` → tạo user + profile + đăng nhập |
| POST | `/api/auth/login/` | `{email, password}` → session |
| POST | `/api/auth/logout/` | Huỷ session |
| GET | `/api/auth/me/` | User hiện tại hoặc 401 |
| GET/POST | `/api/transactions/` | Danh sách / tạo giao dịch của mình |
| DELETE | `/api/transactions/<uuid>/` | Xoá giao dịch của mình |
| GET/PUT | `/api/budgets/` | Đọc/ghi toàn bộ budget của mình |
| GET/PUT | `/api/profile/` | Đọc/ghi `initial_balance` |
| POST | `/api/import/` | Nhập một lần `{transactions, budgets, initial_balance}`; 409 nếu tài khoản đã có dữ liệu/đã import |
| GET | `/api/health/` | Healthcheck cho Docker (DB kết nối được) |

Phản hồi lỗi thống nhất dạng `{detail: "..."}` hoặc lỗi field của DRF. Ngày trả về ISO `YYYY-MM-DD`.
`/api/import/` chạy trong `transaction.atomic`, kiểm tra quyền sở hữu từng bản ghi (luôn gán `user=request.user`), bỏ qua id do client gửi và sinh id mới.

## 11. Bảo mật

- Mật khẩu hash bằng Django (mặc định PBKDF2; có thể chuyển Argon2 nếu cài `argon2-cffi`).
- Session cookie httpOnly; `Secure` + `SameSite=Lax` khi production; `SESSION_COOKIE_AGE` hợp lý (2 tuần).
- CSRF bật cho mọi request ghi; SPA gửi `X-CSRFToken` đọc từ cookie.
- CORS chỉ cho phép origin dev (`http://localhost:5173`) và domain production, kèm `credentials`.
- `SECRET_KEY`, thông tin DB đọc từ `.env`; `.env` nằm trong `.gitignore`.
- `DEBUG=False`, `ALLOWED_HOSTS` cấu hình theo môi trường khi deploy.
- Kiểm tra quyền sở hữu ở tầng queryset, không tin dữ liệu client.

## 12. Frontend

- `AuthProvider` gọi `/api/auth/me/` khi khởi động; trạng thái `loading | authenticated | anonymous`.
- `App` bọc trong `AuthGate`: chưa đăng nhập → `LoginPage`; đã đăng nhập → giao diện hiện tại.
- `LoginPage`: một trang với hai tab Đăng nhập / Đăng ký, style gradient indigo giống thẻ số dư hiện tại, hiển thị lỗi tiếng Việt.
- `useTransactions`, `useBudgets`, `initial_balance` chuyển sang gọi API, có state loading/error; giữ nguyên interface để các component ít phải sửa.
- Header thêm nút Đăng xuất và tên người dùng.
- Sau đăng nhập lần đầu, nếu có dữ liệu localStorage cũ → hỏi import.
- Xử lý 401 toàn cục: chuyển về trang đăng nhập.

## 13. Triển khai trên Vercel + Neon

- **Vercel Services** (beta, có trên gói free) phục vụ cả hai service trong một project, cùng origin `https://<project>.vercel.app`:
  - `frontend` root `frontend/`: Vercel build `npm run build`, output `dist/`; rewrite mọi route không phải `/api/*` về SPA.
  - `backend` root `backend/`: Vercel tự nhận diện Django qua `manage.py`, đọc `DJANGO_SETTINGS_MODULE` và WSGI entrypoint; `/api/*` rewrite vào service này.
  - Cấu hình `vercel.json` dạng `{"services": {...}, "rewrites": [{"source": "/api/(.*)", "destination": {"service": "backend"}}, {"source": "/(.*)", "destination": {"service": "frontend"}}]}`.
  - Cùng origin nên session cookie + CSRF hoạt động, production không cần CORS.
- **Postgres = Neon free tier** (managed Postgres, không phải Supabase): tạo project, lấy connection string **pooled** (Neon pooler) đặt vào `DATABASE_URL`. Dùng `CONN_MAX_AGE=0` và `DISABLE_SERVER_SIDE_CURSORS=True` vì serverless/pooler.
- **Vercel không host Postgres/Docker thường trú** → không dùng `docker-compose.prod.yml`. Docker Compose chỉ chạy Postgres cho dev local.
- **Migrations**: chạy bằng CI hoặc tay (`vercel env pull` rồi `python backend/manage.py migrate`) trước khi deploy; không chạy trong cold start.
- **Static**: Vercel tự chạy `collectstatic` khi thấy `STATIC_ROOT` và phục vụ asset qua CDN; không cần WhiteNoise ở production. React do service frontend phục vụ.
- **Biến môi trường trên Vercel:** `DEBUG=False`, `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS=.vercel.app`, `CSRF_TRUSTED_ORIGINS=https://<project>.vercel.app`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`.
- **Giới hạn free tier:** function timeout (Hobby ~10s) và cold start; Neon tự ngủ khi rỗi nên request đầu có thể chậm. Chấp nhận được cho app cá nhân.
- **Preview deployment** có domain riêng: chỉ production domain nằm trong `CSRF_TRUSTED_ORIGINS`; preview muốn test auth thì thêm domain đó vào env của preview.
- **Backup:** dùng tính năng backup/branch của Neon; ghi runbook, chưa tự động hoá trong v1.

## 14. Kiểm thử và xác minh

- Backend (pytest-django): đăng ký/đăng nhập/đăng xuất; user A không đọc/sửa/xoá được dữ liệu user B; CRUD transactions/budgets/profile; validate amount > 0.
- Import: nhập đủ cả ba loại; trả 409 khi tài khoản đã có giao dịch hoặc `imported_at` đã set; không import lần hai; chỉ gán dữ liệu cho user hiện tại; request lỗi giữa chừng không để lại dữ liệu dở (atomic).
- Frontend: kiểm tra thủ công luồng đăng nhập → thêm giao dịch → refresh vẫn còn → đăng xuất → đăng nhập lại thấy dữ liệu; ít nhất một test cho `api/client` nếu thêm Vitest.
- Trước khi báo hoàn thành: chạy `pytest`, `npm run lint`, `npm run build`, và kiểm tra luồng thật trên dev.

## 15. Việc còn để người build quyết

- Chi tiết trình bày trang login (khoảng cách, màu, animation) miễn khớp phong cách hiện tại.
- Có thêm phân trang giao dịch hay không (mặc định: chưa).
- Tên project Vercel/Neon và domain production cụ thể (do người dùng tạo tài khoản; thiết kế chỉ ràng buộc env như mục 13).

## 16. Rủi ro và cách giảm

- **Custom User model phải đặt trước migration đầu tiên** → làm ngay khi khởi tạo project, không migrate trước.
- **CSRF/CORS sai cấu hình ở dev** → thêm endpoint `csrf/` và test bằng trình duyệt thật, không chỉ curl.
- **Import trùng dữ liệu** → server chặn bằng `imported_at` + kiểm tra tài khoản rỗng, xoá key chỉ sau khi thành công.
- **Mất dữ liệu localStorage** → chỉ xoá sau khi API import trả thành công; hiển thị số bản ghi đã nhập.
- **Khác origin khi deploy** → có đường import bằng file JSON để không phụ thuộc việc chạy app mới trên đúng origin cũ.
- **Session hết hạn giữa chừng** → interceptor 401 đưa về login, không mất dữ liệu form đang nhập (chấp nhận trong v1).
