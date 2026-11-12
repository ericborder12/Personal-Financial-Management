from django.contrib import admin

from .models import Account, AISecurityAlert, Budget, Category, Profile, SavingsDeposit, Transaction


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "initial_balance", "imported_at")


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "type", "current_balance", "is_active", "created_at")
    list_filter = ("type", "is_active")
    search_fields = ("name", "user__email")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "type", "is_default", "is_active")
    list_filter = ("type", "is_default", "is_active")
    search_fields = ("name", "user__email")


@admin.register(SavingsDeposit)
class SavingsDepositAdmin(admin.ModelAdmin):
    list_display = ("bank_name", "user", "amount", "interest_rate", "term_months", "is_settled", "start_date")
    list_filter = ("is_settled", "bank_name")
    search_fields = ("bank_name", "user__email")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount", "category", "date")
    list_filter = ("type", "category")
    search_fields = ("category__name", "note", "user__email")


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "limit", "fixed", "month", "year")
    list_filter = ("fixed", "year", "month")


@admin.register(AISecurityAlert)
class AISecurityAlertAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "reason", "short_prompt")
    list_filter = ("reason", "created_at")
    search_fields = ("user__email", "prompt", "reason")
    readonly_fields = ("user", "reason", "prompt", "created_at")

    def short_prompt(self, obj):
        return (obj.prompt[:80] + "...") if len(obj.prompt) > 80 else obj.prompt
    short_prompt.short_description = "Nội dung câu hỏi nghi vấn"
