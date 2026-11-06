from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountDetailView,
    AccountListCreateView,
    BudgetDetailView,
    BudgetView,
    CategoryDetailView,
    CategoryListCreateView,
    DashboardView,
    HealthView,
    ImportView,
    ProfileView,
    ReportsView,
    SavingsDepositViewSet,
    TransactionDetailView,
    TransactionListCreateView,
    TransactionSummaryView,
)

router = DefaultRouter()
router.register(r"savings", SavingsDepositViewSet, basename="savings")

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("accounts/", AccountListCreateView.as_view(), name="account-list"),
    path("accounts/<uuid:pk>/", AccountDetailView.as_view(), name="account-detail"),
    path("categories/", CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<uuid:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("transactions/", TransactionListCreateView.as_view(), name="transaction-list"),
    path("transactions/summary/", TransactionSummaryView.as_view(), name="transaction-summary"),
    path(
        "transactions/<uuid:pk>/",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),
    path("budgets/", BudgetView.as_view(), name="budget-list"),
    path("budgets/<uuid:pk>/", BudgetDetailView.as_view(), name="budget-detail"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("import/", ImportView.as_view(), name="import-data"),
] + router.urls
