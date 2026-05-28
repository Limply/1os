from rest_framework import viewsets, permissions
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday
from .serializers import (
    EmployeeSerializer, LeaveTypeSerializer, LeaveBalanceSerializer,
    LeaveApplicationSerializer, AttendanceSerializer, CertificationSerializer, PublicHolidaySerializer,
)


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class EmployeeViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('department', 'position')
    serializer_class = EmployeeSerializer


class LeaveTypeViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer


class LeaveBalanceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = LeaveBalance.objects.select_related('employee', 'leave_type')
    serializer_class = LeaveBalanceSerializer


class LeaveApplicationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = LeaveApplication.objects.select_related('employee', 'leave_type')
    serializer_class = LeaveApplicationSerializer


class AttendanceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('employee')
    serializer_class = AttendanceSerializer


class CertificationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Certification.objects.select_related('employee')
    serializer_class = CertificationSerializer


class PublicHolidayViewSet(viewsets.ReadOnlyModelViewSet):
    """Public holidays — read-only, not tenant-scoped."""
    queryset = PublicHoliday.objects.all()
    serializer_class = PublicHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
