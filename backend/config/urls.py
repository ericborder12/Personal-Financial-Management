from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_root_index(request):
    return JsonResponse(
        {
            "name": "FinanceFlow API",
            "status": "online",
            "message": "Backend API Django đang hoạt động bình thường!",
            "health": "/api/health/",
            "admin": "/admin/",
        }
    )


urlpatterns = [
    path("", api_root_index, name="api-root-index"),
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("finance.urls")),
    path("api/finance/", include("finance.urls")),
]
