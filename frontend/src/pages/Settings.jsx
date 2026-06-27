import { useEffect, useState } from 'react'
import { THEMES, useTheme } from '../context/ThemeContext'
import { getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import api from '../api/axios'

const MODES = [
  { key: 'light',  label: 'Light',  icon: '☀️' },
  { key: 'dark',   label: 'Dark',   icon: '🌙' },
  { key: 'vscode', label: 'VS Code', icon: '🟦' },
  { key: 'system', label: 'System', icon: '💻' },
]

export default function Settings() {
  const { theme, setTheme, darkMode, setDarkMode } = useTheme()
  const user = getUser()
  const isAdmin = can(P.SETTINGS_EDIT)

  const [pendingTheme, setPendingTheme] = useState(theme)
  const [pendingMode, setPendingMode]   = useState(darkMode)
  const [themeSaved, setThemeSaved]     = useState(false)

  const [pwForm, setPwForm]   = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwMsg, setPwMsg]     = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // Company settings
  const [tenant, setTenant]         = useState(null)
  const [tenantForm, setTenantForm] = useState({})
  const [tenantMsg, setTenantMsg]   = useState('')
  const [tenantErr, setTenantErr]   = useState('')
  const [tenantSaving, setTenantSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    api.get('/auth/tenants/').then(res => {
      const t = Array.isArray(res.data) ? res.data[0] : res.data.results?.[0]
      if (t) {
        setTenant(t)
        setTenantForm({
          name:           t.name           ?? '',
          phone:          t.phone          ?? '',
          email:          t.email          ?? '',
          address:        t.address        ?? '',
          gst_registered: t.gst_registered ?? false,
          gst_number:     t.gst_number     ?? '',
          project_prefix: t.project_prefix ?? 'SE',
        })
      }
    }).catch(() => {})
  }, [isAdmin])

  function handleSaveTheme() {
    setTheme(pendingTheme)
    setDarkMode(pendingMode)
    setThemeSaved(true)
    setTimeout(() => setThemeSaved(false), 2000)
  }

  const themeChanged = pendingTheme !== theme || pendingMode !== darkMode

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    setPwSaving(true)
    try {
      const res = await api.post('/auth/change-password/', pwForm)
      setPwMsg(res.data.message)
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSaveTenant(e) {
    e.preventDefault()
    setTenantErr('')
    setTenantMsg('')
    setTenantSaving(true)
    try {
      const prefix = (tenantForm.project_prefix || 'SE').toUpperCase().replace(/[^A-Z0-9]/g, '')
      await api.patch(`/auth/tenants/${tenant.id}/`, { ...tenantForm, project_prefix: prefix })
      setTenantForm(f => ({ ...f, project_prefix: prefix }))
      setTenantMsg('Company settings saved.')
    } catch (err) {
      setTenantErr(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.')
    } finally {
      setTenantSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      {/* Appearance */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Appearance</h2>

        <p className="text-sm text-gray-600 mb-3">Mode</p>
        <div className="flex gap-2 mb-6">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setPendingMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${
                pendingMode === m.key
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-4">Color Theme</p>
        <div className="flex gap-3 flex-wrap mb-5">
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => setPendingTheme(t.key)}
              title={t.label}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center transition"
                style={{
                  backgroundColor: t.color,
                  boxShadow: pendingTheme === t.key ? `0 0 0 3px #fff, 0 0 0 5px ${t.color}` : undefined,
                }}
              >
                {pendingTheme === t.key && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-700">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveTheme}
            disabled={!themeChanged}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Save
          </button>
          {themeSaved && <span className="text-sm text-green-600">✓ Theme saved</span>}
        </div>
      </div>

      {/* Company (admin only) */}
      {isAdmin && tenant && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Company</h2>
          <form onSubmit={handleSaveTenant} className="space-y-3">
            {[
              { key: 'name',    label: 'Company Name' },
              { key: 'phone',   label: 'Phone' },
              { key: 'email',   label: 'Email' },
              { key: 'address', label: 'Address' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
                <input
                  type="text"
                  value={tenantForm[key] ?? ''}
                  onChange={e => setTenantForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Project Number Prefix</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={tenantForm.project_prefix ?? ''}
                  onChange={e => setTenantForm(f => ({ ...f, project_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                  maxLength={10}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-400"
                  placeholder="SE"
                />
                <span className="text-sm text-gray-400">
                  → generates <span className="font-mono text-gray-600">{tenantForm.project_prefix || 'SE'}-26-001</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Letters and numbers only. Existing project numbers are not affected.</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tenantForm.gst_registered ?? false}
                  onChange={e => setTenantForm(f => ({ ...f, gst_registered: e.target.checked }))}
                  className="accent-primary-600 w-4 h-4"
                />
                GST Registered
              </label>
              {tenantForm.gst_registered && (
                <input
                  type="text"
                  value={tenantForm.gst_number ?? ''}
                  onChange={e => setTenantForm(f => ({ ...f, gst_number: e.target.value }))}
                  placeholder="GST Reg. No."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
              )}
            </div>

            {tenantErr && <p className="text-red-500 text-sm">{tenantErr}</p>}
            {tenantMsg && <p className="text-green-600 text-sm">✓ {tenantMsg}</p>}
            <button
              type="submit"
              disabled={tenantSaving}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              {tenantSaving ? 'Saving...' : 'Save Company Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Account */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Account</h2>
        <p className="text-sm text-gray-600 mb-4">Change Password</p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { key: 'current_password', label: 'Current Password' },
            { key: 'new_password',     label: 'New Password' },
            { key: 'confirm_password', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400"
              />
            </div>
          ))}
          {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
          {pwMsg   && <p className="text-green-600 text-sm">✓ {pwMsg}</p>}
          <button
            type="submit"
            disabled={pwSaving}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            {pwSaving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
