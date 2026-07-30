import { NavLink, useNavigate, useMatch, useLocation } from 'react-router-dom'
import { logout, getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import { useTenantInfo, isModulePaid } from '../utils/tenant'

const ALL_LINKS = [
  {
    module: 'dashboard', to: '/', label: 'Dashboard',
    children: [
      { module: 'orgchart', to: '/orgchart', label: 'Org Chart' },
      { module: 'dashboard', to: '/strategy', label: 'Business Strategy' },
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
      { module: 'finance', to: '/finance/payments', label: 'Payments' },
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

// Shown when the tenant hasn't paid for a module: greyed, non-clickable, with a
// lock + "Coming soon" badge. Tenant-wide — shows for admins too.
function LockedNavItem({ label }) {
  return (
    <div
      title="Not included in your current plan"
      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed select-none"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1 text-[10px] text-gray-500">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a2.25 2.25 0 0 1 2.25 2.25v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z" />
        </svg>
        Coming soon
      </span>
    </div>
  )
}

function NavItem({ link, allowed, isAdminPlus }) {
  const location = useLocation()
  const isParentActive = useMatch({ path: link.to.split('?')[0], end: link.to === '/' })
  const visibleChildren = link.children?.filter(c => canSee(c.module, allowed, isAdminPlus))

  // A child is active only on an exact pathname match AND when every query param
  // in its `to` matches the current URL — so tab-based links (e.g.
  // /finance?tab=Service Reports) don't stay lit on sibling routes.
  const childActive = (c) => {
    const [path, query] = c.to.split('?')
    if (location.pathname !== path) return false
    if (!query) return true
    const want = new URLSearchParams(query)
    const have = new URLSearchParams(location.search)
    for (const [k, v] of want) if (have.get(k) !== v) return false
    return true
  }
  const isChildActive = visibleChildren?.some(childActive)

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
              className={
                `block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  childActive(child)
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
  const isAdminPlus = can(P.ADMIN_USERS)
  const { info } = useTenantInfo()
  const tenantModules = info.modules
  const logoUrl = info.logo ? `/media/${info.logo}?v=2` : null

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
        {ALL_LINKS.map(link => {
          // Tenant didn't pay → locked "Coming soon" (overrides per-user access).
          if (!isModulePaid(link.module, tenantModules)) {
            return <LockedNavItem key={link.to} label={link.label} />
          }
          // Paid, but this user has no access → hide.
          if (!canSee(link.module, allowed, isAdminPlus)) return null
          return <NavItem key={link.to} link={link} allowed={allowed} isAdminPlus={isAdminPlus} />
        })}
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
