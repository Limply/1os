import { useEffect, useState } from 'react'
import { Plus, Trash2, Paperclip, ChevronDown, ChevronRight, Send, Check, X } from 'lucide-react'
import api from '../api/axios'

const STATUS_STYLE = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
}

const CATEGORIES = [
  { key: 'transport',     label: 'Transport' },
  { key: 'meals',         label: 'Meals' },
  { key: 'material',      label: 'Material' },
  { key: 'equipment',     label: 'Equipment' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'misc',          label: 'Miscellaneous' },
]

const money = n => `$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const thisMonth = () => new Date().toISOString().slice(0, 7) // YYYY-MM

const blankItem = () => ({
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'transport',
  description: '',
  amount: '',
  project_no: '',
  files: [],
})

export default function ClaimsTab() {
  const [claims, setClaims]       = useState([])
  const [toApprove, setToApprove] = useState([])
  const [projectNos, setProjectNos] = useState([])
  const [expanded, setExpanded]   = useState(null)

  // New-claim builder
  const [showForm, setShowForm] = useState(false)
  const [header, setHeader]     = useState({ title: '', month: thisMonth(), notes: '' })
  const [items, setItems]       = useState([blankItem()])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Review (approver)
  const [reviewError, setReviewError] = useState('')

  function loadClaims() {
    api.get('/hr/claims/?scope=mine').then(r => {
      const d = r.data
      setClaims(Array.isArray(d) ? d : (d.results ?? []))
    }).catch(() => {})
    api.get('/hr/claims/?scope=to_approve&status=submitted').then(r => {
      const d = r.data
      setToApprove(Array.isArray(d) ? d : (d.results ?? []))
    }).catch(() => {})
  }

  useEffect(() => {
    loadClaims()
    api.get('/projects/projects/').then(r => {
      const d = r.data
      const list = Array.isArray(d) ? d : (d.results ?? [])
      setProjectNos(list.map(p => p.project_no).filter(Boolean))
    }).catch(() => {})
  }, [])

  // ---- builder helpers ----
  const updateItem = (i, patch) => setItems(its => its.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const addItem    = () => setItems(its => [...its, blankItem()])
  const removeItem = i => setItems(its => its.length > 1 ? its.filter((_, idx) => idx !== i) : its)
  const builderTotal = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

  function resetForm() {
    setHeader({ title: '', month: thisMonth(), notes: '' })
    setItems([blankItem()])
    setError('')
    setShowForm(false)
  }

  async function saveClaim(submit) {
    setError('')
    if (!header.title.trim())       { setError('Enter a claim title.'); return }
    const valid = items.filter(it => it.description.trim() && parseFloat(it.amount) > 0)
    if (valid.length === 0)         { setError('Add at least one item with a description and amount.'); return }
    setSaving(true)
    try {
      const claimRes = await api.post('/hr/claims/', {
        title: header.title.trim(),
        period_month: `${header.month}-01`,
        notes: header.notes || null,
      })
      const claim = claimRes.data
      for (const it of valid) {
        const itemRes = await api.post('/hr/claim-items/', {
          claim: claim.id,
          expense_date: it.expense_date,
          category: it.category,
          description: it.description.trim(),
          amount: it.amount,
          project_no: it.project_no || null,
        })
        const item = itemRes.data
        for (const f of it.files) {
          const fd = new FormData()
          fd.append('item', item.id)
          fd.append('file', f)
          await api.post('/hr/claim-attachments/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
      }
      if (submit) {
        await api.post(`/hr/claims/${claim.id}/submit/`)
      }
      resetForm()
      loadClaims()
    } catch (err) {
      const data = err.response?.data
      const msg = data?.detail || (typeof data === 'object' ? Object.values(data).flat().join(' ') : null)
        || err.response?.statusText || err.message || 'Failed to save claim'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function submitExisting(id) {
    setError('')
    api.post(`/hr/claims/${id}/submit/`).then(() => loadClaims())
      .catch(err => alert(err.response?.data?.detail || 'Failed to submit'))
  }

  function deleteClaim(id) {
    if (!confirm('Delete this claim?')) return
    api.delete(`/hr/claims/${id}/`).then(() => loadClaims())
      .catch(err => alert(err.response?.data?.detail || 'Failed to delete'))
  }

  function review(id, action) {
    setReviewError('')
    const remarks = action === 'reject'
      ? (prompt('Reason for rejection (optional):') ?? '')
      : (prompt('Approval remarks (optional):') ?? '')
    api.post(`/hr/claims/${id}/${action}/`, { remarks }).then(() => loadClaims())
      .catch(err => setReviewError(err.response?.data?.detail || `Failed to ${action}`))
  }

  return (
    <div className="space-y-5">

      {/* ---- Approvals queue (supervisors) ---- */}
      {toApprove.length > 0 && (
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Claims awaiting your approval ({toApprove.length})
          </h2>
          {reviewError && <p className="text-xs text-red-500 mb-2">{reviewError}</p>}
          <div className="space-y-2">
            {toApprove.map(c => (
              <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.claimant_name} · {c.items?.length || 0} items · {money(c.total_amount)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => review(c.id, 'approve')}
                      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => review(c.id, 'reject')}
                      className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
                <ClaimDetail claim={c} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Header + new claim button ---- */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{claims.length} claim{claims.length === 1 ? '' : 's'}</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
            <Plus className="w-4 h-4" /> New Claim
          </button>
        )}
      </div>

      {/* ---- New-claim builder ---- */}
      {showForm && (
        <div className="bg-white border border-primary-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Claim title (e.g. June transport)"
              value={header.title} onChange={e => setHeader(h => ({ ...h, title: e.target.value }))}
              className="sm:col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <input type="month" value={header.month}
              onChange={e => setHeader(h => ({ ...h, month: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700" />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input type="date" value={it.expense_date}
                    onChange={e => updateItem(i, { expense_date: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
                  <select value={it.category} onChange={e => updateItem(i, { category: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white">
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <input type="number" step="0.01" min="0" placeholder="Amount"
                    value={it.amount} onChange={e => updateItem(i, { amount: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
                  <input list="claim-project-nos" placeholder="Project (optional)"
                    value={it.project_no} onChange={e => updateItem(i, { project_no: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
                </div>
                <input type="text" placeholder="Description"
                  value={it.description} onChange={e => updateItem(i, { description: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
                {/* Receipt attachments — one or more per item */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 cursor-pointer">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach receipt(s)
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                      onChange={e => updateItem(i, { files: [...it.files, ...Array.from(e.target.files)] })} />
                  </label>
                  {it.files.map((f, fi) => (
                    <span key={fi} className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                      {f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name}
                      <button onClick={() => updateItem(i, { files: it.files.filter((_, x) => x !== fi) })}
                        className="text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <datalist id="claim-project-nos">
              {projectNos.map(no => <option key={no} value={no} />)}
            </datalist>
            <button onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>

          <textarea placeholder="Notes (optional)" rows={2}
            value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700" />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total: {money(builderTotal)}</span>
            <div className="flex gap-2">
              <button onClick={resetForm} disabled={saving}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button onClick={() => saveClaim(false)} disabled={saving}
                className="text-xs border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button onClick={() => saveClaim(true)} disabled={saving}
                className="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-1.5 rounded-lg disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> {saving ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- My claims list ---- */}
      {claims.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-8">No claims yet. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {claims.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl">
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                {expanded === c.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">
                    {c.period_month?.slice(0, 7)} · {c.items?.length || 0} items · {money(c.total_amount)}
                    {c.approver_name && <span> · to {c.approver_name}</span>}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {c.status}
                </span>
              </button>
              {expanded === c.id && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                  <ClaimDetail claim={c} />
                  {c.status === 'rejected' && c.remarks && (
                    <p className="text-xs text-red-500 mt-2">Rejected: {c.remarks}</p>
                  )}
                  {(c.status === 'draft' || c.status === 'rejected') && (
                    <div className="flex gap-2 justify-end mt-3">
                      <button onClick={() => deleteClaim(c.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Delete</button>
                      <button onClick={() => submitExisting(c.id)}
                        className="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white font-medium px-3 py-1.5 rounded-lg">
                        <Send className="w-3.5 h-3.5" /> Submit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClaimDetail({ claim }) {
  const items = Array.isArray(claim.items) ? claim.items : []
  if (items.length === 0) return <p className="text-xs text-gray-400 mt-2">No items.</p>
  return (
    <div className="mt-2 space-y-2">
      {items.map(it => (
        <div key={it.id} className="text-xs text-gray-600 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-gray-800">{it.description}</p>
            <p className="text-gray-400">
              {it.expense_date} · {it.category}{it.project_no ? ` · ${it.project_no}` : ''}
            </p>
            {Array.isArray(it.attachments) && it.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {it.attachments.map(a => (
                  <a key={a.id} href={a.url || '#'} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800">
                    <Paperclip className="w-3 h-3" />{a.filename}
                  </a>
                ))}
              </div>
            )}
          </div>
          <span className="font-medium text-gray-700 shrink-0">
            ${Number(it.amount || 0).toLocaleString('en-SG', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}
