from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
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

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class LeaveApplicationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = LeaveApplication.objects.select_related('employee', 'leave_type', 'approved_by')
    serializer_class = LeaveApplicationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        status = self.request.query_params.get('status')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')


class AttendanceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('employee')
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs.order_by('-date')


class CertificationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Certification.objects.select_related('employee')
    serializer_class = CertificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs.order_by('-issue_date')


class PublicHolidayViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PublicHoliday.objects.all()
    serializer_class = PublicHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def employee_me(request):
    """Return the employee profile for the logged-in user."""
    try:
        employee = Employee.objects.select_related('department', 'position').get(
            user=request.user, tenant=request.user.tenant
        )
        return Response(EmployeeSerializer(employee).data)
    except Employee.DoesNotExist:
        return Response({'detail': 'No employee profile found.'}, status=404)