from django.urls import path

from .views import (
    ChangePasswordView,
    CsrfView,
    GoogleLoginView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    VerificationEmailRequestView,
    VerifyEmailView,
)

urlpatterns = [
    path("auth/csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("auth/verification-email/", VerificationEmailRequestView.as_view(), name="auth-verification-email"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]
