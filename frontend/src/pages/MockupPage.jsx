import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Design mockups live here. To add one:
//   1. Write a small component (static JSX styled like the app).
//   2. Add an entry: { key: 'slug', label: 'Name', element: <YourMock /> }
// They render live at /mock_up_page (unlisted — no sidebar link).
// ─────────────────────────────────────────────────────────────────────────
const MOCKUPS = [
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
