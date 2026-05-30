import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import api from '../api/axios'

const USER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const STATUS_COLORS = { todo: 'bg-gray-200 text-gray-700', in_progress: 'bg-blue-100 text-blue-700', review: 'bg-yellow-100 text-yellow-700', done: 'bg-green-100 text-green-700' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function Calendar() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [selectedEvent, setSelectedEvent] = useState(null) // { type: 'task'|'project', data }
  const [loading, setLoading] = useState(true)
  const calendarRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/projects/tasks/'),
      api.get('/projects/projects/'),
      api.get('/auth/users/'),
    ]).then(([taskRes, projectRes, userRes]) => {
      const allUsers = userRes.data.results || userRes.data
      setUsers(allUsers)
      setSelectedUsers(new Set(allUsers.map(u => u.id)))
      setTasks(taskRes.data.results || taskRes.data)
      setProjects(projectRes.data.results || projectRes.data)
      setLoading(false)
    })
  }, [])

  const userColorMap = {}
  users.forEach((u, i) => { userColorMap[u.id] = USER_COLORS[i % USER_COLORS.length] })

  // Tasks with due_date as single-day events
  const taskEvents = tasks
    .filter(t => t.due_date && (selectedUsers.has(t.assigned_to) || (!t.assigned_to && selectedUsers.size > 0)))
    .map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.due_date,
      backgroundColor: t.assigned_to ? userColorMap[t.assigned_to] : '#9ca3af',
      borderColor: 'transparent',
      extendedProps: { type: 'task', data: t },
    }))

  // Projects with start+end as multi-day bars
  const projectEvents = projects
    .filter(p => p.start_date && p.end_date)
    .map(p => ({
      id: `project-${p.id}`,
      title: `📁 ${p.name}`,
      start: p.start_date,
      end: p.end_date,
      backgroundColor: '#1e293b',
      borderColor: 'transparent',
      display: 'block',
      extendedProps: { type: 'project', data: p },
    }))

  const events = [...projectEvents, ...taskEvents]

  // Tasks without due_date grouped by status
  const unscheduled = tasks.filter(t => !t.due_date)
  const unscheduledByStatus = Object.keys(STATUS_LABELS).map(s => ({
    status: s,
    count: unscheduled.filter(t => t.status === s).length,
  })).filter(s => s.count > 0)

  function toggleUser(userId) {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  function handleEventClick(info) {
    setSelectedEvent({
      type: info.event.extendedProps.type,
      data: info.event.extendedProps.data,
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <p className="text-gray-400">Loading calendar...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <a href="/" className="text-gray-400 text-sm">← Back</a>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Company Calendar</h1>
      </div>

      {/* User filter */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        <button onClick={() => setSelectedUsers(new Set(users.map(u => u.id)))}
          className="shrink-0 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">All</button>
        <button onClick={() => setSelectedUsers(new Set())}
          className="shrink-0 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">None</button>
        {users.map(u => (
          <button key={u.id} onClick={() => toggleUser(u.id)}
            className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition"
            style={{
              backgroundColor: selectedUsers.has(u.id) ? userColorMap[u.id] : '#f3f4f6',
              borderColor: userColorMap[u.id],
              color: selectedUsers.has(u.id) ? '#fff' : '#6b7280',
            }}>
            {u.first_name} {u.last_name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="p-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,listMonth',
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
          />
        </div>
      </div>

      {/* Unscheduled tasks summary */}
      {unscheduledByStatus.length > 0 && (
        <div className="px-3 pb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Unscheduled Tasks ({unscheduled.length} total)
            </p>
            <div className="flex flex-wrap gap-2">
              {unscheduledByStatus.map(({ status, count }) => (
                <span key={status} className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedEvent(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 flex-1 pr-2">
                {selectedEvent.type === 'project' ? '📁 ' : ''}{selectedEvent.data.name || selectedEvent.data.title}
              </h2>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 text-xl leading-none">×</button>
            </div>

            {selectedEvent.type === 'project' ? (
              <div className="space-y-2 text-sm">
                {selectedEvent.data.client_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Client</span>
                    <span className="text-gray-700">{selectedEvent.data.client_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-gray-700 capitalize">{selectedEvent.data.status?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Start</span>
                  <span className="text-gray-700">{selectedEvent.data.start_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">End</span>
                  <span className="text-gray-700">{selectedEvent.data.end_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-gray-700">{selectedEvent.data.progress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {selectedEvent.data.description && (
                  <p className="text-gray-500 mb-2">{selectedEvent.data.description}</p>
                )}
                {selectedEvent.data.group && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Group</span>
                    <span className="text-gray-700">{selectedEvent.data.group}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-gray-700">{STATUS_LABELS[selectedEvent.data.status]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority</span>
                  <span className="text-gray-700">{PRIORITY_LABELS[selectedEvent.data.priority]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Due</span>
                  <span className="text-gray-700">{selectedEvent.data.due_date}</span>
                </div>
                {selectedEvent.data.assigned_to_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned to</span>
                    <span className="text-gray-700">{selectedEvent.data.assigned_to_name}</span>
                  </div>
                )}
                {selectedEvent.data.photo && (
                  <div className="pt-2">
                    <img src={selectedEvent.data.photo} alt="" className="w-full rounded-lg object-cover max-h-48" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}