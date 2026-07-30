import { useEffect, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import { can, P } from '../utils/permissions'
import ManpowerCalendar from '../components/ManpowerCalendar'
import ManpowerSettings from '../components/ManpowerSettings'
import { useManpowerSettings } from '../hooks/useManpowerSettings'
import AuthImage from '../components/AuthImage'



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
    ...(isManager ? ['Manpower', 'Team Attendance', 'Employees', 'Locations', 'Approvals'] : []),
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

  // Locations (manager)
  const SITE_TYPES = [
    ['office', 'Office'], ['branch', 'Branch'], ['client_site', 'Client Site'], ['warehouse', 'Warehouse'],
  ]
  const emptySiteForm = { name: '', type: 'office', address: '', postal_code: '', lat: '', lng: '', contact_name: '', contact_phone: '', notes: '', project: '' }
  const [sites, setSites] = useState([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState(null)
  const [siteForm, setSiteForm] = useState(emptySiteForm)
  const [siteSaving, setSiteSaving] = useState(false)
  const [siteMsg, setSiteMsg] = useState('')
  const [siteProjects, setSiteProjects] = useState([])
  const [importingSites, setImportingSites] = useState(false)

  // Team attendance (manager)
  const [teamView, setTeamView] = useState('daily') // 'daily' | 'monthly'
  const [teamDate, setTeamDate] = useState(todayStr())
  const [teamMonth, setTeamMonth] = useState(monthStr())
  const [teamDaily, setTeamDaily] = useState(null)
  const [teamMonthly, setTeamMonthly] = useState(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamPhotos, setTeamPhotos] = useState(null) // row currently shown in the photo lightbox

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (tab !== 'Team Attendance' || !isManager) return
    setTeamLoading(true)
    const params = teamView === 'daily' ? `date=${teamDate}` : `month=${teamMonth}`
    api.get(`/hr/attendance/team/?${params}`)
      .then(res => { teamView === 'daily' ? setTeamDaily(res.data) : setTeamMonthly(res.data) })
      .finally(() => setTeamLoading(false))
  }, [tab, teamView, teamDate, teamMonth, isManager])

  useEffect(() => {
    if (tab !== 'Locations' || !isManager) return
    fetchSites()
    api.get('/projects/projects/?limit=999').then(res => setSiteProjects(res.data.results || res.data)).catch(() => {})
  }, [tab, isManager])

  function fetchSites() {
    setSitesLoading(true)
    api.get('/org/sites/')
      .then(res => setSites(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .finally(() => setSitesLoading(false))
  }

  function openNewSite() {
    setEditingSiteId(null)
    setSiteForm(emptySiteForm)
    setSiteMsg('')
    setShowSiteForm(true)
  }

  function openEditSite(site) {
    setEditingSiteId(site.id)
    setSiteForm({
      name: site.name ?? '', type: site.type ?? 'office', address: site.address ?? '',
      postal_code: site.postal_code ?? '', lat: site.lat ?? '', lng: site.lng ?? '',
      contact_name: site.contact_name ?? '', contact_phone: site.contact_phone ?? '', notes: site.notes ?? '',
      project: site.project ?? '',
    })
    setSiteMsg('')
    setShowSiteForm(true)
  }

  function pickSiteProject(projectId) {
    const proj = siteProjects.find(p => String(p.id) === String(projectId))
    setSiteForm(p => ({
      ...p,
      project: projectId,
      name: proj ? proj.name : p.name,
      type: proj ? 'client_site' : p.type,
      address: proj?.site_address || p.address,
      lat: proj?.site_lat ?? p.lat,
      lng: proj?.site_lng ?? p.lng,
      contact_name: proj?.client_contact || p.contact_name,
      contact_phone: proj?.client_phone || p.contact_phone,
    }))
  }

  async function importSitesFromProjects() {
    setImportingSites(true)
    setSiteMsg('')
    try {
      const res = await api.post('/org/sites/import_from_projects/')
      setSiteMsg(`Imported: ${res.data.created} new, ${res.data.updated} refreshed, ${res.data.skipped} skipped (no site info).`)
      fetchSites()
    } catch (err) {
      setSiteMsg(err.response?.data?.detail || 'Could not import locations from projects.')
    } finally {
      setImportingSites(false)
    }
  }

  async function saveSite(e) {
    e.preventDefault()
    setSiteSaving(true)
    setSiteMsg('')
    try {
      const payload = { ...siteForm, lat: siteForm.lat || null, lng: siteForm.lng || null, project: siteForm.project || null }
      if (editingSiteId) await api.patch(`/org/sites/${editingSiteId}/`, payload)
      else await api.post('/org/sites/', payload)
      setShowSiteForm(false)
      fetchSites()
    } catch (err) {
      setSiteMsg(err.response?.data?.detail || 'Could not save location. Check the fields and try again.')
    } finally {
      setSiteSaving(false)
    }
  }

  async function deleteSite(site) {
    if (!confirm(`Remove "${site.name}"?`)) return
    try {
      await api.delete(`/org/sites/${site.id}/`)
      fetchSites()
    } catch {
      setSiteMsg('Could not remove this location.')
    }
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
            {teamView === 'daily' ? (
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
              {['daily', 'monthly'].map(v => (
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ['present', 'Present'], ['late', 'Late'], ['absent', 'Absent'], ['leave', 'On Leave'],
                  ].map(([key, label]) => (
                    <div key={key} className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xl font-bold text-gray-800">{teamDaily.summary[key] || 0}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {!teamDaily || teamDaily.results.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
                ) : teamDaily.results.map(r => (
                  <div key={r.employee_id}
                    className={`px-4 py-3 flex items-center justify-between gap-2 border-l-2 ${
                      r.status === 'late' ? 'border-l-yellow-400' : r.status === 'absent' ? 'border-l-red-400 bg-red-50/40' : 'border-l-transparent'
                    }`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.employee_name}</p>
                      <p className="text-xs text-gray-400 truncate">{r.department_name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">
                        {r.clock_in ? r.clock_in.slice(11, 16) : '—'} – {r.clock_out ? r.clock_out.slice(11, 16) : '—'}
                      </span>
                      {r.hours && <span className="text-xs text-gray-400">{r.hours}h</span>}
                      {(r.clock_in_photo || r.clock_out_photo) && (
                        <button onClick={() => setTeamPhotos(r)} className="shrink-0">
                          <AuthImage src={r.clock_in_photo || r.clock_out_photo} alt=""
                            className="w-8 h-8 rounded-md object-cover border border-gray-200 hover:opacity-80 transition" />
                        </button>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ATTENDANCE_COLORS[r.status]}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {!teamMonthly || teamMonthly.results.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>
                ) : teamMonthly.results.map(r => {
                  const [y, m] = teamMonth.split('-').map(Number)
                  const daysInMonth = new Date(y, m, 0).getDate()
                  const byDate = Object.fromEntries(r.days.map(d => [d.date, d.status]))
                  return (
                    <div key={r.employee_id} className="px-4 py-3 flex items-center gap-3">
                      <div className="min-w-0 w-32 shrink-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.employee_name}</p>
                        <p className="text-xs text-gray-400 truncate">{r.department_name || '—'}</p>
                      </div>
                      <div className="flex gap-[2px] flex-1 min-w-0 overflow-hidden">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${teamMonth}-${String(i + 1).padStart(2, '0')}`
                          const st = byDate[dateStr]
                          return (
                            <span key={i} title={`${dateStr}${st ? ': ' + st.replace('_', ' ') : ''}`}
                              className={`h-4 w-[3px] rounded-sm ${st ? HEAT_COLORS[st] || 'bg-gray-200' : 'bg-gray-100'}`} />
                          )
                        })}
                      </div>
                      <div className="flex gap-2 text-xs text-gray-400 shrink-0 w-28 justify-end">
                        <span><b className="text-gray-700">{r.present}</b>P</span>
                        <span><b className="text-gray-700">{r.late}</b>L</span>
                        <span><b className="text-gray-700">{r.absent}</b>A</span>
                      </div>
                    </div>
                  )
                })}
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
              <div key={e.id} className="px-4 py-3 flex items-center justify-between">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOCATIONS (manager+) ──────────────────── */}
      {tab === 'Locations' && (
        <div className="space-y-3">
          {siteMsg && (
            <div className={`rounded-xl px-4 py-2 text-sm border ${
              siteMsg.startsWith('Imported:') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>{siteMsg}</div>
          )}

          {!showSiteForm ? (
            <div className="flex gap-2">
              <button onClick={openNewSite}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
                + Add Location
              </button>
              <button onClick={importSitesFromProjects} disabled={importingSites}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition">
                {importingSites ? 'Importing…' : 'Import from Projects'}
              </button>
            </div>
          ) : (
            <form onSubmit={saveSite} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">{editingSiteId ? 'Edit Location' : 'New Location'}</p>
              <div>
                <label className="text-xs text-gray-400">Project (optional — auto-fills fields below)</label>
                <select value={siteForm.project}
                  onChange={e => pickSiteProject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
                  <option value="">— No project —</option>
                  {siteProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_no ? `${p.project_no} — ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input required value={siteForm.name}
                  onChange={e => setSiteForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Type</label>
                <select value={siteForm.type}
                  onChange={e => setSiteForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
                  {SITE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Address</label>
                <input value={siteForm.address}
                  onChange={e => setSiteForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Postal Code</label>
                  <input value={siteForm.postal_code}
                    onChange={e => setSiteForm(p => ({ ...p, postal_code: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">GPS Latitude</label>
                  <input type="number" step="any" value={siteForm.lat}
                    onChange={e => setSiteForm(p => ({ ...p, lat: e.target.value }))}
                    placeholder="1.3772153"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">GPS Longitude</label>
                  <input type="number" step="any" value={siteForm.lng}
                    onChange={e => setSiteForm(p => ({ ...p, lng: e.target.value }))}
                    placeholder="103.8707002"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Contact Name</label>
                  <input value={siteForm.contact_name}
                    onChange={e => setSiteForm(p => ({ ...p, contact_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Contact Phone</label>
                  <input value={siteForm.contact_phone}
                    onChange={e => setSiteForm(p => ({ ...p, contact_phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <textarea placeholder="Notes (optional)" value={siteForm.notes}
                onChange={e => setSiteForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none" rows={2} />
              <div className="flex gap-2">
                <button type="submit" disabled={siteSaving}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {siteSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowSiteForm(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {sitesLoading ? (
              <p className="text-sm text-gray-400 p-4 text-center">Loading…</p>
            ) : sites.length === 0 ? (
              <p className="text-sm text-gray-400 p-4 text-center">No locations yet</p>
            ) : sites.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.address || '—'}</p>
                  <p className="text-xs text-gray-400">
                    {s.lat && s.lng ? `${parseFloat(s.lat).toFixed(7)}, ${parseFloat(s.lng).toFixed(7)}` : 'No GPS set'}
                  </p>
                  {s.project_name && (
                    <p className="text-xs text-primary-500 mt-0.5">↳ from project: {s.project_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {s.type?.replace('_', ' ')}
                  </span>
                  <button onClick={() => openEditSite(s)} className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => deleteSite(s)} className="text-xs text-red-500 hover:underline">Remove</button>
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
