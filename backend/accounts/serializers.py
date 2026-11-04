from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "display_name", "date_joined"]
        read_only_fields = ["id", "email", "date_joined"]


class UserUpdateSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(max_length=100, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ["display_name"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không chính xác.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        validate_password(value, user=user)
        return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    display_name = serializers.CharField(
        required=False, allow_blank=True, max_length=100, default=""
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email này đã được sử dụng.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class EmailAddressSerializer(serializers.Serializer):
    email = serializers.EmailField()


class EmailTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetConfirmSerializer(EmailTokenSerializer):
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        user = self.context.get("user")
        validate_password(value, user=user)
        return value
