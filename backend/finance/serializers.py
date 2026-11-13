from rest_framework import serializers

from .models import (
    Account,
    Budget,
    Category,
    ChatMessage,
    Feedback,
    Profile,
    SavingsDeposit,
    Transaction,
)

MAX_AMOUNT = 9223372036854775807


class StrictIntegerField(serializers.IntegerField):
    """Integer field that refuses floats/booleans instead of silently truncating."""

    def to_internal_value(self, data):
        if isinstance(data, bool) or isinstance(data, float):
            self.fail("invalid")
        return super().to_internal_value(data)


class AccountSerializer(serializers.ModelSerializer):
    current_balance = serializers.IntegerField(read_only=True)
    initial_balance = StrictIntegerField(min_value=0, max_value=MAX_AMOUNT, default=0, required=False)
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "type",
            "initial_balance",
            "current_balance",
            "color",
            "icon",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "current_balance", "created_at"]


class CategorySerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "type",
            "icon",
            "color",
            "is_default",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "is_default", "created_at"]


class TransactionSerializer(serializers.ModelSerializer):
    amount = StrictIntegerField(min_value=1, max_value=MAX_AMOUNT)
    account_name = serializers.CharField(source="account.name", read_only=True)
    to_account_name = serializers.CharField(source="to_account.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "type",
            "amount",
            "account",
            "account_name",
            "to_account",
            "to_account_name",
            "category",
            "category_name",
            "category_icon",
            "category_color",
            "date",
            "note",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "account_name",
            "to_account_name",
            "category_name",
            "category_icon",
            "category_color",
            "created_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        tx_type = attrs.get("type", getattr(self.instance, "type", None))
        account = attrs.get("account", getattr(self.instance, "account", None))
        to_account = attrs.get("to_account", getattr(self.instance, "to_account", None))
        category = attrs.get("category", getattr(self.instance, "category", None))

        if user:
            if account and account.user != user:
                raise serializers.ValidationError({"account": "Tài khoản không hợp lệ."})
            if to_account and to_account.user != user:
                raise serializers.ValidationError({"to_account": "Tài khoản đích không hợp lệ."})
            if category and category.user != user:
                raise serializers.ValidationError({"category": "Danh mục không hợp lệ."})

        if tx_type == "transfer":
            if not account:
                raise serializers.ValidationError({"account": "Tài khoản nguồn là bắt buộc khi chuyển tiền."})
            if not to_account:
                raise serializers.ValidationError({"to_account": "Tài khoản đích là bắt buộc khi chuyển tiền."})
            if account == to_account:
                raise serializers.ValidationError({"to_account": "Tài khoản nguồn và đích phải khác nhau."})
        elif tx_type in ("income", "expense"):
            if not account:
                raise serializers.ValidationError({"account": "Vui lòng chọn tài khoản giao dịch."})

        return attrs


class BudgetSerializer(serializers.ModelSerializer):
    limit = StrictIntegerField(min_value=0, max_value=MAX_AMOUNT)
    category_id = serializers.UUIDField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)

    class Meta:
        model = Budget
        fields = [
            "id",
            "category",
            "category_id",
            "category_name",
            "category_icon",
            "category_color",
            "limit",
            "year",
            "month",
            "fixed",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]



class ProfileSerializer(serializers.ModelSerializer):
    initial_balance = StrictIntegerField(min_value=0, max_value=MAX_AMOUNT)

    class Meta:
        model = Profile
        fields = ["initial_balance", "imported_at"]
        read_only_fields = ["imported_at"]


class ImportTransactionSerializer(serializers.ModelSerializer):
    amount = StrictIntegerField(min_value=1, max_value=MAX_AMOUNT)

    class Meta:
        model = Transaction
        fields = ["type", "amount", "category", "date", "note"]


class ImportBudgetSerializer(serializers.ModelSerializer):
    limit = StrictIntegerField(min_value=0, max_value=MAX_AMOUNT)

    class Meta:
        model = Budget
        fields = ["category", "limit", "fixed"]


class ImportSerializer(serializers.Serializer):
    transactions = ImportTransactionSerializer(many=True, required=False)
    budgets = ImportBudgetSerializer(many=True, required=False)
    initial_balance = StrictIntegerField(
        min_value=0, max_value=MAX_AMOUNT, required=False
    )

    def validate(self, attrs):
        attrs.setdefault("transactions", [])
        attrs.setdefault("budgets", [])
        attrs.setdefault("initial_balance", 0)
        return attrs

    def validate_budgets(self, value):
        categories = [item["category"] for item in value]
        if len(categories) != len(set(categories)):
            raise serializers.ValidationError("Danh mục bị trùng.")
        return value


class SavingsDepositSerializer(serializers.ModelSerializer):
    amount = StrictIntegerField(min_value=1, max_value=MAX_AMOUNT)
    term_months = serializers.IntegerField(min_value=1, max_value=120, default=6)
    interest_rate = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    maturity_date = serializers.DateField(read_only=True)
    estimated_interest = serializers.IntegerField(read_only=True)
    source_account_name = serializers.CharField(source="source_account.name", read_only=True)

    class Meta:
        model = SavingsDeposit
        fields = [
            "id",
            "bank_name",
            "source_account",
            "source_account_name",
            "savings_account",
            "amount",
            "start_date",
            "term_months",
            "interest_rate",
            "payout_type",
            "is_settled",
            "settled_at",
            "actual_interest",
            "settled_amount",
            "notes",
            "maturity_date",
            "estimated_interest",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "savings_account",
            "is_settled",
            "settled_at",
            "actual_interest",
            "settled_amount",
            "maturity_date",
            "estimated_interest",
            "created_at",
        ]

    def validate_source_account(self, value):
        if value and value.user != self.context["request"].user:
            raise serializers.ValidationError("Tài khoản nguồn không hợp lệ.")
        return value

    def update(self, instance, validated_data):
        if instance.is_settled:
            raise serializers.ValidationError("Không thể chỉnh sửa sổ tiết kiệm đã tất toán.")
        # Core financial fields are immutable once created
        validated_data.pop("amount", None)
        validated_data.pop("bank_name", None)
        validated_data.pop("source_account", None)
        validated_data.pop("start_date", None)
        validated_data.pop("term_months", None)
        validated_data.pop("payout_type", None)
        return super().update(instance, validated_data)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.CharField(source="sender.email", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    receiver_email = serializers.CharField(source="receiver.email", read_only=True, default=None)
    is_from_admin = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "receiver",
            "receiver_email",
            "content",
            "is_read",
            "is_from_admin",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "receiver_email",
            "is_from_admin",
            "created_at",
        ]

    def get_is_from_admin(self, obj):
        return bool(obj.sender and (obj.sender.is_staff or obj.sender.is_superuser))


class FeedbackSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.display_name", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "type",
            "type_display",
            "title",
            "content",
            "status",
            "status_display",
            "admin_reply",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "type_display",
            "status_display",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            if not (user.is_staff or user.is_superuser):
                attrs.pop("status", None)
                attrs.pop("admin_reply", None)
        return attrs



