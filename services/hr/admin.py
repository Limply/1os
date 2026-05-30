from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday


@admin.register(Employee)
class EmployeeAdmin(TenantModelAdmin):
    list_display = ['emp_no', 'first_name', 'last_name', 'employment_type', 'department', 'join_date', 'is_active']
    search_fields = ['emp_no', 'first_name', 'last_name', 'email']
    list_filter = ['employment_type', 'pass_type', 'department', 'is_active']
    ordering = ['emp_no']
    fieldsets = [
        ('Personal', {'fields': ['user', 'emp_no', 'first_name', 'last_name', 'nric', 'nationality', 'email', 'phone']}),
        ('Work Pass', {'fields': ['pass_type', 'pass_expiry'], 'classes': ['collapse'], 'description': 'Optional — only for foreign workers'}),
        ('Employment', {'fields': ['department', 'position', 'employment_type', 'join_date', 'end_date', 'basic_salary']}),
        ('Emergency Contact', {'fields': ['emergency_name', 'emergency_phone'], 'classes': ['collapse']}),
    ]


@admin.register(LeaveType)
class LeaveTypeAdmin(TenantModelAdmin):
    list_display = ['name', 'days_per_year', 'paid', 'carry_forward', 'tenant']
    list_filter = ['paid', 'carry_forward', 'tenant']


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(TenantModelAdmin):
    list_display = ['employee', 'leave_type', 'year', 'entitled', 'taken', 'carried_forward']
    list_filter = ['year', 'leave_type']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__emp_no']


@admin.register(LeaveApplication)
class LeaveApplicationAdmin(TenantModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'days', 'status']
    list_filter = ['status', 'leave_type']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__emp_no']
    ordering = ['-created_at']


@admin.register(Attendance)
class AttendanceAdmin(TenantModelAdmin):
    list_display = ['employee', 'date', 'clock_in', 'clock_out', 'hours', 'status']
    list_filter = ['status', 'date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__emp_no']
    ordering = ['-date']


@admin.register(Certification)
class CertificationAdmin(TenantModelAdmin):
    list_display = ['employee', 'name', 'issuer', 'issue_date', 'expiry_date', 'alert_days']
    search_fields = ['name', 'employee__first_name', 'employee__last_name', 'cert_number']
    list_filter = ['issuer']
    ordering = ['expiry_date']


@admin.register(PublicHoliday)
class PublicHolidayAdmin(TenantModelAdmin):
    list_display = ['date', 'name', 'year']
    list_filter = ['year']
    ordering = ['date']
