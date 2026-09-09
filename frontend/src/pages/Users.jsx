import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import { USER_MODULES } from '../utils/tenant'

const ROLES = [
  { key: 'staff',      label: 'Staff',      hint: 'Access follows their position level; falls back to Dashboard + HR view.' },
  { key: 'admin',      label: 'Admin',      hint: 'Full access to every module except company/tenant settings.' },
  { key: 'superadmin', label: 'Super Admin', hint: 'Everything, including company settings and module entitlements.' },
]

const ROLE_BADGE = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin:      'bg-blue-100 text-blue-700',
  staff:      'bg-gray-100 text-gray-600',
}

// DRF errors arrive as {field: [msg]}, {detail: msg} or a bare string.
function apiError(err, fallback = 'Something went wrong') {
  const d = err?.response?.data
  if (!d) return fallback
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  const first = Object.entries(d)[0]
  if (!first) return fallback
  const [field, msgs] = first
  const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
  return field === 'non_field_errors' ? text : `${field}: ${text}`
}

export default function Users() {
  const me = getUser()
  const allowed = can(P.ADMIN_USERS)
  const isSuperAdmin = me?.role === 'superadmin'

  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  const [editing, setEditing]   = useState(null)   // user object, or 'new'
  const [pwTarget, setPwTarget] = useState(null)   // user we're setting a password for
  const [rowErr, setRowErr]     = useState({})     // { [userId]: message }

  useEffect(() => {
    if (allowed) fetchUsers()
  }, [allowed])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/auth/users/')
      setUsers(Array.isArray(res.data) ? res.data : res.data?.results || [])
      setLoadErr('')
    } catch (err) {
      setLoadErr(apiError(err, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(user) {
    setRowErr(e => ({ ...e, [user.id]: '' }))
    try {
      await api.patch(`/auth/users/${user.id}/`, { is_active: !user.is_active })
      fetchUsers()
    } catch (err) {
      setRowErr(e => ({ ...e, [user.id]: apiError(err, 'Failed to update user') }))
    }
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">You don’t have permission to manage users.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/settings" className="text-xs text-gray-400 hover:text-gray-600">← Settings</Link>
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {users.length} account{users.length === 1 ? '' : 's'} · who can sign in and what they can see
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          Add User
        </button>
      </div>

      {loadErr && <p className="text-red-500 text-sm">{loadErr}</p>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-left font-semibold px-4 py-3">Position</th>
                <th className="text-left font-semibold px-4 py-3">Modules</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No users yet</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={u.is_active ? '' : 'bg-gray-50/60'}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.first_name} {u.last_name}
                    {u.id === me?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_BADGE[u.role] || ROLE_BADGE.staff}`}>
                      {ROLES.find(r => r.key === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.position_title || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.role === 'staff'
                      ? `${(u.modules || []).length} of ${USER_MODULES.length}`
                      : <span className="text-gray-400">All</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {rowErr[u.id] && <p className="text-red-500 text-xs mt-1">{rowErr[u.id]}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <button onClick={() => setEditing(u)} className="text-primary-600 hover:underline text-xs font-medium">Edit</button>
                      <button onClick={() => setPwTarget(u)} className="text-gray-500 hover:underline text-xs font-medium">Password</button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs font-medium hover:underline ${u.is_active ? 'text-red-500' : 'text-green-600'}`}
                        >
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Staff permissions come from their linked employee’s position level. A staff user with no
        employee record falls back to Dashboard + HR view only, whatever their module ticks say.
      </p>

      {editing && (
        <Modal title={editing === 'new' ? 'Add User' : 'Edit User'} onClose={() => setEditing(null)}>
          <UserForm
            user={editing === 'new' ? null : editing}
            isSuperAdmin={isSuperAdmin}
            isSelf={editing !== 'new' && editing.id === me?.id}
            onDone={() => { setEditing(null); fetchUsers() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {pwTarget && (
        <Modal title={`Set Password — ${pwTarget.first_name} ${pwTarget.last_name}`} onClose={() => setPwTarget(null)}>
          <PasswordForm
            user={pwTarget}
            onDone={() => setPwTarget(null)}
            onCancel={() => setPwTarget(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function UserForm({ user, isSuperAdmin, isSelf, onDone, onCancel }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    role:       user?.role       || 'staff',
    password:   '',
  })
  const [modules, setModules] = useState(user?.modules || [])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const roleOptions = ROLES.filter(r => r.key !== 'superadmin' || isSuperAdmin)
  const roleHint = ROLES.find(r => r.key === form.role)?.hint

  function toggleModule(key) {
    setModules(m => m.includes(key) ? m.filter(k => k !== key) : [...m, key])
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (user) {
        await api.patch(`/auth/users/${user.id}/`, { ...form, password: undefined, modules })
      } else {
        await api.post('/auth/users/', { ...form, modules })
      }
      onDone()
    } catch (err) {
      setError(apiError(err, 'Failed to save user'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">First Name *</label>
          <input required value={form.first_name} onChange={f('first_name')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Last Name</label>
          <input value={form.last_name} onChange={f('last_name')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Email *</label>
          <input required type="email" value={form.email} onChange={f('email')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {!user && (
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Password *</label>
            <input required type="password" value={form.password} onChange={f('password')}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters. The user can change it later under Settings.</p>
          </div>
        )}
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
          <select value={form.role} onChange={f('role')} disabled={isSelf}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400">
            {roleOptions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{isSelf ? 'You cannot change your own role.' : roleHint}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase">Module Access</label>
        <p className="text-xs text-gray-400 mb-2">
          Which modules appear in this user’s sidebar. Admins and super admins see everything regardless.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border border-gray-100 rounded-lg p-3">
          {USER_MODULES.map(m => (
            <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={modules.includes(m.key)} onChange={() => toggleModule(m.key)}
                className="accent-primary-600 w-4 h-4" />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition">
          {saving ? 'Saving…' : user ? 'Save Changes' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </form>
  )
}

function PasswordForm({ user, onDone, onCancel }) {
  const [pw, setPw]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function submit(e) {
    e.preventDefault()
    if (pw !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/auth/users/${user.id}/set-password/`, { new_password: pw })
      onDone()
    } catch (err) {
      setError(apiError(err, 'Failed to set password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-gray-500">
        Sets a new password immediately. Tell {user.first_name} to change it after signing in.
      </p>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase">New Password</label>
        <input required type="password" value={pw} onChange={e => setPw(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase">Confirm Password</label>
        <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition">
          {saving ? 'Saving…' : 'Set Password'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </form>
  )
}
