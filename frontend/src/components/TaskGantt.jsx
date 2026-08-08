import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'

// Timeline built in day-units: every position is (days from gridStart) * pxPerDay.
// Columns may span several days (weeks, months) but geometry stays day-based.
const UNITS = {
  day:   { label: 'Day',   pxPerDay: 30, pad: 3,  minSpan: 24 },
  week:  { label: 'Week',  pxPerDay: 12, pad: 7,  minSpan: 90 },
  month: { label: 'Month', pxPerDay: 4,  pad: 15, minSpan: 300 },
}
// Duration given to a task dropped straight onto the timeline, per zoom level.
const DROP_SPAN = { day: 3, week: 5, month: 14 }

const BAR_FILL = {
  todo:        '#cbd5e1',
  in_progress: '#fb923c',
  review:      '#60a5fa',
  done:        '#4ade80',
  issue:       '#c084fc',
}
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', issue: 'Issue' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const LEFT_W  = 250
const ROW_H   = 24
const GROUP_H = 26

// --- date helpers (all local-midnight, no timezone maths) --------------------
function parseISO(s) {
  if (!s) return null
  const [y, m, d] = String(s).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDays(d, n) { const c = startOfDay(d); c.setDate(c.getDate() + n); return c }
function dayDiff(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000) }
function startOfWeek(d) { const c = startOfDay(d); return addDays(c, -((c.getDay() + 6) % 7)) } // Monday
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function fmt(d) { return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '—' }

function apiError(err) {
  const d = err?.response?.data
  if (!d) return err?.message || 'Request failed'
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  const first = Object.entries(d)[0]
  if (!first) return 'Request failed'
  return `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`
}

function buildColumns(unit, from, to) {
  const cols = []
  if (unit === 'day') {
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
      cols.push({ start: d, days: 1, label: String(d.getDate()), weekend: d.getDay() === 0 || d.getDay() === 6 })
    }
  } else if (unit === 'week') {
    for (let d = startOfWeek(from); d <= to; d = addDays(d, 7)) {
      cols.push({ start: d, days: 7, label: `${d.getDate()}/${d.getMonth() + 1}`, weekend: false })
    }
  } else {
    for (let d = startOfMonth(from); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      cols.push({ start: d, days, label: MONTHS[d.getMonth()], weekend: false })
    }
  }
  return cols
}

// Upper header tier: month bands for day/week zoom, year bands for month zoom.
function buildBands(unit, cols) {
  const bands = []
  for (const c of cols) {
    const key = unit === 'month' ? String(c.start.getFullYear())
                                 : `${c.start.getFullYear()}-${c.start.getMonth()}`
    const label = unit === 'month' ? String(c.start.getFullYear())
                                   : `${MONTHS[c.start.getMonth()]} ${String(c.start.getFullYear()).slice(2)}`
    const last = bands[bands.length - 1]
    if (last && last.key === key) last.days += c.days
    else bands.push({ key, label, days: c.days })
  }
  return bands
}

export default function TaskGantt({ project, editable, onChange }) {
  const [unit, setUnit]       = useState(() => localStorage.getItem('farm.gantt.unit') || 'week')
  const [drag, setDrag]       = useState(null)     // live preview during a drag
  const [override, setOverride] = useState(null)   // holds the new dates until refetch lands
  const [saving, setSaving]   = useState(null)
  const [error, setError]     = useState('')
  const scrollRef  = useRef(null)
  const overlayRef = useRef(null)
  const dragRef    = useRef(null)
  const didCentre  = useRef(false)
  // Handlers are re-created every render, so the exact identities that were
  // attached must be kept in order to detach them again (Esc, unmount, drop).
  const listenersRef = useRef(null)

  const { pxPerDay, pad, minSpan } = UNITS[unit]

  useEffect(() => { localStorage.setItem('farm.gantt.unit', unit) }, [unit])

  const groups = useMemo(() => project.task_groups || [], [project])
  const allTasks = useMemo(() => groups.flatMap(g => g.tasks), [groups])

  // A task's effective dates: live drag preview > pending save > server value.
  function datesOf(task) {
    if (drag && drag.taskId === task.id) return { start: drag.start, end: drag.end }
    if (override && override.taskId === task.id) return { start: override.start, end: override.end }
    const start = parseISO(task.start_date)
    const end   = parseISO(task.end_date) || start
    return start ? { start, end: end < start ? start : end } : { start: null, end: null }
  }

  const scheduled = allTasks.map(datesOf).filter(d => d.start)
  const unscheduledCount = allTasks.length - scheduled.length

  // --- timeline range ---
  const { cols, bands, gridStart, totalW } = useMemo(() => {
    const today = startOfDay(new Date())
    let from = today, to = today
    if (scheduled.length) {
      from = scheduled.reduce((m, d) => (d.start < m ? d.start : m), scheduled[0].start)
      to   = scheduled.reduce((m, d) => (d.end   > m ? d.end   : m), scheduled[0].end)
      if (today < from) from = today
      if (today > to) to = today
    }
    from = addDays(from, -pad)
    to   = addDays(to, pad)
    if (dayDiff(from, to) < minSpan) to = addDays(from, minSpan)
    const c = buildColumns(unit, from, to)
    const gs = c.length ? c[0].start : from
    return {
      cols: c,
      bands: buildBands(unit, c),
      gridStart: gs,
      totalW: c.reduce((s, x) => s + x.days, 0) * pxPerDay,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, unit, drag, override, pxPerDay, pad, minSpan])

  const xOf = d => dayDiff(gridStart, d) * pxPerDay
  const todayX = xOf(startOfDay(new Date()))

  function scrollToToday() {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - 180)
  }
  useEffect(() => {
    if (didCentre.current || !scrollRef.current) return
    didCentre.current = true
    scrollToToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalW])

  // --- dragging ---------------------------------------------------------------
  // modes: move | resize-l | resize-r | draw (on an empty track) | place (from the left pane)
  function dayAtClientX(clientX) {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return null
    return addDays(gridStart, Math.floor((clientX - rect.left) / pxPerDay))
  }

  function attach(onMove, onUp) {
    detach()
    listenersRef.current = { onMove, onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  function detach() {
    const l = listenersRef.current
    if (l) {
      window.removeEventListener('mousemove', l.onMove)
      window.removeEventListener('mouseup', l.onUp)
      listenersRef.current = null
    }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  function abortDrag() {
    detach()
    dragRef.current = null
    setDrag(null)
  }

  function beginDrag(e, task, mode) {
    if (!editable || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const { start, end } = datesOf(task)
    let origStart = start, origEnd = end
    if (mode === 'draw') {
      const d = dayAtClientX(e.clientX)
      if (!d) return
      origStart = d; origEnd = d
    }
    if (mode !== 'place' && !origStart) return

    dragRef.current = { taskId: task.id, mode, originX: e.clientX, origStart, origEnd, moved: false, start: origStart, end: origEnd }
    setDrag({ taskId: task.id, mode, start: origStart, end: origEnd })
    attach(onDragMove, onDragEnd)
    document.body.style.cursor = mode === 'move' || mode === 'place' ? 'grabbing' : 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onDragMove(ev) {
    const st = dragRef.current
    if (!st) return
    let start = st.origStart, end = st.origEnd

    if (st.mode === 'place') {
      const d = dayAtClientX(ev.clientX)
      if (!d) return
      start = d
      end = addDays(d, DROP_SPAN[unit] - 1)
      st.moved = true
    } else {
      const delta = Math.round((ev.clientX - st.originX) / pxPerDay)
      if (delta !== 0) st.moved = true
      if (st.mode === 'move') {
        start = addDays(st.origStart, delta)
        end   = addDays(st.origEnd, delta)
      } else if (st.mode === 'resize-l') {
        start = addDays(st.origStart, delta)
        if (start > st.origEnd) start = st.origEnd
        end = st.origEnd
      } else if (st.mode === 'resize-r') {
        end = addDays(st.origEnd, delta)
        if (end < st.origStart) end = st.origStart
        start = st.origStart
      } else if (st.mode === 'draw') {
        const d = addDays(st.origStart, delta)
        st.moved = true
        if (d < st.origStart) { start = d; end = st.origStart }
        else { start = st.origStart; end = d }
      }
    }
    st.start = start
    st.end = end
    setDrag({ taskId: st.taskId, mode: st.mode, start, end })
  }

  async function onDragEnd() {
    detach()
    const st = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!st || !st.moved || !st.start || !st.end) return

    const task = allTasks.find(t => t.id === st.taskId)
    const startISO = toISO(st.start)
    const endISO   = toISO(st.end)
    if (task && task.start_date === startISO && task.end_date === endISO) return

    // Hold the new position on screen so the bar doesn't snap back while saving.
    setOverride({ taskId: st.taskId, start: st.start, end: st.end })
    setSaving(st.taskId)
    try {
      // due_date tracks end_date so rescheduling here also moves the task on the
      // Calendar and in the dashboard's overdue / due-this-week widgets.
      await api.patch(`/projects/tasks/${st.taskId}/`, { start_date: startISO, end_date: endISO, due_date: endISO })
      setError('')
      await onChange()
    } catch (err) {
      setError(`Couldn't reschedule "${task?.title || 'task'}" — ${apiError(err)}`)
    } finally {
      setSaving(null)
      setOverride(null)
    }
  }

  // Esc abandons an in-flight drag and snaps the bar back — same contract as Esc
  // in the sheet view. Captured so it wins before the page-level handler.
  useEffect(() => {
    if (!drag) return
    function onKey(e) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      abortDrag()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  useEffect(() => detach, [])

  async function clearDates(task) {
    setSaving(task.id)
    try {
      await api.patch(`/projects/tasks/${task.id}/`, { start_date: null, end_date: null, due_date: null })
      setError('')
      await onChange()
    } catch (err) {
      setError(`Couldn't unschedule "${task.title}" — ${apiError(err)}`)
    } finally {
      setSaving(null)
    }
  }

  // --- render helpers ---------------------------------------------------------
  function Bar({ task, gi, ti }) {
    const { start, end } = datesOf(task)
    if (!start) {
      return editable ? (
        <div
          onMouseDown={e => beginDrag(e, task, 'draw')}
          className="group absolute inset-y-0 left-0 right-0 cursor-crosshair"
          title="Drag across this row to schedule the task"
        >
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition">
            drag to schedule
          </span>
        </div>
      ) : null
    }
    const left = xOf(start)
    const width = Math.max(pxPerDay, (dayDiff(start, end) + 1) * pxPerDay)
    const busy = saving === task.id
    return (
      <div
        onMouseDown={e => beginDrag(e, task, 'move')}
        title={`${gi + 1}.${ti + 1} ${task.title}\n${fmt(start)} → ${fmt(end)} (${dayDiff(start, end) + 1}d)\n${STATUS_LABELS[task.status] || task.status}${task.assigned_to_name ? ` · ${task.assigned_to_name}` : ''}`}
        className={`absolute rounded-[3px] flex items-center ${editable ? 'cursor-grab' : ''} ${busy ? 'opacity-50' : ''}`}
        style={{ left, width, top: 4, height: ROW_H - 9, background: BAR_FILL[task.status] || BAR_FILL.todo }}
      >
        {editable && (
          <div onMouseDown={e => beginDrag(e, task, 'resize-l')}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-black/20 rounded-l-[3px]" />
        )}
        <span className="px-1.5 text-[10px] leading-none text-gray-800/80 truncate select-none">{task.title}</span>
        {editable && (
          <div onMouseDown={e => beginDrag(e, task, 'resize-r')}
            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-black/20 rounded-r-[3px]" />
        )}
      </div>
    )
  }

  function GroupBar({ grp }) {
    const ds = grp.tasks.map(datesOf).filter(d => d.start)
    if (!ds.length) return null
    const start = ds.reduce((m, d) => (d.start < m ? d.start : m), ds[0].start)
    const end   = ds.reduce((m, d) => (d.end   > m ? d.end   : m), ds[0].end)
    return (
      <div className="absolute rounded-sm bg-gray-500/70"
        style={{ left: xOf(start), width: Math.max(pxPerDay, (dayDiff(start, end) + 1) * pxPerDay), top: GROUP_H / 2 - 3, height: 6 }}
        title={`${grp.group || 'General'}: ${fmt(start)} → ${fmt(end)}`} />
    )
  }

  const btn = active =>
    `text-[11px] px-2 py-1 border transition ${active
      ? 'bg-primary-600 border-primary-600 text-white'
      : 'bg-white border-gray-300 text-gray-500 hover:text-gray-700'}`

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex">
          {Object.entries(UNITS).map(([k, u]) => (
            <button key={k} onClick={() => setUnit(k)} className={`${btn(unit === k)} -ml-px first:ml-0`}>{u.label}</button>
          ))}
        </div>
        <button onClick={scrollToToday} className="text-[11px] px-2 py-1 border border-gray-300 text-gray-500 hover:text-gray-700 bg-white transition">
          Today
        </button>
        {unscheduledCount > 0 && (
          <span className="text-[11px] text-gray-400">
            {unscheduledCount} unscheduled
            {editable && <span className="ml-1 text-gray-300">· drag a row’s ⠿ handle onto the timeline, or drag across its track</span>}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-gray-400">
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: BAR_FILL[k] }} />{label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-1 mb-2">{error}</p>
      )}

      <div ref={scrollRef} className="overflow-auto border border-gray-300 bg-white" style={{ maxHeight: 'calc(100vh - 230px)' }}>
        <div style={{ width: LEFT_W + totalW }}>

          {/* Header — two tiers */}
          <div className="sticky top-0 z-30 flex bg-gray-100 border-b border-gray-300">
            <div className="sticky left-0 z-10 shrink-0 bg-gray-100 border-r border-gray-300 flex items-end px-1.5 pb-1"
              style={{ width: LEFT_W }}>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Task</span>
            </div>
            <div style={{ width: totalW }}>
              <div className="flex h-5">
                {bands.map(b => (
                  <div key={b.key} style={{ width: b.days * pxPerDay }}
                    className="border-r border-gray-300 text-[10px] font-semibold text-gray-500 px-1 leading-5 truncate">
                    {b.label}
                  </div>
                ))}
              </div>
              <div className="flex h-4 border-t border-gray-200">
                {cols.map((c, i) => (
                  <div key={i} style={{ width: c.days * pxPerDay }}
                    className={`border-r border-gray-200 text-[9px] text-gray-400 text-center leading-4 truncate ${c.weekend ? 'bg-gray-200/60' : ''}`}>
                    {pxPerDay * c.days >= 18 ? c.label : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {/* gridlines + weekend shading, painted under the rows */}
            <div ref={overlayRef} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: LEFT_W, width: totalW }}>
              {cols.map((c, i) => (
                <div key={i} className={`absolute top-0 bottom-0 border-r border-gray-100 ${c.weekend ? 'bg-gray-50' : ''}`}
                  style={{ left: xOf(c.start), width: c.days * pxPerDay }} />
              ))}
            </div>

            {groups.map((grp, gi) => (
              <Fragment key={grp.group}>
                <div className="relative flex bg-gray-50 border-b border-t border-gray-300" style={{ height: GROUP_H }}>
                  <div className="sticky left-0 z-20 shrink-0 bg-gray-50 border-r border-gray-300 flex items-center gap-1.5 px-1.5"
                    style={{ width: LEFT_W }}>
                    <span className="text-[11px] font-bold text-gray-400 w-4 text-right">{gi + 1}</span>
                    <span className="text-xs font-semibold text-gray-700 truncate">{grp.group || 'General'}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-auto">{grp.done_count}/{grp.task_count}</span>
                  </div>
                  <div className="relative" style={{ width: totalW }}>
                    <GroupBar grp={grp} />
                  </div>
                </div>

                {grp.tasks.map((task, ti) => {
                  const { start } = datesOf(task)
                  return (
                    <div key={task.id} className="relative flex border-b border-gray-100 hover:bg-primary-50/40" style={{ height: ROW_H }}>
                      <div className="sticky left-0 z-20 shrink-0 bg-white border-r border-gray-200 flex items-center gap-1 px-1.5"
                        style={{ width: LEFT_W }}>
                        <span className="font-mono text-[10px] text-gray-400 w-7 text-right shrink-0">{gi + 1}.{ti + 1}</span>
                        {editable && !start && (
                          <span
                            onMouseDown={e => beginDrag(e, task, 'place')}
                            title="Drag onto the timeline to schedule"
                            className="text-[11px] leading-none text-gray-300 hover:text-primary-500 cursor-grab select-none shrink-0"
                          >⠿</span>
                        )}
                        <span className={`text-[11px] truncate ${start ? 'text-gray-700' : 'text-gray-400 italic'}`} title={task.title}>
                          {task.title}
                        </span>
                        {task.assigned_to_name && (
                          <span className="text-[10px] text-gray-400 shrink-0 ml-auto">{task.assigned_to_name.split(' ')[0]}</span>
                        )}
                        {editable && start && (
                          <button onClick={() => clearDates(task)} title="Clear dates (unschedule)"
                            className="text-[10px] text-gray-300 hover:text-red-500 shrink-0">✕</button>
                        )}
                      </div>
                      <div className="relative" style={{ width: totalW }}>
                        <Bar task={task} gi={gi} ti={ti} />
                      </div>
                    </div>
                  )
                })}
              </Fragment>
            ))}

            {groups.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-gray-400">No task groups yet.</div>
            )}

            {/* today marker, above the bars */}
            {todayX >= 0 && todayX <= totalW && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none" style={{ left: LEFT_W + todayX }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
