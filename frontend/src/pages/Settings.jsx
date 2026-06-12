import { useState } from 'react'
import { THEMES, useTheme } from '../context/ThemeContext'
import api from '../api/axios'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [pendingTheme, setPendingTheme] = useState(theme)
  const [themeSaved, setThemeSaved] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  function handleSaveTheme() {
    setTheme(pendingTheme)
    setThemeSaved(true)
    setTimeout(() => setThemeSaved(false), 2000)
  }

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

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* Appearance */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Appearance</h2>
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
            disabled={pendingTheme === theme}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Save
          </button>
          {themeSaved && <span className="text-sm text-green-600">✓ Theme saved</span>}
        </div>
      </div>

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
