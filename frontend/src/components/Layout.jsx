import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import { isLoggedIn, getUser } from '../api/auth'

// Maps URL path → module key (dashboard '/' is always accessible — no entry)
const ROUTE_MODULE = {
  '/orgchart':   'orgchart',
  '/projects':   'projects',
  '/crm':        'crm',
  '/calendar':   'calendar',
  '/hr':         'hr',
  '/schedules':  'schedules',
  '/operations': 'operations',
  '/finance':    'finance',
  '/compliance': 'compliance',
  '/files':      'files',
}

export default function Layout() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />

  const [open, setOpen] = useState(true)
  const location = useLocation()
  const user = getUser()
  const allowed = user.modules || []
  const isAdminPlus = ['admin', 'superadmin'].includes(user.role)

  // Block direct URL access for restricted users
  if (!isAdminPlus && allowed.length > 0) {
    const requiredModule = ROUTE_MODULE[location.pathname]
    if (requiredModule && !allowed.includes(requiredModule)) {
      return <Navigate to="/" replace />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {open && <Sidebar onCollapse={() => setOpen(false)} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-3 left-3 z-50 bg-gray-900 text-white font-bold text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700 transition shadow"
        >
          1OS
        </button>
      )}
      <div className="fixed top-3 right-4 z-50">
        <NotificationBell />
      </div>
      <main className="flex-1 p-6 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}