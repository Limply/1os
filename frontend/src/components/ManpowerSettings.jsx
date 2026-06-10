import { useState } from 'react';
import { useManpowerSettings } from '../hooks/useManpowerSettings';

/**
 * ManpowerSettings - Manage visibility and feature toggles
 * Decoupled: Uses hook for data management, no internal fetching
 */
export default function ManpowerSettings() {
  const { settings, loading, error, updateSettings } = useManpowerSettings();
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

  if (loading) {
    return <div className="p-4 text-gray-500">Loading settings...</div>;
  }

  if (error && !settings) {
    return <div className="p-4 text-red-500">Failed to load settings</div>;
  }

  const roleToggles = [
    { label: 'Directors', field: 'show_directors' },
    { label: 'Managers', field: 'show_managers' },
    { label: 'Senior Supervisors', field: 'show_senior_supervisors' },
    { label: 'Supervisors', field: 'show_supervisors' },
    { label: 'Technicians', field: 'show_technicians' },
    { label: 'Helpers', field: 'show_helpers' },
    { label: 'Workers', field: 'show_workers' },
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
            <label key={toggle.field} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[toggle.field]}
                onChange={() => handleToggle(toggle.field)}
                disabled={saving}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">{toggle.label}</span>
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
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Changes are saved automatically. The calendar will refresh with your new preferences.
        </p>
      </div>
    </div>
  );
}

