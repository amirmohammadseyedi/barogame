from django.db import migrations


def seed_chart_axis_types_and_parameters(apps, schema_editor):
    ChartAxisType = apps.get_model('safar724', 'ChartAxisType')
    ChartParameter = apps.get_model('safar724', 'ChartParameter')

    axis_x, _ = ChartAxisType.objects.get_or_create(code='x', defaults={'label': 'X'})
    axis_y, _ = ChartAxisType.objects.get_or_create(code='y', defaults={'label': 'Y'})
    axis_z, _ = ChartAxisType.objects.get_or_create(code='z', defaults={'label': 'Z'})

    parameters = [
        {
            'english_name': 'capacity',
            'persian_name': 'تعداد صندلی',
            'axes': [axis_z],
        },
        {
            'english_name': 'sampling_date',
            'persian_name': 'تاریخ نمونه‌برداری',
            'axes': [axis_x],
        },
        {
            'english_name': 'companyPersianName',
            'persian_name': 'فروشنده بلیط',
            'axes': [axis_y],
        },
        {
            'english_name': 'departureTime',
            'persian_name': 'ساعت حرکت',
            'axes': [axis_y],
        },
        {
            'english_name': 'price',
            'persian_name': 'قیمت',
            'axes': [axis_y],
        },
    ]

    for item in parameters:
        axes = item['axes']
        parameter, _ = ChartParameter.objects.update_or_create(
            english_name=item['english_name'],
            defaults={'persian_name': item['persian_name']},
        )
        parameter.axis_types.set(axes)


def unseed_chart_axis_types_and_parameters(apps, schema_editor):
    ChartAxisType = apps.get_model('safar724', 'ChartAxisType')
    ChartParameter = apps.get_model('safar724', 'ChartParameter')

    ChartParameter.objects.filter(
        english_name__in=[
            'capacity',
            'sampling_date',
            'companyPersianName',
            'departureTime',
            'price',
        ],
    ).delete()
    ChartAxisType.objects.filter(code__in=['x', 'y', 'z']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('safar724', '0004_chartaxistype_chartparameter'),
    ]

    operations = [
        migrations.RunPython(
            seed_chart_axis_types_and_parameters,
            unseed_chart_axis_types_and_parameters,
        ),
    ]
