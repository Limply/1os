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


