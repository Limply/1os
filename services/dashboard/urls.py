from django.urls import path
from .views import overview, supervisor_home, problem_report

urlpatterns = [
    path('overview/',        overview,        name='dashboard-overview'),
    path('supervisor/',      supervisor_home, name='dashboard-supervisor'),
    path('problem-report/',  problem_report,  name='problem-report'),
]
