import { useState } from 'react';

/**
 * ManpowerSettings - Manage visibility and feature toggles
 * Decoupled: accepts settings + updateSettings as props
 */
export default function ManpowerSettings({ settings, updateSettings }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleToggle(field) {
    if (!settings || saving) return;
    setSaving(true);
    try {
      await updateSettings({ [field]: !settings[field] });
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Failed to save settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  const roleToggles = [
    { label: 'Admin',       field: 'show_admin',      hint: 'Admin, Director' },
    { label: 'Manager',     field: 'show_manager',    hint: 'Manager, Business Development, Advisor' },
    { label: 'Supervisor',  field: 'show_supervisor', hint: 'Senior Supervisor, Foremen, Supervisor' },
    { label: 'Worker',      field: 'show_worker',     hint: 'Construction Worker, Engineer, Helper' },
  ];

  const featureToggles = [
    { label: 'On-Site Indicator (green glow)', field: 'show_on_site_indicator' },
    { label: 'Leave Status', field: 'show_leave_status' },
    { label: 'Unassigned Staff', field: 'show_unassigned' },
    { label: 'Staff Grouped by Supervisor', field: 'show_teams' },
  ];

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.includes('saved')
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Staff Roles to Display</h2>
        <p className="text-xs text-gray-500 mb-4">Select which staff roles appear on the calendar</p>
        <div className="space-y-3">
          {roleToggles.map(toggle => (
            <label key={toggle.field} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[toggle.field]}
                onChange={() => handleToggle(toggle.field)}
                disabled={saving}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600"
              />
              <div>
                <span className="text-sm text-gray-700">{toggle.label}</span>
                {toggle.hint && <p className="text-xs text-gray-400">{toggle.hint}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Features</h2>
        <p className="text-xs text-gray-500 mb-4">Toggle additional display features on the calendar</p>
        <div className="space-y-3">
          {featureToggles.map(toggle => (
            <label key={toggle.field} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[toggle.field]}
                onChange={() => handleToggle(toggle.field)}
                disabled={saving}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
        <p className="text-xs text-primary-800">
          <strong>Note:</strong> Changes are saved automatically. The calendar will refresh with your new preferences.
        </p>
      </div>
    </div>
  );
}

