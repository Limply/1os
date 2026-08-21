import { useEffect, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import ManpowerCalendar from '../components/ManpowerCalendar'
import ManpowerSettings from '../components/ManpowerSettings'
import { useManpowerSettings } from '../hooks/useManpowerSettings'
import AuthImage from '../components/AuthImage'
import StaffLocationsMap from '../components/StaffLocationsMap'



const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const DAILY_COLUMNS = [
  { key: 'employee_name', label: 'Employee', width: 150 },
  { key: 'photo', label: '📷', width: 48, sortable: false },
  { key: 'status', label: 'Status', width: 120 },
  { key: 'location', label: 'Location', width: 170 },
  { key: 'department_name', label: 'Department', width: 130 },
  { key: 'clock_in', label: 'Clock In', width: 85, numeric: true },
  { key: 'clock_out', label: 'Clock Out', width: 85, numeric: true },
  { key: 'hours', label: 'Hours', width: 70, numeric: true },
]

const ATTENDANCE_COLORS = {
  present:  'bg-green-100 text-green-700',
  absent:   'bg-red-100 text-red-700',
  late:     'bg-yellow-100 text-yellow-700',
  half_day: 'bg-primary-100 text-primary-700',
  leave:    'bg-purple-100 text-purple-700',
  pending:  'bg-gray-100 text-gray-400',
}

const HEAT_COLORS = {
  present:  'bg-green-500',
  late:     'bg-yellow-500',
  absent:   'bg-red-500',
  half_day: 'bg-primary-500',
  leave:    'bg-purple-500',
}

function attendanceLabel(status, leaveTypeName, leaveStatus) {
  if (status === 'leave' && leaveTypeName) {
    return `${leaveTypeName}${leaveStatus === 'pending' ? ' · pending' : ''}`
  }
  return status.replace('_', ' ')
}

const DAILY_CELL_RENDERERS = {
  employee_name: r => r.employee_name,
  department_name: r => r.department_name || '—',
  location: r => r.location || '—',
  clock_in: r => r.clock_in ? r.clock_in.slice(11, 16) : '—',
  clock_out: r => r.clock_out ? r.clock_out.slice(11, 16) : '—',
  hours: r => r.hours ? `${r.hours}h` : '—',
  status: r => (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${ATTENDANCE_COLORS[r.status]}`}>
      {attendanceLabel(r.status, r.leave_type_name, r.leave_status)}
    </span>
  ),
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
}
function monthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Sub-tab pill bar ──────────────────────────────────────
function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            active === t
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}>
          {t}
        </button>
      ))}
    </div>
  )
}

export default function HR() {
  const currentUser = getUser()
  const isManager = can(P.HR_MANAGE)
  const { settings: manpowerSettings, updateSettings: updateManpowerSettings } = useManpowerSettings()
  const [showManpowerSettings, setShowManpowerSettings] = useState(false)

  // Main tabs
  const TABS = [
    'My Leave',
    'Attendance',
    'My Profile',
    'Courses',
    ...(isManager ? ['Manpower', 'Team Attendance', 'Employees', 'Approvals'] : []),
  ]
  const [tab, setTab] = useState('My Leave')


  // Data
  const [employee, setEmployee] = useState(null)
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveHistory, setLeaveHistory] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [attendance, setAttendance] = useState([])
  const [certifications, setCertifications] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [employees, setEmployees] = useState([])
  const [remarkInput, setRemarkInput] = useState({})
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)

  // Employee edit (manager)
  const [editEmployee, setEditEmployee] = useState(null)
  const [empEditForm, setEmpEditForm] = useState({})
  const [empSaving, setEmpSaving] = useState(false)
  const [empEditMsg, setEmpEditMsg] = useState('')

  // Leave form
  const [applyForm, setApplyForm] = useState({ leave_type: '', start_date: '', end_date: '', days: '', reason: '' })
  const [applying, setApplying] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)

  // Attendance form
  const [attendForm, setAttendForm] = useState({ date: '', status: 'present', clock_in: '', clock_out: '', hours: '' })
  const [showAttendForm, setShowAttendForm] = useState(false)

  // Employee search
  const [empSearch, setEmpSearch] = useState('')

  // Team attendance (manager)
  const [teamView, setTeamView] = useState('daily') // 'daily' | 'map' | 'monthly'
  const [teamDate, setTeamDate] = useState(todayStr())
  const [teamMonth, setTeamMonth] = useState(monthStr())
  const [teamDaily, setTeamDaily] = useState(null)
  const [teamMonthly, setTeamMonthly] = useState(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamPhotos, setTeamPhotos] = useState(null) // row currently shown in the photo lightbox
  const [dailySort, setDailySort] = useState({ key: 'employee_name', dir: 'asc' })
  const [dailyColWidths, setDailyColWidths] = useState(() => Object.fromEntries(DAILY_COLUMNS.map(c => [c.key, c.width])))
  const [dailyColOrder, setDailyColOrder] = useState(() => DAILY_COLUMNS.map(c => c.key))
  const [draggedCol, setDraggedCol] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (tab !== 'Team Attendance' || !isManager) return
    setTeamLoading(true)
    const params = teamView === 'monthly' ? `month=${teamMonth}` : `date=${teamDate}`
    api.get(`/hr/attendance/team/?${params}`)
      .then(res => { teamView === 'monthly' ? setTeamMonthly(res.data) : setTeamDaily(res.data) })
      .finally(() => setTeamLoading(false))
  }, [tab, teamView, teamDate, teamMonth, isManager])

  function toggleDailySort(key) {
    setDailySort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  function startDailyColResize(e, key) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = dailyColWidths[key]
    const onMove = ev => {
      setDailyColWidths(w => ({ ...w, [key]: Math.max(36, startWidth + (ev.clientX - startX)) }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function sortDailyRows(rows, key, dir) {
    const mul = dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      let av = a[key], bv = b[key]
      if (key === 'hours') {
        av = av || 0; bv = bv || 0
        return (av - bv) * mul
      }
      if (key === 'clock_in' || key === 'clock_out') {
        av = av || ''; bv = bv || ''
        return av.localeCompare(bv) * mul
      }
      av = (av || '').toString().toLowerCase()
      bv = (bv || '').toString().toLowerCase()
      return av.localeCompare(bv) * mul
    })
  }

  function handleColDragStart(e, key) {
    setDraggedCol(key)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', key) } catch { /* Safari requires setData to allow drag */ }
  }

  function handleColDragOver(e, key) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (key !== dragOverCol) setDragOverCol(key)
  }

  function handleColDrop(e, key) {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggedCol || draggedCol === key) { setDraggedCol(null); return }
    setDailyColOrder(order => {
      const next = order.filter(k => k !== draggedCol)
      next.splice(next.indexOf(key), 0, draggedCol)
      return next
    })
    setDraggedCol(null)
  }

  function handleColDragEnd() {
    setDraggedCol(null)
    setDragOverCol(null)
  }

  function shiftTeamDate(days) {
    const d = new Date(teamDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setTeamDate(d.toLocaleDateString('en-CA'))
  }
  function shiftTeamMonth(delta) {
    const [y, m] = teamMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setTeamMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  async function fetchAll() {
    try {
      const empRes = await api.get('/hr/employees/me/')
      const emp = empRes.data
      setEmployee(emp)

      const requests = [
        api.get(`/hr/leave-balances/?employee=${emp.id}`),
        api.get(`/hr/leave-applications/?employee=${emp.id}`),
        api.get('/hr/leave-types/'),
        api.get(`/hr/attendance/?employee=${emp.id}`),
        api.get(`/hr/certifications/?employee=${emp.id}`),
      ]
      if (isManager) {
        requests.push(api.get('/hr/leave-applications/?status=pending'))
        requests.push(api.get('/hr/employees/?limit=999'))
      }
      const [balances, history, types, attend, certs, pending, emps] = await Promise.all(requests)
      setLeaveBalances(balances.data.results || balances.data)
      setLeaveHistory(history.data.results || history.data)
      setLeaveTypes(types.data.results || types.data)
      setAttendance(attend.data.results || attend.data)
      setCertifications(certs.data.results || certs.data)
      if (pending) setPendingLeaves(pending.data.results || pending.data)
      if (emps) setEmployees(emps.data.results || emps.data)
    } catch (e) {
      if (e.response?.status === 404) setNoProfile(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyLeave(e) {
    e.preventDefault()
    setApplying(true)
    await api.post('/hr/leave-applications/', { ...applyForm, employee: employee.id })
    setApplyForm({ leave_type: '', start_date: '', end_date: '', days: '', reason: '' })
    setShowApplyForm(false)
    setApplying(false)
    fetchAll()
  }

  function openEditEmployee(e) {
    setEditEmployee(e)
    setEmpEditForm({
      is_active: e.is_active,
      can_clock_in: e.can_clock_in,
      employment_type: e.employment_type,
      end_date: e.end_date || '',
    })
    setEmpEditMsg('')
  }

  async function saveEmployee(e) {
    e.preventDefault()
    setEmpSaving(true)
    setEmpEditMsg('')
    try {
      await api.patch(`/hr/employees/${editEmployee.id}/`, {
        ...empEditForm,
        end_date: empEditForm.end_date || null,
      })
      setEditEmployee(null)
      fetchAll()
    } catch (err) {
      setEmpEditMsg(err.response?.data?.detail || 'Could not update this employee.')
    } finally {
      setEmpSaving(false)
    }
  }

  async function handleDecision(leaveId, action) {
    await api.post(`/hr/leave-applications/${leaveId}/${action}/`, {
      remarks: remarkInput[leaveId] || '',
    })
    setRemarkInput(p => ({ ...p, [leaveId]: '' }))
    fetchAll()
  }

  async function handleLogAttendance(e) {
    e.preventDefault()
    await api.post('/hr/attendance/', { ...attendForm, employee: employee.id })
    setAttendForm({ date: '', status: 'present', clock_in: '', clock_out: '', hours: '' })
    setShowAttendForm(false)
    fetchAll()
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  if (noProfile) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">HR</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        No employee profile linked to your account. Ask your admin to link one via the admin panel.
      </div>
    </div>
  )

  const filteredEmployees = employees.filter(e =>
    `${e.first_name} ${e.last_name} ${e.emp_no} ${e.department_name || ''}`.toLowerCase().includes(empSearch.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto p-4">

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
          {employee.first_name?.[0]}{employee.last_name?.[0]}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{employee.first_name} {employee.last_name}</p>
          <p className="text-sm text-gray-400">{employee.emp_no} · {employee.employment_type} · {employee.department_name || '—'}</p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 text-sm font-medium px-3 py-2 rounded-lg transition ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── MY LEAVE ──────────────────────────────── */}
      {tab === 'My Leave' && (
        <div className="space-y-4">
          {leaveBalances.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {leaveBalances.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-400 mb-1">{b.leave_type_name}</p>
                  <p className="text-2xl font-bold text-gray-800">{b.remaining}</p>
                  <p className="text-xs text-gray-400">of {b.entitled} days remaining</p>
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full"
                      style={{ width: `${b.entitled > 0 ? (b.remaining / b.entitled) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showApplyForm ? (
            <button onClick={() => setShowApplyForm(true)}
              className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
              + Apply for Leave
            </button>
          ) : (
            <form onSubmit={handleApplyLeave} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">New Leave Application</p>
              <select required value={applyForm.leave_type}
                onChange={e => setApplyForm(p => ({ ...p, leave_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
                <option value="">Select leave type</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Start Date</label>
                  <input required type="date" value={applyForm.start_date}
                    onChange={e => setApplyForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">End Date</label>
                  <input required type="date" value={applyForm.end_date}
                    onChange={e => setApplyForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Number of Days</label>
                <input required type="number" step="0.5" min="0.5" value={applyForm.days}
                  onChange={e => setApplyForm(p => ({ ...p, days: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <textarea placeholder="Reason (optional)" value={applyForm.reason}
                onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none" rows={2} />
              <div className="flex gap-2">
                <button type="submit" disabled={applying}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {applying ? 'Submitting…' : 'Submit'}
                </button>
                <button type="button" onClick={() => setShowApplyForm(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {leaveHistory.length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No leave applications yet</p>
            ) : leaveHistory.map(l => (
              <div key={l.id} className="p-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{l.leave_type_name}</p>
                  <p className="text-xs text-gray-400">{l.start_date} → {l.end_date} · {l.days} day(s)</p>
                  {l.reason && <p className="text-xs text-gray-400 mt-0.5">{l.reason}</p>}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status]}`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ────────────────────────────── */}
      {tab === 'Attendance' && (
        <div>
          <div className="space-y-4">
              {isManager && !showAttendForm && (
                <button onClick={() => setShowAttendForm(true)}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
                  + Log Attendance
                </button>
              )}
              {isManager && showAttendForm && (
                <form onSubmit={handleLogAttendance} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <p className="font-semibold text-gray-700 text-sm">Log Attendance</p>
                  <div>
                    <label className="text-xs text-gray-400">Date</label>
                    <input required type="date" value={attendForm.date}
                      onChange={e => setAttendForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                  </div>
                  <select value={attendForm.status}
                    onChange={e => setAttendForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
                    <option value="present">Present</option>
                    <option value="half_day">Half Day</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="leave">On Leave</option>
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Clock In</label>
                      <input type="time" value={attendForm.clock_in}
                        onChange={e => setAttendForm(p => ({ ...p, clock_in: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Clock Out</label>
                      <input type="time" value={attendForm.clock_out}
                        onChange={e => setAttendForm(p => ({ ...p, clock_out: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Hours</label>
                      <input type="number" step="0.5" value={attendForm.hours}
                        onChange={e => setAttendForm(p => ({ ...p, hours: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700">Save</button>
                    <button type="button" onClick={() => setShowAttendForm(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {attendance.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No attendance records yet</p>
                ) : attendance.slice(0, 30).map(a => (
                  <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800">{a.date}</p>
                      {a.clock_in && <p className="text-xs text-gray-400">{a.clock_in?.slice(11, 16)} – {a.clock_out?.slice(11, 16) || '—'}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.hours && <span className="text-xs text-gray-400">{a.hours}h</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ATTENDANCE_COLORS[a.status]}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}

      {/* ── MY PROFILE ────────────────────────────── */}
      {tab === 'My Profile' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[
              ['Employee No.', employee.emp_no],
              ['Full Name', `${employee.first_name} ${employee.last_name}`],
              ['Email', employee.email],
              ['Phone', employee.phone || '—'],
              ['Department', employee.department_name || '—'],
              ['Position', employee.position_name || '—'],
              ['Employment Type', employee.employment_type],
              ['Join Date', employee.join_date],
              ['Nationality', employee.nationality || '—'],
              ['Pass Type', employee.pass_type || '—'],
              ['Pass Expiry', employee.pass_expiry || '—'],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Emergency contact */}
          {(employee.emergency_name || employee.emergency_phone) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Emergency Contact</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Name</span>
                <span className="font-medium text-gray-800">{employee.emergency_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-400">Phone</span>
                <span className="font-medium text-gray-800">{employee.emergency_phone || '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COURSES / CERTIFICATIONS ──────────────── */}
      {tab === 'Courses' && (
        <div className="space-y-3">
          {certifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
              No courses or certifications recorded yet.
            </div>
          ) : certifications.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.issuer}</p>
                </div>
                {c.expiry_date && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    new Date(c.expiry_date) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {new Date(c.expiry_date) < new Date() ? 'Expired' : 'Valid'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                {c.issue_date && <span>Issued: {c.issue_date}</span>}
                {c.expiry_date && <span>Expires: {c.expiry_date}</span>}
                {c.cert_number && <span>#{c.cert_number}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MANPOWER (manager+) ────────────────────── */}
      {tab === 'Manpower' && (
        <div style={{ position: 'relative' }}>
          <ManpowerCalendar settings={manpowerSettings} onSettingsClick={() => setShowManpowerSettings(v => !v)} />
          {showManpowerSettings && (
            <div style={{
              position: 'absolute', top: 0, right: 0, zIndex: 100,
              background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 12, padding: 20, width: 280,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>Display Settings</span>
                <button onClick={() => setShowManpowerSettings(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <ManpowerSettings settings={manpowerSettings} updateSettings={updateManpowerSettings} />
            </div>
          )}
        </div>
      )}

      {/* ── TEAM ATTENDANCE (manager+) ─────────────── */}
      {tab === 'Team Attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {teamView !== 'monthly' ? (
              <div className="flex items-center gap-2">
                <button onClick={() => shiftTeamDate(-1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">‹</button>
                <span className="text-sm font-semibold text-gray-800">
                  {new Date(teamDate + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => shiftTeamDate(1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">›</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => shiftTeamMonth(-1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">‹</button>
                <span className="text-sm font-semibold text-gray-800">
                  {new Date(teamMonth + '-01T00:00:00').toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => shiftTeamMonth(1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">›</button>
              </div>
            )}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['daily', 'map', 'monthly'].map(v => (
                <button key={v} onClick={() => setTeamView(v)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md capitalize transition ${
                    teamView === v ? 'bg-primary-600 text-white' : 'text-gray-500'
                  }`}>{v}</button>
              ))}
            </div>
          </div>

          {teamLoading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading…</div>
          ) : teamView === 'daily' ? (
            <>
              {teamDaily && (
                <div className="flex gap-1.5">
                  {[
                    ['present', 'Present', 'text-green-700'], ['late', 'Late', 'text-yellow-700'],
                    ['absent', 'Absent', 'text-red-700'], ['leave', 'On Leave', 'text-purple-700'],
                  ].map(([key, label, color]) => (
                    <div key={key} className="flex-1 bg-white rounded-lg border border-gray-200 px-2.5 py-1.5 flex items-baseline gap-1.5">
                      <span className={`text-base font-bold ${color}`}>{teamDaily.summary[key] || 0}</span>
                      <span className="text-[11px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                {!teamDaily || teamDaily.results.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
                ) : (
                  <table className="text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 40 }} />
                      {dailyColOrder.map(key => <col key={key} style={{ width: dailyColWidths[key] }} />)}
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 sticky top-0 z-10">
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">S/N</th>
                        {dailyColOrder.map(key => {
                          const c = DAILY_COLUMNS.find(dc => dc.key === key)
                          const sortable = c.sortable !== false
                          return (
                            <th key={c.key}
                              draggable
                              onDragStart={e => handleColDragStart(e, c.key)}
                              onDragOver={e => handleColDragOver(e, c.key)}
                              onDrop={e => handleColDrop(e, c.key)}
                              onDragEnd={handleColDragEnd}
                              onClick={sortable ? () => toggleDailySort(c.key) : undefined}
                              className={`relative px-2.5 py-1.5 text-left align-bottom font-semibold text-gray-600 border-b border-r border-gray-200 cursor-grab active:cursor-grabbing select-none hover:bg-gray-100 whitespace-normal break-words leading-tight transition ${
                                sortable ? '' : 'text-center'
                              } ${draggedCol === c.key ? 'opacity-40' : ''} ${
                                dragOverCol === c.key && draggedCol !== c.key ? 'bg-primary-100 border-l-2 border-l-primary-500' : ''
                              }`}
                              title="Drag to reorder · click to sort">
                              {c.label}
                              {sortable && (
                                <span className="inline-block w-3 text-gray-400">
                                  {dailySort.key === c.key ? (dailySort.dir === 'asc' ? '▲' : '▼') : ''}
                                </span>
                              )}
                              <span onMouseDown={e => startDailyColResize(e, c.key)} onClick={e => e.stopPropagation()} draggable={false}
                                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary-400/70 z-20" />
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortDailyRows(teamDaily.results, dailySort.key, dailySort.dir).map((r, i) => {
                        const rowBg = r.status === 'absent' ? 'bg-red-50' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60')
                        return (
                          <tr key={r.employee_id} className={`group ${rowBg} hover:bg-primary-50/50`}>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-400 tabular-nums align-top">{i + 1}</td>
                            {dailyColOrder.map(key => {
                              const c = DAILY_COLUMNS.find(dc => dc.key === key)
                              const highlight = dragOverCol === c.key && draggedCol !== c.key ? 'bg-primary-50/40' : ''
                              if (c.key === 'photo') {
                                return (
                                  <td key={c.key} className={`px-1 py-1 border-r border-b border-gray-100 text-center align-top ${highlight}`}>
                                    {(r.clock_in_photo || r.clock_out_photo) ? (
                                      <button onClick={() => setTeamPhotos(r)} className="shrink-0">
                                        <AuthImage src={r.clock_in_photo || r.clock_out_photo} alt=""
                                          className="w-6 h-6 rounded object-cover border border-gray-300 hover:opacity-80 hover:scale-110 transition" />
                                      </button>
                                    ) : (
                                      <span className="text-gray-300 text-xs">—</span>
                                    )}
                                  </td>
                                )
                              }
                              return (
                                <td key={c.key}
                                  className={`px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top ${
                                    c.key === 'employee_name' ? 'font-medium text-gray-800' : ''
                                  } ${highlight}`}
                                  title={c.key === 'location' ? (r.location || '') : undefined}>
                                  {c.numeric ? (
                                    <span className="whitespace-nowrap tabular-nums">{DAILY_CELL_RENDERERS[c.key](r)}</span>
                                  ) : (
                                    <div className="line-clamp-2 break-words">{DAILY_CELL_RENDERERS[c.key](r)}</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : teamView === 'map' ? (
            <StaffLocationsMap results={teamDaily?.results} onPhotoClick={setTeamPhotos} />
          ) : (
            <>
              {teamMonthly && teamMonthly.results.length > 0 && (() => {
                const totals = teamMonthly.results.reduce((acc, r) => ({
                  present: acc.present + r.present, late: acc.late + r.late,
                  absent: acc.absent + r.absent, hours: acc.hours + r.total_hours,
                }), { present: 0, late: 0, absent: 0, hours: 0 })
                const marked = totals.present + totals.late + totals.absent
                const rate = marked > 0 ? Math.round(((totals.present + totals.late) / marked) * 100) : 0
                return (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xl font-bold text-gray-800">{rate}%</p>
                      <p className="text-xs text-gray-400">Attendance rate</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xl font-bold text-gray-800">{totals.late}</p>
                      <p className="text-xs text-gray-400">Late incidents</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xl font-bold text-gray-800">{totals.absent}</p>
                      <p className="text-xs text-gray-400">Absences</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xl font-bold text-gray-800">{totals.hours.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">Total hours</p>
                    </div>
                  </div>
                )
              })()}

              <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                {!teamMonthly || teamMonthly.results.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
                ) : (
                  <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 40 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 130 }} />
                      <col />
                      <col style={{ width: 56 }} />
                      <col style={{ width: 56 }} />
                      <col style={{ width: 56 }} />
                      <col style={{ width: 64 }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 sticky top-0 z-10">
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">S/N</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Employee</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Department</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Attendance</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Present</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Late</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Absent</th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap align-bottom">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMonthly.results.map((r, i) => {
                        const [y, m] = teamMonth.split('-').map(Number)
                        const daysInMonth = new Date(y, m, 0).getDate()
                        const byDate = Object.fromEntries(r.days.map(d => [d.date, d]))
                        const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                        return (
                          <tr key={r.employee_id} className={`group ${rowBg} hover:bg-primary-50/50`}>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-400 tabular-nums align-top">{i + 1}</td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-800 font-medium align-top">
                              <div className="line-clamp-2 break-words">{r.employee_name}</div>
                            </td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top">
                              <div className="line-clamp-2 break-words">{r.department_name || '—'}</div>
                            </td>
                            <td className="px-1.5 py-1 border-r border-b border-gray-100 align-middle">
                              <div className="flex gap-[2px] items-center h-4 min-w-0 overflow-hidden">
                                {Array.from({ length: daysInMonth }, (_, di) => {
                                  const dateStr = `${teamMonth}-${String(di + 1).padStart(2, '0')}`
                                  const day = byDate[dateStr]
                                  const st = day?.status
                                  const hasPhoto = day && (day.clock_in_photo || day.clock_out_photo)
                                  return (
                                    <span key={di} title={`${dateStr}${st ? ': ' + attendanceLabel(st, day.leave_type_name, day.leave_status) : ''}${hasPhoto ? ' (click for photo)' : ''}`}
                                      onClick={hasPhoto ? () => setTeamPhotos({ employee_name: r.employee_name, ...day }) : undefined}
                                      className={`h-4 w-[3px] rounded-sm ${st ? HEAT_COLORS[st] || 'bg-gray-200' : 'bg-gray-100'} ${hasPhoto ? 'cursor-pointer hover:h-5 hover:-translate-y-0.5 transition-transform' : ''}`} />
                                  )
                                })}
                              </div>
                            </td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top"><span className="tabular-nums">{r.present}</span></td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top"><span className="tabular-nums">{r.late}</span></td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top"><span className="tabular-nums">{r.absent}</span></td>
                            <td className="px-2.5 py-1 border-r border-b border-gray-100 text-gray-500 align-top"><span className="tabular-nums">{(r.total_hours || 0).toFixed(1)}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EMPLOYEES (manager+) ──────────────────── */}
      {tab === 'Employees' && (
        <div className="space-y-3">
          <input
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            placeholder="Search name, emp no, department..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          />
          <p className="text-xs text-gray-400">{filteredEmployees.length} employees</p>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
            ) : filteredEmployees.map(e => (
              <button key={e.id} onClick={() => openEditEmployee(e)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0">
                    {e.first_name?.[0]}{e.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.first_name} {e.last_name}</p>
                    <p className="text-xs text-gray-400">{e.emp_no} · {e.department_name || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{e.position_name || '—'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {e.employment_type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── APPROVALS (manager+) ──────────────────── */}
      {tab === 'Approvals' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500">
            Pending Leave Applications ({pendingLeaves.length})
          </p>
          {pendingLeaves.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
              No pending leave applications.
            </div>
          ) : pendingLeaves.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{l.employee_name}</p>
                  <p className="text-xs text-gray-400">{l.leave_type_name} · {l.start_date} → {l.end_date} · {l.days} day(s)</p>
                  {l.reason && <p className="text-xs text-gray-500 mt-1">"{l.reason}"</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">pending</span>
              </div>
              <input
                placeholder="Remarks (optional)"
                value={remarkInput[l.id] || ''}
                onChange={e => setRemarkInput(p => ({ ...p, [l.id]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              />
              <div className="flex gap-2">
                <button onClick={() => handleDecision(l.id, 'approve')}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition">
                  Approve
                </button>
                <button onClick={() => handleDecision(l.id, 'reject')}
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EDIT EMPLOYEE (manager+) ──────────────── */}
      {editEmployee && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setEditEmployee(null)}>
          <form onSubmit={saveEmployee} onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl p-4 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-gray-800 text-sm">
                {editEmployee.first_name} {editEmployee.last_name} · {editEmployee.emp_no}
              </p>
              <button type="button" onClick={() => setEditEmployee(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <label className="flex items-center justify-between text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2">
              Active
              <input type="checkbox" checked={empEditForm.is_active}
                onChange={e => setEmpEditForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4" />
            </label>
            {!empEditForm.is_active && (
              <p className="text-xs text-amber-600 -mt-2">
                Inactive employees drop off the attendance roster and employee list.
              </p>
            )}

            <label className="flex items-center justify-between text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2">
              Can Clock In
              <input type="checkbox" checked={empEditForm.can_clock_in}
                onChange={e => setEmpEditForm(p => ({ ...p, can_clock_in: e.target.checked }))}
                className="w-4 h-4" />
            </label>

            <div>
              <label className="text-xs text-gray-400">Employment Type</label>
              <select value={empEditForm.employment_type}
                onChange={e => setEmpEditForm(p => ({ ...p, employment_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
                <option value="fulltime">Full Time</option>
                <option value="parttime">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400">End Date (leave blank if still employed)</label>
              <input type="date" value={empEditForm.end_date}
                onChange={e => setEmpEditForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>

            {empEditMsg && <p className="text-xs text-red-500">{empEditMsg}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={empSaving}
                className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {empSaving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditEmployee(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── CLOCK PHOTO LIGHTBOX (Team Attendance) ─── */}
      {teamPhotos && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setTeamPhotos(null)}>
          <div className="bg-white rounded-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-800 text-sm">{teamPhotos.employee_name}</p>
              <button onClick={() => setTeamPhotos(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Clock in{teamPhotos.clock_in ? ` · ${teamPhotos.clock_in.slice(11, 16)}` : ''}
                </p>
                {teamPhotos.clock_in_photo ? (
                  <AuthImage src={teamPhotos.clock_in_photo} alt="Clock in"
                    className="w-full aspect-square object-cover rounded-lg" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No photo</div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Clock out{teamPhotos.clock_out ? ` · ${teamPhotos.clock_out.slice(11, 16)}` : ''}
                </p>
                {teamPhotos.clock_out_photo ? (
                  <AuthImage src={teamPhotos.clock_out_photo} alt="Clock out"
                    className="w-full aspect-square object-cover rounded-lg" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No photo</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
