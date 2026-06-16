from django.contrib import admin
from django.utils.html import format_html

from .models import Link


@admin.register(Link)
class LinkAdmin(admin.ModelAdmin):
    list_display = ('short_link_full', 'source_url', 'short_code', 'visit_count', 'created_at')
    search_fields = ('short_code', 'source_url')
    readonly_fields = ('short_link_full', 'visit_count', 'created_at')
    fields = ('source_url', 'short_code', 'short_link_full', 'visit_count', 'created_at')

    @admin.display(description='لینک کوتاه')
    def short_link_full(self, obj):
        if not obj or not obj.short_code:
            return '-'

        url = obj.get_short_url()
        return format_html('<a href="{url}" target="_blank">{url}</a>', url=url)
