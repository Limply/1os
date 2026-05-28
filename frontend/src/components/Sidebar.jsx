import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'

const links = [
  { to: '/',           label: 'Dashboard' },
  { to: '/projects',   label: 'Projects' },
  { to: '/hr',         label: 'HR' },
  { to: '/operations', label: 'Operations' },
  { to: '/finance',    label: 'Finance' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/files',      label: 'Files' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-white font-bold text-lg">1OS</span>
        <p className="text-gray-400 text-xs mt-0.5">Simply Engineering</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
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
