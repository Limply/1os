import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CalendarDays, ClipboardList, X, ArrowRight, Plus, Trash2, Check, Sunrise, Sun, Moon, Pencil } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../api/auth'
import CalendarView from '../components/CalendarView'
import ClaimsTab from '../components/ClaimsTab'

const TASK_STATUS_STYLE = {
  todo:        { dot: 'bg-gray-400',    label: 'To Do',      color: '#9ca3af' },
  in_progress: { dot: 'bg-blue-500',   label: 'In Progress', color: '#3b82f6' },
  review:      { dot: 'bg-yellow-500', label: 'Review',      color: '#f59e0b' },
  done:        { dot: 'bg-green-500',  label: 'Done',        color: '#10b981' },
}

const LEAVE_STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'goals',     label: 'Goals' },
  { key: 'mindset',   label: 'Mindset' },
  { key: 'claims',    label: 'Claims' },
  { key: 'calendar',  label: 'Calendar' },
]

const EMPTY_ANCHOR = { expect_it: '', for_what: '', gratitude: '' }

const localToday = () => new Date().toLocaleDateString('en-CA')  // YYYY-MM-DD in local tz

const GOAL_CATEGORIES = [
  { key: 'all',      label: 'All' },
  { key: 'health',   label: 'Health' },
  { key: 'finance',  label: 'Finance' },
  { key: 'career',   label: 'Career' },
  { key: 'learning', label: 'Learning' },
  { key: 'personal', label: 'Personal' },
  { key: 'family',   label: 'Family' },
]

const CATEGORY_COLOR = {
  health:   'bg-rose-100 text-rose-700',
  finance:  'bg-emerald-100 text-emerald-700',
  career:   'bg-blue-100 text-blue-700',
  learning: 'bg-purple-100 text-purple-700',
  personal: 'bg-amber-100 text-amber-700',
  family:   'bg-pink-100 text-pink-700',
}

export default function Personal() {
  const user     = getUser()
  const navigate = useNavigate()

  const [me, setMe]       = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState('overview')
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Goals state
  const [goals, setGoals]           = useState([])
  const [goalCat, setGoalCat]       = useState('all')
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm]     = useState({ text: '', category: 'personal', goal_type: 'sub', target_date: '' })
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalError, setGoalError]   = useState('')
  const goalTextRef = useRef(null)

  // Mindset — constant Anchor
  const [anchor, setAnchor]           = useState(EMPTY_ANCHOR)
  const [anchorEditing, setAnchorEditing] = useState(false)
  const [anchorForm, setAnchorForm]   = useState(EMPTY_ANCHOR)
  const [anchorSaving, setAnchorSaving] = useState(false)
  const [anchorError, setAnchorError] = useState('')

  // Mindset — per-day log (midday key-notes + evening review, each a list of rows)
  const [mindsetToday, setMindsetToday]     = useState(null)   // today's saved row, or null if none yet
  const [midday, setMidday]                 = useState([])     // list of strings
  const [evening, setEvening]               = useState([])     // list of strings
  const [chapterClosed, setChapterClosed]   = useState(false)
  const [mindsetHistory, setMindsetHistory] = useState([])
  const [mindsetSaving, setMindsetSaving]   = useState(false)
  const [mindsetError, setMindsetError]     = useState('')
  const [mindsetSaved, setMindsetSaved]     = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/hr/employees/me/'),
      api.get(`/projects/tasks/?assigned_to=${user.id}`),
    ]).then(([meRes, tasksRes]) => {
      setMe(meRes.data)
      const taskData = tasksRes.data
      setTasks(Array.isArray(taskData) ? taskData : (taskData.results ?? []))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'goals') {
      api.get('/hr/personal-goals/').then(r => {
      const d = r.data
      setGoals(Array.isArray(d) ? d : (d.results ?? []))
    }).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    if (tab !== 'mindset') return
    setMindsetError(''); setAnchorError('')
    api.get('/hr/mindset-anchor/').then(r => {
      const a = { ...EMPTY_ANCHOR, ...r.data }
      setAnchor(a)
      setAnchorEditing(!a.expect_it && !a.for_what && !a.gratitude)  // first time → open editor
    }).catch(err => setAnchorError(err.response?.data?.detail || err.message || 'Failed to load anchor'))

    api.get('/hr/mindset-logs/').then(r => {
      const d = r.data
      const list = Array.isArray(d) ? d : (d.results ?? [])
      const todayStr = localToday()
      const todayRow = list.find(m => m.date === todayStr) || null
      setMindsetToday(todayRow)
      setMindsetHistory(list.filter(m => m.date !== todayStr))
      setMidday(Array.isArray(todayRow?.midday_notes) ? todayRow.midday_notes : [])
      setEvening(Array.isArray(todayRow?.evening_notes) ? todayRow.evening_notes : [])
      setChapterClosed(!!todayRow?.chapter_closed)
    }).catch(err => {
      setMindsetError(err.response?.data?.detail || err.message || 'Failed to load mindset log')
    })
  }, [tab])

  function editAnchor() {
    setAnchorForm(anchor)
    setAnchorEditing(true)
    setAnchorError('')
  }

  function saveAnchor() {
    setAnchorSaving(true); setAnchorError('')
    api.patch('/hr/mindset-anchor/', anchorForm).then(r => {
      setAnchor({ ...EMPTY_ANCHOR, ...r.data })
      setAnchorEditing(false)
    }).catch(err => {
      const data = err.response?.data
      const msg = data?.detail || (data && typeof data === 'object' ? Object.values(data).flat().join(' ') : null) || err.message || 'Failed to save'
      setAnchorError(msg)
    }).finally(() => setAnchorSaving(false))
  }

  function saveMindset() {
    setMindsetSaving(true)
    setMindsetError('')
    const payload = {
      midday_notes:  midday.map(s => s.trim()).filter(Boolean),
      evening_notes: evening.map(s => s.trim()).filter(Boolean),
      chapter_closed: chapterClosed,
    }
    const req = mindsetToday
      ? api.patch(`/hr/mindset-logs/${mindsetToday.id}/`, payload)
      : api.post('/hr/mindset-logs/', payload)
    req.then(r => {
      setMindsetToday(r.data)
      setMidday(Array.isArray(r.data.midday_notes) ? r.data.midday_notes : [])
      setEvening(Array.isArray(r.data.evening_notes) ? r.data.evening_notes : [])
      setMindsetSaved(true)
      setTimeout(() => setMindsetSaved(false), 2000)
    }).catch(err => {
      const data = err.response?.data
      const msg = data?.detail
        || (data && typeof data === 'object' ? Object.values(data).flat().join(' ') : null)
        || err.message || 'Failed to save'
      setMindsetError(msg)
    }).finally(() => setMindsetSaving(false))
  }

  // Row-list helpers for midday / evening
  const rowOps = (list, setList) => ({
    add:    ()        => setList([...list, '']),
    edit:   (i, v)    => setList(list.map((x, idx) => idx === i ? v : x)),
    remove: (i)       => setList(list.filter((_, idx) => idx !== i)),
  })

  function toggleGoalAchieved(goal) {
    const updated = { is_achieved: !goal.is_achieved }
    api.patch(`/hr/personal-goals/${goal.id}/`, updated).then(r => {
      setGoals(gs => gs.map(g => g.id === goal.id ? r.data : g))
    }).catch(() => {})
  }

  function deleteGoal(id) {
    api.delete(`/hr/personal-goals/${id}/`).then(() => {
      setGoals(gs => gs.filter(g => g.id !== id))
    }).catch(() => {})
  }

  function submitGoal(e) {
    e.preventDefault()
    if (!goalForm.text.trim()) return
    setGoalSaving(true)
    setGoalError('')
    const payload = { ...goalForm, target_date: goalForm.target_date || null }
    api.post('/hr/personal-goals/', payload).then(r => {
      setGoals(gs => [...gs, r.data])
      setGoalForm({ text: '', category: goalForm.category, goal_type: goalForm.goal_type, target_date: '' })
      setShowGoalForm(false)
    }).catch(err => {
      const msg = err.response?.data?.detail || err.response?.statusText || err.message || 'Failed to save'
      setGoalError(msg)
    }).finally(() => setGoalSaving(false))
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks   = tasks.filter(t => t.status === 'done').length

  const today = new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>

  const emp        = me?.employee
  const balances   = me?.leave_balances ?? []
  const leaves     = me?.leave_applications ?? []
  const attendance = me?.today_attendance

  // Calendar events — only this user's tasks with a due date
  const calendarEvents = tasks
    .filter(t => t.due_date)
    .map(t => {
      const s = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.todo
      return {
        id: `task-${t.id}`,
        title: t.title,
        date: t.due_date,
        backgroundColor: s.color,
        borderColor: 'transparent',
        extendedProps: { data: t },
      }
    })

  function handleEventClick(info) {
    setSelectedEvent(info.event.extendedProps.data)
  }

  return (
    <div className="max-w-3xl space-y-4">

      {/* Welcome header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hi, {user.first_name || user.email}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/clock-in')}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              <Clock className="w-4 h-4" /> Clock In / Out
            </button>
            <button
              onClick={() => navigate('/hr')}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 transition"
            >
              <CalendarDays className="w-4 h-4" /> Apply Leave
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 transition"
            >
              <ClipboardList className="w-4 h-4" /> Projects
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Today attendance */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Attendance</h2>
              {attendance ? (
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clock In</span>
                    <span className="font-medium">{attendance.clock_in ? new Date(attendance.clock_in).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clock Out</span>
                    <span className="font-medium">{attendance.clock_out ? new Date(attendance.clock_out).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  {attendance.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-right max-w-[160px] truncate">{attendance.location}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-gray-400 text-sm">Not clocked in today</p>
                  <button onClick={() => navigate('/clock-in')}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-medium">
                    Go to Clock In <ArrowRight className="w-3 h-3 inline" />
                  </button>
                </div>
              )}
            </div>

            {/* Leave balances */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leave Balance</h2>
              {balances.length === 0 ? (
                <p className="text-sm text-gray-400">No leave balances set up.</p>
              ) : (
                <div className="space-y-2">
                  {balances.map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{b.leave_type_name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (b.remaining / b.entitled) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {b.remaining} / {b.entitled}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* My tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Tasks</h2>
              <span className="text-xs text-gray-400">{activeTasks.length} active · {doneTasks} done</span>
            </div>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No active tasks assigned to you.</p>
            ) : (
              <div className="space-y-2">
                {activeTasks.map(t => {
                  const s = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.todo
                  return (
                    <div key={t.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/projects?project=${t.project}#task-${t.id}`)}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.project_no && <span className="text-gray-500 font-medium">{t.project_no}</span>}
                          {t.project_name && <span className="ml-1">· {t.project_name}</span>}
                          <span className="mx-1">·</span>
                          {s.label}
                          {t.due_date && <span className="ml-2">· Due {t.due_date}</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent leave applications */}
          {leaves.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Leave Applications</h2>
              <div className="space-y-2">
                {leaves.map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{l.leave_type_name}</span>
                      <span className="text-gray-400 ml-2">{l.start_date} → {l.end_date}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_STATUS_STYLE[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee info */}
          {emp && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My Profile</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {[
                  ['Employee No.', emp.emp_no],
                  ['Department',   emp.department_name],
                  ['Position',     emp.position_name],
                  ['Employment',   emp.employment_type],
                  ['Phone',        emp.phone],
                  ['Email',        emp.email],
                ].map(([label, val]) => val ? (
                  <div key={label} className="flex justify-between col-span-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium text-right">{val}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'goals' && (
        <div className="space-y-4">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {goals.filter(g => g.is_achieved).length} of {goals.length} achieved
            </p>
            <button
              onClick={() => { setShowGoalForm(true); setTimeout(() => goalTextRef.current?.focus(), 50) }}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setGoalCat(c.key)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                  goalCat === c.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Add goal inline form */}
          {showGoalForm && (
            <form onSubmit={submitGoal} className="bg-white border border-primary-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex gap-2">
                <select
                  value={goalForm.goal_type}
                  onChange={e => setGoalForm(f => ({ ...f, goal_type: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
                >
                  <option value="main">Main Goal</option>
                  <option value="sub">Sub Goal</option>
                </select>
                <select
                  value={goalForm.category}
                  onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white capitalize"
                >
                  {GOAL_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={goalForm.target_date}
                  onChange={e => setGoalForm(f => ({ ...f, target_date: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
                />
              </div>
              <input
                ref={goalTextRef}
                type="text"
                value={goalForm.text}
                onChange={e => setGoalForm(f => ({ ...f, text: e.target.value }))}
                placeholder="What's your goal?"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                maxLength={300}
              />
              {goalError && (
                <p className="text-xs text-red-500">{goalError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowGoalForm(false); setGoalError('') }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">
                  Cancel
                </button>
                <button type="submit" disabled={goalSaving || !goalForm.text.trim()}
                  className="text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-4 py-1.5 rounded-lg transition">
                  {goalSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {/* Goals list — main goals first, then sub */}
          {(() => {
            const filtered = goalCat === 'all' ? goals : goals.filter(g => g.category === goalCat)
            const mainGoals = filtered.filter(g => g.goal_type === 'main')
            const subGoals  = filtered.filter(g => g.goal_type === 'sub')
            const ordered   = [...mainGoals, ...subGoals]

            if (ordered.length === 0) return (
              <p className="text-sm text-gray-400 text-center py-8">No goals yet. Add one above.</p>
            )

            return (
              <div className="space-y-2">
                {ordered.map(g => (
                  <div
                    key={g.id}
                    className={`flex items-start gap-3 bg-white border rounded-xl px-4 py-3 group transition ${
                      g.is_achieved ? 'border-gray-100 opacity-60' : 'border-gray-200'
                    } ${g.goal_type === 'sub' ? 'ml-5' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleGoalAchieved(g)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                        g.is_achieved
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {g.is_achieved && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${g.is_achieved ? 'line-through text-gray-400' : 'text-gray-800'} ${g.goal_type === 'main' ? 'font-semibold' : ''}`}>
                        {g.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[g.category] ?? 'bg-gray-100 text-gray-500'}`}>
                          {g.category}
                        </span>
                        {g.target_date && (
                          <span className="text-xs text-gray-400">· {g.target_date}</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {tab === 'mindset' && (
        <div className="max-w-lg mx-auto w-full space-y-4">

          {/* Constant Anchor — set once, shown every day */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Sunrise className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">My Anchor</span>
              </div>
              {!anchorEditing && (
                <button
                  onClick={editAnchor}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded-lg hover:bg-amber-100 transition"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {anchorEditing ? (
              <div className="space-y-2">
                <input
                  type="text" maxLength={300} value={anchorForm.expect_it}
                  onChange={e => setAnchorForm(f => ({ ...f, expect_it: e.target.value }))}
                  placeholder="Today I will… (expect victory)"
                  className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <input
                  type="text" maxLength={300} value={anchorForm.for_what}
                  onChange={e => setAnchorForm(f => ({ ...f, for_what: e.target.value }))}
                  placeholder="This is for… (your purpose)"
                  className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <input
                  type="text" maxLength={300} value={anchorForm.gratitude}
                  onChange={e => setAnchorForm(f => ({ ...f, gratitude: e.target.value }))}
                  placeholder="Grateful for…"
                  className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {anchorError && <p className="text-sm text-red-500">{anchorError}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  {(anchor.expect_it || anchor.for_what || anchor.gratitude) && (
                    <button onClick={() => { setAnchorEditing(false); setAnchorError('') }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                  )}
                  <button onClick={saveAnchor} disabled={anchorSaving}
                    className="text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg transition">
                    {anchorSaving ? 'Saving…' : 'Save Anchor'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {anchor.expect_it && <p className="text-sm font-semibold text-gray-800">{anchor.expect_it}</p>}
                {anchor.for_what  && <p className="text-sm text-gray-600">This is for {anchor.for_what}</p>}
                {anchor.gratitude && <p className="text-sm text-gray-600">Grateful for {anchor.gratitude}</p>}
              </div>
            )}
          </div>

          {/* Today's date */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today</span>
            <span className="text-xs text-gray-400">{localToday()}</span>
          </div>

          {/* Midday — key notes for today */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-600">
              <Sun className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Key Notes for Today</span>
            </div>
            {midday.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
            {midday.map((note, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text" value={note}
                  onChange={e => rowOps(midday, setMidday).edit(i, e.target.value)}
                  placeholder="A note…"
                  className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <button onClick={() => rowOps(midday, setMidday).remove(i)}
                  className="shrink-0 text-gray-300 hover:text-red-400 p-1.5 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => rowOps(midday, setMidday).add()}
              className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800 font-medium">
              <Plus className="w-4 h-4" /> Add note
            </button>
          </div>

          {/* Evening — night review */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Moon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Night Review</span>
            </div>
            {evening.length === 0 && <p className="text-sm text-gray-400">Nothing logged yet.</p>}
            {evening.map((note, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text" value={note}
                  onChange={e => rowOps(evening, setEvening).edit(i, e.target.value)}
                  placeholder="What did today reveal?"
                  className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <button onClick={() => rowOps(evening, setEvening).remove(i)}
                  className="shrink-0 text-gray-300 hover:text-red-400 p-1.5 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => rowOps(evening, setEvening).add()}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <Plus className="w-4 h-4" /> Add review
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-1 cursor-pointer">
              <button type="button" onClick={() => setChapterClosed(v => !v)}
                className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                  chapterClosed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 hover:border-indigo-400'
                }`}>
                {chapterClosed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </button>
              Chapter closed — turn the page
            </label>
          </div>

          {mindsetError && <p className="text-sm text-red-500 px-1">{mindsetError}</p>}

          {/* Sticky save bar */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-2 pb-1 flex items-center justify-end gap-3">
            {mindsetSaved && <span className="text-xs text-green-600">Saved ✓</span>}
            <button onClick={saveMindset} disabled={mindsetSaving}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition shadow-sm">
              {mindsetSaving ? 'Saving…' : 'Save Today'}
            </button>
          </div>

          {/* History */}
          {mindsetHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Past Days</h2>
              {mindsetHistory.map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-gray-400 mb-2">{m.date}{m.chapter_closed && <span className="text-indigo-400"> · closed ✓</span>}</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    {(m.midday_notes || []).map((n, i) => <p key={`d${i}`}><span className="text-sky-500">◐ </span>{n}</p>)}
                    {(m.evening_notes || []).map((n, i) => <p key={`e${i}`}><span className="text-indigo-500">☾ </span>{n}</p>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'claims' && <ClaimsTab />}

      {tab === 'calendar' && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(TASK_STATUS_STYLE).map(([key, s]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            ))}
          </div>

          <CalendarView events={calendarEvents} onEventClick={handleEventClick} />

          {calendarEvents.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No tasks with due dates assigned to you.</p>
          )}
        </div>
      )}

      {/* Task detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 flex-1 pr-2">{selectedEvent.title}</h2>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 text-xl leading-none ml-2">×</button>
            </div>
            <div className="space-y-2 text-sm">
              {selectedEvent.description && <p className="text-gray-500">{selectedEvent.description}</p>}
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-700">{TASK_STATUS_STYLE[selectedEvent.status]?.label ?? selectedEvent.status}</span>
              </div>
              {selectedEvent.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Due</span>
                  <span className="text-gray-700">{selectedEvent.due_date}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelectedEvent(null); navigate(`/projects?project=${selectedEvent.project}#task-${selectedEvent.id}`) }}
              className="mt-4 w-full bg-primary-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-primary-700 transition"
            >
              Open in Projects <ArrowRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
