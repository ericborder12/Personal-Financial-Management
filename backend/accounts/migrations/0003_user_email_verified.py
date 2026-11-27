from django.db import migrations, models
from django.db.models import F


def set_existing_email_verification(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.using(schema_editor.connection.alias).update(
        is_email_verified=F("is_active")
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_last_seen"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_email_verified",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(set_existing_email_verification, migrations.RunPython.noop),
    ]
