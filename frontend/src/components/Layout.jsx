import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { isLoggedIn } from '../api/auth'

export default function Layout() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
