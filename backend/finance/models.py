import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    initial_balance = models.BigIntegerField(default=0)
    imported_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile({self.user_id})"


class Account(models.Model):
    ACCOUNT_TYPES = [
        ("cash", "Tiền mặt"),
        ("bank", "Tài khoản ngân hàng"),
        ("ewallet", "Ví điện tử"),
        ("savings", "Sổ tiết kiệm"),
        ("other", "Khác"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accounts")
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default="cash")
    initial_balance = models.BigIntegerField(default=0)
    color = models.CharField(max_length=20, default="#2563EB")
    icon = models.CharField(max_length=50, default="wallet")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.type})"

    @property
    def current_balance(self):
        from django.db.models import Sum
        income_sum = 0
        expense_sum = 0
        transfers_out = 0
        transfers_in = 0

        if hasattr(self, "transactions"):
            income_sum = self.transactions.filter(type="income").aggregate(s=Sum("amount"))["s"] or 0
            expense_sum = self.transactions.filter(type="expense").aggregate(s=Sum("amount"))["s"] or 0
            transfers_out = self.transactions.filter(type="transfer").aggregate(s=Sum("amount"))["s"] or 0

        if hasattr(self, "incoming_transfers"):
            transfers_in = self.incoming_transfers.filter(type="transfer").aggregate(s=Sum("amount"))["s"] or 0

        return self.initial_balance + income_sum - expense_sum + transfers_in - transfers_out


class Category(models.Model):
    CATEGORY_TYPES = [
        ("income", "Thu nhập"),
        ("expense", "Chi tiêu"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=CATEGORY_TYPES)
    icon = models.CharField(max_length=50, default="tag")
    color = models.CharField(max_length=20, default="#64748B")
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["type", "name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name", "type"], name="unique_category_per_user_name_type")
        ]
        indexes = [
            models.Index(fields=["user", "type", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.type})"


class Transaction(models.Model):
    TYPE_CHOICES = [
        ("income", "Thu"),
        ("expense", "Chi"),
        ("transfer", "Chuyển tiền"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.BigIntegerField()
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="incoming_transfers",
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name="transactions",
        null=True,
        blank=True,
    )
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["account", "date"]),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="transaction_amount_positive")
        ]
        ordering = ["-date", "-created_at"]

    def clean(self):
        super().clean()
        if self.type == "transfer":
            if not self.account_id:
                raise ValidationError({"account": "Tài khoản nguồn là bắt buộc khi chuyển tiền."})
            if not self.to_account_id:
                raise ValidationError({"to_account": "Tài khoản đích là bắt buộc khi chuyển tiền."})
            if self.account_id == self.to_account_id:
                raise ValidationError({"to_account": "Tài khoản nguồn và tài khoản đích phải khác nhau."})
        elif self.type in ("income", "expense"):
            if not self.account_id:
                raise ValidationError({"account": "Vui lòng chọn tài khoản giao dịch."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        cat_name = self.category.name if self.category else "Không có danh mục"
        return f"{self.type} {self.amount} ({cat_name})"


class Budget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="budgets", null=True, blank=True)
    limit = models.BigIntegerField()
    year = models.IntegerField(default=2026)
    month = models.IntegerField(default=1)
    fixed = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "category", "year", "month"], name="unique_budget_per_user_cat_year_month")
        ]
        indexes = [
            models.Index(fields=["user", "year", "month"]),
        ]

    def __str__(self):
        cat_name = self.category.name if self.category else "All"
        return f"{cat_name}: {self.limit} ({self.month}/{self.year})"


class SavingsDeposit(models.Model):
    PAYOUT_CHOICES = [
        ("end_of_term", "Lãi cuối kỳ"),
        ("monthly", "Lãi hàng tháng"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="savings_deposits")
    bank_name = models.CharField(max_length=100)
    source_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="outbound_savings",
    )
    savings_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inbound_savings",
    )
    amount = models.BigIntegerField()
    start_date = models.DateField()
    term_months = models.IntegerField(default=6)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # % / năm, ví dụ 6.00
    payout_type = models.CharField(max_length=20, choices=PAYOUT_CHOICES, default="end_of_term")
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateField(null=True, blank=True)
    actual_interest = models.BigIntegerField(default=0)
    settled_amount = models.BigIntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["is_settled", "start_date"]
        indexes = [
            models.Index(fields=["user", "is_settled"]),
        ]

    def __str__(self):
        return f"{self.bank_name}: {self.amount} ({self.term_months}M @ {self.interest_rate}%)"

    @property
    def maturity_date(self):
        import calendar
        month_idx = self.start_date.month - 1 + self.term_months
        year = self.start_date.year + (month_idx // 12)
        month = (month_idx % 12) + 1
        day = min(self.start_date.day, calendar.monthrange(year, month)[1])
        import datetime
        return datetime.date(year, month, day)

    @property
    def estimated_interest(self):
        # amount * (interest_rate / 100) * (term_months / 12)
        return int(round(self.amount * (float(self.interest_rate) / 100.0) * (self.term_months / 12.0)))


