import { useEffect, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'

const MANAGER_ROLES = ['superadmin', 'admin', 'manager']

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const ATTENDANCE_COLORS = {
  present:  'bg-green-100 text-green-700',
  absent:   'bg-red-100 text-red-700',
  late:     'bg-yellow-100 text-yellow-700',
  half_day: 'bg-blue-100 text-blue-700',
  leave:    'bg-purple-100 text-purple-700',
}

// ─── Sub-tab pill bar ──────────────────────────────────────
function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            active === t
              ? 'bg-blue-600 text-white'
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
  const isManager = MANAGER_ROLES.includes(currentUser?.role)

  // Main tabs
  const TABS = [
    'My Leave',
    'Attendance',
    'My Profile',
    'Courses',
    ...(isManager ? ['Employees', 'Approvals'] : []),
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

  // Leave form
  const [applyForm, setApplyForm] = useState({ leave_type: '', start_date: '', end_date: '', days: '', reason: '' })
  const [applying, setApplying] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)

  // Attendance form
  const [attendForm, setAttendForm] = useState({ date: '', status: 'present', clock_in: '', clock_out: '', hours: '' })
  const [showAttendForm, setShowAttendForm] = useState(false)

  // Employee search
  const [empSearch, setEmpSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

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
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
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
                    <div className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${b.entitled > 0 ? (b.remaining / b.entitled) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showApplyForm ? (
            <button onClick={() => setShowApplyForm(true)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              + Apply for Leave
            </button>
          ) : (
            <form onSubmit={handleApplyLeave} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">New Leave Application</p>
              <select required value={applyForm.leave_type}
                onChange={e => setApplyForm(p => ({ ...p, leave_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select leave type</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Start Date</label>
                  <input required type="date" value={applyForm.start_date}
                    onChange={e => setApplyForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">End Date</label>
                  <input required type="date" value={applyForm.end_date}
                    onChange={e => setApplyForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Number of Days</label>
                <input required type="number" step="0.5" min="0.5" value={applyForm.days}
                  onChange={e => setApplyForm(p => ({ ...p, days: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <textarea placeholder="Reason (optional)" value={applyForm.reason}
                onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" rows={2} />
              <div className="flex gap-2">
                <button type="submit" disabled={applying}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
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
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <select value={attendForm.status}
                    onChange={e => setAttendForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
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
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
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
          )}

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

      {/* ── EMPLOYEES (manager+) ──────────────────── */}
      {tab === 'Employees' && (
        <div className="space-y-3">
          <input
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            placeholder="Search name, emp no, department..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400">{filteredEmployees.length} employees</p>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
            ) : filteredEmployees.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
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
              </div>
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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

    </div>
  )
}
