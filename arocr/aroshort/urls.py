from django.urls import path

from . import views

urlpatterns = [
    path('<str:short_code>/', views.redirect_short_link, name='aroshort-redirect'),
]
