import { useEffect, useState } from 'react'
import api from '../api/axios'
import ProjectDetail from './ProjectDetail'

const STATUS_COLORS = {
  planning:  'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

const PRIORITY_COLORS = {
  low:    'text-gray-400',
  medium: 'text-blue-500',
  high:   'text-orange-500',
  urgent: 'text-red-500',
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'client', status: 'planning', priority: 'medium', client_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProjects() }, [])

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
      setForm({ name: '', type: 'client', status: 'planning', priority: 'medium', client_name: '' })
      fetchProjects()
    } finally {
      setSaving(false)
    }
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
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + New Project
        </button>
      </div>

      {/* New project form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">New Project</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Lift Maintenance Q1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="client">Client</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Name (optional)</label>
              <input
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Changi Business Park"
              />
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

      {/* Project list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No projects yet</p>
          <p className="text-sm mt-1">Click "+ New Project" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id}
              onClick={() => setSelected(p.id)}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800 truncate">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {p.client_name && <span className="mr-3">{p.client_name}</span>}
                  <span className={`font-medium ${PRIORITY_COLORS[p.priority]}`}>{p.priority}</span>
                  {p.manager_name && <span className="ml-3 text-gray-400">· {p.manager_name}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-700">{p.progress}%</div>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{p.task_count} tasks</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
