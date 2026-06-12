import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'

const todayStr = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}
const todayISO = () => new Date().toISOString().split('T')[0]
const isoToDisplay = iso => { const [y,m,d] = iso.split('-'); return `${d}-${m}-${y}` }
const displayToISO = dd => { const [d,m,y] = dd.split('-'); return `${y}-${m}-${d}` }

const EMPTY_FORM = {
  employee: '',
  date: todayISO(),
  shift_start: '08:00',
  shift_end: '18:00',
  location_name: '',
  location_lat: '',
  location_lng: '',
  radius: 200,
}

const STATUS_COLOR = {
  Done:    'bg-green-100 text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  Missed:  'bg-red-100 text-red-600',
  Pending: 'bg-gray-100 text-gray-500',
}

// Palette for employee name chips in calendar
const CHIP_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
]

export default function Schedules() {
  const user = getUser()
  const isManager = ['superadmin', 'admin', 'manager'].includes(user?.role)

  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [date, setDate] = useState(todayStr())
  const [monthISO, setMonthISO] = useState(todayISO().slice(0, 7)) // YYYY-MM

  const [schedules, setSchedules] = useState([])         // list view data
  const [monthData, setMonthData] = useState([])         // calendar view data
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

  // Fetch list view data
  useEffect(() => {
    if (viewMode !== 'list') return
    setLoading(true)
    api.get(`/hr/work-schedules/?date=${date}`)
      .then(res => setSchedules(res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [date, viewMode])

  // Fetch calendar month data
  useEffect(() => {
    if (viewMode !== 'calendar') return
    setLoading(true)
    api.get(`/hr/work-schedules/?month=${monthISO}`)
      .then(res => setMonthData(res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [monthISO, viewMode])

  // Group monthData by date string DD-MM-YYYY
  const byDate = {}
  monthData.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })

  // Assign consistent chip color per employee name
  const empColorMap = {}
  let colorIdx = 0
  monthData.forEach(s => {
    if (!empColorMap[s.employee_name]) {
      empColorMap[s.employee_name] = CHIP_COLORS[colorIdx % CHIP_COLORS.length]
      colorIdx++
    }
  })

  // Build calendar grid for the month
  function buildCalendarDays() {
    const [y, m] = monthISO.split('-').map(Number)
    const firstDay = new Date(y, m - 1, 1).getDay() // 0=Sun
    const daysInMonth = new Date(y, m, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }

  const calDays = buildCalendarDays()
  const todayDisplayStr = todayStr()

  const clickCalDay = (day) => {
    if (!day) return
    const [y, m] = monthISO.split('-')
    const dd = String(day).padStart(2, '0')
    const newDate = `${dd}-${m}-${y}`
    setDate(newDate)
    setViewMode('list')
  }

  const openAdd = (prefillDate) => {
    setForm({ ...EMPTY_FORM, date: prefillDate || todayISO() })
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (s) => {
    const emp = employees.find(e => e.emp_no === s.emp_no)
    setForm({
      employee: emp?.id || '',
      date: displayToISO(s.date),
      shift_start: s.shift_start,
      shift_end: s.shift_end,
      location_name: s.location_name,
      location_lat: s.location_lat,
      location_lng: s.location_lng,
      radius: s.radius,
    })
    setEditingId(s.id)
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
        await api.post('/hr/work-schedules/', form)
      }
      setShowModal(false)
      if (viewMode === 'list') {
        const res = await api.get(`/hr/work-schedules/?date=${date}`)
        setSchedules(res.data.results || [])
      } else {
        const res = await api.get(`/hr/work-schedules/?month=${monthISO}`)
        setMonthData(res.data.results || [])
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return
    await api.delete(`/hr/work-schedules/${id}/`)
    if (viewMode === 'list') {
      setSchedules(s => s.filter(x => x.id !== id))
    } else {
      const res = await api.get(`/hr/work-schedules/?month=${monthISO}`)
      setMonthData(res.data.results || [])
    }
  }

  const handleExportCSV = () => {
    window.open('https://files.sim-eng.com/files/1os/database/', '_blank')
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

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const [calY, calM] = monthISO.split('-').map(Number)

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Work Schedules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Assign workers to sites with geofenced clock-in</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportCSV}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↓ CSV
          </button>
          <button onClick={handleExportExcel}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↓ Excel
          </button>
          <button onClick={() => fileInputRef.current.click()}
            className="border border-primary-300 text-primary-600 hover:bg-primary-50 font-semibold px-3 py-2 rounded-lg text-sm transition">
            ↑ Import
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
          <button onClick={() => openAdd()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
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
          <p className="font-semibold mb-1">Import failed:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            {importErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* View toggle + nav */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          <button onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${viewMode === 'calendar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            Calendar
          </button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            List
          </button>
        </div>

        {viewMode === 'calendar' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const d = new Date(calY, calM - 2, 1)
              setMonthISO(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
            }} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-500 text-sm">‹</button>
            <span className="font-semibold text-gray-700 min-w-[130px] text-center">
              {MONTH_NAMES[calM - 1]} {calY}
            </span>
            <button onClick={() => {
              const d = new Date(calY, calM, 1)
              setMonthISO(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
            }} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-500 text-sm">›</button>
            <button onClick={() => setMonthISO(todayISO().slice(0,7))}
              className="text-xs text-primary-600 hover:underline ml-1">Today</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Date:</label>
            <input type="date"
              value={displayToISO(date)}
              onChange={e => setDate(isoToDisplay(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400" />
            <button onClick={() => setDate(todayStr())}
              className="text-xs text-primary-600 hover:underline">Today</button>
          </div>
        )}
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-10">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {calDays.map((day, i) => {
                if (!day) return <div key={`blank-${i}`} className="min-h-[80px] bg-gray-50/50" />
                const dd = `${String(day).padStart(2,'0')}-${String(calM).padStart(2,'0')}-${calY}`
                const entries = byDate[dd] || []
                const isToday = dd === todayDisplayStr
                return (
                  <div key={day}
                    onClick={() => clickCalDay(day)}
                    className="min-h-[80px] p-1.5 cursor-pointer hover:bg-primary-50 transition group">
                    <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-primary-600 text-white' : 'text-gray-600 group-hover:text-primary-600'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {entries.slice(0, 3).map((s, si) => (
                        <div key={si}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${empColorMap[s.employee_name] || CHIP_COLORS[0]}`}
                          title={`${s.employee_name} · ${s.location_name} · ${s.shift_start}–${s.shift_end}`}>
                          {s.employee_name.split(' ')[0]}
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-1">+{entries.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center">
            <p className="text-gray-400">No schedules for {date}</p>
            <button onClick={() => openAdd(displayToISO(date))}
              className="mt-3 text-primary-600 hover:underline text-sm">+ Add one</button>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[s.clock_status] || STATUS_COLOR.Pending}`}>
                        {s.clock_status === 'Done'    ? '✓ Done' :
                         s.clock_status === 'Late'    ? '⚠ Late' :
                         s.clock_status === 'Missed'  ? '✗ Missed' : '— Pending'}
                        {s.clock_in_time && ` ${s.clock_in_time}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button onClick={() => openEdit(s)}
                        className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-xs text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400">
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Shift Start</label>
                  <input type="time" value={form.shift_start}
                    onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Shift End</label>
                  <input type="time" value={form.shift_end}
                    onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Location Name *</label>
                <input type="text" placeholder="e.g. Raffles Place Site" value={form.location_name}
                  onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">GPS Coordinates *</label>
                  <button onClick={useCurrentLocation}
                    className="text-xs text-primary-600 hover:underline">📍 Use Current Location</button>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.0000001" placeholder="Latitude" value={form.location_lat}
                    onChange={e => setForm(f => ({ ...f, location_lat: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                  <input type="number" step="0.0000001" placeholder="Longitude" value={form.location_lng}
                    onChange={e => setForm(f => ({ ...f, location_lng: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Allowed Radius (meters)</label>
                <input type="number" value={form.radius}
                  onChange={e => setForm(f => ({ ...f, radius: parseInt(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-primary-400" />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg text-sm transition">
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
