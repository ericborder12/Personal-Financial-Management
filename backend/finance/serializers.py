from rest_framework import serializers

from .models import Transaction

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
