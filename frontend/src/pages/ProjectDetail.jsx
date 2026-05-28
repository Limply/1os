import { useEffect, useState } from 'react'
import api from '../api/axios'

const STATUS_ICONS = { todo: '⬜', in_progress: '🔄', review: '👁️', done: '✅' }
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: 'text-gray-400', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' }

export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newTask, setNewTask] = useState({})
  const [addingTaskTo, setAddingTaskTo] = useState(null)

  useEffect(() => {
    fetchProject()
    fetchUsers()
  }, [projectId])

  async function fetchProject() {
    const res = await api.get(`/projects/projects/${projectId}/`)
    setProject(res.data)
    setLoading(false)
  }

  async function fetchUsers() {
    const res = await api.get('/auth/users/')
    setUsers(res.data.results || res.data)
  }

  async function handleAddTask(e, group) {
    e.preventDefault()
    const t = newTask[group]
    if (!t?.title?.trim()) return
    await api.post('/projects/tasks/', {
      project: projectId,
      group: group,
      title: t.title,
      assigned_to: t.assigned_to || null,
      priority: t.priority || 'medium',
      due_date: t.due_date || null,
      status: 'todo',
    })
    setNewTask({ ...newTask, [group]: {} })
    setAddingTaskTo(null)
    fetchProject()
  }

  async function handleAddGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    // Create a placeholder task to establish the group
    await api.post('/projects/tasks/', {
      project: projectId,
      group: newGroupName.trim(),
      title: '(New task)',
      status: 'todo',
      priority: 'medium',
    })
    setNewGroupName('')
    setAddingGroup(false)
    fetchProject()
  }

  async function handleStatusChange(taskId, status) {
    await api.patch(`/projects/tasks/${taskId}/`, { status })
    fetchProject()
  }

  async function handleTaskPhotoUpload(taskId, file) {
    if (!file) return
    const form = new FormData()
    form.append('photo', file)
    await api.patch(`/projects/tasks/${taskId}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    fetchProject()
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>
  if (!project) return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500">
            {project.client_name && <span className="mr-2">{project.client_name} ·</span>}
            <span>{project.status.replace('_', ' ')}</span>
            <span className="ml-2 font-semibold text-blue-600">{project.progress}% complete</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {project.task_groups.map(grp => (
          <div key={grp.group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">{grp.group || 'General'}</span>
                <span className="text-xs text-gray-400">{grp.done_count}/{grp.task_count} done</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${grp.completion}%` }} />
                </div>
                <span className="text-xs text-gray-400">{grp.completion}%</span>
              </div>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-gray-100">
              {grp.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                  <select
                    value={task.status}
                    onChange={e => handleStatusChange(task.id, e.target.value)}
                    className="text-sm border-none bg-transparent focus:outline-none cursor-pointer"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{STATUS_ICONS[val]} {label}</option>
                    ))}
                  </select>
                  <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </span>
                  {task.assigned_to_name && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {task.assigned_to_name}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-gray-400">{task.due_date}</span>
                  )}
                  <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                  <div className="relative group">
                    <label className="cursor-pointer text-xs text-gray-400 hover:text-blue-500" title="Attach photo">
                      📎
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleTaskPhotoUpload(task.id, e.target.files[0])} />
                    </label>
                    {task.photo && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 shadow-xl rounded-lg overflow-hidden border border-gray-200 bg-white">
                        <img src={task.photo} alt="" style={{ width: '200px', height: 'auto', display: 'block' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add task */}
            {addingTaskTo === grp.group ? (
              <form onSubmit={e => handleAddTask(e, grp.group)} className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    required
                    placeholder="Task title"
                    value={newTask[grp.group]?.title || ''}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], title: e.target.value } })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newTask[grp.group]?.priority || 'medium'}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], priority: e.target.value } })}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <select
                    value={newTask[grp.group]?.assigned_to || ''}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], assigned_to: e.target.value } })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                  </select>
                  <input
                    type="date"
                    value={newTask[grp.group]?.due_date || ''}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], due_date: e.target.value } })}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">Add</button>
                  <button type="button" onClick={() => setAddingTaskTo(null)} className="text-gray-400 text-sm px-2">Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingTaskTo(grp.group)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition border-t border-gray-100"
              >
                + Add task
              </button>
            )}
          </div>
        ))}

        {/* Add group */}
        {addingGroup ? (
          <form onSubmit={handleAddGroup} className="flex gap-2">
            <input
              autoFocus
              required
              placeholder="Group name, e.g. Phase 1 - Survey"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Add Group
            </button>
            <button type="button" onClick={() => setAddingGroup(false)} className="text-gray-400 text-sm px-2">Cancel</button>
          </form>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
          >
            + Add Group
          </button>
        )}
      </div>
    </div>
  )
}
