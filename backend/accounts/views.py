import smtplib
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.middleware.csrf import get_token
from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import CsrfEnforcingSessionAuthentication
from .models import User
from .serializers import (
    EmailAddressSerializer,
    EmailTokenSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    UserSerializer,
)


class EmailDeliveryError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Không gửi được email. Vui lòng thử lại sau."
    default_code = "email_delivery_failed"


def send_account_email(user, purpose):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    params = urlencode({"uid": uid, "token": token})
    route = "verify" if purpose == "verify" else "reset"
    link = f"{settings.FRONTEND_URL}/?{route}=1&{params}"
    if purpose == "verify":
        subject = "Xác thực email tài khoản"
        message = f"Xác thực email bằng liên kết này (có hiệu lực trong 3 ngày):\n\n{link}"
    else:
        subject = "Đặt lại mật khẩu"
        message = f"Đặt lại mật khẩu bằng liên kết này (có hiệu lực trong 3 ngày):\n\n{link}"
    try:
        sent = send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError() from exc
    if sent != 1:
        raise EmailDeliveryError()


def token_user(data, *, active):
    serializer = EmailTokenSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    try:
        user_id = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
        users = User.objects.filter(pk=user_id)
        if active is not None:
            users = users.filter(is_active=active)
        user = users.get()
    except (ValueError, TypeError, OverflowError, User.DoesNotExist):
        return None, serializer.validated_data
    if not default_token_generator.check_token(user, serializer.validated_data["token"]):
        return None, serializer.validated_data
    return user, serializer.validated_data


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save(is_active=False)
            send_account_email(user, "verify")
        return Response(
            {"detail": "Hãy kiểm tra email để xác thực tài khoản trước khi đăng nhập."},
            status=status.HTTP_202_ACCEPTED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        email = request.data.get("email", "")
        password = request.data.get("password", "")
        user = authenticate(request, username=email, password=password)
        if user is None:
            inactive_user = User.objects.filter(email__iexact=email, is_active=False).first()
            if inactive_user and inactive_user.check_password(password):
                return Response(
                    {"detail": "Vui lòng xác thực email trước khi đăng nhập."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "Email hoặc mật khẩu không đúng."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        user, _ = token_user(request.data, active=None)
        if user is None:
            return Response(
                {"detail": "Liên kết xác thực không hợp lệ hoặc đã hết hạn."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response({"detail": "Email đã được xác thực. Bạn có thể đăng nhập."})


class VerificationEmailRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        serializer = EmailAddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=False
        ).first()
        if user:
            send_account_email(user, "verify")
        return Response(
            {"detail": "Nếu email thuộc tài khoản chưa xác thực, hướng dẫn sẽ được gửi."}
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        serializer = EmailAddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()
        if user:
            send_account_email(user, "reset")
        return Response(
            {"detail": "Nếu email thuộc tài khoản đã xác thực, hướng dẫn sẽ được gửi."}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfEnforcingSessionAuthentication]

    def post(self, request):
        user, token_data = token_user(request.data, active=True)
        if user is None:
            return Response(
                {"detail": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PasswordResetConfirmSerializer(
            data={**token_data, "password": request.data.get("password")},
            context={"user": user},
        )
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Mật khẩu đã được cập nhật. Hãy đăng nhập."})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        get_token(request)
        return Response({"detail": "CSRF cookie set"})
