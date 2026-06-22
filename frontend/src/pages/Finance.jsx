import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'
import { getUser } from '../api/auth'
import { generateQuotationPDF } from '../utils/quotationPDF'

const TABS = ['Quotations', 'Invoices', 'Delivery Orders', 'Service Reports', 'P&L']

const Q_STATUS   = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-primary-100 text-primary-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600', expired: 'bg-yellow-100 text-yellow-700' }
const INV_STATUS = { unpaid: 'bg-yellow-100 text-yellow-700', partial: 'bg-primary-100 text-primary-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-600', void: 'bg-gray-100 text-gray-500' }
const DO_STATUS  = { draft: 'bg-gray-100 text-gray-600', issued: 'bg-primary-100 text-primary-700', delivered: 'bg-purple-100 text-purple-700', acknowledged: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600' }

const GST_RATE = 0.09
const ADMIN_ROLES = ['admin', 'superadmin']

const PROJECT_STATUSES = [
  { value: 'planning',  label: 'Planning',  cls: 'bg-gray-100 text-gray-500' },
  { value: 'active',    label: 'Active',    cls: 'bg-green-100 text-green-700' },
  { value: 'on_hold',   label: 'On Hold',   cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', label: 'Cancelled', cls: 'bg-red-100 text-red-500' },
]

function Badge({ label, map }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[label] || 'bg-gray-100 text-gray-500'}`}>{label?.replace('_', ' ')}</span>
}

function MoneyCell({ row, field, value, className, canEdit, onPatch }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value > 0 ? String(value) : '')

  if (!canEdit) return (
    <td className={className}>{value > 0 ? money(value) : '—'}</td>
  )
  return (
    <td className={className} onClick={e => { e.stopPropagation(); setEditing(true) }}>
      {editing ? (
        <input
          autoFocus
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); onPatch(row.id, field, val) }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
          className="w-24 text-right border-b border-primary-400 focus:outline-none bg-transparent text-sm"
        />
      ) : (
        <span className="cursor-text">{value > 0 ? money(value) : <span className="text-gray-300">click to add</span>}</span>
      )}
    </td>
  )
}

function StatusCell({ row, canEdit, onPatch }) {
  const [editing, setEditing] = useState(false)
  const current = PROJECT_STATUSES.find(s => s.value === row.status) || { label: row.status, cls: 'bg-gray-100 text-gray-500' }
  return (
    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
      {editing && canEdit ? (
        <select
          autoFocus
          defaultValue={row.status}
          onChange={e => { onPatch(row.id, 'status', e.target.value); setEditing(false) }}
          onBlur={() => setEditing(false)}
          className="text-xs border border-primary-300 rounded px-2 py-0.5 focus:outline-none bg-white"
        >
          {PROJECT_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      ) : (
        <span
          onClick={canEdit ? () => setEditing(true) : undefined}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${current.cls} ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary-300' : ''}`}
        >
          {current.label}
        </span>
      )}
    </td>
  )
}

function CommentPanel({ projectId, canDelete, currentUserId }) {
  const [comments, setComments] = useState(null)
  const [body, setBody] = useState('')

  useEffect(() => {
    api.get(`/projects/project-comments/?project=${projectId}`)
      .then(r => setComments(r.data.results || r.data))
      .catch(() => setComments([]))
  }, [projectId])

  async function addComment(e) {
    e.preventDefault()
    if (!body.trim()) return
    const res = await api.post('/projects/project-comments/', { project: projectId, body: body.trim() })
    setComments(prev => [...prev, res.data])
    setBody('')
  }

  async function deleteComment(id) {
    await api.delete(`/projects/project-comments/${id}/`)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  if (!comments) return <div className="px-6 py-3 text-xs text-gray-400">Loading…</div>

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-2">Comments</p>
      {comments.length === 0 && <p className="text-xs text-gray-400 mb-2">No comments yet.</p>}
      <div className="space-y-2 mb-3">
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-2 group">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
              {c.author_initials}
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-gray-700 text-xs mr-2">{c.author_name}</span>
              <span className="text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <p className="text-gray-700 mt-0.5">{c.body}</p>
            </div>
            {(canDelete || currentUserId === c.author) && (
              <button onClick={() => deleteComment(c.id)}
                className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition pt-1">✕</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={addComment} className="flex gap-2">
        <input value={body} onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400" />
        <button type="submit" disabled={!body.trim()}
          className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-40 transition">
          Post
        </button>
      </form>
    </div>
  )
}

function money(n) {
  return '$' + n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PlSortTh({ label, colKey, align = 'right', sort, onSort }) {
  const active = sort.key === colKey
  return (
    <th onClick={() => onSort(colKey)}
      className={`px-4 py-3 text-${align} text-xs text-gray-500 uppercase cursor-pointer select-none hover:text-primary-600 whitespace-nowrap`}>
      {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

function DescriptionCell({ value, suggestions, onChange, onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? suggestions.filter(s => s.description.toLowerCase().includes(query.toLowerCase()))
    : suggestions

  function pick(s) {
    setQuery(s.description)
    setOpen(false)
    onSelect(s)
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border-b border-gray-200 focus:border-primary-400 focus:outline-none text-sm py-0.5"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 top-full mt-0.5 w-full min-w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.slice(0, 30).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-50 last:border-0"
            >
              <p className="text-sm text-gray-800 truncate">{s.description}</p>
              <p className="text-xs text-gray-400">{[s.unit, s.unit_price ? `$${parseFloat(s.unit_price).toFixed(2)}` : ''].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TYPE_BADGE = {
  mcst: 'bg-blue-50 text-blue-600',
  commercial: 'bg-amber-50 text-amber-600',
  residential: 'bg-green-50 text-green-700',
  government: 'bg-purple-50 text-purple-700',
  other: 'bg-gray-100 text-gray-500',
}

function ClientDropdown({ value, clients, onChange, onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients

  function pick(c) {
    setQuery(c.name)
    setOpen(false)
    onSelect(c)
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        required
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Select or type client name…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-30 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400 italic">
              "{query}" — not in list. Will be saved as new client.
            </p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(c) }}
              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 border-b border-gray-50 last:border-0 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                {c.primary_contact && (
                  <p className="text-xs text-gray-400 truncate">
                    {[c.primary_contact.name, c.primary_contact.phone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded capitalize shrink-0 mt-0.5 ${TYPE_BADGE[c.type] || TYPE_BADGE.other}`}>
                {c.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemsTable({ items, setItems, showAmount = true, suggestions = [] }) {
  const [addCount, setAddCount] = useState(3)
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

  function fillFromSuggestion(i, s) {
    setItems(prev => {
      const next = [...prev]
      next[i] = {
        ...next[i],
        description: s.description,
        unit: s.unit || next[i].unit,
        unit_price: s.unit_price || next[i].unit_price,
        amount: ((parseFloat(next[i].qty) || 1) * (parseFloat(s.unit_price) || 0)).toFixed(2),
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
                <DescriptionCell
                  value={item.description || ''}
                  suggestions={suggestions}
                  onChange={val => update(i, 'description', val)}
                  onSelect={s => fillFromSuggestion(i, s)}
                />
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
      <div className="mt-2 ml-3 flex items-center gap-2">
        <button onClick={() => {
          const blank = { description: '', unit: '', qty: 1, unit_price: '', amount: '', remarks: '' }
          setItems(prev => [...prev, ...Array(addCount).fill(null).map(() => ({ ...blank }))])
        }} className="text-sm text-primary-600 hover:underline">+ Add lines</button>
        <select value={addCount} onChange={e => setAddCount(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500 focus:outline-none focus:border-primary-400">
          {[1, 3, 5, 10].map(n => <option key={n} value={n}>+{n}</option>)}
        </select>
      </div>
    </div>
  )
}

function Totals({ items, gstRegistered }) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const gst = gstRegistered ? subtotal * GST_RATE : 0
  const total = subtotal + gst
  return (
    <div className="text-sm text-right space-y-1 pr-3 pt-3 border-t border-gray-100">
      <div className="flex justify-end gap-8"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      {gstRegistered && (
        <div className="flex justify-end gap-8"><span className="text-gray-500">GST (9%)</span><span>${gst.toFixed(2)}</span></div>
      )}
      <div className="flex justify-end gap-8 font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
    </div>
  )
}

export default function Finance() {
  const currentUser = getUser()
  const canEditFinance = ADMIN_ROLES.includes(currentUser?.role)
  const location = useLocation()
  const initialTab = TABS.includes(new URLSearchParams(window.location.search).get('tab'))
    ? new URLSearchParams(window.location.search).get('tab') : 'Quotations'
  const [tab, setTab] = useState(initialTab)

  // sync the active tab when navigated to via ?tab= (e.g. sidebar deep-link)
  useEffect(() => {
    const qTab = new URLSearchParams(location.search).get('tab')
    if (qTab && TABS.includes(qTab)) setTab(qTab)
  }, [location.search])
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [dos, setDos] = useState([])
  const [serviceJobs, setServiceJobs] = useState([])
  const [srExpanded, setSrExpanded] = useState(null)
  const [srExporting, setSrExporting] = useState('')
  const [srLineDraft, setSrLineDraft] = useState({ description: '', quantity: 1, unit: 'lot', amount: '' })
  const [projects, setProjects] = useState([])
  const [plSort, setPlSort] = useState({ key: 'profit', dir: 'desc' })
  const [plExpanded, setPlExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // Quotation form
  const today = new Date().toISOString().slice(0, 10)
  const [qForm, setQForm] = useState({ project_no: '', client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '', issue_date: today, valid_until: '', notes: '' })
  const [qItems, setQItems] = useState([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])

  // Invoice form
  const [iForm, setIForm] = useState({ client_name: '', client_email: '', issue_date: '', due_date: '', notes: '' })
  const [iItems, setIItems] = useState([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])

  // DO form
  const [dForm, setDForm] = useState({ client_name: '', delivery_address: '', issue_date: '', delivery_date: '', delivered_by: '', notes: '' })
  const [dItems, setDItems] = useState([{ description: '', unit: '', qty: 1, remarks: '' }])

  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [itemSuggestions, setItemSuggestions] = useState([])
  const [crmClients, setCrmClients] = useState([])
  const [tenant, setTenant] = useState(null)

  useEffect(() => {
    fetchAll()
    api.get('/finance/quotation-items/suggestions/').then(({ data }) => {
      setItemSuggestions(Array.isArray(data) ? data : [])
    }).catch(() => {})
    api.get('/crm/clients/').then(({ data }) => {
      setCrmClients(Array.isArray(data) ? data : data.results ?? [])
    }).catch(() => {})
    fetch('/api/auth/tenant-info/').then(r => r.json()).then(setTenant).catch(() => {})
  }, [])

  // eslint-disable-next-line no-unused-vars
  async function fetchAll() {
    const [q, i, d, p, s] = await Promise.all([
      api.get('/finance/quotations/'),
      api.get('/finance/invoices/'),
      api.get('/finance/delivery-orders/'),
      api.get('/projects/projects/'),
      api.get('/ops/service-jobs/'),
    ])
    setQuotations(q.data.results || q.data)
    setInvoices(i.data.results || i.data)
    setDos(d.data.results || d.data)
    setProjects(p.data.results || p.data)
    setServiceJobs(Array.isArray(s.data) ? s.data : s.data.results ?? [])
    setLoading(false)
  }

  async function addServiceLine(job) {
    const draft = srLineDraft
    if (!draft.description) return
    const nextNo = (job.line_items?.reduce((m, l) => Math.max(m, l.line_number), 0) ?? 0) + 1
    await api.post('/ops/invoice-line-items/', {
      job: job.id, line_number: nextNo,
      description: draft.description, quantity: draft.quantity || 1,
      unit: draft.unit, amount: draft.amount || 0,
    })
    setSrLineDraft({ description: '', quantity: 1, unit: 'lot', amount: '' })
    fetchAll()
  }

  async function deleteServiceLine(id) {
    await api.delete(`/ops/invoice-line-items/${id}/`)
    fetchAll()
  }

  async function exportServiceReport(job, kind) {
    setSrExporting(`${job.id}:${kind}`)
    try {
      const res = await api.get(`/ops/service-jobs/${job.id}/${kind}/`, { responseType: 'blob' })
      const href = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = href; a.download = `${job.service_number}.${kind}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(href)
    } finally { setSrExporting('') }
  }

  function fillFromCrmClient(client) {
    const pc = client.primary_contact
    setQForm(f => ({
      ...f,
      client_name:    client.name,
      client_contact: pc?.name    || '',
      client_email:   pc?.email   || '',
      client_phone:   pc?.phone   || '',
      client_address: client.address || '',
    }))
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
    const gst = tenant?.gst_registered ? subtotal * GST_RATE : 0
    return { subtotal: subtotal.toFixed(2), gst_amount: gst.toFixed(2), total: (subtotal + gst).toFixed(2) }
  }

  function cleanDates(form) {
    const out = { ...form }
    for (const k of ['valid_until', 'issue_date', 'due_date', 'delivery_date', 'start_date', 'end_date']) {
      if (k in out && out[k] === '') out[k] = null
    }
    return out
  }

  async function handleCreateQuotation(e) {
    e.preventDefault(); setSaving(true)
    try {
      const q = await api.post('/finance/quotations/', { ...cleanDates(qForm), ...calcTotals(qItems) })
      await Promise.all(qItems.filter(i => i.description).map((item, idx) =>
        api.post('/finance/quotation-items/', { ...item, quotation: q.data.id, sort_order: idx })
      ))
      setSavedMsg(`Quotation ${q.data.quote_no} saved`)
      setTimeout(() => setSavedMsg(''), 4000)
      setShowForm(false)
      setQForm({ project_no: '', client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '', issue_date: new Date().toISOString().slice(0, 10), valid_until: '', notes: '' })
      setQItems([{ description: '', unit: '', qty: 1, unit_price: '', amount: '' }])
      fetchAll()
    } finally { setSaving(false) }
  }

  async function handleCreateInvoice(e) {
    e.preventDefault(); setSaving(true)
    try {
      const inv = await api.post('/finance/invoices/', { ...cleanDates(iForm), ...calcTotals(iItems) })
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
      const d = await api.post('/finance/delivery-orders/', cleanDates(dForm))
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
        {tab !== 'P&L' && tab !== 'Service Reports' && (
          <button onClick={async () => {
            setShowForm(true); setExpanded(null)
            if (tab === 'Quotations') {
              try {
                const res = await api.get('/projects/projects/next_no/')
                setQForm(f => ({ ...f, project_no: res.data.project_no || '' }))
              } catch {}
            }
          }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            + New {tab === 'Quotations' ? 'Quotation' : tab === 'Invoices' ? 'Invoice' : 'Delivery Order'}
          </button>
        )}
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
              <h2 className="font-semibold text-gray-700 mb-4">New Quotation <span className="text-xs text-gray-400 font-normal">(project number auto-filled, editable)</span></h2>
              <form onSubmit={handleCreateQuotation}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Project No.</label>
                    <input
                      value={qForm.project_no}
                      onChange={e => setQForm(f => ({ ...f, project_no: e.target.value }))}
                      onBlur={e => lookupProject(e.target.value)}
                      placeholder="e.g. SE-26-001"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 font-mono"
                    />
                  </div>
                  {inp('Issue Date *', 'issue_date', qForm, setQForm, { required: true, type: 'date' })}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
                    <ClientDropdown
                      value={qForm.client_name}
                      clients={crmClients}
                      onChange={val => setQForm(f => ({ ...f, client_name: val }))}
                      onSelect={c => fillFromCrmClient(c)}
                    />
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
                  <ItemsTable items={qItems} setItems={setQItems} suggestions={itemSuggestions} />
                  <Totals items={qItems} gstRegistered={tenant?.gst_registered} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {savedMsg && <span className="text-sm text-green-600 mr-auto">{savedMsg}</span>}
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Quotation'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-[calc(100vh-260px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10"><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
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
                  <Fragment key={q.id}>
                    <tr onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                      className="hover:bg-primary-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs">{q.quote_no}</td>
                      <td className="px-4 py-3 text-gray-500">{q.project_no || '—'}</td>
                      <td className="px-4 py-3 font-medium">{q.client_name}</td>
                      <td className="px-4 py-3 text-gray-500">{q.issue_date}</td>
                      <td className="px-4 py-3"><Badge label={q.status} map={Q_STATUS} /></td>
                      <td className="px-4 py-3 text-right font-medium">${parseFloat(q.total).toLocaleString('en-SG', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); generateQuotationPDF(q) }}
                          className="text-xs text-green-600 hover:underline mr-2">PDF</button>
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
                  </Fragment>
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
                  <ItemsTable items={iItems} setItems={setIItems} suggestions={itemSuggestions} />
                  <Totals items={iItems} gstRegistered={tenant?.gst_registered} />
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-[calc(100vh-260px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10"><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
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
                  <Fragment key={inv.id}>
                    <tr onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
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
                  </Fragment>
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
                  <ItemsTable items={dItems} setItems={setDItems} showAmount={false} suggestions={itemSuggestions} />
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-[calc(100vh-260px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10"><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
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
                  <Fragment key={d.id}>
                    <tr onClick={() => setExpanded(expanded === d.id ? null : d.id)}
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
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── P&L ── */}
      {tab === 'P&L' && (() => {
        const fmt = n => parseFloat(n) || 0

        function onPlSort(key) {
          setPlSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
        }

        async function patchProject(id, field, value) {
          await api.patch(`/projects/projects/${id}/`, { [field]: value })
          setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
        }

        async function patchFinance(id, field, value) {
          patchProject(id, field, value === '' ? null : parseFloat(value))
        }


        const rows = projects
          .map(p => {
            const received = fmt(p.payment_received)
            const expenses = fmt(p.expenses)
            const profit   = received - expenses
            const margin   = received > 0 ? (profit / received) * 100 : -Infinity
            return { ...p, quoted: fmt(p.quoted_amount), received, expenses, profit, margin }
          })
          .sort((a, b) => {
            const av = a[plSort.key] ?? ''
            const bv = b[plSort.key] ?? ''
            if (av < bv) return plSort.dir === 'asc' ? -1 : 1
            if (av > bv) return plSort.dir === 'asc' ? 1 : -1
            return 0
          })

        const totQuoted   = rows.reduce((s, r) => s + r.quoted,   0)
        const totReceived = rows.reduce((s, r) => s + r.received, 0)
        const totExpenses = rows.reduce((s, r) => s + r.expenses, 0)
        const totProfit   = totReceived - totExpenses
        const totMargin   = totReceived > 0 ? (totProfit / totReceived) * 100 : 0

        function marginColor(pct) {
          if (pct >= 20) return 'text-green-600'
          if (pct >= 0)  return 'text-yellow-600'
          return 'text-red-600'
        }

        return (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Quoted',   value: totQuoted,   color: 'text-gray-800' },
                { label: 'Total Received', value: totReceived, color: 'text-blue-600' },
                { label: 'Total Expenses', value: totExpenses, color: 'text-orange-600' },
                { label: 'Net Profit',     value: totProfit,   color: totProfit >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{money(k.value)}</p>
                  {k.label === 'Net Profit' && (
                    <p className={`text-xs mt-1 ${marginColor(totMargin)}`}>{totMargin.toFixed(1)}% margin</p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b">
                    <PlSortTh label="Project"  colKey="project_no" align="left" sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Client"   colKey="client_name" align="left" sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Status"   colKey="status" align="left" sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Quoted"   colKey="quoted"   sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Received" colKey="received" sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Expenses" colKey="expenses" sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Profit"   colKey="profit"   sort={plSort} onSort={onPlSort} />
                    <PlSortTh label="Margin"   colKey="margin"   sort={plSort} onSort={onPlSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No projects yet</td></tr>
                  )}
                  {rows.map(r => {
                    const hasData = r.quoted > 0 || r.received > 0 || r.expenses > 0
                    const marginDisplay = r.margin !== -Infinity ? r.margin : null
                    const isOpen = plExpanded === r.id
                    return (
                      <Fragment key={r.id}>
                      <tr onClick={() => setPlExpanded(isOpen ? null : r.id)}
                        className={`cursor-pointer ${hasData ? 'hover:bg-primary-50' : 'opacity-40'} ${isOpen ? 'bg-primary-50' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-400 mr-2">{r.project_no}</span>
                          <span className="font-medium text-gray-800">{r.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.client_name || '—'}</td>
                        <StatusCell row={r} canEdit={canEditFinance} onPatch={patchProject} />
                        <MoneyCell row={r} field="quoted_amount"    value={r.quoted}   className="px-4 py-3 text-right text-gray-600"           canEdit={false} onPatch={patchFinance} />
                        <MoneyCell row={r} field="payment_received" value={r.received} className="px-4 py-3 text-right text-blue-600 font-medium" canEdit={false} onPatch={patchFinance} />
                        <MoneyCell row={r} field="expenses"         value={r.expenses} className="px-4 py-3 text-right text-orange-600"            canEdit={false} onPatch={patchFinance} />
                        <td className={`px-4 py-3 text-right font-semibold ${r.received > 0 ? (r.profit >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                          {r.received > 0 ? money(r.profit) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${marginDisplay !== null ? marginColor(marginDisplay) : 'text-gray-300'}`}>
                          {marginDisplay !== null ? `${marginDisplay.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.id}-comments`}>
                          <td colSpan={8} className="p-0">
                            <CommentPanel projectId={r.id} canDelete={canEditFinance} currentUserId={currentUser?.id} />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                      <td className="px-4 py-3 text-gray-500" colSpan={3}>Total ({rows.length} projects)</td>
                      <td className="px-4 py-3 text-right text-gray-600">{money(totQuoted)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{money(totReceived)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{money(totExpenses)}</td>
                      <td className={`px-4 py-3 text-right ${totProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(totProfit)}</td>
                      <td className={`px-4 py-3 text-right ${marginColor(totMargin)}`}>{totMargin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )
      })()}

      {/* ── Service Reports (financial view) ── */}
      {tab === 'Service Reports' && (
        <>
          <p className="text-sm text-gray-400 mb-4">Invoice line items &amp; totals for service reports. Create reports and edit findings under <span className="font-medium text-gray-600">Operations</span>.</p>
          {serviceJobs.length === 0 && <p className="text-sm text-gray-400">No service reports yet.</p>}
          <div className="space-y-3">
            {serviceJobs.map(job => {
              const open = srExpanded === job.id
              return (
                <div key={job.id} className="bg-white rounded-xl border border-gray-200">
                  <button onClick={() => setSrExpanded(open ? null : job.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <div>
                      <span className="font-medium text-gray-800 text-sm">{job.service_number}</span>
                      <span className="text-sm text-gray-500 ml-2">{job.client_name} · {job.site_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-700">{money(Number(job.total_amount) || 0)}</span>
                      <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-gray-100 p-4">
                      <table className="w-full text-sm mb-3">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase">
                            <th className="text-left font-medium pb-1 w-10">#</th>
                            <th className="text-left font-medium pb-1">Description</th>
                            <th className="text-right font-medium pb-1 w-16">Qty</th>
                            <th className="text-left font-medium pb-1 w-16 pl-3">Unit</th>
                            <th className="text-right font-medium pb-1 w-28">Amount</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(job.line_items ?? []).map(li => (
                            <tr key={li.id}>
                              <td className="py-1.5 text-gray-500">{li.line_number}</td>
                              <td className="py-1.5 text-gray-700">{li.description}</td>
                              <td className="py-1.5 text-right text-gray-600">{Number(li.quantity)}</td>
                              <td className="py-1.5 text-gray-600 pl-3">{li.unit}</td>
                              <td className="py-1.5 text-right text-gray-700">{money(Number(li.amount) || 0)}</td>
                              <td className="py-1.5 text-right">
                                {canEditFinance && (
                                  <button onClick={() => deleteServiceLine(li.id)} className="text-gray-300 hover:text-red-600">✕</button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {(job.line_items ?? []).length === 0 && (
                            <tr><td colSpan={6} className="py-2 text-gray-400 text-center text-xs">No line items.</td></tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 font-semibold">
                            <td colSpan={4} className="pt-2 text-right text-gray-500 text-xs uppercase">Total</td>
                            <td className="pt-2 text-right text-gray-800">{money(Number(job.total_amount) || 0)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>

                      {canEditFinance && (
                        <div className="flex items-end gap-2 mb-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Description</label>
                            <input value={srLineDraft.description} onChange={e => setSrLineDraft(d => ({ ...d, description: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary-400" />
                          </div>
                          <div className="w-16">
                            <label className="block text-xs text-gray-400 mb-1">Qty</label>
                            <input type="number" min="0" step="0.01" value={srLineDraft.quantity} onChange={e => setSrLineDraft(d => ({ ...d, quantity: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                          </div>
                          <div className="w-20">
                            <label className="block text-xs text-gray-400 mb-1">Unit</label>
                            <select value={srLineDraft.unit} onChange={e => setSrLineDraft(d => ({ ...d, unit: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                              {['lot', 'run', 'pcs', 'hrs', 'set', 'm'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="w-28">
                            <label className="block text-xs text-gray-400 mb-1">Amount</label>
                            <input type="number" min="0" step="0.01" value={srLineDraft.amount} onChange={e => setSrLineDraft(d => ({ ...d, amount: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                          </div>
                          <button onClick={() => addServiceLine(job)}
                            className="bg-primary-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-primary-700">Add</button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => exportServiceReport(job, 'docx')} disabled={!!srExporting}
                          className="text-xs border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 disabled:opacity-50">
                          {srExporting === `${job.id}:docx` ? 'Preparing…' : '⬇ Print DOCX'}
                        </button>
                        <button onClick={() => exportServiceReport(job, 'pdf')} disabled={!!srExporting}
                          className="text-xs border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 disabled:opacity-50">
                          {srExporting === `${job.id}:pdf` ? 'Preparing…' : '⬇ Print PDF'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
