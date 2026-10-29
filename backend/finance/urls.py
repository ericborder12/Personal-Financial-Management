from django.urls import path

from .views import (
    BudgetView,
    HealthView,
    ImportView,
    ProfileView,
    TransactionDetailView,
    TransactionListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("transactions/", TransactionListCreateView.as_view(), name="transaction-list"),
    path(
        "transactions/<uuid:pk>/",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),
    path("budgets/", BudgetView.as_view(), name="budget-list"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("import/", ImportView.as_view(), name="import-data"),
]
