import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import api from '../api/axios'

const USER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function Calendar() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const calendarRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/projects/tasks/'),
      api.get('/auth/users/'),
    ]).then(([taskRes, userRes]) => {
      const allUsers = userRes.data.results || userRes.data
      const allTasks = taskRes.data.results || taskRes.data
      setUsers(allUsers)
      setSelectedUsers(new Set(allUsers.map(u => u.id)))
      setTasks(allTasks)
      setLoading(false)
    })
  }, [])

  const userColorMap = {}
  users.forEach((u, i) => {
    userColorMap[u.id] = USER_COLORS[i % USER_COLORS.length]
  })

  const events = tasks
    .filter(t => t.due_date && (selectedUsers.has(t.assigned_to) || (!t.assigned_to && selectedUsers.size > 0)))
    .map(t => ({
      id: t.id,
      title: t.title,
      date: t.due_date,
      backgroundColor: t.assigned_to ? userColorMap[t.assigned_to] : '#9ca3af',
      borderColor: 'transparent',
      extendedProps: { task: t },
    }))

  function toggleUser(userId) {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  function handleEventClick(info) {
    setSelectedTask(info.event.extendedProps.task)
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
        <a href="/projects" className="text-gray-400 text-sm">← Back</a>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Company Calendar</h1>
      </div>

      {/* User filter — horizontal scroll on mobile */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedUsers(new Set(users.map(u => u.id)))}
          className="shrink-0 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >All</button>
        <button
          onClick={() => setSelectedUsers(new Set())}
          className="shrink-0 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >None</button>
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => toggleUser(u.id)}
            className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition"
            style={{
              backgroundColor: selectedUsers.has(u.id) ? userColorMap[u.id] : '#f3f4f6',
              borderColor: userColorMap[u.id],
              color: selectedUsers.has(u.id) ? '#fff' : '#6b7280',
            }}
          >
            {u.first_name} {u.last_name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex-1 p-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
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

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedTask(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 flex-1 pr-2">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            {selectedTask.description && (
              <p className="text-sm text-gray-500 mb-3">{selectedTask.description}</p>
            )}
            <div className="space-y-2 text-sm">
              {selectedTask.group && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Group</span>
                  <span className="text-gray-700">{selectedTask.group}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-700">{STATUS_LABELS[selectedTask.status]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Priority</span>
                <span className="text-gray-700">{PRIORITY_LABELS[selectedTask.priority]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Due</span>
                <span className="text-gray-700">{selectedTask.due_date}</span>
              </div>
              {selectedTask.assigned_to_name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Assigned to</span>
                  <span className="text-gray-700">{selectedTask.assigned_to_name}</span>
                </div>
              )}
              {selectedTask.photo && (
                <div className="pt-2">
                  <img src={selectedTask.photo} alt="" className="w-full rounded-lg object-cover max-h-48" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}