import { getUser } from '../api/auth'

// ---------------------------------------------------------------------------
// Permission constants  —  must mirror shared/permissions.py  P class
// ---------------------------------------------------------------------------
export const P = {
  // Dashboard
  DASHBOARD_VIEW:   'dashboard.view',

  // Projects
  PROJECTS_VIEW:    'projects.view',
  PROJECTS_EDIT:    'projects.edit',
  PROJECTS_DELETE:  'projects.delete',

  // HR
  HR_VIEW:          'hr.view',
  HR_MANAGE:        'hr.manage',
  HR_APPROVE_LEAVE: 'hr.approve_leave',

  // Finance
  FINANCE_VIEW:     'finance.view',
  FINANCE_EDIT:     'finance.edit',

  // Operations
  OPERATIONS_VIEW:  'operations.view',
  OPERATIONS_EDIT:  'operations.edit',

  // Compliance
  COMPLIANCE_VIEW:  'compliance.view',
  COMPLIANCE_EDIT:  'compliance.edit',

  // CRM
  CRM_VIEW:         'crm.view',
  CRM_EDIT:         'crm.edit',

  // Files
  FILES_VIEW:       'files.view',

  // Settings
  SETTINGS_VIEW:    'settings.view',
  SETTINGS_EDIT:    'settings.edit',

  // Admin
  ADMIN_USERS:      'admin.users',
  ADMIN_TENANT:     'admin.tenant',

  // Supervisor app
  SUPERVISOR_APP:   'supervisor.app',
}

// Default permissions per role — mirrors ROLE_DEFAULT_PERMISSIONS in shared/permissions.py
const ROLE_DEFAULT_PERMISSIONS = {
  admin:      Object.values(P).filter(p => p !== P.ADMIN_TENANT),
  manager: [
    P.DASHBOARD_VIEW,
    P.PROJECTS_VIEW, P.PROJECTS_EDIT, P.PROJECTS_DELETE,
    P.HR_VIEW, P.HR_MANAGE, P.HR_APPROVE_LEAVE,
    P.OPERATIONS_VIEW, P.OPERATIONS_EDIT,
    P.FINANCE_VIEW,
    P.CRM_VIEW, P.CRM_EDIT,
    P.COMPLIANCE_VIEW,
    P.FILES_VIEW,
    P.SETTINGS_VIEW,
  ],
  supervisor: [
    P.DASHBOARD_VIEW,
    P.SUPERVISOR_APP,
    P.PROJECTS_VIEW,
    P.HR_VIEW,
    P.FILES_VIEW,
  ],
  foreman: [
    P.SUPERVISOR_APP,
    P.PROJECTS_VIEW,
    P.HR_VIEW,
  ],
  staff: [
    P.DASHBOARD_VIEW,
    P.HR_VIEW,
    P.FILES_VIEW,
  ],
  viewer: [
    P.DASHBOARD_VIEW,
    P.PROJECTS_VIEW,
    P.HR_VIEW,
    P.FINANCE_VIEW,
    P.OPERATIONS_VIEW,
    P.COMPLIANCE_VIEW,
    P.CRM_VIEW,
    P.FILES_VIEW,
  ],
}

// ---------------------------------------------------------------------------
// can(perm) — check if the current user has a permission.
// Phase 4+: reads user.permissions from JWT/me response.
// Phase 1–3 fallback: derives from user.role using the default map above.
// ---------------------------------------------------------------------------
export function can(perm) {
  const user = getUser()
  if (!user) return false
  if (user.role === 'superadmin') return true
  // Phase 4+ path: permissions list from API
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(perm)
  }
  // Phase 1–3 fallback: derive from role
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] ?? []
  return defaults.includes(perm)
}

// Convenience: check if user has ANY of the given permissions
export function canAny(...perms) {
  return perms.some(p => can(p))
}
