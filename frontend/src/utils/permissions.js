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

// ---------------------------------------------------------------------------
// can(perm) — check if the current user has a permission.
// Permissions are resolved server-side from Position.permissions and sent in
// the login response as user.permissions. Superadmin bypasses all checks.
// ---------------------------------------------------------------------------
export function can(perm) {
  const user = getUser()
  if (!user) return false
  if (user.role === 'superadmin') return true
  return Array.isArray(user.permissions) && user.permissions.includes(perm)
}

// Convenience: check if user has ANY of the given permissions
export function canAny(...perms) {
  return perms.some(p => can(p))
}
