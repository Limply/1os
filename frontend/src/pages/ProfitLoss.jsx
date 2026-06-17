import { useEffect, useState } from 'react'
import api from '../api/axios'

const fmt = v => parseFloat(v || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 2 + i)

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || 'border-gray-200'} p-4`}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent === 'border-red-200' ? 'text-red-600' : 'text-gray-800'}`}>
        ${fmt(value)}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Bar({ invoiced, collected, maxVal }) {
  if (!maxVal) return null
  const iW = Math.round((parseFloat(invoiced) / maxVal) * 100)
  const cW = Math.round((parseFloat(collected) / maxVal) * 100)
  return (
    <div className="flex flex-col gap-0.5 w-28">
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${iW}%` }} />
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${cW}%` }} />
      </div>
    </div>
  )
}

export default function ProfitLoss() {
  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(THIS_YEAR)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = period === 'month' ? `?period=month&year=${year}` : `?period=year`
    api.get(`/finance/pl-summary/${params}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period, year])

  const rows = data?.rows || []
  const summary = data?.summary || {}
  const maxVal = Math.max(...rows.map(r => Math.max(parseFloat(r.invoiced), parseFloat(r.collected))), 1)

  // Totals row
  const totInvoiced = rows.reduce((s, r) => s + parseFloat(r.invoiced), 0)
  const totCollected = rows.reduce((s, r) => s + parseFloat(r.collected), 0)
  const totExclGst = rows.reduce((s, r) => s + parseFloat(r.excl_gst), 0)
  const totGst = rows.reduce((s, r) => s + parseFloat(r.gst), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">P&amp;L</h1>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['month', 'year'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition capitalize ${period === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {p === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
          {/* Year picker — only for monthly view */}
          {period === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setYear(y => y - 1)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm flex items-center justify-center">‹</button>
              <span className="text-sm font-semibold text-gray-700 w-12 text-center">{year}</span>
              <button onClick={() => setYear(y => y + 1)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm flex items-center justify-center">›</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label={period === 'month' ? `Invoiced ${year}` : 'Total Invoiced'}
          value={summary.invoiced}
        />
        <SummaryCard
          label={period === 'month' ? `Collected ${year}` : 'Total Collected'}
          value={summary.collected}
        />
        <SummaryCard
          label="Outstanding"
          value={summary.outstanding}
          sub="all unpaid invoices"
        />
        <SummaryCard
          label="Overdue"
          value={summary.overdue_amount}
          sub={`${summary.overdue_count || 0} invoice${summary.overdue_count !== 1 ? 's' : ''}`}
          accent="border-red-200"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">{period === 'month' ? 'Month' : 'Year'}</th>
                <th className="px-4 py-3 text-right">Excl. GST</th>
                <th className="px-4 py-3 text-right">GST (9%)</th>
                <th className="px-4 py-3 text-right">Invoiced</th>
                <th className="px-4 py-3 text-right">Collected</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No data</td></tr>
              )}
              {rows.map(r => {
                const inv = parseFloat(r.invoiced)
                const col = parseFloat(r.collected)
                const variance = col - inv
                return (
                  <tr key={r.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{r.label}</td>
                    <td className="px-4 py-3 text-right text-gray-500">${fmt(r.excl_gst)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">${fmt(r.gst)}</td>
                    <td className="px-4 py-3 text-right font-medium">${fmt(r.invoiced)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">${fmt(r.collected)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {variance >= 0 ? '+' : ''}{fmt(variance)}
                    </td>
                    <td className="px-4 py-3">
                      <Bar invoiced={r.invoiced} collected={r.collected} maxVal={maxVal} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <td className="px-4 py-3 text-gray-600">Total</td>
                  <td className="px-4 py-3 text-right text-gray-500">${fmt(totExclGst)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">${fmt(totGst)}</td>
                  <td className="px-4 py-3 text-right">${fmt(totInvoiced)}</td>
                  <td className="px-4 py-3 text-right text-green-700">${fmt(totCollected)}</td>
                  <td className={`px-4 py-3 text-right ${totCollected - totInvoiced >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totCollected - totInvoiced >= 0 ? '+' : ''}{fmt(totCollected - totInvoiced)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>

          {/* Legend */}
          <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-1.5 rounded-full bg-blue-400" /> Invoiced</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-1.5 rounded-full bg-green-400" /> Collected</span>
          </div>
        </div>
      )}
    </div>
  )
}
