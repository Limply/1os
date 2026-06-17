import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import ProjectDetail from './ProjectDetail'

const DEFAULT_WIDTHS = {
  no: 110, name: 260, client: 180, contact: 160, priority: 100, progress: 120, tasks: 70,
  status: 100, start: 90, end: 90, manager: 140, supervisor: 140,
}

const ALL_COLS = [
  { key: 'name',            label: 'Name',       sortKey: 'name',            colKey: 'name',       defaultOn: true  },
  { key: 'client_name',     label: 'Client',      sortKey: 'client_name',     colKey: 'client',     defaultOn: true  },
  { key: 'client_contact',  label: 'Contact',     sortKey: 'client_contact',  colKey: 'contact',    defaultOn: true  },
  { key: 'priority',        label: 'Priority',    sortKey: 'priority',        colKey: 'priority',   defaultOn: true  },
  { key: 'progress',        label: 'Progress',    sortKey: 'progress',        colKey: 'progress',   defaultOn: true,  align: 'right' },
  { key: 'task_count',      label: 'Tasks',       sortKey: 'task_count',      colKey: 'tasks',      defaultOn: true,  align: 'right' },
  { key: 'status',          label: 'Status',      sortKey: 'status',          colKey: 'status',     defaultOn: false },
  { key: 'start_date',      label: 'Start',       sortKey: 'start_date',      colKey: 'start',      defaultOn: false },
  { key: 'end_date',        label: 'End',         sortKey: 'end_date',        colKey: 'end',        defaultOn: false },
  { key: 'manager_name',    label: 'Manager',     sortKey: 'manager_name',    colKey: 'manager',    defaultOn: false },
  { key: 'supervisor_name', label: 'Supervisor',  sortKey: 'supervisor_name', colKey: 'supervisor', defaultOn: false },
]
const DEFAULT_COLS = ALL_COLS.filter(c => c.defaultOn).map(c => c.key)

const STATUS_COLORS = {
  planning:  'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-primary-100 text-primary-700',
  cancelled: 'bg-red-100 text-red-600',
}

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

function ResizableHeader({ label, colKey, sortKey, widths, setWidths, align = 'left', sort, onSort, sticky = false }) {
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
    <th style={{ width: widths[colKey], minWidth: widths[colKey], position: sticky ? 'sticky' : 'relative', left: sticky ? 0 : undefined, zIndex: sticky ? 3 : undefined }}
      className={`px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none${sticky ? ' border-r border-gray-200' : ''}`}
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
  const [clients, setClients]               = useState([])
  const [clientDropdown, setClientDropdown] = useState(false)
  const [visibleCols, setVisibleCols]       = useState(DEFAULT_COLS)
  const [showColPicker, setShowColPicker]   = useState(false)
  const colPickerRef                        = useRef(null)

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

  useEffect(() => {
    if (!showForm || clients.length > 0) return
    api.get('/organisation/clients/').then(r => {
      const d = r.data
      setClients(Array.isArray(d) ? d : (Array.isArray(d?.results) ? d.results : []))
    }).catch(() => {})
  }, [showForm])

  useEffect(() => {
    const saved = getUser().preferences?.projects_columns
    if (Array.isArray(saved) && saved.length > 0) setVisibleCols(saved)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function saveColPrefs(cols) {
    const user = getUser()
    const prefs = { ...(user.preferences || {}), projects_columns: cols }
    localStorage.setItem('user', JSON.stringify({ ...user, preferences: prefs }))
    try { await api.patch('/auth/me/', { preferences: prefs }) } catch {}
  }

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      saveColPrefs(next)
      return next
    })
  }

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

  const activeCols = ALL_COLS.filter(c => visibleCols.includes(c.key))
  const tableWidth = widths.no + activeCols.reduce((sum, c) => sum + (widths[c.colKey] || 120), 0)
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
          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(p => !p)}
              className={`text-xs px-2 py-1 border rounded-lg transition flex items-center gap-1 ${showColPicker ? 'border-primary-400 text-primary-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Columns
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-44">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Show / Hide</p>
                <label className="flex items-center gap-2 py-1 opacity-50 cursor-not-allowed">
                  <input type="checkbox" checked readOnly className="accent-primary-600" />
                  <span className="text-sm text-gray-700">Project No.</span>
                </label>
                {ALL_COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary-600">
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(c.key)}
                      onChange={() => toggleCol(c.key)}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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
                {/* Company Name combobox */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <input
                    value={form.client_name}
                    onChange={e => { setForm(p => ({ ...p, client_name: e.target.value })); setClientDropdown(true) }}
                    onFocus={() => setClientDropdown(true)}
                    onBlur={() => setTimeout(() => setClientDropdown(false), 150)}
                    placeholder="e.g. Ritz Carlton Singapore"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {clientDropdown && (() => {
                    const q = (form.client_name || '').toLowerCase()
                    const matches = (clients || []).filter(c => c.name?.toLowerCase().includes(q))
                    return (
                      <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {matches.length === 0
                          ? <li className="px-3 py-2 text-xs text-gray-400 italic">No clients found — type to enter new</li>
                          : matches.map(c => (
                              <li key={c.id}
                                onMouseDown={() => {
                                  setForm(p => ({
                                    ...p,
                                    client_name:    c.name,
                                    client_contact: c.contact_name    || '',
                                    client_email:   c.contact_email   || '',
                                    client_phone:   c.contact_phone   || '',
                                    client_address: c.billing_address || '',
                                  }))
                                  setClientDropdown(false)
                                }}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 cursor-pointer"
                              >
                                {c.name}
                              </li>
                            ))
                        }
                      </ul>
                    )
                  })()}
                </div>
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="text-sm" style={{ tableLayout: 'fixed', width: tableWidth }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <ResizableHeader label="Project No." colKey="no" sortKey="project_no" widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} sticky />
                {activeCols.map(c => (
                  <ResizableHeader key={c.key} label={c.label} colKey={c.colKey} sortKey={c.sortKey} align={c.align} widths={widths} setWidths={setWidths} sort={sort} onSort={onSort} />
                ))}
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
                      <td colSpan={1 + activeCols.length} className={`px-4 py-2 ${text}`}>
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
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 bg-white border-r border-gray-100" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{p.project_no}</td>
                        {activeCols.map(c => {
                          switch (c.key) {
                            case 'name': return (
                              <td key="name" className="px-4 py-3">
                                <div className="font-medium text-gray-800 truncate">{p.name}</div>
                                {!visibleCols.includes('supervisor_name') && p.supervisor_name && (
                                  <div className="text-xs text-gray-400">{p.supervisor_name}</div>
                                )}
                              </td>
                            )
                            case 'client_name': return <td key="client_name" className="px-4 py-3 text-gray-600 truncate">{p.client_name || '—'}</td>
                            case 'client_contact': return <td key="client_contact" className="px-4 py-3 text-gray-500 truncate">{p.client_contact || '—'}</td>
                            case 'priority': return <td key="priority" className={`px-4 py-3 font-medium ${PRIORITY_COLORS[p.priority]}`}>{p.priority}</td>
                            case 'progress': return (
                              <td key="progress" className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-600 w-8">{p.progress}%</span>
                                </div>
                              </td>
                            )
                            case 'task_count': return <td key="task_count" className="px-4 py-3 text-right text-gray-500">{p.task_count}</td>
                            case 'status': return (
                              <td key="status" className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABEL[p.status] || p.status}
                                </span>
                              </td>
                            )
                            case 'start_date': return <td key="start_date" className="px-4 py-3 text-gray-500 text-xs">{p.start_date || '—'}</td>
                            case 'end_date': return <td key="end_date" className="px-4 py-3 text-gray-500 text-xs">{p.end_date || '—'}</td>
                            case 'manager_name': return <td key="manager_name" className="px-4 py-3 text-gray-600 truncate">{p.manager_name || '—'}</td>
                            case 'supervisor_name': return <td key="supervisor_name" className="px-4 py-3 text-gray-600 truncate">{p.supervisor_name || '—'}</td>
                            default: return <td key={c.key} className="px-4 py-3 text-gray-500">{p[c.key] || '—'}</td>
                          }
                        })}
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
