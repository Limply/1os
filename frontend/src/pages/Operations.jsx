import { useEffect, useState } from 'react'
import api from '../api/axios'

const DEFAULT_REMARKS = 'PayNow to UEN 53484821D (SIMPLY ENGINEERING)\nThe supplied items will be covered by 1-year manufacturer’s warranty.'
const STATUSES = ['draft', 'sent', 'acknowledged', 'closed']
const UNITS = ['lot', 'run', 'pcs', 'hrs', 'set', 'm']
const STATUS_STYLE = {
  draft:        'bg-gray-100 text-gray-600',
  sent:         'bg-blue-100 text-blue-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  closed:       'bg-green-100 text-green-700',
}

let _uid = 0
const uid = () => `k${++_uid}`
const label = s => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const linesToList = txt => (txt || '').split('\n').map(s => s.trim()).filter(Boolean)
const listToLines = list => (Array.isArray(list) ? list : []).join('\n')
const money = n => '$' + (Number(n) || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(href)
}

// build editable item/line rows from a saved job (edit mode) or blank (create)
function itemFromApi(it) {
  return {
    key: uid(), id: it.id, item_number: it.item_number, title: it.title || '',
    issue: listToLines(it.issue_points), action: listToLines(it.action_points),
    recommendation: listToLines(it.recommendation_points),
    photos: Array.isArray(it.photos) ? it.photos : [], staged: [], removedPhotoIds: [],
  }
}
const blankItem = () => ({ key: uid(), id: null, item_number: null, title: '', issue: '', action: '', recommendation: '', photos: [], staged: [], removedPhotoIds: [] })
const blankLine = () => ({ key: uid(), id: null, line_number: null, description: '', quantity: '1', unit: 'lot', amount: '' })

// ── Combined create / edit form ────────────────────────────────────────────
function ReportForm({ initial, clients, sites, onSaved, onCancel }) {
  const isEdit = !!initial
  const [header, setHeader] = useState(initial ? {
    client: initial.client || '', site: initial.site || '', site_name: initial.site_name || '',
    site_address: initial.site_address || '', invoice_date: initial.invoice_date || new Date().toISOString().slice(0, 10),
    status: initial.status || 'draft', remarks: initial.remarks || '',
  } : {
    client: '', site: '', site_name: '', site_address: '',
    invoice_date: new Date().toISOString().slice(0, 10), status: 'draft', remarks: DEFAULT_REMARKS,
  })
  const [items, setItems] = useState(initial ? (initial.report_items || []).map(itemFromApi) : [blankItem()])
  const [lines, setLines] = useState(initial ? (initial.line_items || []).map(l => ({
    key: uid(), id: l.id, line_number: l.line_number, description: l.description || '',
    quantity: String(l.quantity ?? '1'), unit: l.unit || 'lot', amount: String(l.amount ?? ''),
  })) : [blankLine()])
  const [removedItems, setRemovedItems] = useState([])
  const [removedLines, setRemovedLines] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const h = k => e => setHeader(p => ({ ...p, [k]: e.target.value }))
  const upItem = (key, patch) => setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  const upLine = (key, patch) => setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))

  function pickClient(e) {
    const id = e.target.value
    const c = clients.find(x => x.id === id)
    setHeader(p => ({
      ...p, client: id,
      site_name: p.site_name || (c?.name ?? ''),
      site_address: c?.address ?? p.site_address,
    }))
  }
  function pickSite(e) {
    const id = e.target.value
    const s = sites.find(x => x.id === id)
    setHeader(p => ({ ...p, site: id, site_name: s?.name ?? p.site_name, site_address: s?.address ?? p.site_address }))
  }

  function stagePhotos(key, fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const staged = files.map(file => ({ file, caption: '', url: URL.createObjectURL(file) }))
    setItems(prev => prev.map(it => it.key === key ? { ...it, staged: [...it.staged, ...staged] } : it))
  }
  function removeStaged(key, idx) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, staged: it.staged.filter((_, i) => i !== idx) } : it))
  }
  function removeExistingPhoto(key, photoId) {
    setItems(prev => prev.map(it => it.key === key
      ? { ...it, photos: it.photos.filter(p => p.id !== photoId), removedPhotoIds: [...it.removedPhotoIds, photoId] } : it))
  }
  function removeItem(key) {
    setItems(prev => {
      const it = prev.find(x => x.key === key)
      if (it?.id) setRemovedItems(r => [...r, it.id])
      return prev.filter(x => x.key !== key)
    })
  }
  function removeLine(key) {
    setLines(prev => {
      const ln = prev.find(x => x.key === key)
      if (ln?.id) setRemovedLines(r => [...r, ln.id])
      return prev.filter(x => x.key !== key)
    })
  }

  const total = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      // 1. Job header
      const headerPayload = { ...header }
      if (!headerPayload.site) delete headerPayload.site
      let jobId = initial?.id
      if (jobId) await api.patch(`/ops/service-jobs/${jobId}/`, headerPayload)
      else jobId = (await api.post('/ops/service-jobs/', headerPayload)).data.id

      // 2. Deletions
      await Promise.all(removedItems.map(id => api.delete(`/ops/service-report-items/${id}/`).catch(() => {})))
      await Promise.all(removedLines.map(id => api.delete(`/ops/invoice-line-items/${id}/`).catch(() => {})))

      // 3. Report items (keep existing numbers; new ones get max+1 to avoid unique clashes)
      let maxItemNo = Math.max(0, ...items.filter(i => i.id && i.item_number).map(i => i.item_number))
      for (const it of items) {
        const hasContent = it.title.trim() || it.issue.trim() || it.action.trim() ||
          it.recommendation.trim() || it.photos.length || it.staged.length
        if (!hasContent && !it.id) continue
        const num = it.item_number || ++maxItemNo
        const payload = {
          item_number: num, title: it.title.trim() || `Item ${num}`,
          issue_points: linesToList(it.issue), action_points: linesToList(it.action),
          recommendation_points: linesToList(it.recommendation),
        }
        let itemId = it.id
        if (itemId) await api.patch(`/ops/service-report-items/${itemId}/`, payload)
        else itemId = (await api.post('/ops/service-report-items/', { ...payload, job: jobId })).data.id

        await Promise.all(it.removedPhotoIds.map(pid => api.delete(`/ops/service-report-photos/${pid}/`).catch(() => {})))
        for (let i = 0; i < it.staged.length; i++) {
          const s = it.staged[i]
          const fd = new FormData()
          fd.append('item', itemId); fd.append('image', s.file)
          fd.append('caption', s.caption || ''); fd.append('sort_order', it.photos.length + i)
          await api.post('/ops/service-report-photos/', fd)
        }
      }

      // 4. Invoice line items
      let maxLineNo = Math.max(0, ...lines.filter(l => l.id && l.line_number).map(l => l.line_number))
      for (const ln of lines) {
        if (!ln.description.trim() && !ln.id) continue
        const num = ln.line_number || ++maxLineNo
        const payload = {
          line_number: num, description: ln.description, quantity: ln.quantity || 1,
          unit: ln.unit || 'lot', amount: ln.amount || 0,
        }
        if (ln.id) await api.patch(`/ops/invoice-line-items/${ln.id}/`, payload)
        else await api.post('/ops/invoice-line-items/', { ...payload, job: jobId })
      }

      onSaved(jobId)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save report.')
    } finally { setSaving(false) }
  }

  const inputCls = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <form onSubmit={save} className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? `Edit ${initial.service_number}` : 'New Service Report'}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
          <button type="submit" disabled={saving}
            className="bg-primary-600 text-white text-sm px-5 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
          </button>
        </div>
      </div>

      {/* A — Header */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Job Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Client *</label>
            <select required value={header.client} onChange={pickClient} className={inputCls}>
              <option value="">— Select —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Site (optional)</label>
            <select value={header.site} onChange={pickSite} className={inputCls}>
              <option value="">— None —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Site Name *</label>
            <input required value={header.site_name} onChange={h('site_name')} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Date *</label>
            <input required type="date" value={header.invoice_date} onChange={h('invoice_date')} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Site Address *</label>
            <textarea required value={header.site_address} onChange={h('site_address')} rows={2} className={inputCls + ' resize-none'} />
          </div>
          {isEdit && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
              <select value={header.status} onChange={h('status')} className={inputCls}>
                {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* B — Report Items */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700">Report Items</h3>
          <button type="button" onClick={() => setItems(prev => [...prev, blankItem()])}
            className="text-xs text-primary-600 hover:text-primary-800">+ Add Another Issue</button>
        </div>
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={it.key} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">Issue {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(it.key)} className="text-xs text-gray-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Title *</label>
                  <input value={it.title} onChange={e => upItem(it.key, { title: e.target.value })} placeholder="e.g. Wi-Fi Camera at Entrance"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                {[['Issue', 'issue'], ['Action Taken', 'action'], ['Recommendation', 'recommendation']].map(([lbl, key]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500">{lbl} <span className="text-gray-300">(one per line)</span></label>
                    <textarea value={it[key]} onChange={e => upItem(it.key, { [key]: e.target.value })} rows={2}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none" />
                  </div>
                ))}
                {/* Photos */}
                <div>
                  <label className="text-xs text-gray-500">Photos</label>
                  {(it.photos.length > 0 || it.staged.length > 0) && (
                    <div className="flex flex-wrap gap-3 my-2">
                      {it.photos.map(ph => (
                        <div key={ph.id} className="w-24">
                          <div className="relative">
                            <img src={ph.image_url} alt={ph.caption || 'photo'} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => removeExistingPhoto(it.key, ph.id)}
                              className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-5 h-5 text-xs leading-none text-gray-500 hover:text-red-600">✕</button>
                          </div>
                          {ph.caption && <p className="text-xs text-gray-500 mt-0.5 truncate">{ph.caption}</p>}
                        </div>
                      ))}
                      {it.staged.map((s, si) => (
                        <div key={si} className="w-24">
                          <div className="relative">
                            <img src={s.url} alt="new" className="w-24 h-24 object-cover rounded-lg border border-primary-200" />
                            <button type="button" onClick={() => removeStaged(it.key, si)}
                              className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-5 h-5 text-xs leading-none text-gray-500 hover:text-red-600">✕</button>
                          </div>
                          <input value={s.caption} placeholder="caption"
                            onChange={e => upItem(it.key, { staged: it.staged.map((x, i) => i === si ? { ...x, caption: e.target.value } : x) })}
                            className="mt-0.5 w-24 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none" />
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="file" accept="image/*" multiple onChange={e => { stagePhotos(it.key, e.target.files); e.target.value = '' }}
                    className="mt-1 text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:px-3 file:py-1.5 file:text-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C — Invoice line items */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700">Equipment, Labour & Materials</h3>
          <button type="button" onClick={() => setLines(prev => [...prev, blankLine()])}
            className="text-xs text-primary-600 hover:text-primary-800">+ Add Line</button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          {lines.map(ln => (
            <div key={ln.key} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Description</label>
                <input value={ln.description} onChange={e => upLine(ln.key, { description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="w-16">
                <label className="text-xs text-gray-400">Qty</label>
                <input type="number" min="0" step="0.01" value={ln.quantity} onChange={e => upLine(ln.key, { quantity: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              </div>
              <div className="w-20">
                <label className="text-xs text-gray-400">Unit</label>
                <select value={ln.unit} onChange={e => upLine(ln.key, { unit: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="text-xs text-gray-400">Amount</label>
                <input type="number" min="0" step="0.01" value={ln.amount} onChange={e => upLine(ln.key, { amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              </div>
              <button type="button" onClick={() => removeLine(ln.key)} className="text-gray-300 hover:text-red-600 pb-2">✕</button>
            </div>
          ))}
          <div className="flex justify-end border-t border-gray-100 pt-2 text-sm font-semibold text-gray-700">
            Total:&nbsp;{money(total)}
          </div>
        </div>
      </section>

      {/* D — Remarks */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-2">Remarks</h3>
        <textarea value={header.remarks} onChange={h('remarks')} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
      </section>

      {error && <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
        <button type="submit" disabled={saving}
          className="bg-primary-600 text-white text-sm px-5 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
        </button>
      </div>
    </form>
  )
}

function PointList({ heading, points }) {
  const list = Array.isArray(points) ? points : []
  if (list.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">{heading}</p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
        {list.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  )
}

// ── Read-only detail view ──────────────────────────────────────────────────
function ReadView({ job, onEdit, onStatus, onExport, exporting, error }) {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">{job.service_number}</h2>
              <select value={job.status} onChange={e => onStatus(e.target.value)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium border-none focus:outline-none cursor-pointer ${STATUS_STYLE[job.status]}`}>
                {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-1">{job.client_name} · {job.site_name}</p>
            <p className="text-xs text-gray-400">{job.site_address}</p>
            <p className="text-xs text-gray-400 mt-0.5">Date: {job.invoice_date}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={onEdit} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">✎ Edit</button>
            <button onClick={() => onExport('docx')} disabled={!!exporting}
              className="text-xs border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 disabled:opacity-50">
              {exporting === 'docx' ? 'Preparing…' : '⬇ Print DOCX'}
            </button>
            <button onClick={() => onExport('pdf')} disabled={!!exporting}
              className="text-xs border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 disabled:opacity-50">
              {exporting === 'pdf' ? 'Preparing…' : '⬇ Print PDF'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <section>
        <h3 className="font-semibold text-gray-700 mb-2">Report Items</h3>
        {(job.report_items ?? []).length === 0 && <p className="text-sm text-gray-400">No report items.</p>}
        <div className="space-y-3">
          {(job.report_items ?? []).map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-medium text-gray-800 text-sm">{item.item_number}. {item.title}</h4>
              <div className="mt-2 space-y-2">
                <PointList heading="Issue" points={item.issue_points} />
                <PointList heading="Action Taken" points={item.action_points} />
                <PointList heading="Recommendation" points={item.recommendation_points} />
                {Array.isArray(item.photos) && item.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {item.photos.map(ph => (
                      <div key={ph.id} className="w-24">
                        <img src={ph.image_url} alt={ph.caption || 'photo'} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                        {ph.caption && <p className="text-xs text-gray-500 mt-0.5 truncate">{ph.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(job.line_items ?? []).length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Equipment, Labour & Materials</h3>
          <table className="w-full text-sm bg-white rounded-xl border border-gray-200 overflow-hidden">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
              <tr><th className="text-left px-3 py-2 w-10">#</th><th className="text-left px-3 py-2">Description</th><th className="text-right px-3 py-2 w-20">Qty</th><th className="text-right px-3 py-2 w-28">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {job.line_items.map(li => (
                <tr key={li.id}>
                  <td className="px-3 py-2 text-gray-500">{li.line_number}</td>
                  <td className="px-3 py-2 text-gray-700">{li.description}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{Number(li.quantity)} {li.unit}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{money(li.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t-2 border-gray-200">
                <td className="px-3 py-2" colSpan={3} style={{ textAlign: 'right' }}>Total</td>
                <td className="px-3 py-2 text-right text-gray-800">{money(job.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {job.remarks && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Remarks</h3>
          <p className="text-sm text-gray-600 bg-white rounded-xl border border-gray-200 p-4 whitespace-pre-wrap">{job.remarks}</p>
        </section>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Operations() {
  const [jobs, setJobs]       = useState([])
  const [clients, setClients] = useState([])
  const [sites, setSites]     = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [job, setJob]         = useState(null)
  const [mode, setMode]       = useState('view')   // 'view' | 'create' | 'edit'
  const [search, setSearch]   = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [exporting, setExporting] = useState('')
  const [error, setError]     = useState('')

  useEffect(() => {
    fetchJobs()
    api.get('/org/clients/').then(({ data }) => setClients(Array.isArray(data) ? data : data.results ?? []))
    api.get('/org/sites/').then(({ data }) => setSites(Array.isArray(data) ? data : data.results ?? []))
  }, [])
  useEffect(() => { if (selectedId) fetchJob(selectedId) }, [selectedId])

  async function fetchJobs() {
    try {
      const { data } = await api.get('/ops/service-jobs/')
      setJobs(Array.isArray(data) ? data : data.results ?? [])
    } finally { setLoadingList(false) }
  }
  async function fetchJob(id) {
    const { data } = await api.get(`/ops/service-jobs/${id}/`)
    setJob(data)
  }

  function openCreate() { setSelectedId(null); setJob(null); setMode('create') }
  function openView(id) { setMode('view'); setSelectedId(id) }

  async function onSaved(jobId) {
    setMode('view')
    await fetchJobs()
    setSelectedId(jobId)
    fetchJob(jobId)
  }

  async function updateStatus(status) {
    await api.patch(`/ops/service-jobs/${job.id}/`, { status })
    setJob(j => ({ ...j, status }))
    fetchJobs()
  }
  async function exportDoc(kind) {
    setExporting(kind); setError('')
    try { await downloadFile(`/ops/service-jobs/${job.id}/${kind}/`, `${job.service_number}.${kind}`) }
    catch { setError(`Could not generate ${kind.toUpperCase()}.`) }
    finally { setExporting('') }
  }

  const filtered = jobs.filter(j =>
    [j.service_number, j.client_name, j.site_name].some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-6 overflow-hidden">
      {/* List */}
      <div className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800">Service Reports</h1>
            <button onClick={openCreate} className="text-xs bg-primary-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-primary-700 transition">+ Report</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loadingList && <p className="text-center text-gray-400 text-sm py-10">Loading…</p>}
          {!loadingList && filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No reports</p>}
          {filtered.map(j => (
            <button key={j.id} onClick={() => openView(j.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedId === j.id && mode === 'view' ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm truncate">{j.service_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[j.status]}`}>{label(j.status)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{j.client_name || '—'}</div>
              <div className="text-xs text-gray-400 truncate">{j.site_name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {mode === 'create' && (
          <ReportForm initial={null} clients={clients} sites={sites} onSaved={onSaved} onCancel={() => setMode('view')} />
        )}
        {mode === 'edit' && job && (
          <ReportForm initial={job} clients={clients} sites={sites} onSaved={onSaved} onCancel={() => setMode('view')} />
        )}
        {mode === 'view' && !selectedId && (
          <div className="flex items-center justify-center h-full text-gray-400"><p>Select a report, or create a new one</p></div>
        )}
        {mode === 'view' && selectedId && job && (
          <ReadView job={job} onEdit={() => setMode('edit')} onStatus={updateStatus} onExport={exportDoc} exporting={exporting} error={error} />
        )}
      </div>
    </div>
  )
}
