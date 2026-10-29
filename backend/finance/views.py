from django.db import connection, transaction
from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import filters, generics, pagination, serializers, status
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


class TransactionPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class StableOrderingFilter(filters.OrderingFilter):
    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        if ordering:
            return [*ordering, "-created_at", "-id"]
        return ["-date", "-created_at", "-id"]


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    pagination_class = TransactionPagination
    filter_backends = [filters.SearchFilter, StableOrderingFilter]
    search_fields = ["category", "note"]
    ordering_fields = ["date", "category", "amount"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)
        params = TransactionQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        values = params.validated_data
        if "start_date" in values:
            queryset = queryset.filter(date__gte=values["start_date"])
        if "end_date" in values:
            queryset = queryset.filter(date__lte=values["end_date"])
        if "category" in values:
            queryset = queryset.filter(category=values["category"])
        if "type" in values:
            queryset = queryset.filter(type=values["type"])
        if "min_amount" in values:
            queryset = queryset.filter(amount__gte=values["min_amount"])
        if "max_amount" in values:
            queryset = queryset.filter(amount__lte=values["max_amount"])
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.DestroyAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


class TransactionQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    category = serializers.CharField(required=False, max_length=50)
    type = serializers.ChoiceField(required=False, choices=Transaction.TYPE_CHOICES)
    min_amount = serializers.IntegerField(required=False, min_value=1)
    max_amount = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        if (
            attrs.get("start_date")
            and attrs.get("end_date")
            and attrs["start_date"] > attrs["end_date"]
        ):
            raise serializers.ValidationError(
                {"end_date": "Ngày kết thúc phải từ ngày bắt đầu trở đi."}
            )
        if (
            attrs.get("min_amount") is not None
            and attrs.get("max_amount") is not None
            and attrs["min_amount"] > attrs["max_amount"]
        ):
            raise serializers.ValidationError(
                {"max_amount": "Số tiền tối đa phải lớn hơn hoặc bằng tối thiểu."}
            )
        return attrs


class TransactionSummaryView(APIView):
    def get(self, request):
        month = request.query_params.get("month", "")
        if len(month) != 7 or month[4] != "-":
            raise serializers.ValidationError({"month": "Tháng phải có dạng YYYY-MM."})
        start = parse_date(f"{month}-01")
        if start is None or start.strftime("%Y-%m") != month:
            raise serializers.ValidationError({"month": "Tháng không hợp lệ."})
        next_month = (
            start.replace(year=start.year + 1, month=1)
            if start.month == 12
            else start.replace(month=start.month + 1)
        )
        transactions = Transaction.objects.filter(user=request.user)
        totals = transactions.aggregate(
            income=Sum("amount", filter=Q(type="income")),
            expense=Sum("amount", filter=Q(type="expense")),
            income_through_month=Sum(
                "amount",
                filter=Q(type="income", date__lt=next_month),
            ),
            expense_before_month=Sum(
                "amount",
                filter=Q(type="expense", date__lt=start),
            ),
        )
        month_transactions = transactions.filter(
            date__gte=start, date__lt=next_month
        )
        month_totals = month_transactions.aggregate(
            income=Sum("amount", filter=Q(type="income")),
            expense=Sum("amount", filter=Q(type="expense")),
        )
        spent_by_category = dict(
            month_transactions.filter(type="expense")
            .values("category")
            .annotate(total=Sum("amount"))
            .values_list("category", "total")
        )
        return Response(
            {
                "income": totals["income"] or 0,
                "expense": totals["expense"] or 0,
                "month_income": month_totals["income"] or 0,
                "month_expense": month_totals["expense"] or 0,
                "income_through_month": totals["income_through_month"] or 0,
                "expense_before_month": totals["expense_before_month"] or 0,
                "spent_by_category": spent_by_category,
            }
        )


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
