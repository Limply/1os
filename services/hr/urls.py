from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, LeaveTypeViewSet, LeaveBalanceViewSet,
    LeaveApplicationViewSet, AttendanceViewSet, CertificationViewSet, PublicHolidayViewSet,
    WorkScheduleViewSet, ManpowerSettingsViewSet, StaffDeploymentViewSet, employee_me, org_tree,
    PersonalGoalViewSet, ClaimViewSet, ClaimItemViewSet, ClaimAttachmentViewSet,
)

router = DefaultRouter()
router.register('employees', EmployeeViewSet, basename='employee')
router.register('leave-types', LeaveTypeViewSet, basename='leave-type')
router.register('leave-balances', LeaveBalanceViewSet, basename='leave-balance')
router.register('leave-applications', LeaveApplicationViewSet, basename='leave-application')
router.register('attendance', AttendanceViewSet, basename='attendance')
router.register('certifications', CertificationViewSet, basename='certification')
router.register('public-holidays', PublicHolidayViewSet, basename='public-holiday')
router.register('work-schedules', WorkScheduleViewSet, basename='work-schedule')
router.register('manpower-settings', ManpowerSettingsViewSet, basename='manpower-settings')
router.register('staff-deployments', StaffDeploymentViewSet, basename='staff-deployment')
router.register('personal-goals',    PersonalGoalViewSet,    basename='personal-goal')
router.register('claims',             ClaimViewSet,           basename='claim')
router.register('claim-items',        ClaimItemViewSet,       basename='claim-item')
router.register('claim-attachments',  ClaimAttachmentViewSet, basename='claim-attachment')

urlpatterns = [
    path('employees/me/', employee_me, name='employee-me'),
    path('org-tree/', org_tree, name='org-tree'),
    path('', include(router.urls)),
]
