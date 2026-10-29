from django.db import connection, transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget, Profile, Transaction
from .serializers import (
    BudgetSerializer,
    ImportSerializer,
    ProfileSerializer,
    TransactionSerializer,
)


def get_profile(user):
    return Profile.objects.get_or_create(user=user)[0]


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by(
            "-date", "-created_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.DestroyAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


class BudgetView(APIView):
    def get(self, request):
        budgets = Budget.objects.filter(user=request.user).order_by("category")
        return Response(BudgetSerializer(budgets, many=True).data)

    def put(self, request):
        serializer = BudgetSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data
        categories = [item["category"] for item in items]
        if len(categories) != len(set(categories)):
            return Response(
                {"detail": "Danh mục bị trùng."}, status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            Budget.objects.filter(user=request.user).delete()
            Budget.objects.bulk_create(
                [Budget(user=request.user, **item) for item in items]
            )
        budgets = Budget.objects.filter(user=request.user).order_by("category")
        return Response(BudgetSerializer(budgets, many=True).data)


class ProfileView(APIView):
    def get(self, request):
        profile = get_profile(request.user)
        return Response(ProfileSerializer(profile).data)

    def put(self, request):
        profile = get_profile(request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ImportView(APIView):
    def post(self, request):
        profile = get_profile(request.user)
        has_data = (
            profile.imported_at is not None
            or profile.initial_balance != 0
            or Transaction.objects.filter(user=request.user).exists()
            or Budget.objects.filter(user=request.user).exists()
        )
        if has_data:
            return Response(
                {"detail": "Tài khoản đã có dữ liệu, không thể nhập."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            Transaction.objects.bulk_create(
                [Transaction(user=request.user, **item) for item in data["transactions"]]
            )
            Budget.objects.bulk_create(
                [Budget(user=request.user, **item) for item in data["budgets"]]
            )
            profile.initial_balance = data["initial_balance"]
            profile.imported_at = timezone.now()
            profile.save(update_fields=["initial_balance", "imported_at"])

        return Response(
            {
                "transactions": len(data["transactions"]),
                "budgets": len(data["budgets"]),
            }
        )
