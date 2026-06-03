import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'

const todayStr = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}
const todayISO = () => new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  employee: '',   // UUID for dropdown
  date: todayISO(),
  shift_start: '08:00',
  shift_end: '18:00',
  location_name: '',
  location_lat: '',
  location_lng: '',
  radius: 200,
}

export default function Schedules() {
  const user = getUser()
  const isManager = ['superadmin', 'admin', 'manager'].includes(user?.role)

  const [date, setDate] = useState(todayStr())
  const [schedules, setSchedules] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [importMsg, setImportMsg] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    api.get('/hr/employees/?limit=999&can_clock_in=true').then(res => {
      setEmployees(res.data.results || [])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get(`/hr/work-schedules/?date=${date}`).then(res => {
      setSchedules(res.data.results || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [date])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: todayISO() })
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (s) => {
    // Find employee UUID from employees list using emp_no
    const emp = employees.find(e => e.emp_no === s.emp_no)
    setForm({
      employee: emp?.id || '',
      date: todayISO(),  // not used for edits, just needed for form
      shift_start: s.shift_start,
      shift_end: s.shift_end,
      location_name: s.location_name,
      location_lat: s.location_lat,
      location_lng: s.location_lng,
      radius: s.radius,
    })
    setEditingId(s.id)   // id = "emp_no_date"
    setError('')
    setShowModal(true)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({
        ...f,
        location_lat: pos.coords.latitude.toFixed(7),
        location_lng: pos.coords.longitude.toFixed(7),
      }))
    })
  }

  const handleSave = async () => {
    if (!form.employee || !form.location_name || !form.location_lat || !form.location_lng) {
      setError('Please fill in all required fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await api.put(`/hr/work-schedules/${editingId}/`, form)
      } else {
        // Send date as ISO; backend converts to DD-MM-YYYY
        await api.post('/hr/work-schedules/', form)
      }
      setShowModal(false)
      const res = await api.get(`/hr/work-schedules/?date=${date}`)
      setSchedules(res.data.results || [])
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return
    await api.delete(`/hr/work-schedules/${id}/`)
    setSchedules(s => s.filter(x => x.id !== id))
  }

  const handleExportCSV = () => {
    window.open('https://files.sim-eng.com/files/1os/database/Work_schedule.csv', '_blank')
  }

  const handleExportExcel = () => {
    window.location.href = `/api/hr/work-schedules/export_excel/?date=${date}`
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportErrors([])
    setImportMsg('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/hr/work-schedules/import_file/', formData)
      setImportMsg(res.data.message)
      const res2 = await api.get(`/hr/work-schedules/?date=${date}`)
      setSchedules(res2.data.results || [])
    } catch (err) {
      const data = err.response?.data
      setImportErrors(data?.errors || [data?.message || 'Import failed'])
    }
    e.target.value = ''
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Access denied — managers only
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Work Schedules</h1>
          <p className="text-sm text-gray-500 mt-1">Assign workers to sites with geofenced clock-in</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↓ CSV
          </button>
          <button onClick={handleExportExcel}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↓ Excel
          </button>
          <button onClick={() => fileInputRef.current.click()}
            className="border border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↑ Import
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
          <button onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
            + Add Schedule
          </button>
        </div>
      </div>

      {/* Import feedback */}
      {importMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          ✓ {importMsg}
        </div>
      )}
      {importErrors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold mb-1">Import failed — nothing was saved:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            {importErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Date Filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-600">Date:</label>
        <input type="date"
          value={date.includes('-') && date.length === 10 && date[2] === '-'
            ? date.split('-').reverse().join('-')
            : date}
          onChange={e => {
            const [y,m,d] = e.target.value.split('-')
            setDate(`${d}-${m}-${y}`)
          }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        <button onClick={() => setDate(todayStr())}
          className="text-xs text-blue-600 hover:underline">Today</button>
      </div>

      {/* Schedule Table */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center">
          <p className="text-gray-400">No schedules for {date}</p>
          <button onClick={openAdd}
            className="mt-3 text-blue-600 hover:underline text-sm">+ Add one</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Shift</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedules.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.employee_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{s.location_name}</p>
                    <p className="text-xs text-gray-400">{s.location_lat}, {s.location_lng}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.shift_start} – {s.shift_end}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.clock_status === 'Done'    ? 'bg-green-100 text-green-700' :
                      s.clock_status === 'Late'    ? 'bg-yellow-100 text-yellow-700' :
                      s.clock_status === 'Missed'  ? 'bg-red-100 text-red-600' :
                                                     'bg-gray-100 text-gray-500'
                    }`}>
                      {s.clock_status === 'Done'   ? '✓ Done' :
                       s.clock_status === 'Late'   ? '⚠ Late' :
                       s.clock_status === 'Missed' ? '✗ Missed' : '— Pending'}
                      {s.clock_in_time && ` ${s.clock_in_time}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => openEdit(s)}
                      className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s.id)}
                      className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {editingId ? 'Edit Schedule' : 'Add Schedule'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Employee *</label>
                <select value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400">
                  <option value="">Select employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Date *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Shift Start *</label>
                  <input type="time" value={form.shift_start}
                    onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Shift End *</label>
                  <input type="time" value={form.shift_end}
                    onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Location Name *</label>
                <input type="text" placeholder="e.g. Raffles Place Site" value={form.location_name}
                  onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">GPS Coordinates *</label>
                  <button onClick={useCurrentLocation}
                    className="text-xs text-blue-600 hover:underline">📍 Use Current Location</button>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.0000001" placeholder="Latitude" value={form.location_lat}
                    onChange={e => setForm(f => ({ ...f, location_lat: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  <input type="number" step="0.0000001" placeholder="Longitude" value={form.location_lng}
                    onChange={e => setForm(f => ({ ...f, location_lng: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Allowed Radius (meters)</label>
                <input type="number" value={form.radius}
                  onChange={e => setForm(f => ({ ...f, radius: parseInt(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400" />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg text-sm transition">
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
