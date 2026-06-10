/**
 * Map position names to role types for visibility filtering
 */
const POSITION_TO_ROLE = {
  'director': 'director',
  'manager': 'manager',
  'senior supervisor': 'senior_supervisor',
  'foremen': 'senior_supervisor',
  'supervisor': 'supervisor',
  'technician': 'technician',
  'construction worker': 'technician',
  'engineer': 'technician',
  'project engineer': 'technician',
  'helper': 'helper',
  'driver': 'helper',
  'admin': 'staff',
  'business development': 'staff',
  'advisor': 'staff',
};

/**
 * Determine role from position name
 */
export function getEmployeeRole(positionName) {
  if (!positionName) return 'staff';
  const normalized = positionName.toLowerCase();
  for (const [position, role] of Object.entries(POSITION_TO_ROLE)) {
    if (normalized.includes(position)) {
      return role;
    }
  }
  return 'staff';
}

/**
 * Check if employee should be visible based on settings
 */
export function shouldShowEmployee(employee, settings) {
  if (!settings) return true;

  const role = getEmployeeRole(employee.position_name);
  const visibilityMap = {
    director: settings.show_directors,
    manager: settings.show_managers,
    senior_supervisor: settings.show_senior_supervisors,
    supervisor: settings.show_supervisors,
    technician: settings.show_technicians,
    helper: settings.show_helpers,
    staff: settings.show_staff,
  };

  return visibilityMap[role] ?? settings.show_staff;
}

/**
 * Get default settings
 */
export function getDefaultSettings() {
  return {
    show_directors: false,
    show_managers: false,
    show_senior_supervisors: true,
    show_supervisors: true,
    show_technicians: true,
    show_helpers: true,
    show_staff: true,
    show_on_site_indicator: true,
    show_leave_status: true,
    show_unassigned: true,
    show_teams: true,
  };
}
