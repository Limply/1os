import { useEffect, useState } from 'react'
import api from '../api/axios'

const TABS = ['Quotations', 'Invoices', 'Delivery Orders']

const Q_STATUS   = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-primary-100 text-primary-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600', expired: 'bg-yellow-100 text-yellow-700' }
const INV_STATUS = { unpaid: 'bg-yellow-100 text-yellow-700', partial: 'bg-primary-100 text-primary-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-600', void: 'bg-gray-100 text-gray-500' }
const DO_STATUS  = { draft: 'bg-gray-100 text-gray-600', issued: 'bg-primary-100 text-primary-700', delivered: 'bg-purple-100 text-purple-700', acknowledged: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600' }

const GST_RATE = 0.09

function Badge({ label, map }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[label] || 'bg-gray-100 text-gray-500'}`}>{label?.replace('_', ' ')}</span>
}

function ItemsTable({ items, setItems, showAmount = true }) {
  function update(i, field, val) {
    setItems(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      if (field === 'qty' || field === 'unit_price') {
        const qty = parseFloat(field === 'qty' ? val : next[i].qty) || 0
        const up  = parseFloat(field === 'unit_price' ? val : next[i].unit_price) || 0
        next[i].amount = (qty * up).toFixed(2)
      }
      return next
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-3 py-2 text-left w-8">#</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-left w-16">Unit</th>
            <th className="px-3 py-2 text-right w-20">Qty</th>
            {showAmount && <th className="px-3 py-2 text-right w-28">Unit Price</th>}
            {showAmount && <th className="px-3 py-2 text-right w-28">Amount</th>}
            {!showAmount && <th className="px-3 py-2 text-left">Remarks</th>}
            <th className="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2">
                <input value={item.description || ''} onChange={e => update(i, 'description', e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5" />
              </td>
              <td className="px-3 py-2">
                <input value={item.unit || ''} onChange={e => update(i, 'unit', e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5" />
              </td>
              <td className="px-3 py-2">
                <input type="number" value={item.qty || ''} onChange={e => update(i, 'qty', e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5 text-right" />
              </td>
              {showAmount && (
                <td className="px-3 py-2">
                  <input type="number" value={item.unit_price || ''} onChange={e => update(i, 'unit_price', e.target.value)}
                    className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5 text-right" />
                </td>
              )}
              {showAmount && (
                <td className="px-3 py-2 text-right text-gray-600">{item.amount ? `$${parseFloat(item.amount).toLocaleString('en-SG', { minimumFractionDigits: 2 })}` : ''}</td>
              )}
              {!showAmount && (
                <td className="px-3 py-2">
                  <input value={item.remarks || ''} onChange={e => update(i, 'remarks', e.target.value)}
                    className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5" />
                </td>
              )}
              <td className="px-3 py-2">
                <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setItems(prev => [...prev, { description: '', unit: '', qty: 1, unit_price: '', amount: '', remarks: '' }])}
        className="mt-2 ml-3 text-sm text-primary-600 hover:underline">+ Add line</button>
    </div>
  )
}

function Totals({ items }) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const gst = subtotal * GST_RATE
  const total = subtotal + gst
  return (
    <div className="text-sm text-right space-y-1 pr-3 pt-3 border-t border-gray-100">
      <div className="flex justify-end gap-8"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      <div className="flex justify-end gap-8"><span className="text-gray-500">GST (9%)</span><span>${gst.toFixed(2)}</span></div>
      <div className="flex justify-end gap-8 font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
    </div>
  )
}

export default function Finance() {
  const [tab, setTab] = useState('Quotations')
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [dos, setDos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // Quotation form
  const [qForm, setQForm] = useState({ project_no: '', client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '', issue_date: '', valid_until: '', notes: '' })
  const [qItems, setQItems] = useState([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])

  // Invoice form
  const [iForm, setIForm] = useState({ client_name: '', client_email: '', issue_date: '', due_date: '', notes: '' })
  const [iItems, setIItems] = useState([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])

  // DO form
  const [dForm, setDForm] = useState({ client_name: '', delivery_address: '', issue_date: '', delivery_date: '', delivered_by: '', notes: '' })
  const [dItems, setDItems] = useState([{ description: '', unit: '', qty: 1, remarks: '' }])

  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [q, i, d] = await Promise.all([
      api.get('/finance/quotations/'),
      api.get('/finance/invoices/'),
      api.get('/finance/delivery-orders/'),
    ])
    setQuotations(q.data.results || q.data)
    setInvoices(i.data.results || i.data)
    setDos(d.data.results || d.data)
    setLoading(false)
  }

  const [clientSuggestions, setClientSuggestions] = useState([])

  async function searchClients(name) {
    if (!name || name.length < 2) { setClientSuggestions([]); return }
    try {
      const res = await api.get(`/org/clients/?search=${name}`)
      setClientSuggestions(res.data.results || res.data)
    } catch {}
  }

  function fillFromClient(client) {
    setQForm(f => ({
      ...f,
      client_name: client.name,
      client_contact: client.contact_name || '',
      client_email: client.contact_email || '',
      client_phone: client.contact_phone || '',
      client_address: client.billing_address || '',
    }))
    setClientSuggestions([])
  }

  async function lookupProject(project_no) {
    if (!project_no) return
    try {
      const res = await api.get(`/projects/projects/?project_no=${project_no}`)
      const list = res.data.results || res.data
      if (list.length > 0) {
        const p = list[0]
        setQForm(f => ({ ...f, client_name: p.client_name || '', client_contact: p.client_contact || '', client_email: p.client_email || '', client_phone: p.client_phone || '', client_address: p.client_address || '' }))
      }
    } catch {}
  }

  function calcTotals(items) {
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    return { subtotal: subtotal.toFixed(2), gst_amount: (subtotal * GST_RATE).toFixed(2), total: (subtotal * (1 + GST_RATE)).toFixed(2) }
  }

  async function handleCreateQuotation(e) {
    e.preventDefault(); setSaving(true)
    try {
      const q = await api.post('/finance/quotations/', { ...qForm, ...calcTotals(qItems) })
      await Promise.all(qItems.filter(i => i.description).map((item, idx) =>
        api.post('/finance/quotation-items/', { ...item, quotation: q.data.id, sort_order: idx })
      ))
      setShowForm(false)
      setQForm({ project_no: '', client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '', issue_date: '', valid_until: '', notes: '' })
      setQItems([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])
      fetchAll()
    } finally { setSaving(false) }
  }

  async function handleCreateInvoice(e) {
    e.preventDefault(); setSaving(true)
    try {
      const inv = await api.post('/finance/invoices/', { ...iForm, ...calcTotals(iItems) })
      await Promise.all(iItems.filter(i => i.description).map((item, idx) =>
        api.post('/finance/invoice-items/', { ...item, invoice: inv.data.id, sort_order: idx })
      ))
      setShowForm(false)
      setIForm({ client_name: '', client_email: '', issue_date: '', due_date: '', notes: '' })
      setIItems([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])
      fetchAll()
    } finally { setSaving(false) }
  }

  async function handleCreateDO(e) {
    e.preventDefault(); setSaving(true)
    try {
      const d = await api.post('/finance/delivery-orders/', dForm)
      await Promise.all(dItems.filter(i => i.description).map((item, idx) =>
        api.post('/finance/delivery-order-items/', { ...item, delivery_order: d.data.id, sort_order: idx })
      ))
      setShowForm(false)
      setDForm({ client_name: '', delivery_address: '', issue_date: '', delivery_date: '', delivered_by: '', notes: '' })
      setDItems([{ description: '', unit: '', qty: 1, remarks: '' }])
      fetchAll()
    } finally { setSaving(false) }
  }

  function downloadDocx(type, id, no) {
    window.open(`/api/finance/${type}/${id}/docx/`, '_blank')
  }

  function inp(label, key, form, setForm, props = {}) {
    return (
      <div className={props.col2 ? 'col-span-2' : ''}>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          {...props} />
      </div>
    )
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Finance</h1>
        <button onClick={() => { setShowForm(true); setExpanded(null) }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          + New {tab === 'Quotations' ? 'Quotation' : tab === 'Invoices' ? 'Invoice' : 'Delivery Order'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); setExpanded(null) }}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Quotations ── */}
      {tab === 'Quotations' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-4">New Quotation <span className="text-xs text-gray-400 font-normal">(number auto-assigned)</span></h2>
              <form onSubmit={handleCreateQuotation}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Project No.</label>
                    <input value={qForm.project_no} onChange={e => setQForm(f => ({ ...f, project_no: e.target.value }))}
                      onBlur={e => lookupProject(e.target.value)}
                      placeholder="AST-26-001 — auto-fills client"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                  </div>
                  {inp('Issue Date *', 'issue_date', qForm, setQForm, { required: true, type: 'date' })}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
                    <input required value={qForm.client_name}
                      onChange={e => { setQForm(f => ({ ...f, client_name: e.target.value })); searchClients(e.target.value) }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                      placeholder="Type to search clients..." />
                    {clientSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {clientSuggestions.map(c => (
                          <button key={c.id} type="button" onClick={() => fillFromClient(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm border-b border-gray-100 last:border-0">
                            <span className="font-medium text-gray-800">{c.name}</span>
                            {c.contact_name && <span className="text-gray-400 ml-2 text-xs">· {c.contact_name}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {inp('Valid Until', 'valid_until', qForm, setQForm, { type: 'date' })}
                  {inp('Contact Person', 'client_contact', qForm, setQForm)}
                  {inp('Phone', 'client_phone', qForm, setQForm)}
                  {inp('Email', 'client_email', qForm, setQForm, { type: 'email' })}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <textarea value={qForm.client_address || ''} rows={2} onChange={e => setQForm(f => ({ ...f, client_address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none" />
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <ItemsTable items={qItems} setItems={setQItems} />
                  <Totals items={qItems} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Quotation'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Quote No.</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No quotations yet</td></tr>}
                {quotations.map(q => (
                  <>
                    <tr key={q.id} onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                      className="hover:bg-primary-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs">{q.quote_no}</td>
                      <td className="px-4 py-3 text-gray-500">{q.project_no || '—'}</td>
                      <td className="px-4 py-3 font-medium">{q.client_name}</td>
                      <td className="px-4 py-3 text-gray-500">{q.issue_date}</td>
                      <td className="px-4 py-3"><Badge label={q.status} map={Q_STATUS} /></td>
                      <td className="px-4 py-3 text-right font-medium">${parseFloat(q.total).toLocaleString('en-SG', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); downloadDocx('quotations', q.id, q.quote_no) }}
                          className="text-xs text-primary-600 hover:underline">DOCX</button>
                      </td>
                    </tr>
                    {expanded === q.id && (
                      <tr key={`${q.id}-detail`}><td colSpan={7} className="bg-gray-50 px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div><span className="text-gray-400">Contact:</span> {q.client_contact || '—'}</div>
                          <div><span className="text-gray-400">Email:</span> {q.client_email || '—'}</div>
                          <div><span className="text-gray-400">Phone:</span> {q.client_phone || '—'}</div>
                          <div className="col-span-3"><span className="text-gray-400">Address:</span> {q.client_address || '—'}</div>
                        </div>
                        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead><tr className="bg-white"><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Unit</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit Price</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {q.items?.map((item, i) => (
                              <tr key={i} className="bg-white"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2">{item.unit}</td><td className="px-3 py-2 text-right">{item.qty}</td><td className="px-3 py-2 text-right">${parseFloat(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right">${parseFloat(item.amount).toFixed(2)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="text-right text-sm mt-2 space-y-0.5">
                          <div>Subtotal: <strong>${parseFloat(q.subtotal).toFixed(2)}</strong></div>
                          <div>GST 9%: <strong>${parseFloat(q.gst_amount).toFixed(2)}</strong></div>
                          <div>Total: <strong>${parseFloat(q.total).toFixed(2)}</strong></div>
                        </div>
                        {q.notes && <p className="text-xs text-gray-500 mt-2">Notes: {q.notes}</p>}
                      </td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Invoices ── */}
      {tab === 'Invoices' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-4">New Invoice</h2>
              <form onSubmit={handleCreateInvoice}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {inp('Client Name *', 'client_name', iForm, setIForm, { required: true })}
                  {inp('Email', 'client_email', iForm, setIForm, { type: 'email' })}
                  {inp('Issue Date *', 'issue_date', iForm, setIForm, { required: true, type: 'date' })}
                  {inp('Due Date *', 'due_date', iForm, setIForm, { required: true, type: 'date' })}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                    <textarea value={iForm.notes || ''} rows={2} onChange={e => setIForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <ItemsTable items={iItems} setItems={setIItems} />
                  <Totals items={iItems} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Invoice No.</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Issue Date</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No invoices yet</td></tr>}
                {invoices.map(inv => (
                  <>
                    <tr key={inv.id} onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                      className="hover:bg-primary-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                      <td className="px-4 py-3 font-medium">{inv.client_name}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.due_date}</td>
                      <td className="px-4 py-3"><Badge label={inv.status} map={INV_STATUS} /></td>
                      <td className="px-4 py-3 text-right">${parseFloat(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">${parseFloat(inv.balance_due).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); downloadDocx('invoices', inv.id, inv.invoice_no) }}
                          className="text-xs text-primary-600 hover:underline">DOCX</button>
                      </td>
                    </tr>
                    {expanded === inv.id && (
                      <tr key={`${inv.id}-detail`}><td colSpan={8} className="bg-gray-50 px-6 py-4">
                        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead><tr className="bg-white"><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit Price</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {inv.items?.map((item, i) => (
                              <tr key={i} className="bg-white"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2 text-right">{item.qty}</td><td className="px-3 py-2 text-right">${parseFloat(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right">${parseFloat(item.amount).toFixed(2)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        {inv.payments?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Payments</p>
                            {inv.payments.map((p, i) => (
                              <div key={i} className="text-xs flex gap-4 text-gray-600">
                                <span>{p.payment_date}</span><span>{p.method}</span><span>${parseFloat(p.amount).toFixed(2)}</span><span>{p.reference}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Delivery Orders ── */}
      {tab === 'Delivery Orders' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-4">New Delivery Order</h2>
              <form onSubmit={handleCreateDO}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {inp('Client Name *', 'client_name', dForm, setDForm, { required: true })}
                  {inp('Issue Date *', 'issue_date', dForm, setDForm, { required: true, type: 'date' })}
                  {inp('Delivery Date', 'delivery_date', dForm, setDForm, { type: 'date' })}
                  {inp('Delivered By', 'delivered_by', dForm, setDForm, { placeholder: 'Driver name' })}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Address</label>
                    <textarea value={dForm.delivery_address || ''} rows={2} onChange={e => setDForm(f => ({ ...f, delivery_address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <ItemsTable items={dItems} setItems={setDItems} showAmount={false} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create DO'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">DO No.</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Issue Date</th>
                <th className="px-4 py-3 text-left">Delivery Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Delivered By</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {dos.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No delivery orders yet</td></tr>}
                {dos.map(d => (
                  <>
                    <tr key={d.id} onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                      className="hover:bg-primary-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs">{d.do_no}</td>
                      <td className="px-4 py-3 font-medium">{d.client_name}</td>
                      <td className="px-4 py-3 text-gray-500">{d.issue_date}</td>
                      <td className="px-4 py-3 text-gray-500">{d.delivery_date || '—'}</td>
                      <td className="px-4 py-3"><Badge label={d.status} map={DO_STATUS} /></td>
                      <td className="px-4 py-3 text-gray-500">{d.delivered_by || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); downloadDocx('delivery-orders', d.id, d.do_no) }}
                          className="text-xs text-primary-600 hover:underline">DOCX</button>
                      </td>
                    </tr>
                    {expanded === d.id && (
                      <tr key={`${d.id}-detail`}><td colSpan={7} className="bg-gray-50 px-6 py-4">
                        <p className="text-xs text-gray-500 mb-2">Address: {d.delivery_address || '—'}</p>
                        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead><tr className="bg-white"><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Unit</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-left">Remarks</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {d.items?.map((item, i) => (
                              <tr key={i} className="bg-white"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2">{item.unit}</td><td className="px-3 py-2 text-right">{item.qty}</td><td className="px-3 py-2">{item.remarks}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
