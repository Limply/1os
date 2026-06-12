import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'
import ProjectDetail from './ProjectDetail'

const DEFAULT_WIDTHS = { no: 110, name: 260, client: 180, contact: 160, priority: 100, progress: 120, tasks: 70 }
const TABLE_WIDTH = Object.values(DEFAULT_WIDTHS).reduce((a, b) => a + b, 0)

const STATUS_ORDER = ['active', 'planning', 'on_hold', 'completed', 'cancelled']
const STATUS_LABEL  = { active: 'Active', planning: 'Planning', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' }

const GROUP_STYLE = {
  active:    { row: 'bg-green-50 hover:bg-green-100',   text: 'text-green-800',  dot: 'bg-green-500' },
  planning:  { row: 'bg-gray-100 hover:bg-gray-200',    text: 'text-gray-700',   dot: 'bg-gray-400' },
  on_hold:   { row: 'bg-yellow-50 hover:bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  completed: { row: 'bg-primary-50 hover:bg-primary-100', text: 'text-primary-800', dot: 'bg-primary-500' },
  cancelled: { row: 'bg-red-50 hover:bg-red-100',       text: 'text-red-700',    dot: 'bg-red-400' },
}

const PRIORITY_COLORS = {
  low: 'text-gray-400', medium: 'text-primary-500', high: 'text-orange-500', urgent: 'text-red-500',
}

const EMPTY_FORM = {
  name: '', type: 'client', status: 'planning', priority: 'medium',
  client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '',
}

function SortIcon({ direction }) {
  if (!direction) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-primary-500">{direction === 'asc' ? '↑' : '↓'}</span>
}

function ResizableHeader({ label, colKey, sortKey, widths, setWidths, align = 'left', sort, onSort }) {
  const startX = useRef(null)
  const startW = useRef(null)

  function onMouseDown(e) {
    e.preventDefault()
    startX.current = e.clientX
    startW.current = widths[colKey]
    const onMove = ev => {
      const delta = ev.clientX - startX.current
      setWidths(w => ({ ...w, [colKey]: Math.max(50, startW.current + delta) }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isActive = sort?.key === sortKey
  const direction = isActive ? sort.dir : null

  return (
    <th style={{ width: widths[colKey], minWidth: widths[colKey], position: 'relative' }}
      className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none"
    >
      <span
        className={`flex items-center cursor-pointer hover:text-gray-800 transition justify-${align === 'right' ? 'end' : 'start'} ${isActive ? 'text-primary-600' : ''}`}
        onClick={() => sortKey && onSort(sortKey)}
      >
        {label}
        {sortKey && <SortIcon direction={direction} />}
      </span>
      <div onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary-300 opacity-0 hover:opacity-100 transition-opacity"
      />
    </th>
  )
}

export default function Projects() {
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [widths, setWidths]             = useState(DEFAULT_WIDTHS)
  const [sort, setSort]                 = useState({ key: 'project_no', dir: 'desc' })
  const [collapsedGroups, setCollapsed] = useState(new Set(['completed', 'cancelled']))
  const [search, setSearch]             = useState('')

  function handleSearch(val) {
    setSearch(val)
    if (val.trim()) setCollapsed(new Set())
  }

  function onSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  function toggleGroup(status) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  function collapseAll() { setCollapsed(new Set(STATUS_ORDER)) }
  function expandAll()   { setCollapsed(new Set()) }

  useEffect(() => {
    fetchProjects()
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('project')
    if (pid) setSelected(pid)
  }, [])

  async function fetchProjects() {
    try {
      const res = await api.get('/projects/projects/')
      setProjects(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/projects/projects/', form)
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  function field(label, key, props = {}) {
    return (
      <div className={props.col2 ? 'col-span-2' : ''}>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...props}
        />
      </div>
    )
  }

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q
      ? projects.filter(p =>
          [p.project_no, p.name, p.type, p.status, p.priority,
           p.client_name, p.client_contact, p.client_email, p.client_phone,
           p.start_date, p.end_date, p.manager_name, p.supervisor_name]
          .some(v => (v || '').toLowerCase().includes(q))
        )
      : [...projects]
    if (sort.key) {
      list.sort((a, b) => {
        let av = a[sort.key] ?? ''
        let bv = b[sort.key] ?? ''
        if (typeof av === 'number' || typeof bv === 'number') {
          av = Number(av) || 0; bv = Number(bv) || 0
        } else {
          av = String(av).toLowerCase(); bv = String(bv).toLowerCase()
        }
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return STATUS_ORDER
      .map(status => ({ status, items: list.filter(p => p.status === status) }))
      .filter(g => g.items.length > 0)
  }, [projects, sort, search])

  if (selected) {
    return <ProjectDetail projectId={selected} onBack={() => { setSelected(null); fetchProjects() }} />
  }

  const tableWidth = Object.values(widths).reduce((a, b) => a + b, 0)
  const allCollapsed = grouped.every(g => collapsedGroups.has(g.status))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {search ? `${grouped.reduce((n, g) => n + g.items.length, 0)} of ${projects.length}` : projects.length}
            {' '}project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-7 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >✕</button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={allCollapsed ? expandAll : collapseAll}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded-lg transition"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            + New Project
          </button>
        </div>
      </div>

      {/* New project form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">New Project <span className="text-xs text-gray-400 font-normal">(project number auto-assigned)</span></h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {field('Project Name *', 'name', { required: true, col2: true, placeholder: 'e.g. Lift Maintenance — Changi' })}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="client">Client</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="col-span-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Client Info</p>
              <div className="grid grid-cols-2 gap-4">
                {field('Company Name', 'client_name', { placeholder: 'e.g. Ritz Carlton Singapore' })}
                {field('Contact Person', 'client_contact', { placeholder: 'e.g. John Tan' })}
                {field('Email', 'client_email', { type: 'email', placeholder: 'john@example.com' })}
                {field('Phone', 'client_phone', { placeholder: '+65 9123 4567' })}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <textarea
                    value={form.client_address}
                    onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Site / billing address"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? (
            <p className="text-lg">No projects match "<span className="font-medium">{search}</span>"</p>
          ) : (
            <>
              <p className="text-lg">No projects yet</p>
              <p className="text-sm mt-1">Click "+ New Project" to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: tableWidth }}>
            <thead>
              <tr>
                <ResizableHeader label="Project No." colKey="no"       sortKey="project_no"     widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                <ResizableHeader label="Name"         colKey="name"     sortKey="name"           widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                <ResizableHeader label="Client"       colKey="client"   sortKey="client_name"    widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                <ResizableHeader label="Contact"      colKey="contact"  sortKey="client_contact" widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                <ResizableHeader label="Priority"     colKey="priority" sortKey="priority"       widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                <ResizableHeader label="Progress"     colKey="progress" sortKey="progress"       widths={widths} setWidths={setWidths} align="right" sort={sort} onSort={onSort} />
                <ResizableHeader label="Tasks"        colKey="tasks"    sortKey="task_count"     widths={widths} setWidths={setWidths} align="right" sort={sort} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ status, items }) => {
                const collapsed = collapsedGroups.has(status)
                const { row, text, dot } = GROUP_STYLE[status]
                return (
                  <Fragment key={status}>
                    {/* Group header row */}
                    <tr
                      className={`cursor-pointer select-none border-t border-gray-200 ${row}`}
                      onClick={() => toggleGroup(status)}
                    >
                      <td colSpan={7} className={`px-4 py-2 ${text}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 opacity-60">{collapsed ? '▶' : '▼'}</span>
                          <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                          <span className="font-semibold text-sm">{STATUS_LABEL[status]}</span>
                          <span className="text-xs opacity-60">{items.length} project{items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Project rows */}
                    {!collapsed && items.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setSelected(p.id)}
                        className="hover:bg-primary-50 cursor-pointer transition border-t border-gray-100"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.project_no}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 truncate">{p.name}</div>
                          {p.supervisor_name && <div className="text-xs text-gray-400">{p.supervisor_name}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 truncate">{p.client_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 truncate">{p.client_contact || '—'}</td>
                        <td className={`px-4 py-3 font-medium ${PRIORITY_COLORS[p.priority]}`}>
                          {p.priority}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 w-8">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{p.task_count}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
