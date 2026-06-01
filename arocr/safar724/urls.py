from django.urls import path

from .views import ChartDataView, DefaultDateView, TravelsForDateView

urlpatterns = [
    path('api/default-date/', DefaultDateView.as_view(), name='safar724-default-date'),
    path('api/travels/', TravelsForDateView.as_view(), name='safar724-travels'),
    path('api/chart-data/', ChartDataView.as_view(), name='safar724-chart-data'),
]
