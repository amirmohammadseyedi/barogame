from django.urls import path

from .views import (
    CartsSummaryView,
    ChartDataView,
    ChartTypeConfigView,
    DefaultDateView,
    TravelsForDateView,
)

urlpatterns = [
    path('api/default-date/', DefaultDateView.as_view(), name='safar724-default-date'),
    path('api/travels/', TravelsForDateView.as_view(), name='safar724-travels'),
    path('api/chart-data/', ChartDataView.as_view(), name='safar724-chart-data'),
    path('api/carts-summary/', CartsSummaryView.as_view(), name='safar724-carts-summary'),
    path('api/chart-type-config/', ChartTypeConfigView.as_view(), name='safar724-chart-type-config'),
]
