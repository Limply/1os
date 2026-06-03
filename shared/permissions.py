from rest_framework.permissions import BasePermission


ROLE_HIERARCHY = ['viewer', 'staff', 'manager', 'admin', 'superadmin']


def _rank(role):
    try:
        return ROLE_HIERARCHY.index(role)
    except ValueError:
        return -1


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'superadmin'


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _rank(request.user.role) >= _rank('admin')


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _rank(request.user.role) >= _rank('manager')


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _rank(request.user.role) >= _rank('staff')


class IsTenantMember(BasePermission):
    """Ensures the user belongs to the requested tenant."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request, 'tenant')


class IsClockInAllowed(BasePermission):
    """Only employees with can_clock_in=True can use clock-in API."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            employee = request.user.employee_profile
            return employee and employee.can_clock_in
        except:
            return False
