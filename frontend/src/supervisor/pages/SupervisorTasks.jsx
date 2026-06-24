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

const PROJECT_STATUS_COLOR = {
  active:   C.green,
  planning: C.blue,
  on_hold:  C.amber,
  done:     C.muted,
}

export default function SupervisorTasks() {
  const navigate = useNavigate()
  const [tab, setTab]               = useState('mine')       // 'mine' | 'others'
  const [filter, setFilter]         = useState('open')       // 'open' | 'done' | 'all'
  const [myProjects, setMyProjects] = useState([])
  const [otherProjects, setOtherProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [expanded, setExpanded]     = useState(new Set())    // project ids
  const [taskCache, setTaskCache]   = useState({})           // id → [{...task, group}]
  const [loading, setLoading]       = useState({})           // id → bool
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/supervisor/')
      .then(res => {
        const d = res.data
        setMyProjects(d.projects || [])
        setOtherProjects(d.other_projects || [])
        const activeId = d.project?.id
        if (activeId) {
          setActiveProjectId(activeId)
          setExpanded(new Set([activeId]))
          fetchTasks(activeId)
        }
      })
      .finally(() => setPageLoading(false))
  }, [])

  async function fetchTasks(projectId) {
    if (taskCache[projectId] !== undefined) return
    setLoading(prev => ({ ...prev, [projectId]: true }))
    try {
      const res = await api.get(`/projects/projects/${projectId}/`)
      const groups = res.data.task_groups || []
      const tasks = groups.flatMap(g => (g.tasks || []).map(t => ({ ...t, group: g.group })))
      setTaskCache(prev => ({ ...prev, [projectId]: tasks }))
    } catch {
      setTaskCache(prev => ({ ...prev, [projectId]: [] }))
    } finally {
      setLoading(prev => ({ ...prev, [projectId]: false }))
    }
  }

  function toggleProject(projectId) {
    fetchTasks(projectId)
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  function applyFilter(tasks) {
    if (filter === 'open') return tasks.filter(t => t.status !== 'done')
    if (filter === 'done') return tasks.filter(t => t.status === 'done')
    return tasks
  }

  const projects = tab === 'mine' ? myProjects : otherProjects

  if (pageLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
      Loading…
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif" }}>

      {/* Top tabs: My Projects / Others */}
      <div style={{ display: 'flex', background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        {[['mine', 'My Projects'], ['others', 'Others']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            style={{
              flex: 1, padding: '11px 4px', fontSize: 12, fontWeight: 700,
              color: tab === val ? C.yellow : C.muted,
              borderBottom: tab === val ? `2px solid ${C.yellow}` : '2px solid transparent',
              background: 'none', cursor: 'pointer',
            }}>
            {label}
            <span style={{ marginLeft: 5, fontSize: 10, color: tab === val ? C.yellow : C.muted }}>
              ({val === 'mine' ? myProjects.length : otherProjects.length})
            </span>
          </button>
        ))}
      </div>

      {/* Task filter */}
      <div style={{ display: 'flex', background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        {[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: 600,
              color: filter === val ? C.text : C.muted,
              borderBottom: filter === val ? `2px solid ${C.blue}` : '2px solid transparent',
              background: 'none', cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Project accordions */}
      <div style={{ padding: '10px 12px 80px' }}>
        {projects.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            No projects
          </div>
        )}

        {projects.map(proj => {
          const isExpanded = expanded.has(proj.id)
          const isActive   = proj.id === activeProjectId
          const tasks      = taskCache[proj.id] || []
          const isLoading  = loading[proj.id]
          const filtered   = applyFilter(tasks)
          const doneCount  = tasks.filter(t => t.status === 'done').length
          const statusColor = PROJECT_STATUS_COLOR[proj.status] || C.muted

          return (
            <div key={proj.id} style={{ marginBottom: 10 }}>

              {/* Project header */}
              <div
                onClick={() => toggleProject(proj.id)}
                style={{
                  background: C.panel,
                  border: `1px solid ${isActive ? C.yellow : C.border}`,
                  borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Status dot */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {proj.name}
                    {isActive && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: C.yellow, background: 'rgba(245,197,24,0.12)', border: `1px solid ${C.yellow}`, borderRadius: 6, padding: '1px 5px', letterSpacing: '0.06em' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{proj.project_no}</span>
                    {tab === 'others' && proj.supervisor && <span>· {proj.supervisor}</span>}
                    {tasks.length > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color: doneCount === tasks.length ? C.green : C.muted }}>
                          {doneCount}/{tasks.length} done
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar (mini) */}
                {tasks.length > 0 && (
                  <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
                    <svg width="36" height="36" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke={C.border} strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke={C.green} strokeWidth="3"
                        strokeDasharray={`${Math.round(doneCount / tasks.length * 88)} 88`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
                    </svg>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: C.text }}>
                      {Math.round(doneCount / tasks.length * 100)}%
                    </span>
                  </div>
                )}

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Task list (expanded) */}
              {isExpanded && (
                <div style={{ border: `1px solid ${isActive ? C.yellow : C.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                  {isLoading ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>Loading…</div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
                      {tasks.length === 0 ? 'No tasks in this project' : 'No tasks match filter'}
                    </div>
                  ) : filtered.map((task, i) => {
                    const st = STATUS[task.status] || STATUS.todo
                    return (
                      <div key={task.id}
                        onClick={() => navigate(`/supervisor/tasks/${task.id}`)}
                        style={{
                          background: C.card,
                          padding: '11px 14px',
                          cursor: 'pointer',
                          borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                          borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || C.muted}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}>
                        <span style={{ fontSize: 15, color: st.color, flexShrink: 0 }}>{st.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700,
                            color: task.status === 'done' ? C.muted : C.text,
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                            {task.group && <span>{task.group}</span>}
                            {task.assigned_to_name && <span> · {task.assigned_to_name.split(' ')[0]}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          {task.photo_count > 0 && <span style={{ fontSize: 10, color: C.blue }}>📷{task.photo_count}</span>}
                          {task.comment_count > 0 && <span style={{ fontSize: 10, color: C.muted }}>💬{task.comment_count}</span>}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
