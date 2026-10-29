from django.contrib import admin

from .models import Budget, Profile, Transaction


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "initial_balance", "imported_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount", "category", "date")
    list_filter = ("type", "category")
    search_fields = ("category", "note", "user__email")


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "limit", "fixed")
    list_filter = ("fixed",)
