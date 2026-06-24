import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const C = {
  panel:  '#212D3E',
  card:   '#273447',
  border: '#2F4060',
  yellow: '#F5C518',
  amber:  '#E8942A',
  green:  '#2ECC71',
  red:    '#E74C3C',
  blue:   '#3A8EE6',
  text:   '#EEF2F7',
  muted:  '#7A90AA',
  bg:     '#1A2332',
}

const STATUS = {
  todo:        { label: 'To Do',       color: C.muted,  icon: '○' },
  in_progress: { label: 'In Progress', color: C.amber,  icon: '◑' },
  review:      { label: 'Review',      color: C.blue,   icon: '◉' },
  done:        { label: 'Done',        color: C.green,  icon: '●' },
  issue:       { label: 'Issue',       color: C.red,    icon: '!' },
}

const PRIORITY_COLOR = { low: C.muted, medium: C.yellow, high: C.amber, urgent: C.red }

export default function SupervisorTasks() {
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('open')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const sup = await api.get('/dashboard/supervisor/')
      const proj = sup.data?.project
      if (!proj?.id) { setLoading(false); return }
      setProject(proj)
      const detail = await api.get(`/projects/projects/${proj.id}/`)
      setGroups(detail.data.task_groups || [])
    } catch {
      // no active project
    } finally {
      setLoading(false)
    }
  }

  const allTasks = groups.flatMap(g => (g.tasks || []).map(t => ({ ...t, group: g.group })))
  const filtered = filter === 'open'
    ? allTasks.filter(t => t.status !== 'done')
    : filter === 'done'
    ? allTasks.filter(t => t.status === 'done')
    : allTasks

  const counts = {
    open:  allTasks.filter(t => t.status !== 'done').length,
    done:  allTasks.filter(t => t.status === 'done').length,
    total: allTasks.length,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
      Loading…
    </div>
  )

  if (!project) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", gap: 10 }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700 }}>No active project assigned</span>
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif" }}>

      {/* Project header */}
      <div style={{ background: C.panel, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {project.project_no}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginTop: 2 }}>{project.name}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: C.muted }}>{counts.done}/{counts.total} done</span>
          <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 4, marginTop: 4, alignSelf: 'center' }}>
            <div style={{ width: `${counts.total ? Math.round(counts.done / counts.total * 100) : 0}%`, height: 4, background: C.green, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        {[['open', `Open (${counts.open})`], ['done', `Done (${counts.done})`], ['all', `All (${counts.total})`]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              flex: 1, padding: '9px 4px', fontSize: 11, fontWeight: 700,
              color: filter === val ? C.yellow : C.muted,
              borderBottom: filter === val ? `2px solid ${C.yellow}` : '2px solid transparent',
              background: 'none', cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={{ padding: '8px 12px 24px' }}>
        {filtered.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '32px 0' }}>No tasks</div>
        )}
        {filtered.map(task => {
          const st = STATUS[task.status] || STATUS.todo
          return (
            <div key={task.id} onClick={() => navigate(`/supervisor/tasks/${task.id}`)}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || C.muted}`,
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1.2, color: st.color, flexShrink: 0 }}>{st.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: task.status === 'done' ? C.muted : C.text,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: 'flex', gap: 10 }}>
                    {task.group && <span>{task.group}</span>}
                    {task.assigned_to_name && <span>· {task.assigned_to_name.split(' ')[0]}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {task.photo_count > 0 && (
                    <span style={{ fontSize: 10, color: C.blue }}>📷{task.photo_count}</span>
                  )}
                  {task.comment_count > 0 && (
                    <span style={{ fontSize: 10, color: C.muted }}>💬{task.comment_count}</span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
