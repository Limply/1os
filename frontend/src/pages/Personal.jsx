import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CalendarDays, ClipboardList, X, ArrowRight } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import CalendarView from '../components/CalendarView'

const TASK_STATUS_STYLE = {
  todo:        { dot: 'bg-gray-400',    label: 'To Do',      color: '#9ca3af' },
  in_progress: { dot: 'bg-blue-500',   label: 'In Progress', color: '#3b82f6' },
  review:      { dot: 'bg-yellow-500', label: 'Review',      color: '#f59e0b' },
  done:        { dot: 'bg-green-500',  label: 'Done',        color: '#10b981' },
}

const LEAVE_STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'calendar',  label: 'Calendar' },
]

export default function Personal() {
  const user     = getUser()
  const navigate = useNavigate()

  const [me, setMe]       = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState('overview')
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/hr/employees/me/'),
      api.get(`/projects/tasks/?assigned_to=${user.id}`),
    ]).then(([meRes, tasksRes]) => {
      setMe(meRes.data)
      const taskData = tasksRes.data
      setTasks(Array.isArray(taskData) ? taskData : (taskData.results ?? []))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks   = tasks.filter(t => t.status === 'done').length

  const today = new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>

  const emp        = me?.employee
  const balances   = me?.leave_balances ?? []
  const leaves     = me?.leave_applications ?? []
  const attendance = me?.today_attendance

  // Calendar events — only this user's tasks with a due date
  const calendarEvents = tasks
    .filter(t => t.due_date)
    .map(t => {
      const s = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.todo
      return {
        id: `task-${t.id}`,
        title: t.title,
        date: t.due_date,
        backgroundColor: s.color,
        borderColor: 'transparent',
        extendedProps: { data: t },
      }
    })

  function handleEventClick(info) {
    setSelectedEvent(info.event.extendedProps.data)
  }

  return (
    <div className="max-w-3xl space-y-4">

      {/* Welcome header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hi, {user.first_name || user.email}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/clock-in')}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              <Clock className="w-4 h-4" /> Clock In / Out
            </button>
            <button
              onClick={() => navigate('/hr')}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 transition"
            >
              <CalendarDays className="w-4 h-4" /> Apply Leave
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 transition"
            >
              <ClipboardList className="w-4 h-4" /> Projects
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Today attendance */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Attendance</h2>
              {attendance ? (
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clock In</span>
                    <span className="font-medium">{attendance.clock_in ? new Date(attendance.clock_in).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clock Out</span>
                    <span className="font-medium">{attendance.clock_out ? new Date(attendance.clock_out).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  {attendance.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-right max-w-[160px] truncate">{attendance.location}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-gray-400 text-sm">Not clocked in today</p>
                  <button onClick={() => navigate('/clock-in')}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-medium">
                    Go to Clock In <ArrowRight className="w-3 h-3 inline" />
                  </button>
                </div>
              )}
            </div>

            {/* Leave balances */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leave Balance</h2>
              {balances.length === 0 ? (
                <p className="text-sm text-gray-400">No leave balances set up.</p>
              ) : (
                <div className="space-y-2">
                  {balances.map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{b.leave_type_name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (b.remaining / b.entitled) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {b.remaining} / {b.entitled}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* My tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Tasks</h2>
              <span className="text-xs text-gray-400">{activeTasks.length} active · {doneTasks} done</span>
            </div>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No active tasks assigned to you.</p>
            ) : (
              <div className="space-y-2">
                {activeTasks.map(t => {
                  const s = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.todo
                  return (
                    <div key={t.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/projects?project=${t.project}#task-${t.id}`)}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.label}
                          {t.due_date && <span className="ml-2">· Due {t.due_date}</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent leave applications */}
          {leaves.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Leave Applications</h2>
              <div className="space-y-2">
                {leaves.map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{l.leave_type_name}</span>
                      <span className="text-gray-400 ml-2">{l.start_date} → {l.end_date}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_STATUS_STYLE[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee info */}
          {emp && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My Profile</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {[
                  ['Employee No.', emp.emp_no],
                  ['Department',   emp.department_name],
                  ['Position',     emp.position_name],
                  ['Employment',   emp.employment_type],
                  ['Phone',        emp.phone],
                  ['Email',        emp.email],
                ].map(([label, val]) => val ? (
                  <div key={label} className="flex justify-between col-span-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium text-right">{val}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'calendar' && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(TASK_STATUS_STYLE).map(([key, s]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            ))}
          </div>

          <CalendarView events={calendarEvents} onEventClick={handleEventClick} />

          {calendarEvents.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No tasks with due dates assigned to you.</p>
          )}
        </div>
      )}

      {/* Task detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 flex-1 pr-2">{selectedEvent.title}</h2>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 text-xl leading-none ml-2">×</button>
            </div>
            <div className="space-y-2 text-sm">
              {selectedEvent.description && <p className="text-gray-500">{selectedEvent.description}</p>}
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-700">{TASK_STATUS_STYLE[selectedEvent.status]?.label ?? selectedEvent.status}</span>
              </div>
              {selectedEvent.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Due</span>
                  <span className="text-gray-700">{selectedEvent.due_date}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelectedEvent(null); navigate(`/projects?project=${selectedEvent.project}#task-${selectedEvent.id}`) }}
              className="mt-4 w-full bg-primary-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-primary-700 transition"
            >
              Open in Projects <ArrowRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
