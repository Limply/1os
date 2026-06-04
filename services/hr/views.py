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
from .permissions import IsClockInAllowed
from shared.utils import haversine_distance
from shared.filebrowser_csv import read_csv as fb_read_csv, write_csv as fb_write_csv


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
            today_str = today.strftime('%d-%m-%Y')

            # Check schedule exists in CSV
            rows = fb_read_csv(CSV_PATH)
            schedule = next((r for r in rows if r.get('emp_no') == employee.emp_no and r.get('date') == today_str), None)
            if not schedule:
                return Response(
                    {'success': False, 'message': 'No schedule assigned for today. Contact your supervisor.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check GPS within allowed radius
            gps_lat = request.data.get('gps_lat')
            gps_lng = request.data.get('gps_lng')
            if gps_lat and gps_lng:
                distance = haversine_distance(gps_lat, gps_lng, schedule['location_lat'], schedule['location_lng'])
                radius = int(schedule.get('radius', 200))
                if distance > radius:
                    return Response({
                        'success': False,
                        'message': f'You are {int(distance)}m away from {schedule["location_name"]}. Must be within {radius}m to clock in.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Flag late if past shift_start
            now = timezone.now()
            from datetime import time as time_type
            shift_start = datetime.strptime(schedule.get('shift_start', '00:00'), '%H:%M').time()
            attendance_status = 'late' if now.time() > shift_start else 'present'

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
                    'location': schedule['location_name'],
                    'shift_start': schedule['shift_start'],
                    'shift_end': schedule['shift_end'],
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


CSV_PATH = '1os/database/Work_schedule.csv'


def _try_parse(val):
    try:
        return _parse_date(val)
    except Exception:
        return None
CSV_FIELDS = ['emp_no', 'first_name', 'last_name', 'date', 'shift_start', 'shift_end', 'location_name', 'location_lat', 'location_lng', 'radius']


def _parse_date(val):
    """Parse date string accepting DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD."""
    s = str(val).split(' ')[0].split('T')[0]
    for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f'Invalid date: {val}')


def _row_clock_status(emp, date_obj):
    record = Attendance.objects.filter(employee=emp, date=date_obj).first()
    if not record or not record.clock_in:
        return ('Missed' if date_obj < timezone.now().date() else 'Pending'), None
    return ('Late' if record.status == 'late' else 'Done'), record.clock_in.strftime('%H:%M')


def _enrich(row, tenant):
    """Add id, employee_name, clock_status, clock_in_time to a CSV row dict."""
    try:
        date_obj = _parse_date(row.get('date', ''))
    except ValueError:
        row['id'] = f"{row.get('emp_no','')}_{row.get('date','')}"
        row['employee_name'] = f"{row.get('first_name','')} {row.get('last_name','')}".strip()
        row['clock_status'] = 'Pending'
        row['clock_in_time'] = None
        return row

    emp = Employee.objects.filter(emp_no=row.get('emp_no', ''), tenant=tenant).first()
    row['id'] = f"{row['emp_no']}_{date_obj.strftime('%d-%m-%Y')}"
    row['employee_name'] = emp.full_name if emp else f"{row.get('first_name','')} {row.get('last_name','')}".strip()
    clock_status, clock_time = _row_clock_status(emp, date_obj) if emp else ('Pending', None)
    row['clock_status'] = clock_status
    row['clock_in_time'] = clock_time
    return row


class WorkScheduleViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _tenant_emp_nos(self, tenant):
        return set(Employee.objects.filter(tenant=tenant, is_active=True).values_list('emp_no', flat=True))

    def list(self, request):
        tenant = request.user.tenant
        emp_nos = self._tenant_emp_nos(tenant)
        rows = [r for r in fb_read_csv(CSV_PATH) if r.get('emp_no', '') in emp_nos]

        date_filter = request.query_params.get('date')
        emp_filter = request.query_params.get('employee')

        if date_filter:
            rows = [r for r in rows if r.get('date') == date_filter or
                    (lambda d: d.strftime('%d-%m-%Y') == date_filter if d else False)(_try_parse(r.get('date', '')))]
        if emp_filter:
            emp = Employee.objects.filter(id=emp_filter, tenant=tenant).first()
            if emp:
                rows = [r for r in rows if r.get('emp_no') == emp.emp_no]

        rows = sorted(rows, key=lambda r: (r.get('date', ''), r.get('shift_start', '')))
        rows = [_enrich(r, tenant) for r in rows]
        return Response({'results': rows, 'count': len(rows)})

    def create(self, request):
        tenant = request.user.tenant
        emp_id = request.data.get('employee')
        emp = Employee.objects.filter(id=emp_id, tenant=tenant).first() if emp_id else None
        if not emp:
            return Response({'error': 'Employee not found'}, status=400)

        try:
            date_obj = _parse_date(request.data.get('date', ''))
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)

        date_str = date_obj.strftime('%d-%m-%Y')
        rows = fb_read_csv(CSV_PATH)

        if any(r.get('emp_no') == emp.emp_no and r.get('date') == date_str for r in rows):
            return Response({'error': f'Schedule already exists for {emp.emp_no} on {date_str}'}, status=400)

        new_row = {
            'emp_no': emp.emp_no,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'date': date_str,
            'shift_start': request.data.get('shift_start', ''),
            'shift_end': request.data.get('shift_end', ''),
            'location_name': request.data.get('location_name', ''),
            'location_lat': request.data.get('location_lat', ''),
            'location_lng': request.data.get('location_lng', ''),
            'radius': request.data.get('radius', 200),
        }
        rows.append(new_row)
        fb_write_csv(CSV_PATH, rows, CSV_FIELDS)
        return Response(_enrich(new_row, tenant), status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        tenant = request.user.tenant
        emp_no, date_str = pk.rsplit('_', 1)
        rows = fb_read_csv(CSV_PATH)
        updated = None
        for i, r in enumerate(rows):
            if r.get('emp_no') == emp_no and r.get('date') == date_str:
                rows[i].update({
                    'shift_start': request.data.get('shift_start', r['shift_start']),
                    'shift_end': request.data.get('shift_end', r['shift_end']),
                    'location_name': request.data.get('location_name', r['location_name']),
                    'location_lat': request.data.get('location_lat', r['location_lat']),
                    'location_lng': request.data.get('location_lng', r['location_lng']),
                    'radius': request.data.get('radius', r['radius']),
                })
                updated = rows[i]
                break
        if not updated:
            return Response({'error': 'Schedule not found'}, status=404)
        fb_write_csv(CSV_PATH, rows, CSV_FIELDS)
        return Response(_enrich(updated, tenant))

    def destroy(self, request, pk=None):
        emp_no, date_str = pk.rsplit('_', 1)
        rows = fb_read_csv(CSV_PATH)
        rows = [r for r in rows if not (r.get('emp_no') == emp_no and r.get('date') == date_str)]
        fb_write_csv(CSV_PATH, rows, CSV_FIELDS)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        tenant = request.user.tenant
        emp_nos = self._tenant_emp_nos(tenant)
        rows = [r for r in fb_read_csv(CSV_PATH) if r.get('emp_no', '') in emp_nos]
        rows = [_enrich(r, tenant) for r in rows]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Schedules'
        headers = CSV_FIELDS + ['clock_in_status', 'clock_in_time']
        ws.append(headers)
        for r in rows:
            ws.append([r.get(h, '') for h in headers])
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = max(len(str(c.value or '')) for c in col) + 4

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = 'attachment; filename="Work_schedule.xlsx"'
        return resp

    @action(detail=False, methods=['post'])
    def import_file(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'success': False, 'message': 'No file uploaded'}, status=400)

        incoming = []
        filename = file.name.lower()
        try:
            if filename.endswith('.xlsx'):
                wb = openpyxl.load_workbook(file)
                ws = wb.active
                headers = [str(c.value).strip() for c in next(ws.iter_rows(min_row=1, max_row=1))]
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if any(v for v in row):
                        incoming.append(dict(zip(headers, [str(v) if v is not None else '' for v in row])))
            elif filename.endswith('.csv'):
                text = file.read().decode('utf-8-sig')
                reader = csv.DictReader(io.StringIO(text))
                incoming = [r for r in reader if any(str(v).strip() for v in r.values())]
            else:
                return Response({'success': False, 'message': 'Only .csv or .xlsx files are supported'}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': f'File parse error: {e}'}, status=400)

        if not incoming:
            return Response({'success': False, 'message': 'File is empty'}, status=400)

        tenant = request.user.tenant
        emp_nos = self._tenant_emp_nos(tenant)
        existing = fb_read_csv(CSV_PATH)
        existing_keys = {(r.get('emp_no'), r.get('date')) for r in existing}

        errors = []
        validated = []
        for i, row in enumerate(incoming, start=2):
            emp_no = str(row.get('emp_no', '')).strip()
            date_val = str(row.get('date', '')).strip()
            shift_start = str(row.get('shift_start', '')).strip()
            shift_end = str(row.get('shift_end', '')).strip()
            location_name = str(row.get('location_name', '')).strip()
            location_lat = str(row.get('location_lat', '')).strip()
            location_lng = str(row.get('location_lng', '')).strip()
            radius = str(row.get('radius', '200')).strip() or '200'

            if not all([emp_no, date_val, shift_start, shift_end, location_name, location_lat, location_lng]):
                errors.append(f'Row {i}: Missing required fields')
                continue
            if emp_no not in emp_nos:
                errors.append(f'Row {i}: Employee {emp_no} not found')
                continue
            try:
                date_obj = _parse_date(date_val)
                date_str = date_obj.strftime('%d-%m-%Y')
            except ValueError:
                errors.append(f'Row {i}: Invalid date "{date_val}" — use DD-MM-YYYY')
                continue
            if (emp_no, date_str) in existing_keys:
                errors.append(f'Row {i}: Schedule already exists for {emp_no} on {date_str}')
                continue

            emp = Employee.objects.filter(emp_no=emp_no, tenant=tenant).first()
            validated.append({
                'emp_no': emp_no,
                'first_name': emp.first_name if emp else '',
                'last_name': emp.last_name if emp else '',
                'date': date_str,
                'shift_start': shift_start,
                'shift_end': shift_end,
                'location_name': location_name,
                'location_lat': location_lat,
                'location_lng': location_lng,
                'radius': radius,
            })

        if errors:
            return Response({'success': False, 'errors': errors, 'message': f'{len(errors)} error(s) — nothing imported'}, status=400)

        fb_write_csv(CSV_PATH, existing + validated, CSV_FIELDS)
        return Response({'success': True, 'message': f'{len(validated)} schedule(s) imported'})


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