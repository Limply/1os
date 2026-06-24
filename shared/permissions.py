from rest_framework.permissions import BasePermission, SAFE_METHODS


# ---------------------------------------------------------------------------
# Permission constants  —  format: module.action
# ---------------------------------------------------------------------------
class P:
    # Dashboard
    DASHBOARD_VIEW    = 'dashboard.view'

    # Projects
    PROJECTS_VIEW     = 'projects.view'
    PROJECTS_EDIT     = 'projects.edit'
    PROJECTS_DELETE   = 'projects.delete'

    # HR
    HR_VIEW           = 'hr.view'
    HR_MANAGE         = 'hr.manage'
    HR_APPROVE_LEAVE  = 'hr.approve_leave'

    # Finance
    FINANCE_VIEW      = 'finance.view'
    FINANCE_EDIT      = 'finance.edit'

    # Operations
    OPERATIONS_VIEW   = 'operations.view'
    OPERATIONS_EDIT   = 'operations.edit'

    # Compliance
    COMPLIANCE_VIEW   = 'compliance.view'
    COMPLIANCE_EDIT   = 'compliance.edit'

    # CRM
    CRM_VIEW          = 'crm.view'
    CRM_EDIT          = 'crm.edit'

    # Files
    FILES_VIEW        = 'files.view'

    # Settings
    SETTINGS_VIEW     = 'settings.view'
    SETTINGS_EDIT     = 'settings.edit'

    # Admin
    ADMIN_USERS       = 'admin.users'
    ADMIN_TENANT      = 'admin.tenant'

    # Supervisor app
    SUPERVISOR_APP    = 'supervisor.app'

    @classmethod
    def all(cls):
        return [v for k, v in vars(cls).items() if not k.startswith('_') and isinstance(v, str)]


# Role defaults — admin has full access, staff is the minimal fallback when no position is set.
# All other permission levels are now defined on Position.permissions in the organisation service.
ROLE_DEFAULT_PERMISSIONS = {
    'admin': [p for p in P.all() if p != P.ADMIN_TENANT],
    'staff': [P.DASHBOARD_VIEW, P.HR_VIEW],
}


# ---------------------------------------------------------------------------
# Legacy role hierarchy (kept for backwards compat during migration)
# ---------------------------------------------------------------------------
ROLE_HIERARCHY = ['viewer', 'staff', 'foreman', 'supervisor', 'manager', 'admin', 'superadmin']


def _rank(role):
    try:
        return ROLE_HIERARCHY.index(role)
    except ValueError:
        return -1


def user_can(user, perm):
    """Check if a user has a permission. Superadmin bypasses all checks."""
    if not user or not user.is_authenticated:
        return False
    if user.role == 'superadmin':
        return True
    return perm in (user.resolved_permissions or [])


def make_module_permission(read_perm, write_perm=None):
    """Factory: returns a DRF permission class checking read_perm for safe methods, write_perm otherwise."""
    _write = write_perm or read_perm

    class _ModulePermission(BasePermission):
        def has_permission(self, request, view):
            if request.method in SAFE_METHODS:
                return user_can(request.user, read_perm)
            return user_can(request.user, _write)

    return _ModulePermission


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
