from django.db import migrations


def delete_single_seat_services(apps, schema_editor):
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')
    deleted, _details = ServiceSummary.objects.filter(total_seats=1).delete()
    print(f'[saledata] deleted {deleted} single-seat service summaries')


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0003_servicesummary'),
    ]

    operations = [
        migrations.RunPython(
            delete_single_seat_services,
            migrations.RunPython.noop,
        ),
    ]
