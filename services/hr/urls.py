from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, LeaveTypeViewSet, LeaveBalanceViewSet,
    LeaveApplicationViewSet, AttendanceViewSet, CertificationViewSet, PublicHolidayViewSet,
    employee_me,
)

router = DefaultRouter()
router.register('employees', EmployeeViewSet, basename='employee')
router.register('leave-types', LeaveTypeViewSet, basename='leave-type')
router.register('leave-balances', LeaveBalanceViewSet, basename='leave-balance')
router.register('leave-applications', LeaveApplicationViewSet, basename='leave-application')
router.register('attendance', AttendanceViewSet, basename='attendance')
router.register('certifications', CertificationViewSet, basename='certification')
router.register('public-holidays', PublicHolidayViewSet, basename='public-holiday')

urlpatterns = [
    path('employees/me/', employee_me, name='employee-me'),
    path('', include(router.urls)),
]
