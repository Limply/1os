import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import { logout, getUser } from '../api/auth'

const links = [
  {
    to: '/', label: 'Dashboard',
    children: [
      { to: '/orgchart', label: 'Org Chart' },
    ],
  },
  {
    to: '/projects',   label: 'Projects',
    children: [
      { to: '/calendar', label: 'Project Calendar' },
    ],
  },
  { to: '/hr',         label: 'HR' },
  { to: '/operations', label: 'Operations' },
  { to: '/finance',    label: 'Finance' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/files',      label: 'Files' },
]

function NavItem({ link }) {
  const isParentActive = useMatch({ path: link.to, end: link.to === '/' })
  const isChildActive = link.children?.some(c => window.location.pathname === c.to)

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

      {link.children && (isParentActive || isChildActive) && (
        <div className="ml-3 border-l border-gray-700 pl-2 space-y-0.5 mt-0.5">
          {link.children.map(child => (
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <button onClick={onCollapse} className="text-white font-bold text-lg hover:text-gray-300 transition">1OS</button>
        <p className="text-gray-400 text-xs mt-0.5">{user.tenant_name || '—'}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavItem key={link.to} link={link} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm text-white font-medium truncate">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-400 truncate">{user.role}</p>
        </div>
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