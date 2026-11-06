# Design: Trợ Lý AI Hỏi Đáp (Cloudflare Workers AI) & Quản Lý Tiền Gửi Tiết Kiệm (Savings Term Deposits)

## 1. Intent & Why
- Người dùng FinanceFlow cần một người trợ lý AI thông minh:
  1. Hướng dẫn sử dụng chi tiết các tính năng của website (thêm giao dịch, đặt ngân sách, quản lý ví/tài khoản, xem báo cáo).
  2. Tư vấn tài chính cá nhân thực tế (phân bổ thu nhập, mẹo tiết kiệm, cắt giảm chi phí với các tình huống như lương 10 triệu, tiền nhà 4 triệu, áp dụng quy tắc 50/30/20).
  3. Phân tích trực tiếp dựa trên số liệu tài chính thực tế của chính họ trong ứng dụng (số dư, chi tiêu tháng, ngân sách, sổ tiết kiệm).
- Người dùng cũng cần một công cụ chuyên biệt để **quản lý các khoản tiền gửi ngân hàng (sổ tiết kiệm có kỳ hạn)** và một **công cụ tính lãi suất nhanh (Savings Calculator)** để chủ động lập kế hoạch sinh lời từ khoản tiền nhàn rỗi.
- Khi gửi tiết kiệm, số tiền sẽ được trừ trực tiếp từ tài khoản nguồn (luân chuyển tài sản) mà không tính vào chi tiêu sinh hoạt, và khi tất toán sẽ hoàn trả tiền gốc kèm ghi nhận tiền lãi vào thu nhập.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Hỏi đáp AI (Q&A Assistant)**:
  - Tích hợp Cloudflare Workers AI LLM (mặc định model `@cf/meta/llama-3.1-8b-instruct`) qua backend Django.
  - Hỗ trợ tiếng Việt tự nhiên, trả lời mạch lạc, cấu trúc bullet point rõ ràng.
  - Ngữ cảnh thông minh (Context-aware): Backend tự động tổng hợp tóm tắt (số dư các ví, tổng chi tiêu tháng hiện tại, các danh mục chi nhiều nhất, ngân sách còn lại, các khoản tiết kiệm) và đưa vào system prompt.
  - Giao diện chat trực quan với gợi ý câu hỏi nhanh (Prompt chips), hỗ trợ render markdown/danh sách, nút xóa lịch sử trò chuyện, trạng thái loading.
  - Xử lý lỗi thân thiện khi chưa cấu hình API key Cloudflare với hướng dẫn cấu hình rõ ràng.
- **Quản lý Tiền gửi Ngân hàng & Sổ tiết kiệm (Savings Deposits)**:
  - Lưu và quản lý danh sách các sổ tiết kiệm: Ngân hàng, số tiền gửi, ngày gửi, kỳ hạn (tháng), lãi suất (%/năm), hình thức nhận lãi (cuối kỳ / hàng tháng), trạng thái (đang gửi / đã tất toán), ghi chú.
  - Trừ trực tiếp số tiền gửi từ tài khoản nguồn được chọn dưới dạng luân chuyển tài sản (không tính vào chi tiêu sinh hoạt hàng tháng hay ngân sách chi tiêu).
  - Tự động tính toán: Ngày đáo hạn, Tiền lãi dự kiến, Tổng số tiền nhận được khi đến hạn.
  - Hỗ trợ tất toán sổ tiết kiệm: Cho phép nhập số tiền lãi thực tế nhận được (hỗ trợ cả tất toán đúng hạn và tất toán trước hạn); hoàn gốc về tài khoản chỉ định và ghi nhận tiền lãi vào danh mục Thu nhập.
  - Máy tính lãi suất tiền gửi nhanh (Calculator): Cho phép nhập thử số tiền, kỳ hạn, lãi suất để xem bảng tính lợi nhuận dự kiến ngay lập tức mà không cần tạo sổ.
- **Trải nghiệm & Thiết kế**:
  - Tích hợp liền mạch vào navigation hiện tại của FinanceFlow (thêm 2 mục "Sổ tiết kiệm" và "Trợ lý AI" vào Sidebar).
  - Tương thích 100% Dark Mode và Responsive trên thiết bị di động.

### Non-Goals
- Kết nối tự động qua Open Banking API đến các ngân hàng thật (người dùng tự nhập thông tin sổ tiết kiệm của mình).
- Lưu toàn bộ lịch sử chat vào database vĩnh viễn (lịch sử lưu trong state phiên làm việc của người dùng trên frontend để đảm bảo tính riêng tư, có nút làm mới cuộc trò chuyện).
- Đầu tư cổ phiếu/chứng khoán/crypto.

### Anti-Goals
- Tuyệt đối không để lộ Cloudflare Account ID hoặc API Token trên frontend bundle hoặc network request phía client; toàn bộ gọi qua Django backend endpoint.
- Không tính việc gửi tiết kiệm vào chi tiêu sinh hoạt (không làm sai lệch biểu đồ chi tiêu và ngân sách).
- Không làm gián đoạn hay đơ giao diện khi gọi AI (có spinner loading rõ ràng và timeout xử lý an toàn).

---

## 3. Approaches Considered

### Approach 1: Context-Aware Assistant + Backend Proxy + Dedicated Savings Deposit Tracker & Calculator (ĐƯỢC CHỌN)
- **Kiến trúc**:
  - Backend cung cấp endpoint `POST /api/ai/qa/` có xác thực session/cookie. Backend thu thập số liệu tổng quan của user (không bao gồm thông tin bảo mật nhạy cảm) và ghép vào System Prompt cùng kiến thức hướng dẫn sử dụng FinanceFlow.
  - Backend dùng Cloudflare Workers AI REST API an toàn với `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_API_TOKEN`.
  - Tạo model `SavingsDeposit` trong Django với đầy đủ thông tin kỳ hạn, lãi suất, tính toán ngày đáo hạn, liên kết giao dịch chuyển tiền nguồn/đích.
  - Frontend có trang `SavingsPage` (gồm danh sách sổ + máy tính lãi suất) và `QAPage` (giao diện chat AI thông minh).
- **Lý do chọn**: Đáp ứng hoàn hảo cả 2 nhu cầu của người dùng: tư vấn tài chính cá nhân sát với thực tế ví tiền của họ và quản lý chi tiết các khoản gửi tiết kiệm sinh lời với dòng tiền chính xác.

### Approach 2: Pure Advisory & Stateless App Guide (BỊ LOẠI)
- AI chỉ nhận câu hỏi và trả lời chung chung, không nắm được người dùng đang có bao nhiêu tiền, chi tiêu ra sao.
- Bị loại vì người dùng đã yêu cầu phương pháp 1 có liên kết ngữ cảnh tài chính thực tế.

### Approach 3: Frontend Direct Calling Cloudflare (BỊ LOẠI)
- Bị loại hoàn toàn vì vi phạm an ninh (lộ API Token trên trình duyệt).

---

## 4. Detailed Specification

### 4.1 Cơ chế Luân chuyển Tiền gửi Tiết kiệm (Ledger Integration)
1. **Khi mở sổ tiết kiệm**:
   - Nếu người dùng chọn tài khoản nguồn `account`:
     - Tạo một tài khoản ảo/hệ thống hoặc ghi nhận giao dịch luân chuyển tài sản: Trong `finance/models.py`, `Account` hiện có các loại `("cash", "bank", "ewallet", "other")`. Ta thêm loại `"savings"` ("Sổ tiết kiệm") vào `Account.ACCOUNT_TYPES`.
     - Hệ thống tự động duy trì một `Account(type="savings", name="Sổ tiết kiệm tích lũy")` cho mỗi người dùng (hoặc mỗi sổ tạo một account con). Khi mở sổ, tạo giao dịch `Transaction(type="transfer", account=nguon, to_account=acc_savings, amount=amount, note=f"Gửi tiết kiệm: {bank_name}")`.
     - Vì giao dịch này có `type="transfer"`, số dư tài khoản nguồn giảm đi, nhưng nó **KHÔNG** bị tính vào `Transaction.filter(type="expense")`, giữ nguyên vẹn 100% tính chính xác của các biểu đồ chi tiêu và ngân sách tháng!
2. **Khi tất toán sổ tiết kiệm**:
   - Người dùng chọn tài khoản nhận lại tiền và nhập "Tiền lãi thực nhận" (mặc định gợi ý bằng lãi dự tính nếu đúng hạn, hoặc 0/lãi không kỳ hạn nếu tất toán trước hạn).
   - Hệ thống tạo:
     - Giao dịch chuyển tiền hoàn gốc: `Transaction(type="transfer", account=acc_savings, to_account=acc_dich, amount=amount, note=f"Tất toán gốc tiết kiệm: {bank_name}")`.
     - Giao dịch thu nhập tiền lãi (nếu lãi > 0): `Transaction(type="income", account=acc_dich, category=cat_lai, amount=actual_interest, note=f"Tiền lãi tiết kiệm: {bank_name}")` (Category tự động chọn hoặc tạo danh mục thu nhập "Lãi tiết kiệm").
     - Đánh dấu sổ tiết kiệm `is_settled=True`, cập nhật `settled_at`, `actual_interest`, `settled_amount`.
3. **Khi xoá sổ tiết kiệm**:
   - Nếu sổ chưa tất toán, hoàn trả giao dịch transfer tương ứng hoặc xoá giao dịch liên quan để số dư tài khoản nguồn quay lại ban đầu.

---

### 4.2 Backend Implementation

#### A. Model `SavingsDeposit` (`backend/finance/models.py`)
```python
class SavingsDeposit(models.Model):
    PAYOUT_CHOICES = [
        ("end_of_term", "Lãi cuối kỳ"),
        ("monthly", "Lãi hàng tháng"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="savings_deposits")
    bank_name = models.CharField(max_length=100)
    source_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name="outbound_savings")
    savings_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name="inbound_savings")
    amount = models.BigIntegerField()
    start_date = models.DateField()
    term_months = models.IntegerField(default=6)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # % / năm, ví dụ 5.50
    payout_type = models.CharField(max_length=20, choices=PAYOUT_CHOICES, default="end_of_term")
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateField(null=True, blank=True)
    actual_interest = models.BigIntegerField(default=0)
    settled_amount = models.BigIntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def maturity_date(self):
        from dateutil.relativedelta import relativedelta
        return self.start_date + relativedelta(months=self.term_months)

    @property
    def estimated_interest(self):
        # amount * (interest_rate / 100) * (term_months / 12)
        return int(self.amount * (float(self.interest_rate) / 100) * (self.term_months / 12))
```

#### B. API Endpoints Sổ Tiết Kiệm (`backend/finance/urls.py`)
- `GET /api/finance/savings/`: Danh sách sổ tiết kiệm của user, kèm thống kê tổng tiền gửi, tổng tiền lãi dự kiến, số sổ đang gửi.
- `POST /api/finance/savings/`: Mở sổ tiết kiệm mới, trích tiền từ `source_account` qua transfer vào `savings_account`.
- `GET /api/finance/savings/<id>/`: Chi tiết sổ tiết kiệm.
- `PATCH /api/finance/savings/<id>/`: Cập nhật ghi chú/thông tin sổ.
- `POST /api/finance/savings/<id>/settle/`: Tất toán sổ tiết kiệm: nhận `destination_account_id` và `actual_interest`, hoàn gốc và ghi nhận lãi.
- `DELETE /api/finance/savings/<id>/`: Xoá sổ tiết kiệm và hoàn tác các giao dịch liên kết.

#### C. API Endpoint Hỏi Đáp AI (`backend/finance/ai_views.py` & urls)
- Endpoint: `POST /api/finance/ai/qa/`
- Quyền truy cập: `IsAuthenticated`
- Payload nhận vào:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Thu nhập 10 triệu, tiền nhà 4 triệu nên chi tiêu sao?" }
    ]
  }
  ```
- **Context Builder Logic**:
  - Tên hiển thị người dùng.
  - Tổng số dư khả dụng hiện tại (chia theo tiền mặt/ngân hàng/ví điện tử) và tổng tiền đang gửi tiết kiệm.
  - Tổng thu nhập và chi tiêu trong tháng hiện tại.
  - Top 3 danh mục chi nhiều nhất tháng.
  - Tình hình ngân sách: Số ngân sách đã đặt, số ngân sách đang bị vượt mức.
  - Danh sách các sổ tiết kiệm đang hoạt động (ngân hàng, số tiền, kỳ hạn, lãi suất, ngày đáo hạn).
- **System Prompt**:
  - Đóng vai: "Bạn là Chuyên gia Tư vấn Tài chính Cá nhân và Trợ lý Hướng dẫn sử dụng ứng dụng FinanceFlow".
  - Tri thức ứng dụng FinanceFlow: Hướng dẫn chi tiết các trang (Tổng quan, Sổ giao dịch, Tài khoản tiền, Danh mục, Ngân sách tháng, Sổ tiết kiệm, Báo cáo & Phân tích), cách thêm giao dịch, cách đặt ngân sách cảnh báo, cách mở sổ tiết kiệm và máy tính lãi.
  - Tri thức tài chính: Các nguyên tắc quản lý dòng tiền (Quy tắc 50/30/20, Quỹ khẩn cấp 3-6 tháng, Phương pháp quả cầu tuyết trả nợ, Tối ưu chi phí cố định như tiền thuê nhà).
  - Nguyên tắc trả lời: Thân thiện, bằng tiếng Việt (hoặc theo ngôn ngữ người dùng hỏi), định dạng bullet point rõ ràng, đưa ra các con số tính toán cụ thể bằng VND.
- **Cloudflare Integration**:
  - URL: `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{CLOUDFLARE_AI_MODEL}`
  - Model: `@cf/meta/llama-3.1-8b-instruct` (cung cấp qua env `CLOUDFLARE_AI_MODEL`, dự phòng `@cf/meta/llama-3-8b-instruct`).
  - Timeout: 30s.

---

### 4.3 Frontend Implementation

#### A. Icons & Sidebar Navigation
- Thêm icon `IconVault` (Sổ tiết kiệm) và `IconSparkles` (Trợ lý AI) vào `components/common/Icons.jsx`.
- Cập nhật `NAV_ITEMS` trong `Sidebar.jsx`:
  - `dashboard`: Tổng quan
  - `transactions`: Sổ giao dịch
  - `accounts`: Tài khoản tiền
  - `savings`: Sổ tiết kiệm *(Mới)*
  - `categories`: Danh mục thu chi
  - `budgets`: Ngân sách tháng
  - `reports`: Báo cáo & Phân tích
  - `qa`: Trợ lý AI & Hỏi đáp *(Mới)*
- Cập nhật `App.jsx` để render `SavingsPage` khi `activeTab === "savings"` và `QAPage` khi `activeTab === "qa"`.

#### B. Trang Sổ Tiết Kiệm (`frontend/src/pages/SavingsPage.jsx`)
- **Thẻ thống kê tổng quan (Summary Cards)**:
  - Tổng tiền đang gửi tiết kiệm (VND).
  - Tổng tiền lãi dự kiến nhận được (VND).
  - Số lượng sổ đang gửi.
  - Số sổ sắp đến hạn đáo hạn trong vòng 30 ngày.
- **Thanh điều hướng nội bộ**:
  - Tab 1: **Danh sách sổ tiết kiệm** (Active và Đã tất toán, có bộ lọc).
  - Tab 2: **Máy tính lãi suất nhanh (Savings Calculator)**:
    - Input: Số tiền gửi, Kỳ hạn (1, 3, 6, 9, 12, 18, 24, 36 tháng), Lãi suất (%/năm), Hình thức nhận lãi.
    - Kết quả trực quan: Tiền lãi nhận được, Tổng tiền gốc + lãi, Bảng phân rã dòng tiền từng tháng.
- **Modal Mở Sổ Tiết Kiệm**: Form nhập chi tiết (chọn tài khoản nguồn trích tiền, ngân hàng, số tiền, kỳ hạn, lãi suất) kèm tính trước ngày đáo hạn & tiền lãi xem trước.
- **Modal Tất Toán Sổ**: Chọn tài khoản nhận lại tiền, xem ngày đáo hạn và cho phép nhập/xác nhận "Tiền lãi thực tế nhận được".

#### C. Trang Hỏi Đáp AI (`frontend/src/pages/QAPage.jsx`)
- **Banner đầu trang**: Giới thiệu trợ lý AI FinanceFlow, có nút "Xoá đoạn chat" để bắt đầu phiên mới.
- **Gợi ý câu hỏi nhanh (Prompt Suggestions Chips)**:
  - "Lương 10 triệu, tiền nhà 4 triệu thì phân bổ chi tiêu sao?"
  - "Làm thế nào để thêm một giao dịch chi tiêu mới?"
  - "Đánh giá tình hình chi tiêu tháng này của tôi"
  - "Quy tắc 50/30/20 là gì và áp dụng thế nào?"
  - "Tôi có nên gửi tiết kiệm 6 tháng hay 12 tháng?"
- **Cửa sổ tin nhắn (Chat Window)**:
  - Tin nhắn chào mừng ban đầu từ Trợ lý AI.
  - Hiển thị tin nhắn người dùng (phải) và tin nhắn AI (trái).
  - Format văn bản AI: Hỗ trợ xuống dòng, danh sách gạch đầu dòng, chữ in đậm số tiền nổi bật.
  - Loading bubble với hiệu ứng "AI đang suy nghĩ...".
- **Khung nhập liệu (Chat Input)**:
  - Textarea tự co giãn chiều cao hoặc Input tiện lợi, nhấn Enter để gửi (Shift+Enter để xuống dòng).
  - Nút Gửi với biểu tượng mũi tên sinh động.
  - Thông báo thân thiện nếu backend chưa có API key Cloudflare.

---

## 5. Security & Configuration
- Tất cả API đều yêu cầu `IsAuthenticated` và CSRF token bảo vệ.
- Dữ liệu tài chính người dùng chỉ được tổng hợp tóm tắt (không gửi email, họ tên đầy đủ, hoặc mật khẩu sang Cloudflare).
- Quản lý khóa API:
  - `CLOUDFLARE_ACCOUNT_ID`: Cấu hình trong `.env` backend.
  - `CLOUDFLARE_API_TOKEN`: Cấu hình trong `.env` backend.
  - `CLOUDFLARE_AI_MODEL`: Mặc định `@cf/meta/llama-3.1-8b-instruct`.
