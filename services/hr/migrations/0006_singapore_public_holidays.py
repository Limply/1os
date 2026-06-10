from django.db import migrations

HOLIDAYS = [
    # 2025
    ("2025-01-01", "New Year's Day"),
    ("2025-01-29", "Chinese New Year"),
    ("2025-01-30", "Chinese New Year (Second Day)"),
    ("2025-03-31", "Hari Raya Puasa"),
    ("2025-04-18", "Good Friday"),
    ("2025-05-01", "Labour Day"),
    ("2025-05-12", "Vesak Day"),
    ("2025-06-06", "Hari Raya Haji"),
    ("2025-08-09", "National Day"),
    ("2025-10-20", "Deepavali"),
    ("2025-12-25", "Christmas Day"),
    # 2026
    ("2026-01-01", "New Year's Day"),
    ("2026-02-17", "Chinese New Year"),
    ("2026-02-18", "Chinese New Year (Second Day)"),
    ("2026-03-20", "Hari Raya Puasa"),
    ("2026-04-03", "Good Friday"),
    ("2026-05-01", "Labour Day"),
    ("2026-05-27", "Hari Raya Haji"),
    ("2026-06-01", "Vesak Day"),
    ("2026-08-10", "National Day"),
    ("2026-11-09", "Deepavali"),
    ("2026-12-25", "Christmas Day"),
]


def load_holidays(apps, schema_editor):
    PublicHoliday = apps.get_model("hr", "PublicHoliday")
    for date_str, name in HOLIDAYS:
        year = int(date_str[:4])
        PublicHoliday.objects.get_or_create(
            date=date_str,
            defaults={"name": name, "year": year},
        )


def unload_holidays(apps, schema_editor):
    PublicHoliday = apps.get_model("hr", "PublicHoliday")
    PublicHoliday.objects.filter(year__in=[2025, 2026]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0005_alter_attendance_clock_in_photo_and_more"),
    ]

    operations = [
        migrations.RunPython(load_holidays, unload_holidays),
    ]
