import uuid

from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    initial_balance = models.BigIntegerField(default=0)
    imported_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile({self.user_id})"


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
