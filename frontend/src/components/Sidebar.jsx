import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import { logout, getUser } from '../api/auth'

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
      { module: 'hr', to: '/clock-in', label: 'Clock In' },
    ],
  },
  { module: 'crm',        to: '/crm',        label: 'CRM' },
  {
    module: 'operations', to: '/operations', label: 'Operations',
    children: [
      { module: 'operations', to: '/operations', label: 'Service Reports' },
    ],
  },
  {
    module: 'finance', to: '/finance', label: 'Finance',
    children: [
      { module: 'finance', to: '/finance?tab=Service Reports', label: 'Service Reports' },
      { module: 'finance', to: '/finance/pl', label: 'P&L' },
    ],
  },
  { module: 'compliance', to: '/compliance', label: 'Compliance' },
  { module: 'files',      to: '/files',      label: 'Files' },
  { module: 'dashboard',  to: '/my',         label: 'My Tools' },
]

function canSee(module, allowed, isAdminPlus) {
  if (isAdminPlus) return true
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
              ? 'bg-primary-600 text-white'
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
                    ? 'text-white bg-primary-500'
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
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    fetch('/api/auth/tenant-info/')
      .then(r => r.json())
      .then(data => { if (data.logo) setLogoUrl(`/media/${data.logo}`) })
      .catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 h-screen sticky top-0 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          {logoUrl && (
            <img src={logoUrl} alt="logo" className="h-7 w-7 object-contain rounded" />
          )}
          <button onClick={onCollapse} className="text-white font-bold text-lg hover:text-gray-300 transition">1OS</button>
        </div>
        <p className="text-gray-400 text-xs mt-0.5">{user.tenant_name || '—'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleLinks.map(link => (
          <NavItem key={link.to} link={link} allowed={allowed} isAdminPlus={isAdminPlus} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700 shrink-0">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm text-white font-medium truncate">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-400 truncate">{user.role}</p>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `block w-full text-left px-3 py-2 text-sm rounded-lg transition ${
              isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`
          }
        >
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
