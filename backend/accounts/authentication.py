from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """Session auth that answers 401 (not 403) when the session is missing/expired."""

    def authenticate_header(self, request):
        return "Session"


class CsrfEnforcingSessionAuthentication(SessionAuthentication401):
    """Session auth that also enforces CSRF for anonymous requests.

    DRF only enforces CSRF when a user is authenticated. Register/login are
    anonymous but still need CSRF protection, so enforce it ourselves.
    """

    def authenticate(self, request):
        user = getattr(request._request, "user", None)
        if not user or not user.is_active:
            self.enforce_csrf(request)
            return None
        return super().authenticate(request)
