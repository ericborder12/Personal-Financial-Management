import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from finance.models import ChatMessage, Feedback


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@example.com",
        password="AdminPassword123!",
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.mark.django_db
def test_support_presence_offline_and_online(auth_client, admin_user, admin_client):
    # Case 1: Admin has no last_seen -> admin_online is False
    res = auth_client.get("/api/support/presence/")
    assert res.status_code == 200
    data = res.json()
    assert data["admin_online"] is False
    assert data["is_admin"] is False

    # Case 2: Admin was last seen 10 minutes ago -> offline
    admin_user.last_seen = timezone.now() - timedelta(minutes=10)
    admin_user.save()

    res = auth_client.get("/api/support/presence/")
    assert res.json()["admin_online"] is False

    # Case 3: Admin sends presence heartbeat (POST) -> online
    res_admin = admin_client.post("/api/support/presence/")
    assert res_admin.status_code == 200
    assert res_admin.json()["admin_online"] is True
    assert res_admin.json()["is_admin"] is True

    # User checks presence -> admin is online
    res = auth_client.get("/api/support/presence/")
    assert res.json()["admin_online"] is True


@pytest.mark.django_db
def test_user_send_chat_message_and_admin_reply(auth_client, user, admin_user, admin_client):
    # User sends a message
    res = auth_client.post(
        "/api/support/messages/",
        {"content": "Xin chào admin, tôi cần trợ giúp!"},
        format="json",
    )
    assert res.status_code == 201
    msg_id = res.json()["id"]
    assert res.json()["content"] == "Xin chào admin, tôi cần trợ giúp!"
    assert res.json()["is_from_admin"] is False
    assert res.json()["is_read"] is False

    # User fetches messages
    res_user = auth_client.get("/api/support/messages/")
    assert res_user.status_code == 200
    assert len(res_user.json()) == 1

    # Admin fetches conversations
    res_convs = admin_client.get("/api/support/messages/")
    assert res_convs.status_code == 200
    convs = res_convs.json()
    assert len(convs) == 1
    assert convs[0]["user_id"] == user.id
    assert convs[0]["unread_count"] == 1

    # Admin fetches messages with this user (marking them read)
    res_admin_msgs = admin_client.get(f"/api/support/messages/?user_id={user.id}")
    assert res_admin_msgs.status_code == 200
    assert len(res_admin_msgs.json()) == 1

    # Check that message is now read in DB
    assert ChatMessage.objects.get(id=msg_id).is_read is True

    # Admin replies
    res_reply = admin_client.post(
        "/api/support/messages/",
        {"receiver_id": user.id, "content": "Chào bạn, tôi có thể hỗ trợ gì cho bạn?"},
        format="json",
    )
    assert res_reply.status_code == 201
    assert res_reply.json()["is_from_admin"] is True

    # User checks messages again
    res_user2 = auth_client.get("/api/support/messages/")
    assert len(res_user2.json()) == 2
    assert res_user2.json()[1]["content"] == "Chào bạn, tôi có thể hỗ trợ gì cho bạn?"
    assert res_user2.json()[1]["is_from_admin"] is True


@pytest.mark.django_db
def test_feedback_create_and_admin_resolve(auth_client, user, other, admin_client):
    # User submits feedback
    res = auth_client.post(
        "/api/support/feedback/",
        {
            "type": "bug",
            "title": "Lỗi nút hiển thị biểu đồ",
            "content": "Biểu đồ thu chi tháng 10 không tải được dữ liệu.",
        },
        format="json",
    )
    assert res.status_code == 201
    fb_id = res.json()["id"]
    assert res.json()["status"] == "pending"
    assert res.json()["type"] == "bug"

    # User retrieves their feedback
    res_list = auth_client.get("/api/support/feedback/")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["id"] == fb_id

    # Another user checks their feedback list -> empty (multi-tenancy)
    other_client = APIClient()
    other_client.force_authenticate(user=other)
    assert len(other_client.get("/api/support/feedback/").json()) == 0

    # Regular user cannot update status or admin_reply
    res_tamper = auth_client.patch(
        f"/api/support/feedback/{fb_id}/",
        {"status": "resolved", "admin_reply": "Hack reply"},
        format="json",
    )
    assert res_tamper.status_code == 200
    fb_tampered = Feedback.objects.get(id=fb_id)
    assert fb_tampered.status == "pending"
    assert fb_tampered.admin_reply == ""

    # Admin sees all feedback
    res_admin_fb = admin_client.get("/api/support/feedback/")
    assert res_admin_fb.status_code == 200
    assert len(res_admin_fb.json()) >= 1

    # Admin replies to feedback and marks resolved
    res_resolve = admin_client.patch(
        f"/api/support/feedback/{fb_id}/",
        {
            "admin_reply": "Cảm ơn bạn đã phản hồi, chúng tôi đã khắc phục sự cố này!",
        },
        format="json",
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "resolved"
    assert res_resolve.json()["admin_reply"] == "Cảm ơn bạn đã phản hồi, chúng tôi đã khắc phục sự cố này!"

    # User re-fetches and sees the response
    res_user_check = auth_client.get(f"/api/support/feedback/{fb_id}/")
    assert res_user_check.status_code == 200
    assert res_user_check.json()["status"] == "resolved"
    assert "chúng tôi đã khắc phục" in res_user_check.json()["admin_reply"]
