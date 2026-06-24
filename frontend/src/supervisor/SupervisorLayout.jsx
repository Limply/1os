import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { isLoggedIn, getUser, logout } from '../api/auth'

const NAV = [
  {
    to: '/supervisor',
    end: true,
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    to: '/supervisor/tasks',
    label: 'Tasks',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    to: '/supervisor/team',
    label: 'Team',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/supervisor/clock-in',
    label: 'Clock In',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    to: '/supervisor/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function SupervisorLayout() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />

  const navigate = useNavigate()
  const user = getUser()
  const displayName = user.first_name || user.email || ''

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", background: '#0D1720', height: '100svh' }}
      className="flex justify-center">
      <div className="flex flex-col w-full" style={{ maxWidth: 480, height: '100svh', overflow: 'hidden' }}>

      {/* App header */}
      <header style={{ background: '#212D3E', borderBottom: '1px solid #2F4060' }}
        className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="Astronic" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 23, color: '#fff', letterSpacing: '0.05em', lineHeight: 1 }}>
              Astronic
            </div>
            <div style={{ fontSize: 10, color: '#F5C518', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', marginTop: 1 }}>
              Site Supervisor
            </div>
          </div>
        </div>

        {/* Name + Bell */}
        <div className="flex items-center gap-3">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#7A90AA', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Hi,</div>
            <div style={{ fontSize: 13, color: '#EEF2F7', fontWeight: 700, lineHeight: 1.2 }}>{displayName}</div>
          </div>
          <button onClick={handleLogout}
            style={{ background: '#273447', border: '1px solid #2F4060', borderRadius: '50%', width: 38, height: 38 }}
            className="flex items-center justify-center flex-shrink-0"
            title="Log out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav style={{ background: '#212D3E', borderTop: '1px solid #2F4060' }}
        className="flex flex-shrink-0 pb-safe">
        {NAV.map(({ to, end, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1 py-2.5 cursor-pointer"
                style={{ opacity: isActive ? 1 : 0.4 }}>
                <span style={{ color: isActive ? '#F5C518' : '#7A90AA' }}>{icon}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? '#F5C518' : '#7A90AA', letterSpacing: '0.04em' }}>
                  {label}
                </span>
                {isActive && (
                  <span style={{ width: 4, height: 4, background: '#F5C518', borderRadius: '50%', marginTop: -2 }} />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
      </div>
    </div>
  )
}
