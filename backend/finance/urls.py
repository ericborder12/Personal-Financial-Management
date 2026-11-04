from django.urls import path

from .views import (
    AccountDetailView,
    AccountListCreateView,
    BudgetView,
    CategoryDetailView,
    CategoryListCreateView,
    HealthView,
    ImportView,
    ProfileView,
    TransactionDetailView,
    TransactionListCreateView,
    TransactionSummaryView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
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
    path("profile/", ProfileView.as_view(), name="profile"),
    path("import/", ImportView.as_view(), name="import-data"),
]
