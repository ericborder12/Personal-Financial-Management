from django.db import connection, transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget, Transaction
from .serializers import BudgetSerializer, TransactionSerializer


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
