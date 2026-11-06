from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .ai_service import call_cloudflare_ai, AIConfigurationError, AIUpstreamError


class AIQAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        messages = request.data.get("messages")
        if not messages or not isinstance(messages, list):
            return Response(
                {"detail": "Vui lòng cung cấp danh sách tin nhắn ('messages')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reply = call_cloudflare_ai(messages, request.user)
            return Response({"reply": reply, "status": "success"})
        except AIConfigurationError as e:
            return Response(
                {"detail": str(e), "configured": False},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AIUpstreamError as e:
            return Response(
                {"detail": str(e), "upstream_error": True},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"detail": f"Đã xảy ra lỗi không xác định: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
