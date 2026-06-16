import datetime

from django.db import migrations


# تاریخ مرز: ۱۰ ژوئن ۲۰۲۶ (سرویس‌های بعد از این تاریخ حذف می‌شوند)
CUTOFF = datetime.date(2026, 6, 10)


def _parse_move_date(value):
    value = (value or '').strip()
    for fmt in ('%Y-%m-%d', '%Y/%m/%d'):
        try:
            return datetime.datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def delete_after_cutoff(apps, schema_editor):
    ResamSaleData = apps.get_model('saledata', 'ResamSaleData')
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')

    # ۱) سرویس‌آیدی‌هایی که تاریخ حرکتشان بعد از مرز است را پیدا می‌کنیم.
    service_ids = set()
    rows = (
        ResamSaleData.objects
        .exclude(service_id__isnull=True)
        .values('service_id', 'move_date')
    )
    for row in rows:
        move_date = _parse_move_date(row['move_date'])
        if move_date is not None and move_date > CUTOFF:
            service_ids.add(row['service_id'])

    service_ids = list(service_ids)
    if not service_ids:
        print('[saledata] no services after cutoff; nothing deleted')
        return

    # ۲) ابتدا سرویس‌ساماری‌های متناظر حذف می‌شوند.
    deleted_summaries, _ = ServiceSummary.objects.filter(
        service_id__in=service_ids
    ).delete()

    # ۳) سپس خود بلیط‌ها از resamsaledata حذف می‌شوند.
    deleted_tickets, _ = ResamSaleData.objects.filter(
        service_id__in=service_ids
    ).delete()

    print(
        f'[saledata] cutoff {CUTOFF}: '
        f'{len(service_ids)} service ids, '
        f'{deleted_summaries} summaries, '
        f'{deleted_tickets} tickets deleted'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0007_occupancy_ratio'),
    ]

    operations = [
        # حذف داده برگشت‌پذیر نیست؛ reverse صرفاً بدون خطا رد می‌شود.
        migrations.RunPython(delete_after_cutoff, migrations.RunPython.noop),
    ]
