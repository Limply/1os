from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from shared.storage import filebrowser_proxy

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
    path('api/projects/', include('services.projects.urls')),
    path('api/crm/',      include('services.crm.urls')),
    path('api/files/proxy/', filebrowser_proxy),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve React frontend for all non-API routes (must be last)
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
