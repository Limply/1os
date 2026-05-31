from rest_framework import serializers
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    department_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_position_name(self, obj):
        return obj.position.title if obj.position else None


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    leave_type_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_leave_type_name(self, obj):
        return obj.leave_type.name if obj.leave_type else None


class LeaveApplicationSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveApplication
        exclude = ['tenant']
        read_only_fields = ['id', 'status', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def get_leave_type_name(self, obj):
        return obj.leave_type.name if obj.leave_type else None

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PublicHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHoliday
        fields = '__all__'