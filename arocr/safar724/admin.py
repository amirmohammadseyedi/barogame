from django.contrib import admin, messages

from .models import ChartAxisType, ChartParameter, CrawlDataTravel, Travel, Carts, Taavoni
from .services import crawl_week_for_travel, fetch_route_data


class CrawlDataTravelInline(admin.TabularInline):
    model = CrawlDataTravel
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('date', 'created_at', 'data')


@admin.action(description='دریافت مسیر ۷ روز از امروز (Safar724)')
def crawl_week_from_safar724(modeladmin, request, queryset):
    saved_count = 0
    errors = []

    for travel in queryset:
        saved, travel_errors = crawl_week_for_travel(travel)
        saved_count += len(saved)
        if travel_errors:
            errors.append(f'{travel}: {" | ".join(travel_errors)}')

    if saved_count:
        modeladmin.message_user(
            request,
            f'{saved_count} رکورد crawl برای {queryset.count()} سفر ذخیره شد.',
            messages.SUCCESS,
        )

    if errors:
        modeladmin.message_user(
            request,
            ' | '.join(errors),
            messages.ERROR,
        )


@admin.action(description='دریافت مجدد مسیر (Safar724)')
def fetch_route_from_safar724(modeladmin, request, queryset):
    success_count = 0
    errors = []

    for crawl in queryset:
        try:
            crawl.data = fetch_route_data(
                crawl.travel.origin_code,
                crawl.travel.destination_code,
                crawl.date,
            )
            crawl.save(update_fields=['data'])
            success_count += 1
        except ValueError as exc:
            errors.append(f'{crawl}: {exc}')

    if success_count:
        modeladmin.message_user(
            request,
            f'{success_count} رکورد crawl با موفقیت بروزرسانی شد.',
            messages.SUCCESS,
        )

    if errors:
        modeladmin.message_user(
            request,
            ' | '.join(errors),
            messages.ERROR,
        )


@admin.register(Travel)
class TravelAdmin(admin.ModelAdmin):
    list_display = ('origin_code', 'destination_code')
    search_fields = ('origin_code', 'destination_code')
    inlines = [CrawlDataTravelInline]
    actions = [crawl_week_from_safar724]


@admin.register(CrawlDataTravel)
class CrawlDataTravelAdmin(admin.ModelAdmin):
    list_display = ('travel', 'date', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('travel__origin_code', 'travel__destination_code', 'date')
    readonly_fields = ('created_at',)
    actions = [fetch_route_from_safar724]

@admin.register(Taavoni)
class TaavoniAdmin(admin.ModelAdmin):
    list_display = ('persian_name', 'companyNameId')
    search_fields = ('persian_name', 'companyNameId')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)

@admin.register(ChartAxisType)
class ChartAxisTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'label')
    search_fields = ('code', 'label')

@admin.register(Carts)
class CartsAdmin(admin.ModelAdmin):
    list_display = ('cart_id', 'companyPersianName', 'capacity' , 'created_at')
    search_fields = ('cart_id', 'companyPersianName')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)

@admin.register(ChartParameter)
class ChartParameterAdmin(admin.ModelAdmin):
    list_display = ('english_name', 'persian_name', 'axis_types_display')
    search_fields = ('english_name', 'persian_name')
    filter_horizontal = ('axis_types',)

    @admin.display(description='Axis types')
    def axis_types_display(self, obj):
        return ', '.join(obj.axis_types.values_list('code', flat=True)) or '-'
