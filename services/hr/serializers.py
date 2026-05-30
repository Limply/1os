from rest_framework import serializers
from .models import Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        exclude = ['tenant']

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()

    class Meta:
        model = LeaveBalance
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveApplication
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
