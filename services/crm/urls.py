from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ContactViewSet, LeadViewSet, InteractionViewSet

router = DefaultRouter()
router.register('clients',      ClientViewSet,      basename='crm-client')
router.register('contacts',     ContactViewSet,     basename='crm-contact')
router.register('leads',        LeadViewSet,        basename='crm-lead')
router.register('interactions', InteractionViewSet, basename='crm-interaction')

urlpatterns = [
    path('', include(router.urls)),
]
