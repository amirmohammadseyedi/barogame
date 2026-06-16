from django.db.models import F
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Link


@require_GET
def redirect_short_link(request, short_code):
    link = get_object_or_404(Link, short_code=short_code)
    Link.objects.filter(pk=link.pk).update(visit_count=F('visit_count') + 1)
    return HttpResponseRedirect(link.source_url)
