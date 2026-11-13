# Implementation Plan: Hỗ trợ & Góp ý (Support Live Chat & Feedback System)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng Hỗ trợ & Góp ý (Live Chat khi Admin Online và Hộp thư góp ý khi Admin Offline) trên một Tab riêng biệt ở Sidebar.

**Architecture:** 
- Backend Django REST Framework với model `ChatMessage`, `Feedback`, và trường `last_seen` trên User để xác định trạng thái Online/Offline của Admin.
- Polling HTTP nhẹ (3-4s khi mở tab chat) đảm bảo tương thích 100% với Vercel Serverless và Neon PostgreSQL mà không tốn phí WebSocket hay thư viện ngoài.
- Không gửi email tự động khi có góp ý để tiết kiệm tuyệt đối quota 500 mail/ngày của Gmail SMTP; quản lý tập trung trên web.
- Giao diện hai góc nhìn (User View và Admin View) trên cùng một Page React `SupportPage.jsx`.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Django 5.2, Django REST Framework, Neon PostgreSQL, Pytest.

---

## Global Constraints
- Phải giữ vững multi-tenancy: User chỉ xem được tin nhắn và feedback của chính mình. Admin (`is_staff=True` hoặc `is_superuser=True`) xem được danh sách tin nhắn từ mọi user và toàn bộ feedback.
- Không gửi email SMTP cho mỗi tin nhắn/góp ý để bảo toàn quota email.
- Polling chỉ kích hoạt khi người dùng đang ở trong tab `support`, tự hủy `setInterval` khi rời tab hoặc unmount để tránh rò rỉ tài nguyên.

---

## Tasks

### Task 1: Backend Models & Migrations
**Files:**
- Modify: `backend/accounts/models.py` (thêm trường `last_seen`)
- Modify: `backend/finance/models.py` (thêm model `ChatMessage` và `Feedback`)
- Test: `backend/finance/tests/test_support.py`

- [x] Thêm trường `last_seen = models.DateTimeField(null=True, blank=True)` vào `accounts.models.User`.
- [x] Thêm model `ChatMessage` và `Feedback` vào `finance.models.py`.
- [x] Chạy `python manage.py makemigrations` và `python manage.py migrate`.
- [x] Đăng ký `ChatMessage` và `Feedback` trong `backend/finance/admin.py`.

### Task 2: Backend Serializers & API Endpoints
**Files:**
- Modify: `backend/finance/serializers.py`
- Modify: `backend/finance/views.py`
- Modify: `backend/finance/urls.py`
- Test: `backend/finance/tests/test_support.py`

- [x] Tạo `ChatMessageSerializer` và `FeedbackSerializer`.
- [x] Tạo view `SupportPresenceView`:
  - `GET`: Trả về `{"admin_online": bool, "last_active": timestamp}`.
  - `POST`: Cập nhật `request.user.last_seen = timezone.now()`.
- [x] Tạo view `ChatMessageListCreateView`:
  - User thường: lấy tin nhắn giữa user đó và admin; gửi tin nhắn đến admin.
  - Admin: lấy danh sách cuộc hội thoại hoặc tin nhắn với user cụ thể; gửi tin nhắn trả lời.
- [x] Tạo view `FeedbackListCreateView` và `FeedbackDetailView`:
  - User thường: tạo feedback mới, xem feedback của chính mình kèm phản hồi từ admin.
  - Admin: xem toàn bộ feedback, cập nhật status và `admin_reply`.
- [x] Đăng ký các route vào `backend/finance/urls.py`.

### Task 3: Backend Unit Tests
**Files:**
- Create: `backend/finance/tests/test_support.py`

- [x] Viết test `test_support_presence_offline_and_online`: Kiểm tra heartbeat đổi trạng thái admin.
- [x] Viết test `test_user_send_chat_message_and_admin_reply`: Kiểm tra gửi và nhận tin nhắn hai chiều.
- [x] Viết test `test_feedback_create_and_admin_resolve`: Kiểm tra gửi góp ý và admin cập nhật phản hồi.
- [x] Chạy `venv/bin/pytest finance/tests/test_support.py --reuse-db` và xác nhận 100% passed.

### Task 4: Frontend API Client & Icons
**Files:**
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/components/common/Icons.jsx`

- [x] Thêm API methods: `getSupportPresence`, `sendSupportHeartbeat`, `getChatMessages`, `sendChatMessage`, `getFeedbacks`, `createFeedback`, `updateFeedback`.
- [x] Thêm icon `IconChat`, `IconPaperAirplane`, `IconInbox` vào `Icons.jsx`.

### Task 5: Frontend Support Page (`SupportPage.jsx`)
**Files:**
- Create: `frontend/src/pages/SupportPage.jsx`

- [x] Xây dựng User View:
  - Header trạng thái Admin: 🟢 *Admin đang trực tuyến* / ⚪ *Admin đang vắng mặt*.
  - Tab 1: Live Chat: khung chat bong bóng, gửi tin nhắn, polling 3 giây.
  - Tab 2: Hộp thư góp ý: Form gửi ý kiến (Báo lỗi, Đề xuất tính năng, Khác) và danh sách lịch sử góp ý kèm phản hồi từ admin.
  - Nút chuyển nhanh sang Hộp thư góp ý khi Admin offline.
- [x] Xây dựng Admin View:
  - Danh sách người dùng đang nhắn tin, chọn user để chat trực tiếp.
  - Bảng duyệt toàn bộ thư góp ý của mọi người dùng, ô nhập phản hồi trực tiếp cho user.

### Task 6: Tích hợp vào App Navigation
**Files:**
- Modify: `frontend/src/components/layout/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

- [x] Thêm mục "Hỗ trợ & Góp ý" vào `NAV_ITEMS` trong `Sidebar.jsx`.
- [x] Render `SupportPage` trong `App.jsx` khi `activeTab === "support"`.
- [x] Tích hợp heartbeat định kỳ (mỗi 60s) nếu người dùng đăng nhập là admin (`is_staff`).

### Task 7: Build Verification & Deployment
**Files:**
- All modified files

- [x] Chạy toàn bộ test backend: `pytest --reuse-db`.
- [x] Chạy frontend build: `npm run build` và `npm run lint`.
- [x] Git commit và push lên `main` để Vercel tự động redeploy.
