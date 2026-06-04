from rest_framework.permissions import BasePermission


class IsClockInAllowed(BasePermission):
    """Only employees with can_clock_in=True can use clock-in API."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            employee = request.user.employee_profile
            return employee and employee.can_clock_in
        except Exception:
            return False
