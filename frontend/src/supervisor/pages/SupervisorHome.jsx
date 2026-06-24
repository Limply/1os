import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

// ── colour tokens ─────────────────────────────────────────────────────────────
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
}

const STATUS_PILL = {
  todo:        { text: 'To Do',       color: C.muted,   bg: 'rgba(122,144,170,0.15)' },
  in_progress: { text: 'In Progress', color: C.yellow,  bg: 'rgba(245,197,24,0.15)'  },
  review:      { text: 'Review',      color: C.blue,    bg: 'rgba(58,142,230,0.15)'  },
  done:        { text: 'Done',        color: C.green,   bg: 'rgba(46,204,113,0.15)'  },
  issue:       { text: 'Issue',       color: C.red,     bg: 'rgba(231,76,60,0.15)'   },
}

// ── reusable tiny components ───────────────────────────────────────────────────

function SumChip({ color, num, label, icon }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 6px 7px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ opacity: 0.7 }}>{icon}</span>
      <span style={{ fontSize: 19, fontWeight: 900, lineHeight: 1, color }}>{num}</span>
      <span style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function ActionCard({ acColor, acBg, icon, title, desc, badge, badgeBg, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '15px 13px 13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9, position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: acColor, borderRadius: '2px 2px 0 0' }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: acBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.4, marginTop: 3 }}>{desc}</div>
      </div>
      {badge != null && (
        <span style={{ position: 'absolute', top: 9, right: 9, borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '2px 7px', lineHeight: 1.5, background: badgeBg, color: '#fff' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function ListCard({ iconBg, icon, title, sub, pillText, pillColor, pillBg, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '3px 9px', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, background: pillBg, color: pillColor }}>
        {pillText}
      </span>
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '16px 0 9px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ── icons ──────────────────────────────────────────────────────────────────────

const IconWorkers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconDone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconAlertRed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

function IconTask(color) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconPerson(color) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function SupervisorHome() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/supervisor/')
      .then(res => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  const navigate = useNavigate()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  const site    = data?.site
  const summary = data?.summary || {}
  const tasks   = data?.tasks   || []
  const team    = data?.team    || []

  return (
    <div style={{ background: '#1A2332' }}>

      {/* Site banner */}
      <div style={{ background: 'linear-gradient(130deg, #1B3558 0%, #0F2238 100%)', padding: '13px 20px', borderBottom: `2px solid ${C.yellow}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'rgba(245,197,24,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Active Site</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginTop: 1 }}>
              {site ? site.name : 'No active site'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {site ? site.project_no : '—'}
            </div>
            {site?.site_address && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                📍 {site.site_address}
              </div>
            )}
            {site?.site_lat && site?.site_lng && (
              <a
                href={`https://maps.google.com/?q=${site.site_lat},${site.site_lng}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: C.blue, marginTop: 3, display: 'inline-block' }}
              >
                {parseFloat(site.site_lat).toFixed(5)}, {parseFloat(site.site_lng).toFixed(5)} ↗
              </a>
            )}
          </div>
        </div>
        <div style={{ background: site ? 'rgba(46,204,113,0.13)' : 'rgba(122,144,170,0.13)', border: `1px solid ${site ? C.green : C.muted}`, color: site ? C.green : C.muted, borderRadius: 20, padding: '5px 11px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, background: site ? C.green : C.muted, borderRadius: '50%' }} />
          {site ? 'ACTIVE' : 'NONE'}
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', padding: '10px 14px', gap: 8, background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <SumChip color={C.blue}  num={summary.workers_on_site ?? 0} label="Workers" icon={<IconWorkers />} />
        <SumChip color={C.green} num={summary.tasks_done      ?? 0} label="Done"    icon={<IconDone />} />
        <SumChip color={C.amber} num={summary.tasks_pending   ?? 0} label="Pending" icon={<IconClock />} />
        <SumChip color={C.red}   num={summary.tasks_urgent    ?? 0} label="Urgent"  icon={<IconAlertRed />} />
      </div>

      {/* Scroll content */}
      <div style={{ padding: '14px 14px 24px' }}>

        <SectionHead>Quick Actions</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 4 }}>

          <ActionCard
            acColor={C.yellow} acBg="rgba(245,197,24,0.1)"
            title="Daily Manpower" desc="Submit manpower report"
            onClick={() => navigate('/supervisor/daily-report')}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/><polyline points="16 13 12.5 17 11 15.5"/></svg>}
          />

          <ActionCard
            acColor={C.red} acBg="rgba(231,76,60,0.1)"
            title="Report Problem" desc="Tell boss about any issue"
            badge="!" badgeBg={C.red}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          />

          <ActionCard
            acColor={C.green} acBg="rgba(46,204,113,0.1)"
            title="Take Photo" desc="Photo of work done"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
          />

          <ActionCard
            acColor={C.blue} acBg="rgba(58,142,230,0.1)"
            title="Clock In / Out" desc="Check in / check out"
            badge={summary.workers_on_site || null} badgeBg={C.blue}
            onClick={() => navigate('/supervisor/clock-in')}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />

        </div>

        {/* My Team Today */}
        <SectionHead>My Team Today</SectionHead>

        {team.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No workers clocked in yet</div>
        ) : team.map((w, i) => (
          <ListCard
            key={i}
            iconBg="rgba(58,142,230,0.1)"
            icon={IconPerson(C.blue)}
            title={w.name}
            sub={`${w.position || 'Worker'} · In since ${w.clock_in}`}
            pillText={w.status === 'out' ? 'Out' : 'In'}
            pillColor={w.status === 'out' ? C.muted : C.green}
            pillBg={w.status === 'out' ? 'rgba(122,144,170,0.15)' : 'rgba(46,204,113,0.15)'}
          />
        ))}

        {/* Today's Tasks */}
        <SectionHead>Today's Tasks</SectionHead>

        {tasks.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No open tasks</div>
        ) : tasks.map(t => {
          const pill = STATUS_PILL[t.status] || STATUS_PILL.todo
          const iconColor = t.priority === 'urgent' ? C.red : t.priority === 'high' ? C.amber : C.yellow
          return (
            <ListCard
              key={t.id}
              iconBg="rgba(245,197,24,0.1)"
              icon={IconTask(iconColor)}
              title={t.title}
              sub={`${t.project_no} · ${t.group || 'General'}`}
              pillText={pill.text}
              pillColor={pill.color}
              pillBg={pill.bg}
              onClick={() => navigate(`/supervisor/tasks/${t.id}`)}
            />
          )
        })}

      </div>
    </div>
  )
}
