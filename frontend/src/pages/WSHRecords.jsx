import { useEffect, useState } from 'react'
import api from '../api/axios'

const TYPE_STYLE = {
  safe:         { label: 'Safe',         className: 'bg-green-100 text-green-700' },
  unsafe:       { label: 'Unsafe',       className: 'bg-red-100 text-red-700' },
  near_miss:    { label: 'Near Miss',    className: 'bg-amber-100 text-amber-700' },
  hazard:       { label: 'Hazard',       className: 'bg-yellow-100 text-yellow-700' },
  daily_report: { label: 'Daily Report', className: 'bg-blue-100 text-blue-700' },
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function typeStyle(value) {
  return TYPE_STYLE[value] || { label: value, className: 'bg-gray-100 text-gray-600' }
}

function DetailModal({ record, onClose }) {
  const type = typeStyle(record.observation_type)
  const photos = [record.photo_url, ...(record.attachments || []).map(a => a.photo_url)].filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${type.className}`}>{type.label}</span>
            <p className="text-sm font-semibold text-gray-800 mt-2">
              {record.project_no ? `${record.project_no} — ` : ''}{record.project_name}
            </p>
            <p className="text-xs text-gray-400">{fmtDate(record.date)}{record.area ? ` · ${record.area}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-4">
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className="rounded-lg object-cover flex-shrink-0"
                style={{ width: photos.length === 1 ? '100%' : 220, height: 220 }} />
            ))}
          </div>
        )}

        {record.description && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observation</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
          </div>
        )}
        {record.action_taken && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Action Taken</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.action_taken}</p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Submitted by {record.submitted_by_name || '—'}</p>
      </div>
    </div>
  )
}

export default function WSHRecords() {
  const [records,        setRecords]        = useState([])
  const [projects,       setProjects]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [typeFilter,     setTypeFilter]     = useState('')
  const [projectFilter,  setProjectFilter]  = useState('')
  const [detail,         setDetail]         = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/projects/wsh-photos/'),
      api.get('/projects/projects/?limit=999'),
    ]).then(([wshRes, projRes]) => {
      setRecords(wshRes.data || [])
      setProjects(projRes.data.results || projRes.data || [])
    }).finally(() => setLoading(false))
  }, [])

  const filtered = records.filter(r =>
    (!typeFilter || r.observation_type === typeFilter) &&
    (!projectFilter || String(r.project) === String(projectFilter))
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">WSH Records</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_no ? `${p.project_no} — ` : ''}{p.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Types</option>
            {Object.entries(TYPE_STYLE).map(([value, t]) => <option key={value} value={value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">Date</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-500">Project</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-500">Type</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-500">Area</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-500">Observation</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-500">Submitted By</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-500">Photos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No WSH records found</td></tr>
            ) : filtered.map(r => {
              const type = typeStyle(r.observation_type)
              const photoCount = (r.photo_url ? 1 : 0) + (r.attachments?.length || 0)
              return (
                <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate">
                    {r.project_no ? `${r.project_no} — ` : ''}{r.project_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${type.className}`}>{type.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{r.area || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.submitted_by_name || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{photoCount || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail && <DetailModal record={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
