from rest_framework import serializers
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday, WorkSchedule, ManpowerSettings, StaffDeployment


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    department_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_position_name(self, obj):
        return obj.position.title if obj.position else None


class EmployeeTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()
    department_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    direct_reports = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'emp_no', 'full_name', 'first_name', 'last_name',
            'position_name', 'department_name', 'photo_url',
            'phone', 'email', 'join_date', 'employment_type',
            'manager', 'manager_name', 'direct_reports', 'children',
        ]

    def get_children(self, obj):
        qs = obj.subordinates.filter(is_active=True)
        return EmployeeTreeSerializer(qs, many=True, context=self.context).data

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            try:
                return obj.photo.url
            except Exception:
                return None
        return None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_position_name(self, obj):
        return obj.position.title if obj.position else None

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_direct_reports(self, obj):
        return obj.subordinates.filter(is_active=True).count()


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    leave_type_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_leave_type_name(self, obj):
        return obj.leave_type.name if obj.leave_type else None


class LeaveApplicationSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveApplication
        fields = '__all__'
        read_only_fields = ['id', 'status', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def get_leave_type_name(self, obj):
        return obj.leave_type.name if obj.leave_type else None

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PublicHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHoliday
        fields = '__all__'


class WorkScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    clock_status = serializers.SerializerMethodField()
    clock_in_time = serializers.SerializerMethodField()

    class Meta:
        model = WorkSchedule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

    def get_clock_status(self, obj):
        from django.utils import timezone
        record = obj.employee.attendance_records.filter(date=obj.date).first()
        if not record or not record.clock_in:
            return 'Missed' if obj.date < timezone.now().date() else 'Pending'
        return 'Late' if record.status == 'late' else 'Done'

    def get_clock_in_time(self, obj):
        record = obj.employee.attendance_records.filter(date=obj.date).first()
        if record and record.clock_in:
            from django.utils.timezone import localtime
            return localtime(record.clock_in).strftime('%H:%M')
        return None


class ClockInResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    clock_in_time = serializers.DateTimeField(required=False, allow_null=True)
    clock_out_time = serializers.DateTimeField(required=False, allow_null=True)
    hours_worked = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    photo_url = serializers.URLField(required=False, allow_null=True)
    gps_location = serializers.JSONField(required=False, allow_null=True)


class ManpowerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManpowerSettings
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class StaffDeploymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffDeployment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None