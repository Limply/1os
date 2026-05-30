import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { isLoggedIn } from '../api/auth'

export default function Layout() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  const [open, setOpen] = useState(true)

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