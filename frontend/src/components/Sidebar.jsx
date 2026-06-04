import { useState } from 'react'
import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import { logout, getUser } from '../api/auth'
import api from '../api/axios'

// module key maps to what's stored in user.modules
const ALL_LINKS = [
  {
    module: 'dashboard', to: '/', label: 'Dashboard',
    children: [
      { module: 'orgchart', to: '/orgchart', label: 'Org Chart' },
    ],
  },
  {
    module: 'projects', to: '/projects', label: 'Projects',
    children: [
      { module: 'calendar', to: '/calendar', label: 'Project Calendar' },
    ],
  },
  {
    module: 'hr', to: '/hr', label: 'HR',
    children: [
      { module: 'schedules', to: '/schedules', label: 'Schedules' },
    ],
  },
  { module: 'operations', to: '/operations', label: 'Operations' },
  { module: 'finance',    to: '/finance',    label: 'Finance' },
  { module: 'compliance', to: '/compliance', label: 'Compliance' },
  { module: 'files',      to: '/files',      label: 'Files' },
]

function canSee(module, allowed, isAdminPlus) {
  // Admins and superadmins always see everything
  if (isAdminPlus) return true
  // Empty modules list = no restrictions (backwards compatible)
  if (!allowed || allowed.length === 0) return true
  return allowed.includes(module)
}

function NavItem({ link, allowed, isAdminPlus }) {
  const isParentActive = useMatch({ path: link.to, end: link.to === '/' })
  const visibleChildren = link.children?.filter(c => canSee(c.module, allowed, isAdminPlus))
  const isChildActive = visibleChildren?.some(c => window.location.pathname === c.to)

  return (
    <>
      <NavLink
        to={link.to}
        end={link.to === '/'}
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-sm font-medium transition ${
            isActive || isChildActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`
        }
      >
        {link.label}
      </NavLink>

      {visibleChildren?.length > 0 && (isParentActive || isChildActive) && (
        <div className="ml-3 border-l border-gray-700 pl-2 space-y-0.5 mt-0.5">
          {visibleChildren.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'text-white bg-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  )
}

export default function Sidebar({ onCollapse }) {
  const navigate = useNavigate()
  const user = getUser()
  const allowed = user.modules || []
  const isAdminPlus = ['admin', 'superadmin'].includes(user.role)
  const visibleLinks = ALL_LINKS.filter(link => canSee(link.module, allowed, isAdminPlus))

  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function handleChangePassword() {
    setPwError('')
    setPwMsg('')
    setPwSaving(true)
    try {
      const res = await api.post('/auth/change-password/', pwForm)
      setPwMsg(res.data.message)
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => { setShowPwModal(false); setPwMsg('') }, 1500)
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <button onClick={onCollapse} className="text-white font-bold text-lg hover:text-gray-300 transition">1OS</button>
        <p className="text-gray-400 text-xs mt-0.5">{user.tenant_name || '—'}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleLinks.map(link => (
          <NavItem key={link.to} link={link} allowed={allowed} isAdminPlus={isAdminPlus} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm text-white font-medium truncate">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-400 truncate">{user.role}</p>
        </div>
        <button
          onClick={() => { setShowPwModal(true); setPwError(''); setPwMsg('') }}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          Change Password
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-5">Change Password</h2>
            <div className="space-y-3">
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}
              {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
              {pwMsg   && <p className="text-green-600 text-sm">✓ {pwMsg}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowPwModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleChangePassword} disabled={pwSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg text-sm transition">
                {pwSaving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}