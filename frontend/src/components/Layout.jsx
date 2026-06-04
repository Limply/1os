import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { isLoggedIn, getUser } from '../api/auth'

// Maps URL path → module key
const ROUTE_MODULE = {
  '/':           'dashboard',
  '/orgchart':   'orgchart',
  '/projects':   'projects',
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
      <div className="flex flex-col flex-1 min-w-0">
        {!open && (
          <div className="bg-gray-900 px-4 py-3">
            <button
              onClick={() => setOpen(true)}
              className="text-white font-bold text-lg tracking-wide"
            >
              1OS
            </button>
          </div>
        )}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}