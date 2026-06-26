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
          {/* Company-wide graphical overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Active projects by progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Projects</h2>
              {(() => {
                const ps = data?.project_status ?? {}
                const ap = ps.active_progress ?? {}
                const buckets = [
                  { key: 'not_started', label: 'Not started', color: '#9ca3af', value: ap.not_started || 0 },
                  { key: 'in_progress', label: 'In progress', color: '#3b82f6', value: ap.in_progress || 0 },
                  { key: 'near_done',   label: 'Near done',   color: '#10b981', value: ap.near_done || 0 },
                ]
                const activeTotal = ps.active || 0
                const segs = buckets.filter(b => b.value > 0)
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <Donut segments={segs} total={activeTotal} centerLabel={activeTotal} centerSub="active" />
                      <div className="flex-1 space-y-1.5">
                        {buckets.map(b => (
                          <div key={b.key} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-gray-600">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                              {b.label}
                            </span>
                            <span className="font-semibold text-gray-700">{b.value}</span>
                          </div>
                        ))}
                        <div className="pt-1.5 mt-1 border-t border-gray-100 text-xs text-gray-400">
                          Avg progress {ps.avg_active_progress || 0}%
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => navigate('/projects')}
                        className="flex-1 rounded-lg bg-purple-50 hover:bg-purple-100 p-2 text-left transition">
                        <p className="text-lg font-bold text-purple-700 leading-none">{k.projects_ending_this_month ?? 0}</p>
                        <p className="text-[11px] text-purple-700 opacity-70 mt-0.5">ending this month</p>
                      </button>
                      <button onClick={() => navigate('/projects')}
                        className={`flex-1 rounded-lg p-2 text-left transition ${k.overdue_tasks > 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <p className={`text-lg font-bold leading-none ${k.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-600'}`}>{k.overdue_tasks ?? 0}</p>
                        <p className={`text-[11px] opacity-70 mt-0.5 ${k.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-500'}`}>overdue tasks</p>
                      </button>
                    </div>
                  </>
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

          {/* CRM mini line */}
          <button onClick={() => navigate('/crm')}
            className="text-xs text-gray-500 hover:text-gray-700 transition">
            Open leads {k.open_leads ?? 0} · {k.won_leads_this_month ?? 0} won this month →
          </button>

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
