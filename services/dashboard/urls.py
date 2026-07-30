from django.urls import path
from .views import overview, supervisor_home, problem_report, strategy, strategy_sync

urlpatterns = [
    path('overview/',        overview,        name='dashboard-overview'),
    path('strategy/',        strategy,        name='dashboard-strategy'),
    path('strategy/sync/',   strategy_sync,   name='dashboard-strategy-sync'),
    path('supervisor/',      supervisor_home, name='dashboard-supervisor'),
    path('problem-report/',  problem_report,  name='problem-report'),
]
