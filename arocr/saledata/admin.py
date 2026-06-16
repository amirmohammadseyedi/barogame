from django.contrib import admin, messages
from django.db.models import Avg, Count, Sum
from django.urls import reverse
from django.utils.html import format_html

from .models import ResamSaleData, Route, RoutePriceGroup, ServiceSummary


@admin.register(ResamSaleData)
class ResamSaleDataAdmin(admin.ModelAdmin):
    list_display = (
        'ticket_id',
        'ticket_code',
        'origin_station',
        'destination_station',
        'move_date',
        'departure_time',
        'total_price',
        'ticket_status',
    )
    search_fields = (
        'ticket_id',
        'ticket_code',
        'origin_station',
        'destination_station',
    )
    list_filter = ('ticket_status', 'create_source_type')

    def lookup_allowed(self, lookup, value, request=None):
        if lookup == 'service_id':
            return True
        return super().lookup_allowed(lookup, value, request)


@admin.register(ServiceSummary)
class ServiceSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'service_id',
        'origins',
        'destinations',
        'prices',
        'total_seats',
        'max_price',
        'final_destination',
        'service_class',
        'occupancy_display',
        'route',
    )
    search_fields = ('service_id', 'origins', 'destinations', 'final_destination')
    list_filter = ('service_class',)
    ordering = ('service_id',)

    @admin.display(description='ضریب اشغال', ordering='occupancy_ratio')
    def occupancy_display(self, obj):
        if obj.occupancy_ratio is None:
            return '-'
        return f'{obj.occupancy_ratio:.2f}'


class ServiceSummaryInline(admin.TabularInline):
    model = ServiceSummary
    extra = 0
    can_delete = False
    fields = ('service_id', 'seats_link', 'prices', 'max_price', 'final_destination', 'service_class', 'occupancy_ratio')
    readonly_fields = ('service_id', 'seats_link', 'prices', 'max_price', 'final_destination', 'occupancy_ratio')
    ordering = ('service_id',)

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='تعداد صندلی (بلیط‌ها)')
    def seats_link(self, obj):
        url = (
            reverse('admin:saledata_resamsaledata_changelist')
            + f'?service_id={obj.service_id}'
        )
        return format_html('<a href="{}">{}</a>', url, obj.total_seats)


class RoutePriceGroupInline(admin.TabularInline):
    model = RoutePriceGroup
    extra = 0
    can_delete = False
    fields = ('price_display', 'final_destination', 'services_count', 'service_class')
    readonly_fields = ('price_display', 'final_destination', 'services_count')
    ordering = ('-max_price',)

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='بیشترین قیمت')
    def price_display(self, obj):
        if obj.max_price is None:
            return '-'
        return f'{obj.max_price:,}'


@admin.action(description='تحلیل قیمت مقصد نهایی (ساخت گروه‌های قیمتی)')
def build_price_groups(modeladmin, request, queryset):
    for route in queryset:
        groups = {}

        for service in route.services.all():
            top_ticket = (
                ResamSaleData.objects
                .filter(service_id=service.service_id, price__isnull=False)
                .order_by('-price')
                .first()
            )
            if top_ticket is None:
                continue

            service.max_price = top_ticket.price
            service.final_destination = (top_ticket.destination_station or '').strip()
            service.save(update_fields=['max_price', 'final_destination'])

            group = groups.setdefault(
                top_ticket.price,
                {'destination': service.final_destination, 'count': 0},
            )
            group['count'] += 1

        route.price_groups.exclude(max_price__in=list(groups)).delete()
        for price, info in groups.items():
            obj, _created = RoutePriceGroup.objects.update_or_create(
                route=route,
                max_price=price,
                defaults={
                    'final_destination': info['destination'],
                    'services_count': info['count'],
                },
            )

        if groups:
            prices_text = ' / '.join(
                f'{price:,} ← {info["destination"] or "؟"}'
                for price, info in sorted(groups.items(), reverse=True)
            )
            modeladmin.message_user(
                request,
                f'{route}: {prices_text}',
                messages.SUCCESS,
            )
        else:
            modeladmin.message_user(
                request,
                f'{route}: قیمتی پیدا نشد.',
                messages.WARNING,
            )


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = (
        'origin',
        'destinations',
        'services_count',
        'total_seats',
        'avg_occupancy',
    )
    search_fields = ('origin', 'destinations')
    inlines = [RoutePriceGroupInline, ServiceSummaryInline]
    actions = [build_price_groups]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                _services_count=Count('services', distinct=True),
                _total_seats=Sum('services__total_seats'),
                _avg_occupancy=Avg('services__occupancy_ratio'),
            )
        )

    @admin.display(description='تعداد سرویس‌ها', ordering='_services_count')
    def services_count(self, obj):
        return obj._services_count

    @admin.display(description='جمع صندلی‌ها', ordering='_total_seats')
    def total_seats(self, obj):
        return obj._total_seats or 0

    @admin.display(description='ضریب اشغال کلی', ordering='_avg_occupancy')
    def avg_occupancy(self, obj):
        if obj._avg_occupancy is None:
            return '-'
        return f'{obj._avg_occupancy:.2f}'


@admin.register(RoutePriceGroup)
class RoutePriceGroupAdmin(admin.ModelAdmin):
    list_display = (
        'route',
        'price_display',
        'final_destination',
        'services_count',
        'service_class',
    )
    list_editable = ('service_class',)
    list_filter = ('service_class',)
    search_fields = ('route__origin', 'route__destinations', 'final_destination')
    ordering = ('route', '-max_price')

    @admin.display(description='بیشترین قیمت', ordering='max_price')
    def price_display(self, obj):
        return f'{obj.max_price:,}'
