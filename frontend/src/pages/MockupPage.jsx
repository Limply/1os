import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Design mockups live here. To add one:
//   1. Write a small component (static JSX styled like the app).
//   2. Add an entry: { key: 'slug', label: 'Name', element: <YourMock /> }
// They render live at /mock_up_page (unlisted — no sidebar link).
// ─────────────────────────────────────────────────────────────────────────
const MOCKUPS = [
  { key: 'dashboard', label: 'Dashboard (redesign)', element: <DashboardMock /> },
  { key: 'record-payment', label: 'Record Payment', element: <RecordPaymentMock /> },
]

// Static sample data (mockup only — not wired to the API)
const SAMPLE_INVOICES = [
  { id: 1, invoice_no: 'INV-26-0042', org: 'Acme Pte Ltd', total: 12000, balance: 4000 },
  { id: 2, invoice_no: 'INV-26-0039', org: 'BuildCo Engineering', total: 8500, balance: 8500 },
  { id: 3, invoice_no: 'INV-26-0031', org: 'Horizon Developments', total: 21000, balance: 0 },
]
const METHODS = ['bank_transfer', 'cheque', 'cash', 'paynow', 'credit_card']
const SAMPLE_PAYMENTS = [
  { id: 1, payment_date: '2026-06-12', method: 'bank_transfer', amount: 8000, reference: 'TXN-99812' },
  { id: 2, payment_date: '2026-05-30', method: 'cheque', amount: 3000, reference: 'CHQ-0457' },
]

const money = (n) => `$${Number(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const labelMethod = (m) => m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function RecordPaymentMock() {
  const [invoiceId, setInvoiceId] = useState(SAMPLE_INVOICES[0].id)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('2026-06-26')
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')

  const invoice = SAMPLE_INVOICES.find((i) => i.id === invoiceId)
  const amt = parseFloat(amount) || 0
  const overpay = amt > invoice.balance
  const newBalance = Math.max(invoice.balance - amt, 0)

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400'

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Record Payment</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice</label>
            <select value={invoiceId} onChange={(e) => setInvoiceId(Number(e.target.value))} className={inputCls}>
              {SAMPLE_INVOICES.map((i) => (
                <option key={i.id} value={i.id} disabled={i.balance === 0}>
                  {i.invoice_no} — {i.org} · balance {money(i.balance)}
                  {i.balance === 0 ? ' (paid)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} text-right`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{labelMethod(m)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="TXN / cheque no."
              className={inputCls}
            />
          </div>
        </div>

        {/* live balance preview */}
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm border-t border-gray-100 pt-3">
          <span className="text-gray-500">Current balance: <span className="font-medium text-gray-700">{money(invoice.balance)}</span></span>
          <span className="text-gray-500">This payment: <span className="font-medium text-gray-700">{money(amt)}</span></span>
          <span className="text-gray-500">New balance: <span className={`font-medium ${newBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>{money(newBalance)}</span></span>
        </div>
        {overpay && (
          <p className="mt-2 text-xs text-red-600">Amount exceeds the outstanding balance of {money(invoice.balance)}.</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button
            type="button"
            disabled={amt <= 0 || overpay}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            Record Payment
          </button>
        </div>
      </div>

      {/* existing payments on this invoice */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Payment History — {invoice.invoice_no}</h3>
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 font-medium text-gray-500">Method</th>
              <th className="px-3 py-2 font-medium text-gray-500 text-right">Amount</th>
              <th className="px-3 py-2 font-medium text-gray-500">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SAMPLE_PAYMENTS.map((p) => (
              <tr key={p.id} className="bg-white">
                <td className="px-3 py-2 text-gray-600">{p.payment_date}</td>
                <td className="px-3 py-2 text-gray-600">{labelMethod(p.method)}</td>
                <td className="px-3 py-2 text-right text-gray-700 font-medium">{money(p.amount)}</td>
                <td className="px-3 py-2 text-gray-500">{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-gray-400 mt-3">Mockup only — sample data, not saved to the database.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Dashboard redesign
//
// Thesis: weight the page by what the business actually runs on. Today the
// live DB holds 158 projects, 3 employees and 1 invoice, but the current
// dashboard gives Projects, Manpower and Financials an equal third each — so
// two thirds of the screen renders confident zeros.
//
// Changes from the live Dashboard:
//   1. "Needs attention" strip first — the page answers "what needs me today?"
//      before it shows any totals. Collapses to one quiet line when all clear.
//   2. Projects gets the primary column; Manpower and Finance share a rail.
//   3. Empty states say "nothing set up yet" and link to the action, instead
//      of showing $0 as though it were a measurement.
//   4. Chart colours use primary-* CSS vars, so they follow the user's theme
//      (blue/green/purple/orange) instead of the hardcoded blue in the live page.
//   5. Dark-mode safe. The live <Donut> hardcodes fill:#1f2937 for its centre
//      text, which is near-invisible on the dark card (#1e2433).
//   6. Sequential ramp, validated: light primary-400→600→900, dark 200→400→600
//      (CVD ΔE 17.2, normal-vision 18.4, monotonic lightness). Every segment is
//      direct-labelled, so identity is never carried by colour alone.
//
// Sample data mirrors the real /api/dashboard/overview/ response shape.
// ─────────────────────────────────────────────────────────────────────────

// Two scenarios so the same layout can be judged against today's sparse data
// AND against what it looks like once finance/HR are actually adopted.
const DASH_SCENARIOS = {
  today: {
    label: 'SE today',
    note: 'Real proportions: 158 projects, 3 staff, 1 invoice, no clock-ins.',
    kpis: { overdue_tasks: 3, projects_ending_this_month: 4, open_leads: 0, won_leads_this_month: 0 },
    project_status: {
      active: 21,
      avg_active_progress: 46,
      active_progress: { not_started: 6, in_progress: 11, near_done: 4 },
    },
    manpower: { clocked_in_today: 0, on_site_now: 0, on_leave_today: 0, total_employees: 3, by_site: [] },
    financials: {
      outstanding_receivables: 0, revenue_this_month: 0, invoiced_this_month: 0,
      expenses_this_month: 0, overdue_invoices_count: 0, overdue_invoices_amount: 0,
      invoices_total: 1,
    },
    ending_soon: [
      { id: 1, project_no: 'SE-26-014', name: 'Tuas Workshop Reinstatement', end_date: '2026-09-12', days_left: 4, progress: 82 },
      { id: 2, project_no: 'SE-26-021', name: 'Jurong Pipe Rack Fabrication', end_date: '2026-09-24', days_left: 16, progress: 55 },
      { id: 3, project_no: 'SE-26-009', name: 'Sembawang Tank Inspection', end_date: '2026-09-30', days_left: 22, progress: 38 },
    ],
    overdue_tasks_list: [
      { id: 1, title: 'Submit WSH risk assessment', project_no: 'SE-26-014', due_date: '2026-09-01', days_overdue: 7, priority: 'urgent' },
      { id: 2, title: 'Confirm scaffold subcontractor', project_no: 'SE-26-021', due_date: '2026-09-03', days_overdue: 5, priority: 'high' },
      { id: 3, title: 'Chase client drawing approval', project_no: 'SE-26-009', due_date: '2026-09-05', days_overdue: 3, priority: 'medium' },
    ],
  },
  adopted: {
    label: 'Once adopted',
    note: 'Same layout with finance and clock-in actually in use.',
    kpis: { overdue_tasks: 3, projects_ending_this_month: 4, open_leads: 6, won_leads_this_month: 2 },
    project_status: {
      active: 21,
      avg_active_progress: 46,
      active_progress: { not_started: 6, in_progress: 11, near_done: 4 },
    },
    manpower: {
      clocked_in_today: 14, on_site_now: 11, on_leave_today: 2, total_employees: 18,
      by_site: [
        { project_no: 'SE-26-014', name: 'Tuas Workshop', count: 6 },
        { project_no: 'SE-26-021', name: 'Jurong Pipe Rack', count: 4 },
        { project_no: 'SE-26-009', name: 'Sembawang Tank', count: 1 },
      ],
    },
    financials: {
      outstanding_receivables: 184500, revenue_this_month: 62000, invoiced_this_month: 88000,
      expenses_this_month: 41200, overdue_invoices_count: 2, overdue_invoices_amount: 23400,
      invoices_total: 37,
    },
    ending_soon: [
      { id: 1, project_no: 'SE-26-014', name: 'Tuas Workshop Reinstatement', end_date: '2026-09-12', days_left: 4, progress: 82 },
      { id: 2, project_no: 'SE-26-021', name: 'Jurong Pipe Rack Fabrication', end_date: '2026-09-24', days_left: 16, progress: 55 },
      { id: 3, project_no: 'SE-26-009', name: 'Sembawang Tank Inspection', end_date: '2026-09-30', days_left: 22, progress: 38 },
    ],
    overdue_tasks_list: [
      { id: 1, title: 'Submit WSH risk assessment', project_no: 'SE-26-014', due_date: '2026-09-01', days_overdue: 7, priority: 'urgent' },
      { id: 2, title: 'Confirm scaffold subcontractor', project_no: 'SE-26-021', due_date: '2026-09-03', days_overdue: 5, priority: 'high' },
      { id: 3, title: 'Chase client drawing approval', project_no: 'SE-26-009', due_date: '2026-09-05', days_overdue: 3, priority: 'medium' },
    ],
  },
}

// Ordinal progress ramp. Sequential single hue, light→dark, on primary-* so it
// follows the active theme. Dark-mode steps are chosen against #1e2433, not flipped.
const PROGRESS_BUCKETS = [
  { key: 'not_started', label: 'Not started', fill: 'bg-primary-400 dark:bg-primary-200' },
  { key: 'in_progress', label: 'In progress', fill: 'bg-primary-600 dark:bg-primary-400' },
  { key: 'near_done',   label: 'Near done',   fill: 'bg-primary-900 dark:bg-primary-600' },
]

const PRIORITY_DOT_MOCK = {
  urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-gray-300',
}

const money0 = (n) => `$${Number(n || 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`

// Panels reuse one shell so spacing/rounding stay consistent across the page.
function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// An empty state that admits the module isn't set up, rather than rendering $0
// as if it were a measured value.
function NotSetUp({ line, cta }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
      <p className="text-sm text-gray-500">{line}</p>
      {cta && <p className="text-xs text-primary-600 font-medium mt-1.5 cursor-pointer hover:underline">{cta} →</p>}
    </div>
  )
}

function ProgressStackedBar({ buckets, total }) {
  const [hover, setHover] = useState(null)
  if (!total) return null
  return (
    <div>
      {/* 2px gaps between segments = the surface spacer; direct labels below
          discharge the sub-3:1 contrast warning on the lightest step. */}
      <div className="flex gap-[2px] h-7 rounded-md overflow-hidden" role="img"
           aria-label={buckets.map(b => `${b.label} ${b.value}`).join(', ')}>
        {buckets.filter(b => b.value > 0).map(b => (
          <div
            key={b.key}
            onMouseEnter={() => setHover(b.key)}
            onMouseLeave={() => setHover(null)}
            className={`${b.fill} relative transition-opacity ${hover && hover !== b.key ? 'opacity-50' : ''}`}
            style={{ width: `${(b.value / total) * 100}%` }}
          >
            {hover === b.key && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow">
                {b.label}: {b.value} ({Math.round((b.value / total) * 100)}%)
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {buckets.map(b => (
          <span key={b.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-sm ${b.fill}`} />
            {b.label}
            <span className="font-semibold text-gray-700">{b.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DashboardMock() {
  const [scenario, setScenario] = useState('today')
  const d = DASH_SCENARIOS[scenario]
  const ps = d.project_status
  const f = d.financials
  const m = d.manpower

  const buckets = PROGRESS_BUCKETS.map(b => ({ ...b, value: ps.active_progress[b.key] || 0 }))
  const endingUrgent = d.ending_soon.filter(p => p.days_left <= 7)
  const attention = [
    d.kpis.overdue_tasks > 0 && { k: 'tasks', tone: 'red', text: `${d.kpis.overdue_tasks} overdue tasks` },
    endingUrgent.length > 0 && { k: 'ending', tone: 'amber', text: `${endingUrgent.length} project${endingUrgent.length > 1 ? 's' : ''} ending within 7 days` },
    f.overdue_invoices_count > 0 && { k: 'inv', tone: 'red', text: `${f.overdue_invoices_count} overdue invoices · ${money0(f.overdue_invoices_amount)}` },
  ].filter(Boolean)

  const financeLive = f.invoiced_this_month > 0 || f.outstanding_receivables > 0

  return (
    <div className="space-y-5">
      {/* Scenario switch — mockup control only, not part of the design */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(DASH_SCENARIOS).map(([key, s]) => (
          <button key={key} onClick={() => setScenario(key)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
              scenario === key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
        <span className="text-[11px] text-gray-400">{d.note}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monday, 8 September 2026</p>
        </div>
        <p className="text-xs text-gray-400">Updated 2 min ago · <span className="text-primary-600 font-medium cursor-pointer hover:underline">Refresh</span></p>
      </div>

      {/* 1 — What needs me today, before any totals. */}
      {attention.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attention.map(a => (
            <div key={a.k}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                a.tone === 'red'
                  ? 'border-red-200 bg-red-50 hover:bg-red-100'
                  : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${a.tone === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <span className={`text-sm font-medium ${a.tone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>{a.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Nothing needs attention today.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 2 — Projects gets the primary column. */}
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Active Projects"
            action={<span className="text-xs text-primary-600 font-medium cursor-pointer hover:underline">All projects →</span>}>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-bold text-gray-800 leading-none">{ps.active}</span>
              <span className="text-sm text-gray-500">active · avg {ps.avg_active_progress}% complete</span>
            </div>
            <ProgressStackedBar buckets={buckets} total={ps.active} />
          </Panel>

          <Panel title="Ending Soon">
            <div className="divide-y divide-gray-100">
              {d.ending_soon.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.project_no} · ends {p.end_date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-semibold ${p.days_left <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                      {p.days_left}d left
                    </span>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                      <div className="bg-primary-600 dark:bg-primary-400 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Overdue Tasks">
            <div className="divide-y divide-gray-100">
              {d.overdue_tasks_list.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT_MOCK[t.priority]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.project_no} · due {t.due_date}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 shrink-0">{t.days_overdue}d</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 3 — Manpower and Finance share the rail, and degrade honestly. */}
        <div className="space-y-5">
          <Panel title="On Site Today">
            {m.clocked_in_today === 0 ? (
              <NotSetUp line="No one has clocked in today." cta="Set up clock-in" />
            ) : (
              <>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-3xl font-bold text-gray-800 leading-none">{m.on_site_now}</span>
                  <span className="text-sm text-gray-500">on site now</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {m.clocked_in_today} clocked in · {m.on_leave_today} on leave · {m.total_employees} staff
                </p>
                <div className="space-y-2">
                  {m.by_site.map((s, i) => {
                    const max = Math.max(1, ...m.by_site.map(x => x.count))
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 truncate pr-2">{s.project_no} · {s.name}</span>
                          <span className="text-gray-700 font-semibold">{s.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-primary-600 dark:bg-primary-400"
                               style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Finance — This Month">
            {!financeLive ? (
              <NotSetUp
                line={`Only ${f.invoices_total} invoice in the system. Nothing issued this month.`}
                cta="Create an invoice"
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Outstanding receivables</p>
                  <p className="text-2xl font-bold text-gray-800">{money0(f.outstanding_receivables)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-[11px] text-gray-500">Invoiced MTD</p>
                    <p className="text-sm font-semibold text-gray-700">{money0(f.invoiced_this_month)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Collected MTD</p>
                    <p className="text-sm font-semibold text-gray-700">{money0(f.revenue_this_month)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Expenses MTD</p>
                    <p className="text-sm font-semibold text-gray-700">{money0(f.expenses_this_month)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Net MTD</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {money0(f.revenue_this_month - f.expenses_this_month)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Pipeline">
            {d.kpis.open_leads === 0 ? (
              <NotSetUp line="No leads recorded." cta="Add a lead" />
            ) : (
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{d.kpis.open_leads}</span> open ·{' '}
                <span className="font-semibold text-gray-800">{d.kpis.won_leads_this_month}</span> won this month
              </p>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">Mockup only — sample data, not wired to the API.</p>
    </div>
  )
}

export default function MockupPage() {
  const [active, setActive] = useState(MOCKUPS[0]?.key ?? null)
  const current = MOCKUPS.find(m => m.key === active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Design Mockups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Internal preview — not linked in the sidebar.</p>
        </div>
        {MOCKUPS.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {MOCKUPS.map(m => (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                  active === m.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {MOCKUPS.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium">No mockups yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Ask Claude to add a design here, then refresh to preview it live.
          </p>
          <p className="text-xs text-gray-300 mt-4">
            Added in <code>frontend/src/pages/MockupPage.jsx</code> → the <code>MOCKUPS</code> array.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          {current?.element ?? <p className="text-sm text-gray-400">Select a mockup above.</p>}
        </div>
      )}
    </div>
  )
}
