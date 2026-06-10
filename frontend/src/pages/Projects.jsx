import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import ProjectDetail from './ProjectDetail'

const DEFAULT_WIDTHS = { no: 110, name: 220, client: 160, contact: 140, status: 100, priority: 90, progress: 110, tasks: 60 }

function ResizableHeader({ label, colKey, widths, setWidths, align = 'left' }) {
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

  return (
    <th style={{ width: widths[colKey], minWidth: widths[colKey], position: 'relative' }}
      className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none"
    >
      <span className={`block text-${align}`}>{label}</span>
      <div onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-300 opacity-0 hover:opacity-100 transition-opacity"
      />
    </th>
  )
}

const STATUS_COLORS = {
  planning:  'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

const PRIORITY_COLORS = {
  low: 'text-gray-400', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500',
}

const EMPTY_FORM = {
  name: '', type: 'client', status: 'planning', priority: 'medium',
  client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '',
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [widths, setWidths] = useState(DEFAULT_WIDTHS)

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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...props}
        />
      </div>
    )
  }

  if (selected) {
    return <ProjectDetail projectId={selected} onBack={() => { setSelected(null); fetchProjects() }} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + New Project
        </button>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="client">Client</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="col-span-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Client Info</p>
              <div className="grid grid-cols-2 gap-4">
                {field('Company Name', 'client_name', { col2: false, placeholder: 'e.g. Ritz Carlton Singapore' })}
                {field('Contact Person', 'client_contact', { placeholder: 'e.g. John Tan' })}
                {field('Email', 'client_email', { type: 'email', placeholder: 'john@example.com' })}
                {field('Phone', 'client_phone', { placeholder: '+65 9123 4567' })}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <textarea
                    value={form.client_address}
                    onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Site / billing address"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No projects yet</p>
          <p className="text-sm mt-1">Click "+ New Project" to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: Object.values(widths).reduce((a, b) => a + b, 0) }}>
            <thead>
              <tr>
                <ResizableHeader label="Project No." colKey="no"       widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Name"         colKey="name"     widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Client"       colKey="client"   widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Contact"      colKey="contact"  widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Status"       colKey="status"   widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Priority"     colKey="priority" widths={widths} setWidths={setWidths} />
                <ResizableHeader label="Progress"     colKey="progress" widths={widths} setWidths={setWidths} align="right" />
                <ResizableHeader label="Tasks"        colKey="tasks"    widths={widths} setWidths={setWidths} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(p => (
                <tr key={p.id} onClick={() => setSelected(p.id)}
                  className="hover:bg-blue-50 cursor-pointer transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.project_no}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{p.name}</div>
                    {p.supervisor_name && <div className="text-xs text-gray-400">{p.supervisor_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.client_contact || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${PRIORITY_COLORS[p.priority]}`}>
                    {p.priority}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{p.task_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
