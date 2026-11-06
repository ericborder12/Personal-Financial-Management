from django.db import connection, transaction
from django.db.models import Case, IntegerField, Q, Sum, Value, When
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import filters, generics, pagination, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Account, Budget, Category, Profile, Transaction, SavingsDeposit
from .serializers import (
    AccountSerializer,
    BudgetSerializer,
    CategorySerializer,
    ImportSerializer,
    ProfileSerializer,
    TransactionSerializer,
    SavingsDepositSerializer,
)


class AccountListCreateView(generics.ListCreateAPIView):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user, is_active=True).order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.filter(user=self.request.user, is_active=True)
        cat_type = self.request.query_params.get("type")
        if cat_type in ("income", "expense"):
            qs = qs.filter(type=cat_type)
        return qs.order_by("type", "name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()



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
    search_fields = ["category__name", "note"]
    ordering_fields = ["date", "amount"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user).select_related("account", "to_account", "category")
        params = TransactionQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        values = params.validated_data
        if "start_date" in values:
            queryset = queryset.filter(date__gte=values["start_date"])
        if "end_date" in values:
            queryset = queryset.filter(date__lte=values["end_date"])
        if "category" in values:
            cat_val = values["category"]
            try:
                import uuid
                uuid.UUID(str(cat_val))
                queryset = queryset.filter(category_id=cat_val)
            except ValueError:
                queryset = queryset.filter(category__name=cat_val)
        if "account" in values:
            acc_val = values["account"]
            queryset = queryset.filter(Q(account_id=acc_val) | Q(to_account_id=acc_val))
        if "type" in values:
            queryset = queryset.filter(type=values["type"])
        if "min_amount" in values:
            queryset = queryset.filter(amount__gte=values["min_amount"])
        if "max_amount" in values:
            queryset = queryset.filter(amount__lte=values["max_amount"])
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related("account", "to_account", "category")


class TransactionQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    category = serializers.CharField(required=False)
    account = serializers.UUIDField(required=False)
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
        now = timezone.now()
        try:
            year = int(request.query_params.get("year", now.year))
            month = int(request.query_params.get("month", now.month))
        except (ValueError, TypeError):
            year, month = now.year, now.month

        import calendar
        from datetime import date
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        categories = Category.objects.filter(user=request.user, type="expense", is_active=True).order_by("name")
        budgets_map = {
            b.category_id: b for b in Budget.objects.filter(user=request.user, year=year, month=month)
        }

        spent_map = dict(
            Transaction.objects.filter(
                user=request.user,
                type="expense",
                date__gte=start_date,
                date__lte=end_date,
                category__isnull=False,
            )
            .values("category_id")
            .annotate(total=Sum("amount"))
            .values_list("category_id", "total")
        )

        results = []
        for cat in categories:
            budget = budgets_map.get(cat.id)
            limit = budget.limit if budget else 0
            spent = spent_map.get(cat.id, 0)
            percentage = round((spent / limit * 100), 1) if limit > 0 else 0.0
            if limit > 0 and percentage >= 100:
                b_status = "danger"
            elif limit > 0 and percentage >= 80:
                b_status = "warning"
            else:
                b_status = "safe"

            results.append({
                "id": str(budget.id) if budget else None,
                "category_id": str(cat.id),
                "category_name": cat.name,
                "category_icon": cat.icon,
                "category_color": cat.color,
                "limit": limit,
                "spent": spent,
                "remaining": max(0, limit - spent) if limit > 0 else 0,
                "percentage": percentage,
                "status": b_status,
                "year": year,
                "month": month,
            })

        return Response(results)

    def post(self, request):
        category_id = request.data.get("category")
        limit = request.data.get("limit")
        year = request.data.get("year", timezone.now().year)
        month = request.data.get("month", timezone.now().month)

        if not category_id:
            return Response({"category": "Danh mục là bắt buộc."}, status=status.HTTP_400_BAD_REQUEST)
        if limit is None or int(limit) < 0:
            return Response({"limit": "Hạn mức không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            category = Category.objects.get(id=category_id, user=request.user)
        except (Category.DoesNotExist, ValueError):
            return Response({"category": "Danh mục không tồn tại."}, status=status.HTTP_400_BAD_REQUEST)

        budget, created = Budget.objects.update_or_create(
            user=request.user,
            category=category,
            year=year,
            month=month,
            defaults={"limit": limit},
        )
        return Response(BudgetSerializer(budget).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class BudgetDetailView(generics.DestroyAPIView):
    serializer_class = BudgetSerializer

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)


class DashboardView(APIView):
    def get(self, request):
        now = timezone.now()
        try:
            year = int(request.query_params.get("year", now.year))
            month = int(request.query_params.get("month", now.month))
        except (ValueError, TypeError):
            year, month = now.year, now.month

        import calendar
        from datetime import date
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        accounts = Account.objects.filter(user=request.user, is_active=True)
        total_balance = sum(acc.current_balance for acc in accounts)

        month_txs = Transaction.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date,
        )
        monthly_income = month_txs.filter(type="income").aggregate(s=Sum("amount"))["s"] or 0
        monthly_expense = month_txs.filter(type="expense").aggregate(s=Sum("amount"))["s"] or 0
        monthly_savings = monthly_income - monthly_expense

        monthly_trend = []
        for i in range(5, -1, -1):
            m = month - i
            y = year
            while m <= 0:
                m += 12
                y -= 1
            _, m_last = calendar.monthrange(y, m)
            m_start = date(y, m, 1)
            m_end = date(y, m, m_last)

            tx_m = Transaction.objects.filter(
                user=request.user,
                date__gte=m_start,
                date__lte=m_end,
            )
            inc = tx_m.filter(type="income").aggregate(s=Sum("amount"))["s"] or 0
            exp = tx_m.filter(type="expense").aggregate(s=Sum("amount"))["s"] or 0
            monthly_trend.append({
                "year": y,
                "month": m,
                "income": inc,
                "expense": exp,
                "savings": inc - exp,
            })

        cat_expenses_qs = (
            month_txs.filter(type="expense", category__isnull=False)
            .values("category__id", "category__name", "category__color", "category__icon")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )
        category_expenses = []
        for item in cat_expenses_qs:
            amount = item["total"]
            pct = round((amount / monthly_expense * 100), 1) if monthly_expense > 0 else 0.0
            category_expenses.append({
                "category_id": str(item["category__id"]),
                "category_name": item["category__name"],
                "category_color": item["category__color"],
                "category_icon": item["category__icon"],
                "amount": amount,
                "percentage": pct,
            })

        recent_txs = (
            Transaction.objects.filter(user=request.user)
            .select_related("account", "to_account", "category")
            .order_by("-date", "-created_at")[:10]
        )
        recent_transactions = TransactionSerializer(recent_txs, many=True).data

        budget_view = BudgetView()
        budget_view.request = request
        budgets_data = budget_view.get(request).data

        return Response({
            "year": year,
            "month": month,
            "total_balance": total_balance,
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "monthly_savings": monthly_savings,
            "monthly_trend": monthly_trend,
            "category_expenses": category_expenses,
            "recent_transactions": recent_transactions,
            "budget_progress": budgets_data,
        })


class ReportsView(APIView):
    def get(self, request):
        now = timezone.now().date()
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")

        start_date = parse_date(start_str) if start_str else now.replace(day=1)
        end_date = parse_date(end_str) if end_str else now

        if not start_date or not end_date:
            return Response(
                {"detail": "Ngày không hợp lệ. Định dạng yêu cầu: YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date > end_date:
            return Response(
                {"detail": "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txs = Transaction.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date,
        )

        total_income = txs.filter(type="income").aggregate(s=Sum("amount"))["s"] or 0
        total_expense = txs.filter(type="expense").aggregate(s=Sum("amount"))["s"] or 0
        net_savings = total_income - total_expense

        cat_breakdown_qs = (
            txs.exclude(type="transfer")
            .filter(category__isnull=False)
            .values("category__id", "category__name", "category__color", "category__icon", "type")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )
        category_breakdown = []
        for item in cat_breakdown_qs:
            amount = item["total"]
            base = total_income if item["type"] == "income" else total_expense
            pct = round((amount / base * 100), 1) if base > 0 else 0.0
            category_breakdown.append({
                "category_id": str(item["category__id"]),
                "category_name": item["category__name"],
                "category_color": item["category__color"],
                "category_icon": item["category__icon"],
                "type": item["type"],
                "amount": amount,
                "percentage": pct,
            })

        daily_qs = (
            txs.exclude(type="transfer")
            .values("date")
            .annotate(
                income=Sum(Case(When(type="income", then="amount"), default=Value(0), output_field=IntegerField())),
                expense=Sum(Case(When(type="expense", then="amount"), default=Value(0), output_field=IntegerField())),
            )
            .order_by("date")
        )
        daily_trend = [
            {
                "date": str(row["date"]),
                "income": row["income"],
                "expense": row["expense"],
                "savings": row["income"] - row["expense"],
            }
            for row in daily_qs
        ]

        return Response({
            "start_date": str(start_date),
            "end_date": str(end_date),
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "category_breakdown": category_breakdown,
            "daily_trend": daily_trend,
        })



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


class SavingsDepositViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsDepositSerializer

    def get_queryset(self):
        return SavingsDeposit.objects.filter(user=self.request.user).order_by("is_settled", "start_date")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        active_deposits = [d for d in queryset if not d.is_settled]
        total_deposit = sum(d.amount for d in active_deposits)
        total_estimated_interest = sum(d.estimated_interest for d in active_deposits)
        today = timezone.now().date()
        maturing_soon_count = sum(
            1 for d in active_deposits
            if d.maturity_date >= today and (d.maturity_date - today).days <= 30
        )

        return Response({
            "results": serializer.data,
            "summary": {
                "total_deposit": total_deposit,
                "total_estimated_interest": total_estimated_interest,
                "active_count": len(active_deposits),
                "maturing_soon_count": maturing_soon_count,
            }
        })

    def perform_create(self, serializer):
        with transaction.atomic():
            source_acc = serializer.validated_data.get("source_account")
            savings_acc = None
            if source_acc:
                savings_acc, _ = Account.objects.get_or_create(
                    user=self.request.user,
                    type="savings",
                    defaults={
                        "name": "Sổ tiết kiệm",
                        "color": "#10B981",
                        "icon": "vault",
                        "initial_balance": 0,
                    },
                )
            deposit = serializer.save(user=self.request.user, savings_account=savings_acc)

            if source_acc and savings_acc:
                Transaction.objects.create(
                    user=self.request.user,
                    type="transfer",
                    amount=deposit.amount,
                    account=source_acc,
                    to_account=savings_acc,
                    date=deposit.start_date,
                    note=f"Gửi tiết kiệm: {deposit.bank_name}",
                )

    @action(detail=True, methods=["post"])
    def settle(self, request, pk=None):
        deposit = self.get_object()
        if deposit.is_settled:
            return Response(
                {"detail": "Sổ tiết kiệm này đã được tất toán."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dest_acc_id = request.data.get("destination_account")
        if not dest_acc_id:
            return Response(
                {"destination_account": "Vui lòng chọn tài khoản nhận tiền."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dest_acc = Account.objects.filter(user=request.user, id=dest_acc_id).first()
        if not dest_acc:
            return Response(
                {"destination_account": "Tài khoản nhận tiền không tồn tại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            actual_interest = int(request.data.get("actual_interest", deposit.estimated_interest))
            if actual_interest < 0:
                actual_interest = 0
        except (ValueError, TypeError):
            actual_interest = deposit.estimated_interest

        settle_date = timezone.now().date()

        with transaction.atomic():
            if deposit.savings_account:
                Transaction.objects.create(
                    user=request.user,
                    type="transfer",
                    amount=deposit.amount,
                    account=deposit.savings_account,
                    to_account=dest_acc,
                    date=settle_date,
                    note=f"Tất toán gốc tiết kiệm: {deposit.bank_name}",
                )

            if actual_interest > 0:
                cat_interest, _ = Category.objects.get_or_create(
                    user=request.user,
                    name="Lãi tiết kiệm",
                    type="income",
                    defaults={"color": "#10B981", "icon": "tag"},
                )
                Transaction.objects.create(
                    user=request.user,
                    type="income",
                    amount=actual_interest,
                    account=dest_acc,
                    category=cat_interest,
                    date=settle_date,
                    note=f"Tiền lãi tiết kiệm: {deposit.bank_name}",
                )

            deposit.is_settled = True
            deposit.settled_at = settle_date
            deposit.actual_interest = actual_interest
            deposit.settled_amount = deposit.amount + actual_interest
            deposit.save(update_fields=["is_settled", "settled_at", "actual_interest", "settled_amount"])

        serializer = self.get_serializer(deposit)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        with transaction.atomic():
            if not instance.is_settled and instance.source_account and instance.savings_account:
                Transaction.objects.filter(
                    user=self.request.user,
                    type="transfer",
                    account=instance.source_account,
                    to_account=instance.savings_account,
                    amount=instance.amount,
                    note=f"Gửi tiết kiệm: {instance.bank_name}",
                ).delete()
            instance.delete()

