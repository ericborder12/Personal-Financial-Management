from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Account, Category, Profile

DEFAULT_CATEGORIES = [
    # Expense categories
    ("Ăn uống", "expense", "utensils", "#EF4444"),
    ("Đi lại", "expense", "car", "#F97316"),
    ("Nhà ở", "expense", "home", "#F59E0B"),
    ("Mua sắm", "expense", "shopping-bag", "#EC4899"),
    ("Hóa đơn & Tiện ích", "expense", "receipt", "#8B5CF6"),
    ("Giải trí", "expense", "gamepad", "#06B6D4"),
    ("Sức khỏe", "expense", "heart-pulse", "#10B981"),
    ("Giáo dục", "expense", "graduation-cap", "#3B82F6"),
    ("Chi tiêu khác", "expense", "more-horizontal", "#64748B"),
    # Income categories
    ("Tiền lương", "income", "briefcase", "#10B981"),
    ("Thưởng", "income", "gift", "#059669"),
    ("Đầu tư", "income", "trending-up", "#2563EB"),
    ("Thu nhập khác", "income", "plus-circle", "#0D9488"),
]


def seed_default_categories(user):
    categories_to_create = []
    for name, cat_type, icon, color in DEFAULT_CATEGORIES:
        if not Category.objects.filter(user=user, name=name, type=cat_type).exists():
            categories_to_create.append(
                Category(
                    user=user,
                    name=name,
                    type=cat_type,
                    icon=icon,
                    color=color,
                    is_default=True,
                    is_active=True,
                )
            )
    if categories_to_create:
        Category.objects.bulk_create(categories_to_create)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def on_user_created(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
        seed_default_categories(instance)
        if not Account.objects.filter(user=instance).exists():
            Account.objects.create(
                user=instance,
                name="Tiền mặt",
                type="cash",
                initial_balance=0,
                color="#10B981",
                icon="wallet",
            )
