import { useEffect, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import TaskPhotoModal from '../components/TaskPhotoModal'
import TaskDocumentModal from '../components/TaskDocumentModal'

const STATUS_ICONS = { todo: '⬜', in_progress: '🔄', review: '👁️', done: '✅' }

function buildWhatsAppLink(project, task) {
  const text = [
    `Project: ${project.name}`,
    `Task: ${task.title}`,
    `Assigned to: ${task.assigned_to_name || 'Unassigned'}`,
    taskUrl(project.id, task.id),
  ].join('\n')
  const encoded = encodeURIComponent(text)
  const raw = task.assigned_to_phone || ''
  const phone = raw.replace(/\D/g, '')
  const sgPhone = phone.length === 8 ? `65${phone}` : phone
  return sgPhone ? `https://wa.me/${sgPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

function taskUrl(projectId, taskId) {
  return `${window.location.origin}/projects?project=${projectId}#task-${taskId}`
}

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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState([])
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [editProject, setEditProject] = useState({})
  const [savingProject, setSavingProject] = useState(false)
  const [foremen, setForemen] = useState([])
  const [managers, setManagers] = useState([])

  useEffect(() => {
    fetchProject()
    fetchUsers()
    fetchTemplates()
    fetchForemen()
    fetchManagers()
  }, [projectId])

  async function fetchProject() {
    const res = await api.get(`/projects/projects/${projectId}/`)
    setProject(res.data)
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
    setLoading(false)
  }

  async function fetchUsers() {
    const res = await api.get('/auth/users/')
    setUsers(res.data.results || res.data)
  }

  async function fetchManagers() {
    try {
      const res = await api.get('/hr/employees/?is_active=true')
      const emps = res.data.results || res.data
      const MANAGER_TITLES = ['manager', 'director', 'admin', 'advisor', 'business development', 'it developer']
      setManagers(emps.filter(e =>
        e.user && MANAGER_TITLES.some(t => (e.position_name || '').toLowerCase().includes(t))
      ))
    } catch {
      setManagers([])
    }
  }

  async function fetchForemen() {
    try {
      const res = await api.get('/hr/employees/?is_active=true')
      const emps = res.data.results || res.data
      const FOREMAN_TITLES = ['foremen', 'supervisor', 'senior supervisor']
      setForemen(emps.filter(e =>
        e.user && FOREMAN_TITLES.some(t => (e.position_name || '').toLowerCase().includes(t))
      ))
    } catch {
      setForemen([])
    }
  }

  async function fetchTemplates() {
    try {
      const res = await api.get('/projects/task-templates/')
      setTemplates(res.data)
    } catch {
      setTemplates([])
    }
  }

  function openEditProject() {
    setEditProject({
      name:           project.name || '',
      type:           project.type || '',
      status:         project.status || '',
      priority:       project.priority || '',
      description:    project.description || '',
      client_name:    project.client_name || '',
      client_contact: project.client_contact || '',
      client_email:   project.client_email || '',
      client_phone:   project.client_phone || '',
      client_address: project.client_address || '',
      start_date:     project.start_date || '',
      end_date:       project.end_date || '',
      manager:        project.manager || '',
      supervisor:     project.supervisor || '',
    })
    setShowEditProject(true)
  }

  async function saveEditProject() {
    setSavingProject(true)
    try {
      const payload = { ...editProject }
      if (!payload.manager) payload.manager = null
      if (!payload.supervisor) payload.supervisor = null
      if (!payload.start_date) payload.start_date = null
      if (!payload.end_date) payload.end_date = null
      await api.patch(`/projects/projects/${project.id}/`, payload)
      await fetchProject()
      setShowEditProject(false)
    } catch (err) {
      const detail = err.response?.data
      console.error('PATCH error:', err.response?.status, detail)
      alert('Save failed: ' + (typeof detail === 'object' ? JSON.stringify(detail) : detail))
    } finally {
      setSavingProject(false)
    }
  }

  async function applyTemplate(template) {
    if (!confirm(`Apply "${template.name}"? This will add ${template.groups.reduce((n, g) => n + g.tasks.length, 0)} tasks to this project.`)) return
    setApplyingTemplate(true)
    try {
      for (const grp of template.groups) {
        for (const title of grp.tasks) {
          await api.post('/projects/tasks/', {
            project: projectId,
            group: grp.group,
            title,
            status: 'todo',
            priority: 'medium',
          })
        }
      }
      setShowTemplatePicker(false)
      fetchProject()
    } finally {
      setApplyingTemplate(false)
    }
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
      <div className="flex flex-wrap items-start gap-2 mb-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm pt-1">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800 truncate">{project.name}</h1>
          <p className="text-sm text-gray-500">
            {project.client_name && <span className="mr-2">{project.client_name} ·</span>}
            <span>{project.status.replace('_', ' ')}</span>
            <span className="ml-2 font-semibold text-blue-600">{project.progress}% complete</span>
            {project.supervisor_name && <span className="ml-2">· Foreman: {project.supervisor_name}</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isManager && (
            <button onClick={openEditProject}
              className="text-sm bg-gray-700 hover:bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-lg transition">
              ✎ Edit
            </button>
          )}
          <button onClick={exportExcel}
            className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
            ↓ Excel
          </button>
          <button onClick={exportPDF}
            className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
            ↓ PDF
          </button>
        </div>
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
                <div key={task.id} id={`task-${task.id}`} className="px-3 py-1 hover:bg-gray-50 transition">

                  {/* Row 1: SN + status + title + action icons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 w-6 shrink-0 text-right">{gi + 1}.{ti + 1}</span>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      className="text-xs border-none bg-transparent focus:outline-none cursor-pointer shrink-0 max-w-[90px]"
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{STATUS_ICONS[val]} {label}</option>
                      ))}
                    </select>

                    {editingTask === task.id ? (
                      <input
                        autoFocus
                        value={editValues.title}
                        onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                        className="flex-1 text-sm border-b border-blue-400 focus:outline-none bg-transparent"
                        onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing() }}
                      />
                    ) : (
                      <span
                        onClick={() => startEditing(task)}
                        className={`flex-1 text-sm cursor-pointer truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 hover:text-blue-600'}`}
                      >
                        {task.title}
                      </span>
                    )}

                    {/* Icons always on the right */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={buildWhatsAppLink(project, task)} target="_blank" rel="noopener noreferrer"
                        className="text-gray-300 hover:text-green-500 transition"
                        title={`Send WhatsApp reminder${task.assigned_to_name ? ' to ' + task.assigned_to_name : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                        </svg>
                      </a>
                      <button onClick={() => setPhotoModalTask(task)}
                        className="relative text-gray-300 hover:text-blue-500 transition"
                        title={task.photo_count > 0 ? `${task.photo_count} photo(s)` : 'Add photos'}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        {task.photo_count > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                      </button>
                      <button onClick={() => setDocModalTask(task)}
                        className="relative text-gray-300 hover:text-blue-500 transition"
                        title={task.doc_count > 0 ? `${task.doc_count} document(s)` : 'Add documents'}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                        {task.doc_count > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                      </button>
                      {isManager && editingTask !== task.id && (
                        <button onClick={() => handleDeleteTask(task.id, task.title)}
                          className="text-gray-300 hover:text-red-500 transition text-sm" title="Delete task">✕</button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: meta info (or edit fields when editing) */}
                  {editingTask === task.id ? (
                    <div className="flex flex-wrap items-center gap-2 pl-8 mt-1">
                      <select value={editValues.assigned_to}
                        onChange={e => setEditValues(p => ({ ...p, assigned_to: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none">
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
                      </select>
                      <input type="date" value={editValues.start_date}
                        onChange={e => setEditValues(p => ({ ...p, start_date: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none" title="Start date" />
                      <input type="date" value={editValues.end_date}
                        onChange={e => setEditValues(p => ({ ...p, end_date: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none" title="End date" />
                      <input type="number" min="1" max="10" value={editValues.weightage}
                        onChange={e => setEditValues(p => ({ ...p, weightage: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none w-14 text-center" title="Weightage (1–10)" />
                      <button onClick={saveEditing} className="text-xs text-white bg-blue-600 px-2 py-0.5 rounded-lg hover:bg-blue-700">Save</button>
                      <button onClick={cancelEditing} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-8 mt-0.5">
                      <span onClick={() => startEditing(task)}
                        className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 hover:text-blue-600">
                        {task.assigned_to_name ? task.assigned_to_name.split(' ')[0] : 'Unassigned'}
                      </span>
                      {(task.start_date || task.end_date) && (
                        <span className="text-xs text-gray-400">{task.start_date || '…'} → {task.end_date || '…'}</span>
                      )}
                      <span className="text-xs text-gray-400" title="Weightage">×{task.weightage ?? 1}</span>
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add task */}
            {addingTaskTo === grp.group ? (
              <form onSubmit={e => handleAddTask(e, grp.group)} className="px-4 py-2 border-t border-gray-100 bg-gray-50 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    autoFocus required
                    placeholder="Task title"
                    value={newTask[grp.group]?.title || ''}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], title: e.target.value } })}
                    className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="flex flex-wrap gap-2">
                  <select
                    value={newTask[grp.group]?.assigned_to || ''}
                    onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], assigned_to: e.target.value } })}
                    className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
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
          <div className="flex gap-2">
            <button
              onClick={() => setAddingGroup(true)}
              className="flex-1 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
            >
              + Add Group
            </button>
            {isManager && templates.length > 0 && (
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="border-2 border-dashed border-purple-300 rounded-xl py-3 px-5 text-sm text-purple-400 hover:border-purple-500 hover:text-purple-600 transition whitespace-nowrap"
              >
                Use Template
              </button>
            )}
          </div>
        )}
      </div>

      {photoModalTask && (
        <TaskPhotoModal task={photoModalTask} onClose={() => { setPhotoModalTask(null); fetchProject() }} />
      )}
      {docModalTask && (
        <TaskDocumentModal task={docModalTask} onClose={() => { setDocModalTask(null); fetchProject() }} />
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Use Template</h2>
                <p className="text-sm text-gray-500 mt-0.5">Auto-populate task groups from a template</p>
              </div>
              <button onClick={() => setShowTemplatePicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {templates.map(tmpl => (
                <button
                  key={tmpl.slug}
                  onClick={() => applyTemplate(tmpl)}
                  disabled={applyingTemplate}
                  className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <div className="font-semibold text-gray-800">{tmpl.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {tmpl.groups.length} group{tmpl.groups.length !== 1 ? 's' : ''}
                    {' · '}
                    {tmpl.groups.reduce((n, g) => n + g.tasks.length, 0)} tasks
                    {tmpl.groups.length > 0 && (
                      <span className="ml-2 text-gray-400">
                        ({tmpl.groups.map(g => g.group).join(', ')})
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {applyingTemplate && (
              <div className="px-6 pb-4 text-sm text-purple-600 text-center">Creating tasks...</div>
            )}
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Edit Project</h2>
              <button onClick={() => setShowEditProject(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Project Name</label>
                <input value={editProject.name} onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
                  <select value={editProject.type} onChange={e => setEditProject(p => ({ ...p, type: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="client">Client Project</option>
                    <option value="internal">Internal Project</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <select value={editProject.status} onChange={e => setEditProject(p => ({ ...p, status: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Priority</label>
                  <select value={editProject.priority} onChange={e => setEditProject(p => ({ ...p, priority: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Manager</label>
                  <select value={editProject.manager} onChange={e => setEditProject(p => ({ ...p, manager: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— None —</option>
                    {managers.map(e => <option key={e.user} value={e.user}>{e.full_name} ({e.position_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Supervisor (Foreman)</label>
                  <select value={editProject.supervisor} onChange={e => setEditProject(p => ({ ...p, supervisor: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— None —</option>
                    {foremen.map(e => <option key={e.user} value={e.user}>{e.full_name} ({e.position_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Start Date</label>
                  <input type="date" value={editProject.start_date} onChange={e => setEditProject(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">End Date</label>
                  <input type="date" value={editProject.end_date} onChange={e => setEditProject(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <textarea value={editProject.description} onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Client</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Name</label>
                    <input value={editProject.client_name} onChange={e => setEditProject(p => ({ ...p, client_name: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Contact Person</label>
                    <input value={editProject.client_contact} onChange={e => setEditProject(p => ({ ...p, client_contact: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Email</label>
                    <input type="email" value={editProject.client_email} onChange={e => setEditProject(p => ({ ...p, client_email: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Phone</label>
                    <input value={editProject.client_phone} onChange={e => setEditProject(p => ({ ...p, client_phone: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400">Address</label>
                    <input value={editProject.client_address} onChange={e => setEditProject(p => ({ ...p, client_address: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowEditProject(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              <button onClick={saveEditProject} disabled={savingProject}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50">
                {savingProject ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
