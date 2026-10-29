from rest_framework import serializers

from .models import Budget, Profile, Transaction

MAX_AMOUNT = 9223372036854775807


class StrictIntegerField(serializers.IntegerField):
    """Integer field that refuses floats/booleans instead of silently truncating."""

    def to_internal_value(self, data):
        if isinstance(data, bool) or isinstance(data, float):
            self.fail("invalid")
        return super().to_internal_value(data)


class TransactionSerializer(serializers.ModelSerializer):
    amount = StrictIntegerField(min_value=1, max_value=MAX_AMOUNT)

    class Meta:
        model = Transaction
        fields = ["id", "type", "amount", "category", "date", "note", "created_at"]
        read_only_fields = ["id", "created_at"]


class BudgetSerializer(serializers.ModelSerializer):
    limit = StrictIntegerField(min_value=0, max_value=MAX_AMOUNT)

    class Meta:
        model = Budget
        fields = ["category", "limit", "fixed"]


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
