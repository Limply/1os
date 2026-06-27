import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'paynow', label: 'PayNow' },
]

const today = () => new Date().toISOString().slice(0, 10)
const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n) => parseFloat(n) || 0

const blank = {
  project_no: '',
  quotation: '',
  invoice: '',
  amount: '',
  payment_date: today(),
  method: 'bank_transfer',
  reference: '',
  notes: '',
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400'

export default function Payments() {
  const [invoices, setInvoices] = useState([])
  const [quotations, setQuotations] = useState([])
  const [projects, setProjects] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function loadAll() {
    setLoading(true)
    Promise.all([
      api.get('/finance/invoices/'),
      api.get('/finance/quotations/'),
      api.get('/projects/projects/'),
      api.get('/finance/payments/'),
    ])
      .then(([i, q, p, pay]) => {
        setInvoices(Array.isArray(i.data) ? i.data : i.data.results || [])
        setQuotations(Array.isArray(q.data) ? q.data : q.data.results || [])
        setProjects(Array.isArray(p.data) ? p.data : p.data.results || [])
        setPayments(Array.isArray(pay.data) ? pay.data : pay.data.results || [])
      })
      .catch(() => setError('Failed to load finance data. Please refresh.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const selectedInvoice = useMemo(
    () => invoices.find((i) => String(i.id) === String(form.invoice)),
    [invoices, form.invoice],
  )
  const selectedQuotation = useMemo(
    () => quotations.find((q) => String(q.id) === String(form.quotation)),
    [quotations, form.quotation],
  )

  // Outstanding balance against the chosen target (invoice preferred, else quotation)
  const target = selectedInvoice || selectedQuotation
  const targetBalance = selectedInvoice
    ? num(selectedInvoice.balance_due)
    : selectedQuotation
      ? num(selectedQuotation.total) -
        payments
          .filter((p) => String(p.quotation) === String(selectedQuotation.id))
          .reduce((s, p) => s + num(p.amount), 0)
      : null

  const amt = num(form.amount)
  const overpay = targetBalance != null && amt > targetBalance + 0.001
  const newBalance = targetBalance != null ? Math.max(targetBalance - amt, 0) : null

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
    setSuccess('')
  }

  // Picking an invoice auto-fills its project & quotation
  function pickInvoice(id) {
    const inv = invoices.find((i) => String(i.id) === String(id))
    setForm((f) => ({
      ...f,
      invoice: id,
      project_no: inv?.project_no || f.project_no,
      quotation: inv?.quotation || f.quotation,
    }))
    setError('')
    setSuccess('')
  }

  function pickQuotation(id) {
    const q = quotations.find((x) => String(x.id) === String(id))
    setForm((f) => ({ ...f, quotation: id, project_no: q?.project_no || f.project_no }))
    setError('')
    setSuccess('')
  }

  const canSubmit =
    amt > 0 &&
    !overpay &&
    !saving &&
    (form.invoice || form.quotation || form.project_no)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (amt <= 0) return setError('Enter a payment amount greater than zero.')
    if (!form.invoice && !form.quotation && !form.project_no)
      return setError('Link the payment to an invoice, quotation, or project.')
    if (overpay) return setError(`Amount exceeds the outstanding balance of ${money(targetBalance)}.`)

    const payload = {
      amount: form.amount,
      payment_date: form.payment_date,
      method: form.method,
      reference: form.reference || null,
      notes: form.notes || null,
      invoice: form.invoice || null,
      quotation: form.quotation || null,
      project_no: form.project_no || null,
    }

    setSaving(true)
    try {
      await api.post('/finance/payments/', payload)
      const fullyPaid = newBalance === 0 && targetBalance != null
      setSuccess(
        fullyPaid
          ? 'Payment recorded — balance cleared. Linked project marked completed.'
          : 'Payment recorded.',
      )
      setForm({ ...blank, payment_date: form.payment_date, method: form.method })
      loadAll()
    } catch (err) {
      const data = err?.response?.data
      const msg =
        typeof data === 'string'
          ? data
          : data
            ? Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(' · ')
            : 'Failed to record payment. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a customer payment against an invoice, quotation, or project.</p>
      </div>

      {/* ── Record form ── */}
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Record Payment</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
            <select value={form.project_no} onChange={(e) => set('project_no', e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.project_no}>
                  {p.project_no} — {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Quotation</label>
            <select value={form.quotation} onChange={(e) => pickQuotation(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_no} — {q.client_name} · {money(q.total)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice</label>
            <select value={form.invoice} onChange={(e) => pickInvoice(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id} disabled={num(i.balance_due) <= 0}>
                  {i.invoice_no} — {i.client_name} · balance {money(i.balance_due)}
                  {num(i.balance_due) <= 0 ? ' (paid)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              className={`${inputCls} text-right`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date *</label>
            <input type="date" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Method *</label>
            <select value={form.method} onChange={(e) => set('method', e.target.value)} className={inputCls}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reference</label>
            <input
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder="Cheque no / transaction ref"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* live balance preview */}
        {target && targetBalance != null && (
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">
              Outstanding: <span className="font-medium text-gray-700">{money(targetBalance)}</span>
            </span>
            <span className="text-gray-500">
              This payment: <span className="font-medium text-gray-700">{money(amt)}</span>
            </span>
            <span className="text-gray-500">
              New balance:{' '}
              <span className={`font-medium ${newBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {money(newBalance)}
              </span>
            </span>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => { setForm(blank); setError(''); setSuccess('') }}
            className="px-4 py-2 text-sm text-gray-500"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </form>

      {/* ── Recent payments ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Recent Payments</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Against</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Method</th>
                  <th className="px-3 py-2 font-medium text-gray-500 text-right">Amount</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Reference</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="bg-white">
                    <td className="px-3 py-2 text-gray-600">{p.payment_date}</td>
                    <td className="px-3 py-2 text-gray-600">{p.invoice_no || p.quote_no || p.project_no || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.method_display || p.method}</td>
                    <td className="px-3 py-2 text-right text-gray-700 font-medium">{money(p.amount)}</td>
                    <td className="px-3 py-2 text-gray-500">{p.reference || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.recorded_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
