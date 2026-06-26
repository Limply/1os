import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const TODAY = new Date().toLocaleDateString('en-SG', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

const PRIORITY_DOT = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  medium: 'bg-yellow-400',
  low:    'bg-gray-300',
}

function KpiCard({ label, value, sub, accent = 'blue', onClick }) {
  const accents = {
    blue:   'border-primary-200 bg-primary-50',
    green:  'border-green-200 bg-green-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    red:    'border-red-200 bg-red-50',
    purple: 'border-purple-200 bg-purple-50',
    gray:   'border-gray-200 bg-gray-50',
  }
  const textAccents = {
    blue:   'text-primary-700',
    green:  'text-green-700',
    yellow: 'text-yellow-700',
    red:    'text-red-600',
    purple: 'text-purple-700',
    gray:   'text-gray-600',
  }
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-5 ${accents[accent]} ${onClick ? 'cursor-pointer hover:shadow-sm transition' : ''}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${textAccents[accent]}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 ${textAccents[accent]}`}>
        {value === null || value === undefined ? '—' : value}
      </p>
      {sub && <p className={`text-xs mt-1 opacity-60 ${textAccents[accent]}`}>{sub}</p>}
    </div>
  )
}

const STATUS_COLORS = {
  active:    '#3b82f6',
  planning:  '#a78bfa',
  on_hold:   '#f59e0b',
  completed: '#10b981',
  cancelled: '#9ca3af',
}
const STATUS_LABELS = {
  active: 'Active', planning: 'Planning', on_hold: 'On Hold',
  completed: 'Completed', cancelled: 'Cancelled',
}
const STATUS_ORDER = ['active', 'planning', 'on_hold', 'completed', 'cancelled']
const money = n => `$${Number(n || 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`

function Donut({ segments, total, centerLabel, centerSub }) {
  const size = 130, stroke = 16, r = (size - stroke) / 2, C = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * C
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </g>
      <text x="50%" y="48%" textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: '#1f2937' }}>{centerLabel}</text>
      <text x="50%" y="63%" textAnchor="middle" style={{ fontSize: 10, fill: '#9ca3af' }}>{centerSub}</text>
    </svg>
  )
}

function Bar({ label, value, max, color = '#3b82f6', display }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 truncate pr-2">{label}</span>
        <span className="text-gray-700 font-semibold shrink-0">{display ?? value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full" style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/overview/')
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const k = data?.kpis ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{TODAY}</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Active Projects"
              value={k.active_projects}
              sub={`${k.planning_projects ?? 0} planning · ${k.on_hold_projects ?? 0} on hold`}
              accent="blue"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              label="Ending This Month"
              value={k.projects_ending_this_month}
              sub="Active projects"
              accent="purple"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              label="Overdue Tasks"
              value={k.overdue_tasks}
              sub={`${k.tasks_due_this_week ?? 0} due this week`}
              accent={k.overdue_tasks > 0 ? 'red' : 'green'}
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              label="Staff on Leave"
              value={k.staff_on_leave_today}
              sub={`of ${k.total_employees ?? '—'} employees`}
              accent="yellow"
              onClick={() => navigate('/hr')}
            />
            <KpiCard
              label="Open Leads"
              value={k.open_leads}
              sub={`${k.won_leads_this_month ?? 0} won this month`}
              accent="green"
              onClick={() => navigate('/crm')}
            />
          </div>

          {/* Company-wide graphical overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Project status donut */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Status</h2>
              {(() => {
                const ps = data?.project_status ?? {}
                const total = ps.total || 0
                const segs = STATUS_ORDER.map(s => ({ value: ps[s] || 0, color: STATUS_COLORS[s] })).filter(s => s.value > 0)
                return (
                  <div className="flex items-center gap-4">
                    <Donut segments={segs} total={total} centerLabel={total} centerSub="projects" />
                    <div className="flex-1 space-y-1.5">
                      {STATUS_ORDER.map(s => (
                        <div key={s} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-gray-600">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                            {STATUS_LABELS[s]}
                          </span>
                          <span className="font-semibold text-gray-700">{ps[s] || 0}</span>
                        </div>
                      ))}
                      <div className="pt-1.5 mt-1 border-t border-gray-100 text-xs text-gray-400">
                        Avg active progress {ps.avg_active_progress || 0}%
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Manpower on site */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Manpower on Site — Today</h2>
              {(() => {
                const m = data?.manpower ?? {}
                const sites = Array.isArray(m.by_site) ? m.by_site : []
                const max = Math.max(1, ...sites.map(s => s.count))
                return (
                  <>
                    <div className="flex items-end gap-4 mb-3">
                      <div>
                        <p className="text-3xl font-bold text-primary-700 leading-none">{m.clocked_in_today ?? 0}</p>
                        <p className="text-xs text-gray-400 mt-1">clocked in</p>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5 pb-0.5">
                        <p><span className="font-semibold text-green-600">{m.on_site_now ?? 0}</span> on site now</p>
                        <p>{m.on_leave_today ?? 0} on leave · {m.total_employees ?? 0} staff</p>
                      </div>
                    </div>
                    {sites.length === 0 ? (
                      <p className="text-sm text-gray-400">No clock-ins yet today.</p>
                    ) : (
                      <div className="space-y-2">
                        {sites.slice(0, 6).map((s, i) => (
                          <Bar key={i} color="#10b981" value={s.count} max={max}
                            label={s.project_no ? `${s.project_no} · ${s.name}` : s.name} />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Financials (manager and above) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials — This Month</h2>
              {data?.financials ? (() => {
                const f = data.financials
                const scale = Math.max(1, f.outstanding_receivables, f.revenue_this_month, f.invoiced_this_month, f.expenses_this_month)
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-green-50 p-2.5">
                        <p className="text-[11px] text-green-700 opacity-70 font-medium">Revenue MTD</p>
                        <p className="text-lg font-bold text-green-700">{money(f.revenue_this_month)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-50 p-2.5">
                        <p className="text-[11px] text-primary-700 opacity-70 font-medium">Receivables</p>
                        <p className="text-lg font-bold text-primary-700">{money(f.outstanding_receivables)}</p>
                      </div>
                    </div>
                    <Bar label="Invoiced MTD" value={f.invoiced_this_month} max={scale} color="#3b82f6" display={money(f.invoiced_this_month)} />
                    <Bar label="Revenue MTD"  value={f.revenue_this_month}  max={scale} color="#10b981" display={money(f.revenue_this_month)} />
                    <Bar label="Expenses MTD" value={f.expenses_this_month} max={scale} color="#f59e0b" display={money(f.expenses_this_month)} />
                    {f.overdue_invoices_count > 0 && (
                      <p className="text-xs text-red-500 pt-1">
                        {f.overdue_invoices_count} overdue invoice{f.overdue_invoices_count > 1 ? 's' : ''} · {money(f.overdue_invoices_amount)}
                      </p>
                    )}
                  </div>
                )
              })() : (
                <p className="text-sm text-gray-400 py-2">Visible to managers and above.</p>
              )}
            </div>

          </div>

          {/* Detail rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Projects ending soon */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Projects Ending Soon
              </h2>
              {(data?.ending_soon ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No active projects with end dates.</p>
              ) : (
                <div className="space-y-2">
                  {data.ending_soon.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate('/projects')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.project_no} · ends {p.end_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-semibold ${p.days_left <= 7 ? 'text-red-500' : p.days_left <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {p.days_left === 0 ? 'Today' : `${p.days_left}d left`}
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1 mt-1">
                          <div
                            className="bg-primary-500 h-1 rounded-full"
                            style={{ width: `${Math.min(100, p.progress)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue tasks */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Overdue Tasks
              </h2>
              {(data?.overdue_tasks_list ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No overdue tasks.</p>
              ) : (
                <div className="space-y-2">
                  {data.overdue_tasks_list.map(t => (
                    <div
                      key={t.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate('/projects')}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400">{t['project__project_no']} · due {t.due_date}</p>
                      </div>
                      <span className="text-xs font-semibold text-red-500 shrink-0">
                        {t.days_overdue}d ago
                      </span>
                    </div>
                  ))}
                  {k.overdue_tasks > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      +{k.overdue_tasks - 5} more overdue tasks
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
