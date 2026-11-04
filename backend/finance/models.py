import uuid

from django.conf import settings
from django.db import models


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
    created_at = models.DateTimeField(auto_now_add=True)

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
    created_at = models.DateTimeField(auto_now_add=True)

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
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="transaction_amount_positive")
        ]
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.type} {self.amount} ({self.category})"


class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    category = models.CharField(max_length=50)
    limit = models.BigIntegerField()
    fixed = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "category"], name="unique_budget_per_user_category")
        ]

    def __str__(self):
        return f"{self.category}: {self.limit}/{self.user_id}"
