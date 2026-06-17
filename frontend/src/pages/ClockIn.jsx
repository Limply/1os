import { useEffect, useState } from 'react'
import { getUser } from '../api/auth'
import ClockInWidget from '../components/ClockInWidget'

export default function ClockIn() {
  const user = getUser()
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex flex-col">
      {/* Header */}
      <div className="bg-primary-950 text-white px-6 py-5 text-center">
        <h1 className="text-2xl font-bold">Clock In / Out</h1>
        <p className="text-primary-200 text-sm mt-1">{user?.first_name} {user?.last_name}</p>
        <p className="text-3xl font-mono font-bold mt-2">{time.toLocaleTimeString()}</p>
        <p className="text-primary-300 text-xs">{time.toLocaleDateString()}</p>
      </div>

      {/* Widget */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <ClockInWidget />
      </div>
    </div>
  )
}
