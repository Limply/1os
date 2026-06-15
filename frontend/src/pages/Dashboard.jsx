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
