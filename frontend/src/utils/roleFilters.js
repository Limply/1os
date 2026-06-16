const POSITION_TO_LEVEL = {
  'it developer':                    'superadmin',
  'director':                        'admin',
  'admin':                           'admin',
  'manager':                         'manager',
  'business development':            'manager',
  'advisor':                         'manager',
  'senior supervisor':               'supervisor',
  'foremen':                         'supervisor',
  'supervisor':                      'supervisor',
  'construction worker cum driver':  'worker',
  'construction worker':             'worker',
  'engineer':                        'worker',
  'project engineer':                'worker',
  'helper':                          'worker',
};

export function getEmployeeLevel(positionName) {
  if (!positionName) return 'worker';
  const normalized = positionName.toLowerCase();
  for (const [key, level] of Object.entries(POSITION_TO_LEVEL)) {
    if (normalized.includes(key)) return level;
  }
  return 'worker';
}

export function shouldShowEmployee(employee, settings) {
  if (!settings) return true;
  const level = getEmployeeLevel(employee.position_name);
  const map = {
    superadmin: settings.show_superadmin,
    admin:      settings.show_admin,
    manager:    settings.show_manager,
    supervisor: settings.show_supervisor,
    worker:     settings.show_worker,
  };
  return map[level] ?? true;
}

export function getDefaultSettings() {
  return {
    show_superadmin:        false,
    show_admin:             true,
    show_manager:           true,
    show_supervisor:        true,
    show_worker:            true,
    show_on_site_indicator: true,
    show_leave_status:      true,
    show_unassigned:        true,
    show_teams:             true,
  };
}
