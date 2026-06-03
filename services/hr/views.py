import csv
import io
import openpyxl
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday, WorkSchedule
from .serializers import (
    EmployeeSerializer, EmployeeTreeSerializer, LeaveTypeSerializer, LeaveBalanceSerializer,
    LeaveApplicationSerializer, AttendanceSerializer, CertificationSerializer, PublicHolidaySerializer,
    ClockInResponseSerializer, WorkScheduleSerializer,
)
from shared.permissions import IsClockInAllowed
from shared.utils import haversine_distance


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class EmployeeViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('department', 'position')
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        can_clock_in = self.request.query_params.get('can_clock_in')
        if can_clock_in == 'true':
            qs = qs.filter(can_clock_in=True)
        return qs


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

            # Check schedule exists
            schedule = WorkSchedule.objects.filter(
                employee=employee, date=today, is_active=True
            ).first()
            if not schedule:
                return Response(
                    {'success': False, 'message': 'No schedule assigned for today. Contact your supervisor.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check GPS within allowed radius
            gps_lat = request.data.get('gps_lat')
            gps_lng = request.data.get('gps_lng')
            if gps_lat and gps_lng:
                distance = haversine_distance(gps_lat, gps_lng, schedule.location_lat, schedule.location_lng)
                if distance > schedule.radius:
                    return Response({
                        'success': False,
                        'message': f'You are {int(distance)}m away from {schedule.location_name}. Must be within {schedule.radius}m to clock in.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Flag late if past shift_start
            now = timezone.now()
            attendance_status = 'late' if now.time() > schedule.shift_start else 'present'

            record, created = Attendance.objects.get_or_create(
                employee=employee,
                date=today,
                defaults={'tenant': request.user.tenant}
            )

            record.clock_in = now
            record.clock_in_photo = request.FILES.get('photo')
            record.status = attendance_status

            if gps_lat and gps_lng:
                record.clock_in_gps = {'lat': float(gps_lat), 'lng': float(gps_lng)}

            address = request.data.get('address')
            if address:
                record.clock_in_address = address

            record.save()

            photo_url = record.clock_in_photo.url if record.clock_in_photo else None
            late_note = ' (Late)' if attendance_status == 'late' else ''
            response = {
                'success': True,
                'message': f'Clocked in at {now.strftime("%H:%M:%S")}{late_note}',
                'clock_in_time': now,
                'status': attendance_status,
                'photo_url': photo_url,
                'gps_location': record.clock_in_gps,
                'schedule': {
                    'location': schedule.location_name,
                    'shift_start': str(schedule.shift_start),
                    'shift_end': str(schedule.shift_end),
                },
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


SCHEDULE_COLUMNS = ['emp_no', 'first_name', 'last_name', 'date', 'shift_start', 'shift_end', 'location_name', 'location_lat', 'location_lng', 'radius', 'clock_in_status', 'clock_in_time']


class WorkScheduleViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = WorkSchedule.objects.select_related('employee')
    serializer_class = WorkScheduleSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        employee = self.request.query_params.get('employee')
        if date:
            qs = qs.filter(date=date)
        if employee:
            qs = qs.filter(employee_id=employee)
        return qs.order_by('date', 'shift_start')

    def _clock_status(self, schedule):
        """Return clock-in status for a schedule: Done, Late, or Missed."""
        record = Attendance.objects.filter(
            employee=schedule.employee, date=schedule.date
        ).first()
        if not record or not record.clock_in:
            # If date is in the past with no clock-in, it's missed
            if schedule.date < timezone.now().date():
                return 'Missed', ''
            return 'Pending', ''
        clock_in_time = record.clock_in.strftime('%H:%M:%S')
        return ('Late' if record.status == 'late' else 'Done'), clock_in_time

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="schedules.csv"'
        writer = csv.writer(response)
        writer.writerow(SCHEDULE_COLUMNS)
        for s in self.get_queryset():
            clock_status, clock_time = self._clock_status(s)
            writer.writerow([
                s.employee.emp_no, s.employee.first_name, s.employee.last_name,
                s.date.strftime('%d-%m-%Y'), s.shift_start, s.shift_end,
                s.location_name, s.location_lat, s.location_lng, s.radius,
                clock_status, clock_time,
            ])
        return response

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Schedules'
        ws.append(SCHEDULE_COLUMNS)
        for s in self.get_queryset():
            clock_status, clock_time = self._clock_status(s)
            ws.append([
                s.employee.emp_no, s.employee.first_name, s.employee.last_name,
                s.date.strftime('%d-%m-%Y'), str(s.shift_start), str(s.shift_end),
                s.location_name, float(s.location_lat), float(s.location_lng), s.radius,
                clock_status, clock_time,
            ])
        # Auto-width columns
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = max_len + 4

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        response = HttpResponse(buf.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="schedules.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def import_file(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'success': False, 'message': 'No file uploaded'}, status=400)

        # Parse rows from CSV or Excel
        rows = []
        filename = file.name.lower()
        try:
            if filename.endswith('.xlsx'):
                wb = openpyxl.load_workbook(file)
                ws = wb.active
                headers = [str(c.value).strip() for c in next(ws.iter_rows(min_row=1, max_row=1))]
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if any(v for v in row):
                        rows.append(dict(zip(headers, row)))
            elif filename.endswith('.csv'):
                text = file.read().decode('utf-8-sig')
                reader = csv.DictReader(io.StringIO(text))
                rows = [r for r in reader if any(v.strip() for v in r.values())]
            else:
                return Response({'success': False, 'message': 'Only .csv or .xlsx files are supported'}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': f'File parse error: {e}'}, status=400)

        if not rows:
            return Response({'success': False, 'message': 'File is empty'}, status=400)

        tenant = request.user.tenant
        errors = []

        # Validate all rows first — reject entire file if any issues
        validated = []
        for i, row in enumerate(rows, start=2):
            line = f'Row {i}'
            emp_no = str(row.get('emp_no', '')).strip()
            date_val = str(row.get('date', '')).strip()
            shift_start = str(row.get('shift_start', '')).strip()
            shift_end = str(row.get('shift_end', '')).strip()
            location_name = str(row.get('location_name', '')).strip()
            location_lat = str(row.get('location_lat', '')).strip()
            location_lng = str(row.get('location_lng', '')).strip()
            radius = str(row.get('radius', '200')).strip() or '200'

            if not all([emp_no, date_val, shift_start, shift_end, location_name, location_lat, location_lng]):
                errors.append(f'{line}: Missing required fields')
                continue

            emp = Employee.objects.filter(emp_no=emp_no, tenant=tenant).first()
            if not emp:
                errors.append(f'{line}: Employee {emp_no} not found')
                continue

            try:
                date_str = str(date_val).split(' ')[0].split('T')[0]
                date_obj = None
                for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y'):
                    try:
                        date_obj = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
                if not date_obj:
                    raise ValueError
            except ValueError:
                errors.append(f'{line}: Invalid date "{date_val}" — use YYYY-MM-DD or DD/MM/YYYY')
                continue

            # Check for duplicate
            if WorkSchedule.objects.filter(employee=emp, date=date_obj, tenant=tenant).exists():
                errors.append(f'{line}: Schedule already exists for {emp_no} on {date_obj}')
                continue

            validated.append({
                'employee': emp, 'date': date_obj,
                'shift_start': shift_start, 'shift_end': shift_end,
                'location_name': location_name,
                'location_lat': location_lat, 'location_lng': location_lng,
                'radius': int(radius),
            })

        if errors:
            return Response({'success': False, 'errors': errors, 'message': f'{len(errors)} error(s) found — nothing imported'}, status=400)

        # All valid — save all
        for v in validated:
            WorkSchedule.objects.create(tenant=tenant, **v)

        return Response({'success': True, 'message': f'{len(validated)} schedule(s) imported successfully'})


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