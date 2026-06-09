import { useEffect, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import TaskPhotoModal from '../components/TaskPhotoModal'
import TaskDocumentModal from '../components/TaskDocumentModal'

const STATUS_ICONS = { todo: '⬜', in_progress: '🔄', review: '👁️', done: '✅' }
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: 'text-gray-400', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' }

const MANAGER_ROLES = ['manager', 'admin', 'superadmin']

export default function ProjectDetail({ projectId, onBack }) {
  const user = getUser()
  const isManager = MANAGER_ROLES.includes(user?.role)

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newTask, setNewTask] = useState({})
  const [addingTaskTo, setAddingTaskTo] = useState(null)
  const [photoModalTask, setPhotoModalTask] = useState(null)
  const [docModalTask, setDocModalTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null) // taskId
  const [editValues, setEditValues] = useState({}) // { title, assigned_to }

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

  function startEditing(task) {
    setEditingTask(task.id)
    setEditValues({
      title: task.title,
      assigned_to: task.assigned_to || '',
      start_date: task.start_date || '',
      end_date: task.end_date || '',
      weightage: task.weightage ?? 1,
    })
  }

  async function saveEditing() {
    await api.patch(`/projects/tasks/${editingTask}/`, {
      title: editValues.title,
      assigned_to: editValues.assigned_to || null,
      start_date: editValues.start_date || null,
      end_date: editValues.end_date || null,
      weightage: Math.min(10, Math.max(1, parseInt(editValues.weightage) || 1)),
    })
    setEditingTask(null)
    fetchProject()
  }

  function cancelEditing() {
    setEditingTask(null)
  }


  async function handleDeleteTask(taskId, title) {
    if (!confirm(`Delete task "${title}"?`)) return
    await api.delete(`/projects/tasks/${taskId}/`)
    fetchProject()
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>
  if (!project) return null

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    const now = new Date().toLocaleDateString()

    doc.setFontSize(16)
    doc.text(project.name, 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`${project.client_name || ''}  ·  ${project.status.replace('_', ' ')}  ·  ${project.progress}% complete  ·  Exported ${now}`, 14, 23)
    doc.setTextColor(0)

    let rows = []
    project.task_groups.forEach((grp, gi) => {
      grp.tasks.forEach((task, ti) => {
        rows.push([
          `${gi + 1}.${ti + 1}`,
          grp.group || 'General',
          task.title,
          STATUS_LABELS[task.status] || task.status,
          task.priority,
          task.weightage ?? 1,
          task.start_date || '',
          task.end_date || '',
          task.assigned_to_name || '',
        ])
      })
    })

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Group', 'Task', 'Status', 'Priority', 'Wt', 'Start', 'End', 'Assigned']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 24 },
        4: { cellWidth: 20 },
        5: { cellWidth: 10 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 28 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    doc.save(`${project.name.replace(/\s+/g, '_')}_tasks.pdf`)
  }

  function exportExcel() {
    const rows = []
    project.task_groups.forEach((grp, gi) => {
      grp.tasks.forEach((task, ti) => {
        rows.push({
          '#': `${gi + 1}.${ti + 1}`,
          'Group': grp.group || 'General',
          'Task': task.title,
          'Status': STATUS_LABELS[task.status] || task.status,
          'Priority': task.priority,
          'Weightage': task.weightage ?? 1,
          'Start Date': task.start_date || '',
          'End Date': task.end_date || '',
          'Assigned To': task.assigned_to_name || '',
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [8, 22, 50, 14, 12, 12, 14, 14, 22].map(w => ({ wch: w }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks')
    XLSX.writeFile(wb, `${project.name.replace(/\s+/g, '_')}_tasks.xlsx`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500">
            {project.client_name && <span className="mr-2">{project.client_name} ·</span>}
            <span>{project.status.replace('_', ' ')}</span>
            <span className="ml-2 font-semibold text-blue-600">{project.progress}% complete</span>
          </p>
        </div>
        <button onClick={exportExcel}
          className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
          ↓ Excel
        </button>
        <button onClick={exportPDF}
          className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
          ↓ PDF
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
      </div>

      {/* Task Groups */}
      <div className="space-y-3">
        {project.task_groups.map((grp, gi) => (
          <div key={grp.group} className="bg-white rounded-xl border border-gray-200">
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{gi + 1}</span>
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
              {grp.tasks.map((task, ti) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-0.5 hover:bg-gray-50 transition">
                  <span className="text-xs text-gray-300 w-7 shrink-0 text-right">{gi + 1}.{ti + 1}</span>
                  <select
                    value={task.status}
                    onChange={e => handleStatusChange(task.id, e.target.value)}
                    className="text-sm border-none bg-transparent focus:outline-none cursor-pointer"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{STATUS_ICONS[val]} {label}</option>
                    ))}
                  </select>

                  {editingTask === task.id ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <input
                        autoFocus
                        value={editValues.title}
                        onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                        className="flex-1 text-sm border-b border-blue-400 focus:outline-none bg-transparent min-w-32"
                        onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing() }}
                      />
                      <select
                        value={editValues.assigned_to}
                        onChange={e => setEditValues(p => ({ ...p, assigned_to: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
                      </select>
                      <input type="date" value={editValues.start_date}
                        onChange={e => setEditValues(p => ({ ...p, start_date: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none"
                        title="Start date" />
                      <input type="date" value={editValues.end_date}
                        onChange={e => setEditValues(p => ({ ...p, end_date: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none"
                        title="End date" />
                      <input type="number" min="1" max="10" value={editValues.weightage}
                        onChange={e => setEditValues(p => ({ ...p, weightage: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none w-14 text-center"
                        title="Weightage (1–10)" />
                      <button onClick={saveEditing} className="text-xs text-white bg-blue-600 px-2 py-0.5 rounded-lg hover:bg-blue-700">Save</button>
                      <button onClick={cancelEditing} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => startEditing(task)}
                        className={`flex-1 text-sm cursor-pointer ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 hover:text-blue-600'}`}
                      >
                        {task.title}
                      </span>
                      <span
                        onClick={() => startEditing(task)}
                        className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 hover:text-blue-600"
                      >
                        {task.assigned_to_name ? task.assigned_to_name.split(' ')[0] : 'Unassigned'}
                      </span>
                      {(task.start_date || task.end_date) && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {task.start_date || '…'} → {task.end_date || '…'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 whitespace-nowrap" title="Weightage">
                        ×{task.weightage ?? 1}
                      </span>
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    </>
                  )}
                  <button
                    onClick={() => setPhotoModalTask(task)}
                    className="relative text-gray-300 hover:text-blue-500 transition shrink-0"
                    title={task.photo_count > 0 ? `${task.photo_count} photo(s)` : 'Add photos'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {task.photo_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setDocModalTask(task)}
                    className="relative text-gray-300 hover:text-blue-500 transition shrink-0"
                    title={task.doc_count > 0 ? `${task.doc_count} document(s)` : 'Add documents'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    {task.doc_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                  {isManager && editingTask !== task.id && (
                    <button
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="text-gray-300 hover:text-red-500 transition text-sm"
                      title="Delete task"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Add task */}
            {addingTaskTo === grp.group ? (
              <form onSubmit={e => handleAddTask(e, grp.group)} className="px-4 py-2 border-t border-gray-100 bg-gray-50">
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
                className="w-full text-left px-4 py-1.5 text-sm text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition border-t border-gray-100"
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

      {photoModalTask && (
        <TaskPhotoModal task={photoModalTask} onClose={() => { setPhotoModalTask(null); fetchProject() }} />
      )}
      {docModalTask && (
        <TaskDocumentModal task={docModalTask} onClose={() => { setDocModalTask(null); fetchProject() }} />
      )}
    </div>
  )
}
