import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_transaction_account_transaction_to_account_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(
            name='Budget',
        ),
        migrations.CreateModel(
            name='Budget',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('limit', models.BigIntegerField()),
                ('year', models.IntegerField(default=2026)),
                ('month', models.IntegerField(default=1)),
                ('fixed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to='finance.category')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'year', 'month'], name='finance_bud_user_id_7a8bb4_idx')],
                'constraints': [models.UniqueConstraint(fields=('user', 'category', 'year', 'month'), name='unique_budget_per_user_cat_year_month')],
            },
        ),
    ]
