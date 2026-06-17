import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ClipboardList, Phone, CalendarDays } from 'lucide-react'
import api from '../api/axios'

const TRIGGER_LINK = {
  task_due_soon:         '/projects',
  lead_followup_overdue: '/crm',
  leave_pending:         '/hr',
}

function TriggerIcon({ trigger }) {
  const cls = 'w-4 h-4 shrink-0 mt-0.5'
  if (trigger === 'task_due_soon')         return <ClipboardList  className={`${cls} text-primary-500`} />
  if (trigger === 'lead_followup_overdue') return <Phone          className={`${cls} text-green-500`} />
  if (trigger === 'leave_pending')         return <CalendarDays   className={`${cls} text-yellow-500`} />
  return <Bell className={`${cls} text-gray-400`} />
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const unread = notifications.filter(n => !n.is_read).length

  async function fetchAndGenerate() {
    try {
      await api.post('/notify/generate/')
      const res = await api.get('/notify/?unread=1')
      const data = res.data
      setNotifications(Array.isArray(data) ? data : (data.results ?? []))
    } catch {
      // silently ignore if backend unavailable
    }
  }

  useEffect(() => {
    fetchAndGenerate()
    const interval = setInterval(fetchAndGenerate, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleClick(notif) {
    if (!notif.is_read) {
      await api.post(`/notify/${notif.id}/read/`)
      setNotifications(prev => prev.filter(n => n.id !== notif.id))
    }
    setOpen(false)
    const link = TRIGGER_LINK[notif.trigger] ?? '/'
    navigate(link)
  }

  async function handleMarkAllRead() {
    await api.post('/notify/read-all/')
    setNotifications([])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        title="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">All caught up!</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
                >
                  <TriggerIcon trigger={n.trigger} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
