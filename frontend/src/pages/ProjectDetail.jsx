import { Fragment, useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import TaskPhotoModal from '../components/TaskPhotoModal'
import TaskDocumentModal from '../components/TaskDocumentModal'
import ProjectFiles from '../components/ProjectFiles'
import TaskGantt from '../components/TaskGantt'
import { Circle, Clock, Eye, CheckCircle2, AlertCircle } from 'lucide-react'

const STATUS_CONFIG = {
  todo:        { Icon: Circle,       color: '#9ca3af', label: 'To Do' },
  in_progress: { Icon: Clock,        color: '#f97316', label: 'In Progress' },
  review:      { Icon: Eye,          color: '#3b82f6', label: 'Review' },
  done:        { Icon: CheckCircle2, color: '#22c55e', label: 'Done' },
  issue:       { Icon: AlertCircle,  color: '#a855f7', label: 'Issue' },
}

// Menu is positioned `fixed` so it escapes the sheet's overflow-auto clipping.
function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const current = STATUS_CONFIG[value] || STATUS_CONFIG.todo

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function toggle() {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={toggle} className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 transition mx-auto" title={current.label}>
        <current.Icon size={13} color={current.color} strokeWidth={2.4} />
      </button>
      {open && pos && (
        <div style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 bg-white border border-gray-300 shadow-lg py-0.5 min-w-[124px]">
          {Object.entries(STATUS_CONFIG).map(([val, { Icon, color, label }]) => (
            <button key={val} onClick={() => { onChange(val); setOpen(false) }}
              className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-gray-50 transition ${val === value ? 'font-semibold' : 'text-gray-700'}`}>
              <Icon size={12} color={color} strokeWidth={2.4} />
              <span style={{ color: val === value ? color : undefined }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_ICONS = { todo: '⬜', in_progress: '🔄', review: '👁️', done: '✅', issue: '⚠️' }

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

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', issue: 'Issue' }
const STATUS_ROW_BG = { done: 'bg-green-50', in_progress: 'bg-orange-50', issue: 'bg-purple-50' }
const PRIORITY_COLORS = { low: 'text-gray-400', medium: 'text-primary-500', high: 'text-orange-500', urgent: 'text-red-500' }

// --- Spreadsheet grid styling -------------------------------------------------
// Table uses border-separate so the sticky header keeps its borders; each cell
// draws only its right + bottom edge, which collapses visually into one grid.
const COL_ORDER   = ['sn', 'st', 'task', 'who', 'start', 'end', 'wt', 'pri', 'act']
const COL_DEFAULT = { sn: 44, st: 28, task: 420, who: 110, start: 92, end: 92, wt: 32, pri: 62, act: 100 }
// Date cells hold native date inputs, which stop being usable much below ~78px.
const COL_MIN     = { sn: 32, st: 24, task: 120, who: 56, start: 78, end: 78, wt: 26, pri: 44, act: 96 }
const COL_W_KEY   = 'farm.projectDetail.colWidths'
const VIEW_KEY    = 'farm.projectDetail.view'

const HEAD      = 'px-1.5 py-1 bg-gray-100 border-b border-r border-gray-300 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left relative'
const HEAD_LAST = 'px-1.5 py-1 bg-gray-100 border-b border-gray-300 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left relative'
const CELL = 'px-1.5 py-0.5 border-b border-r border-gray-200 truncate'
const LAST = 'px-1.5 py-0.5 border-b border-gray-200'
const INPUT = 'w-full bg-white border border-primary-400 px-1 py-0 text-[11px] leading-[16px] focus:outline-none focus:border-primary-600'

function loadColWidths() {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_W_KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...COL_DEFAULT, ...saved }
  } catch { /* corrupt or unavailable — fall back to defaults */ }
  return COL_DEFAULT
}

// Drag handle on a header's right edge. Double-click resets that column.
function ColResizer({ colKey, widths, setWidths }) {
  function onMouseDown(e) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = widths[colKey]
    const min = COL_MIN[colKey] ?? 40
    const onMove = ev => setWidths(w => ({ ...w, [colKey]: Math.max(min, startW + ev.clientX - startX) }))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={() => setWidths(w => ({ ...w, [colKey]: COL_DEFAULT[colKey] }))}
      title="Drag to resize · double-click to reset"
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary-400 transition-colors"
    />
  )
}

function Th({ colKey, widths, setWidths, last = false, className = '', children }) {
  return (
    <th className={`${last ? HEAD_LAST : HEAD} ${className}`}>
      {children}
      <ColResizer colKey={colKey} widths={widths} setWidths={setWidths} />
    </th>
  )
}



export default function ProjectDetail({ projectId, onBack }) {
  const user = getUser()
  const isManager = can(P.PROJECTS_EDIT)

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const foremen  = users.filter(u => u.role === 'superadmin' || u.position_title?.toLowerCase().includes('foreman') || u.position_title?.toLowerCase().includes('supervisor'))
  const managers = users.filter(u => u.role === 'superadmin' || u.permissions?.includes(P.PROJECTS_EDIT))
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newTask, setNewTask] = useState({})
  const [addingTaskTo, setAddingTaskTo] = useState(null)
  const [photoModalTask, setPhotoModalTask] = useState(null)
  const [docModalTask, setDocModalTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null) // taskId
  const [editValues, setEditValues] = useState({}) // { title, assigned_to }
  const [openComments, setOpenComments] = useState(new Set()) // task IDs with comments panel open
  const [comments, setComments] = useState({})   // { taskId: [...] }
  const [commentDraft, setCommentDraft] = useState({}) // { taskId: string }
  const [commentSaving, setCommentSaving] = useState(null) // taskId being saved
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState([])
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [editProject, setEditProject] = useState({})
  const [savingProject, setSavingProject] = useState(false)
  const [widths, setWidths] = useState(loadColWidths)
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'sheet')

  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  useEffect(() => {
    fetchProject()
    fetchUsers()
    fetchTemplates()
  }, [projectId])

  useEffect(() => {
    try { localStorage.setItem(COL_W_KEY, JSON.stringify(widths)) } catch { /* private mode / quota */ }
  }, [widths])

  // Esc backs out of whatever is currently open, innermost first. Discards the
  // edit without saving — same as the Cancel button.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (showTemplatePicker)       { setShowTemplatePicker(false); return }
      if (showEditProject)          { if (!savingProject) setShowEditProject(false); return }
      if (editingTask !== null)     { cancelEditing(); return }
      if (addingTaskTo !== null)    { setAddingTaskTo(null); return }
      if (addingGroup)              { setAddingGroup(false); return }
      if (openComments.size > 0)    { setOpenComments(new Set()) }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showTemplatePicker, showEditProject, savingProject, editingTask, addingTaskTo, addingGroup, openComments])

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
      status:         project.status || '',
      priority:       project.priority || '',
      description:    project.description || '',
      client_name:    project.client_name || '',
      client_contact: project.client_contact || '',
      client_email:   project.client_email || '',
      client_phone:   project.client_phone || '',
      client_address: project.client_address || '',
      site_address:   project.site_address || '',
      site_lat:       project.site_lat || '',
      site_lng:       project.site_lng || '',
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
    e?.preventDefault()
    const t = newTask[group]
    if (!t?.title?.trim()) return
    await api.post('/projects/tasks/', {
      project: projectId,
      group: group,
      title: t.title,
      assigned_to: t.assigned_to || null,
      priority: t.priority || 'medium',
      start_date: t.start_date || null,
      end_date: t.end_date || null,
      // due_date mirrors end_date on purpose — Calendar, the dashboard's
      // overdue/due-this-week widgets and due-soon notifications all key off
      // due_date. Don't drop it or tasks vanish from those views.
      due_date: t.end_date || null,
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
      due_date: editValues.end_date || null,   // keep in step — see handleAddTask
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

  async function toggleComments(taskId) {
    const next = new Set(openComments)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
      if (!comments[taskId]) {
        const res = await api.get(`/projects/task-comments/?task=${taskId}`)
        setComments(prev => ({ ...prev, [taskId]: res.data }))
      }
    }
    setOpenComments(next)
  }

  async function submitComment(e, taskId) {
    e.preventDefault()
    const body = (commentDraft[taskId] || '').trim()
    if (!body) return
    setCommentSaving(taskId)
    const res = await api.post('/projects/task-comments/', { task: taskId, body })
    setComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), res.data] }))
    setCommentDraft(prev => ({ ...prev, [taskId]: '' }))
    setCommentSaving(null)
    fetchProject() // refresh comment_count
  }

  async function deleteComment(taskId, commentId) {
    await api.delete(`/projects/task-comments/${commentId}/`)
    setComments(prev => ({ ...prev, [taskId]: prev[taskId].filter(c => c.id !== commentId) }))
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

  const sheetWidth   = COL_ORDER.reduce((sum, k) => sum + widths[k], 0)
  const widthsCustom = COL_ORDER.some(k => widths[k] !== COL_DEFAULT[k])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xs">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-800 truncate leading-tight">{project.name}</h1>
          <p className="text-[11px] text-gray-500 leading-tight truncate">
            {project.client_name && <span className="mr-1">{project.client_name} ·</span>}
            <span>{project.status.replace('_', ' ')}</span>
            <span className="ml-1.5 font-semibold text-primary-600">{project.progress}% complete</span>
            {project.supervisor_name && <span className="ml-1.5">· Foreman: {project.supervisor_name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* View switch */}
          <div className="flex mr-1">
            {[['sheet', '≡ Sheet'], ['gantt', '▤ Gantt']].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                className={`text-xs px-2 py-1 border -ml-px first:ml-0 transition ${view === k
                  ? 'bg-primary-600 border-primary-600 text-white font-semibold'
                  : 'bg-white border-gray-300 text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          {view === 'sheet' && widthsCustom && (
            <button onClick={() => setWidths(COL_DEFAULT)}
              className="text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 px-1.5 py-1 rounded transition"
              title="Reset all column widths">
              ⇔ Reset cols
            </button>
          )}
          {isManager && (
            <button onClick={openEditProject}
              className="text-xs bg-gray-700 hover:bg-gray-900 text-white font-semibold px-2 py-1 rounded transition">
              ✎ Edit
            </button>
          )}
          <button onClick={exportExcel}
            className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2 py-1 rounded transition">
            ↓ Excel
          </button>
          <button onClick={exportPDF}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-2 py-1 rounded transition">
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
      </div>

      {view === 'sheet' ? (
        <>
        {/* Task sheet — every group shares one grid */}
        {/* w-fit + max-w-full: the bordered box hugs the table, so resizing stays
            pixel-exact and no blank gutter opens up inside the border. */}
        <div className="bg-white border border-gray-300 overflow-auto w-fit max-w-full" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          <table className="border-separate border-spacing-0 text-xs" style={{ tableLayout: 'fixed', width: sheetWidth }}>
            <colgroup>
              {COL_ORDER.map(k => <col key={k} style={{ width: widths[k] }} />)}
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr>
                <Th colKey="sn"    widths={widths} setWidths={setWidths} className="text-right">#</Th>
                <Th colKey="st"    widths={widths} setWidths={setWidths} />
                <Th colKey="task"  widths={widths} setWidths={setWidths}>Task</Th>
                <Th colKey="who"   widths={widths} setWidths={setWidths}>Assigned</Th>
                <Th colKey="start" widths={widths} setWidths={setWidths}>Start</Th>
                <Th colKey="end"   widths={widths} setWidths={setWidths}>End</Th>
                <Th colKey="wt"    widths={widths} setWidths={setWidths} className="text-center">Wt</Th>
                <Th colKey="pri"   widths={widths} setWidths={setWidths}>Priority</Th>
                <Th colKey="act"   widths={widths} setWidths={setWidths} last />
              </tr>
            </thead>
            <tbody>
              {project.task_groups.map((grp, gi) => (
                <Fragment key={grp.group}>
                  {/* Group band */}
                  <tr>
                    <td colSpan={9} className="px-1.5 py-1 bg-gray-50 border-b border-t border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 w-5 text-right shrink-0">{gi + 1}</span>
                        <span className="font-semibold text-gray-700 text-xs truncate">{grp.group || 'General'}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">{grp.done_count}/{grp.task_count} done</span>
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div className="bg-green-500 h-1 rounded-full" style={{ width: `${grp.completion}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-400 w-8 text-right">{grp.completion}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Task rows */}
                  {grp.tasks.map((task, ti) => {
                    const editing = editingTask === task.id
                    const rowBg = editing ? 'bg-primary-50' : (STATUS_ROW_BG[task.status] || 'hover:bg-gray-50')
                    return (
                      <Fragment key={task.id}>
                        <tr id={`task-${task.id}`} className={`transition ${rowBg}`}
                          onKeyDown={editing ? (e => { if (e.key === 'Enter') saveEditing() }) : undefined}>
                          <td className={`${CELL} text-right font-mono text-[11px] text-gray-400`}>{gi + 1}.{ti + 1}</td>
                          <td className={`${CELL} overflow-visible`}>
                            <StatusDropdown value={task.status} onChange={val => handleStatusChange(task.id, val)} />
                          </td>

                          {/* Task title */}
                          <td className={CELL}>
                            {editing ? (
                              <input
                                autoFocus
                                value={editValues.title}
                                onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                                className={INPUT}
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(task)}
                                className={`cursor-pointer ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 hover:text-primary-600'}`}
                              >
                                {task.title}
                              </span>
                            )}
                          </td>

                          {/* Assigned */}
                          <td className={CELL}>
                            {editing ? (
                              <select value={editValues.assigned_to}
                                onChange={e => setEditValues(p => ({ ...p, assigned_to: e.target.value }))}
                                className={INPUT}>
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
                              </select>
                            ) : (
                              <span onClick={() => startEditing(task)}
                                className={`cursor-pointer hover:text-primary-600 ${task.assigned_to_name ? 'text-gray-600' : 'text-gray-300'}`}>
                                {task.assigned_to_name ? task.assigned_to_name.split(' ')[0] : 'Unassigned'}
                              </span>
                            )}
                          </td>

                          {/* Start */}
                          <td className={CELL}>
                            {editing ? (
                              <input type="date" value={editValues.start_date}
                                onChange={e => setEditValues(p => ({ ...p, start_date: e.target.value }))}
                                className={INPUT} />
                            ) : (
                              <span onClick={() => startEditing(task)} className="cursor-pointer text-gray-500 text-[11px]">
                                {task.start_date || '—'}
                              </span>
                            )}
                          </td>

                          {/* End */}
                          <td className={CELL}>
                            {editing ? (
                              <input type="date" value={editValues.end_date}
                                onChange={e => setEditValues(p => ({ ...p, end_date: e.target.value }))}
                                className={INPUT} />
                            ) : (
                              <span onClick={() => startEditing(task)} className="cursor-pointer text-gray-500 text-[11px]">
                                {task.end_date || '—'}
                              </span>
                            )}
                          </td>

                          {/* Weightage */}
                          <td className={`${CELL} text-center`}>
                            {editing ? (
                              <input type="number" min="1" max="10" value={editValues.weightage}
                                onChange={e => setEditValues(p => ({ ...p, weightage: e.target.value }))}
                                className={`${INPUT} text-center`} title="Weightage (1–10)" />
                            ) : (
                              <span onClick={() => startEditing(task)} className="cursor-pointer text-gray-500 text-[11px]">
                                {task.weightage ?? 1}
                              </span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className={`${CELL} font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</td>

                          {/* Actions */}
                          <td className={LAST}>
                            {editing ? (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={saveEditing} title="Save (Enter)"
                                  className="text-[11px] leading-none text-white bg-primary-600 hover:bg-primary-700 px-1.5 py-1 rounded">✓</button>
                                <button onClick={cancelEditing} title="Cancel (Esc)"
                                  className="text-[11px] leading-none text-gray-500 border border-gray-300 hover:bg-gray-100 px-1.5 py-1 rounded">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <a href={buildWhatsAppLink(project, task)} target="_blank" rel="noopener noreferrer"
                                  className="text-gray-300 hover:text-green-500 transition"
                                  title={`Send WhatsApp reminder${task.assigned_to_name ? ' to ' + task.assigned_to_name : ''}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                                  </svg>
                                </a>
                                <button onClick={() => setPhotoModalTask(task)}
                                  className="relative text-gray-300 hover:text-primary-500 transition"
                                  title={`Photos${task.photo_count > 0 ? ` (${task.photo_count})` : ''}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                  {task.photo_count > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                                </button>
                                <button onClick={() => setDocModalTask(task)}
                                  className="relative text-gray-300 hover:text-primary-500 transition"
                                  title={`Files${task.doc_count > 0 ? ` (${task.doc_count})` : ''}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  {task.doc_count > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                                </button>
                                <button onClick={() => toggleComments(task.id)}
                                  className="relative text-gray-300 hover:text-primary-500 transition"
                                  title={task.comment_count > 0 ? `${task.comment_count} comment(s)` : 'Comments'}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                  </svg>
                                  {task.comment_count > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                                </button>
                                {isManager && (
                                  <button onClick={() => handleDeleteTask(task.id, task.title)}
                                    className="text-gray-300 hover:text-red-500 transition text-[11px] leading-none" title="Delete task">✕</button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Comments panel */}
                        {openComments.has(task.id) && (
                          <tr>
                            <td colSpan={9} className="px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Comments</span>
                                  <button onClick={() => toggleComments(task.id)} className="text-[11px] text-gray-400 hover:text-gray-600 transition">✕ Close</button>
                                </div>
                                {(comments[task.id] || []).length === 0 && (
                                  <p className="text-[11px] text-gray-400">No comments yet.</p>
                                )}
                                {(comments[task.id] || []).map(c => (
                                  <div key={c.id} className="flex items-start gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                      {c.author_initials}
                                    </span>
                                    <div className="flex-1 bg-white border border-gray-200 px-2 py-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-gray-700">{c.author_name}</span>
                                        <span className="text-[11px] text-gray-400">{new Date(c.created_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                      </div>
                                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{c.body}</p>
                                    </div>
                                    {(c.author === user?.id || isManager) && (
                                      <button onClick={() => deleteComment(task.id, c.id)}
                                        className="text-gray-300 hover:text-red-400 text-[11px] shrink-0">✕</button>
                                    )}
                                  </div>
                                ))}
                                <form onSubmit={e => submitComment(e, task.id)} className="flex gap-1.5">
                                  <input
                                    value={commentDraft[task.id] || ''}
                                    onChange={e => setCommentDraft(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    placeholder="Add a comment…"
                                    className="flex-1 text-xs border border-gray-300 px-2 py-1 focus:outline-none focus:border-primary-400"
                                  />
                                  <button type="submit"
                                    disabled={commentSaving === task.id || !(commentDraft[task.id] || '').trim()}
                                    className="text-[11px] bg-primary-600 text-white px-2 py-1 hover:bg-primary-700 disabled:opacity-40 transition">
                                    {commentSaving === task.id ? '…' : 'Post'}
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  {/* Add task — an inline row, typed into the same columns */}
                  {addingTaskTo === grp.group ? (
                    <tr className="bg-primary-50"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTask(e, grp.group) }}>
                      <td className={CELL} />
                      <td className={CELL} />
                      <td className={CELL}>
                        <input
                          autoFocus
                          placeholder="Task title"
                          value={newTask[grp.group]?.title || ''}
                          onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], title: e.target.value } })}
                          className={INPUT}
                        />
                      </td>
                      <td className={CELL}>
                        <select
                          value={newTask[grp.group]?.assigned_to || ''}
                          onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], assigned_to: e.target.value } })}
                          className={INPUT}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                        </select>
                      </td>
                      <td className={CELL}>
                        <input type="date"
                          value={newTask[grp.group]?.start_date || ''}
                          onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], start_date: e.target.value } })}
                          className={INPUT} />
                      </td>
                      <td className={CELL}>
                        <input type="date"
                          value={newTask[grp.group]?.end_date || ''}
                          onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], end_date: e.target.value } })}
                          className={INPUT} />
                      </td>
                      <td className={CELL} />
                      <td className={CELL}>
                        <select
                          value={newTask[grp.group]?.priority || 'medium'}
                          onChange={e => setNewTask({ ...newTask, [grp.group]: { ...newTask[grp.group], priority: e.target.value } })}
                          className={INPUT}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td className={LAST}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => handleAddTask(e, grp.group)}
                            className="text-[11px] leading-none text-white bg-primary-600 hover:bg-primary-700 px-1.5 py-1 rounded">Add</button>
                          <button onClick={() => setAddingTaskTo(null)} title="Cancel (Esc)"
                            className="text-[11px] leading-none text-gray-500 border border-gray-300 hover:bg-gray-100 px-1.5 py-1 rounded">✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-1.5 py-0.5 border-b border-gray-200">
                        <button onClick={() => setAddingTaskTo(grp.group)}
                          className="text-[11px] text-gray-400 hover:text-primary-600 transition">
                          + Add task
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {project.task_groups.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-4 text-center text-xs text-gray-400 border-b border-gray-200">
                    No task groups yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <TaskGantt project={project} editable={isManager} onChange={fetchProject} />
      )}

      {/* Add group */}
      <div className="mt-2">
        {addingGroup ? (
          <form onSubmit={handleAddGroup} className="flex gap-1.5">
            <input
              autoFocus
              required
              placeholder="Group name, e.g. Phase 1 - Survey"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="flex-1 border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
            />
            <button type="submit" className="bg-primary-600 text-white px-3 py-1 text-xs font-medium hover:bg-primary-700">
              Add Group
            </button>
            <button type="button" onClick={() => setAddingGroup(false)} className="text-gray-400 text-xs px-2">Cancel</button>
          </form>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setAddingGroup(true)}
              className="flex-1 border border-dashed border-gray-300 py-1.5 text-xs text-gray-400 hover:border-primary-400 hover:text-primary-500 transition"
            >
              + Add Group
            </button>
            {isManager && templates.length > 0 && (
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="border border-dashed border-purple-300 py-1.5 px-4 text-xs text-purple-400 hover:border-purple-500 hover:text-purple-600 transition whitespace-nowrap"
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
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                    {managers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.position_title ? ` · ${u.position_title}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Supervisor (Foreman)</label>
                  <select value={editProject.supervisor} onChange={e => setEditProject(p => ({ ...p, supervisor: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— None —</option>
                    {foremen.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.position_title ? ` · ${u.position_title}` : ''}</option>)}
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
                  rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
              {/* Site Location */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Site Location</p>
                  <button type="button"
                    onClick={() => {
                      if (!navigator.geolocation) return
                      navigator.geolocation.getCurrentPosition(pos => {
                        setEditProject(p => ({
                          ...p,
                          site_lat: pos.coords.latitude.toFixed(7),
                          site_lng: pos.coords.longitude.toFixed(7),
                        }))
                      })
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    📍 Use Current Location
                  </button>
                </div>
                <div className="col-span-2 mb-3">
                  <label className="text-xs text-gray-400">Site Address</label>
                  <input value={editProject.site_address} onChange={e => setEditProject(p => ({ ...p, site_address: e.target.value }))}
                    placeholder="e.g. 123 Jurong East Street 13, Singapore 600123"
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Latitude</label>
                    <input value={editProject.site_lat} onChange={e => setEditProject(p => ({ ...p, site_lat: e.target.value }))}
                      placeholder="e.g. 1.3521000"
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Longitude</label>
                    <input value={editProject.site_lng} onChange={e => setEditProject(p => ({ ...p, site_lng: e.target.value }))}
                      placeholder="e.g. 103.8198000"
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowEditProject(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              <button onClick={saveEditProject} disabled={savingProject}
                className="text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50">
                {savingProject ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
