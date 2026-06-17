from django.urls import path
from .views import overview, supervisor_home

urlpatterns = [
    path('overview/',    overview,        name='dashboard-overview'),
    path('supervisor/',  supervisor_home, name='dashboard-supervisor'),
]
