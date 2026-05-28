from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('services.auth.urls')),
    path('api/org/', include('services.organisation.urls')),
    path('api/hr/', include('services.hr.urls')),
    path('api/ops/', include('services.operations.urls')),
    path('api/finance/', include('services.finance.urls')),
    path('api/compliance/', include('services.compliance.urls')),
    path('api/notify/', include('services.notifications.urls')),
    path('api/dashboard/', include('services.dashboard.urls')),
]
