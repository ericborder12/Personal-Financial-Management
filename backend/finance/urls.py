from django.urls import path

from .views import (
    HealthView,
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
]
