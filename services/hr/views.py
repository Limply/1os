from django.utils import timezone
from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday
from .serializers import (
    EmployeeSerializer, EmployeeTreeSerializer, LeaveTypeSerializer, LeaveBalanceSerializer,
    LeaveApplicationSerializer, AttendanceSerializer, CertificationSerializer, PublicHolidaySerializer,
    ClockInResponseSerializer,
)
from shared.permissions import IsClockInAllowed


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

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'approved'
        leave.approved_by = request.user
        leave.approved_at = timezone.now()
        leave.remarks = request.data.get('remarks', '')
        leave.save()
        return Response(LeaveApplicationSerializer(leave).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'rejected'
        leave.approved_by = request.user
        leave.approved_at = timezone.now()
        leave.remarks = request.data.get('remarks', '')
        leave.save()
        return Response(LeaveApplicationSerializer(leave).data)


class AttendanceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('employee')
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs.order_by('-date')

    @action(detail=False, methods=['post'], permission_classes=[IsClockInAllowed])
    def clock_in(self, request):
        try:
            employee = request.user.employee_profile
            today = timezone.now().date()

            record, created = Attendance.objects.get_or_create(
                employee=employee,
                date=today,
                defaults={'tenant': request.user.tenant}
            )

            now = timezone.now()
            record.clock_in = now
            record.clock_in_photo = request.FILES.get('photo')

            gps_lat = request.data.get('gps_lat')
            gps_lng = request.data.get('gps_lng')
            if gps_lat and gps_lng:
                record.clock_in_gps = {'lat': float(gps_lat), 'lng': float(gps_lng)}

            address = request.data.get('address')
            if address:
                record.clock_in_address = address

            record.save()

            photo_url = record.clock_in_photo.url if record.clock_in_photo else None
            response = {
                'success': True,
                'message': f'Clocked in at {now.strftime("%H:%M:%S")}',
                'clock_in_time': now,
                'photo_url': photo_url,
                'gps_location': record.clock_in_gps,
            }
            return Response(response, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], permission_classes=[IsClockInAllowed])
    def clock_out(self, request):
        try:
            employee = request.user.employee_profile
            today = timezone.now().date()

            record = Attendance.objects.get(employee=employee, date=today)

            now = timezone.now()
            record.clock_out = now
            record.clock_out_photo = request.FILES.get('photo')

            gps_lat = request.data.get('gps_lat')
            gps_lng = request.data.get('gps_lng')
            if gps_lat and gps_lng:
                record.clock_out_gps = {'lat': float(gps_lat), 'lng': float(gps_lng)}

            address = request.data.get('address')
            if address:
                record.clock_out_address = address

            if record.clock_in:
                delta = now - record.clock_in
                hours = delta.total_seconds() / 3600
                record.hours = round(hours, 2)

            record.save()

            photo_url = record.clock_out_photo.url if record.clock_out_photo else None
            response = {
                'success': True,
                'message': f'Clocked out at {now.strftime("%H:%M:%S")}',
                'clock_out_time': now,
                'hours_worked': record.hours,
                'photo_url': photo_url,
                'gps_location': record.clock_out_gps,
            }
            return Response(response, status=status.HTTP_200_OK)
        except Attendance.DoesNotExist:
            return Response(
                {'success': False, 'message': 'No clock-in record for today'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


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
def org_tree(request):
    """Return recursive org chart tree from root(s)."""
    tenant = request.user.tenant
    roots = Employee.objects.filter(tenant=tenant, is_active=True, manager__isnull=True)
    data = EmployeeTreeSerializer(roots, many=True, context={'request': request}).data
    if len(data) == 1:
        return Response(data[0])
    return Response({'id': None, 'full_name': 'Company', 'children': data})


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