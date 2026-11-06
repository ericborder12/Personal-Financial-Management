from django.middleware.csrf import get_token


class CsrfHeaderMiddleware:
    """Exposes X-CSRFToken in response headers for cross-origin SPAs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            token = get_token(request)
            if token:
                response["X-CSRFToken"] = token
        return response
