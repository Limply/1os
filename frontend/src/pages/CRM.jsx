import { useEffect, useState } from 'react'
import api from '../api/axios'

const CLIENT_TYPES = ['mcst', 'commercial', 'residential', 'government', 'other']
const LEAD_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost']
const LEAD_SOURCES  = ['referral', 'repeat', 'cold_call', 'walk_in', 'tender', 'other']
const INTERACTION_TYPES = ['call', 'email', 'site_visit', 'meeting', 'quote_sent', 'other']

const LEAD_STATUS_STYLE = {
  new:       'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  quoted:    'bg-yellow-100 text-yellow-700',
  won:       'bg-green-100 text-green-700',
  lost:      'bg-red-100 text-red-600',
}

const INTERACTION_ICON = {
  call: '📞', email: '✉️', site_visit: '📍', meeting: '🤝', quote_sent: '📄', other: '📝',
}

function label(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Client list panel ─────────────────────────────────────────────────────────
function ClientList({ clients, selectedId, onSelect, onNew, search, setSearch }) {
  const filtered = clients.filter(c =>
    [c.name, c.type, c.primary_contact?.name, c.primary_contact?.phone]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">CRM</h1>
          <button onClick={onNew}
            className="text-xs bg-primary-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-primary-700 transition">
            + Client
          </button>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">No clients</p>
        )}
        {filtered.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedId === c.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}>
            <div className="font-medium text-gray-800 text-sm truncate">{c.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 capitalize">{c.type}</span>
              {c.primary_contact && (
                <span className="text-xs text-gray-400 truncate">· {c.primary_contact.name}</span>
              )}
            </div>
            <div className="flex gap-2 mt-1 text-xs text-gray-400">
              <span>{c.contact_count} contact{c.contact_count !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{c.lead_count} lead{c.lead_count !== 1 ? 's' : ''}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── New / Edit client form ─────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', type: 'mcst', address: '', website: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Company Name *</label>
          <input required value={form.name} onChange={f('name')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
          <select value={form.type} onChange={f('type')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Website</label>
          <input value={form.website || ''} onChange={f('website')} placeholder="https://…"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
          <textarea value={form.address || ''} onChange={f('address')} rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
          <textarea value={form.notes || ''} onChange={f('notes')} rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
        <button type="submit" disabled={saving}
          className="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ── Client detail panel ───────────────────────────────────────────────────────
export default function CRM() {
  const [clients, setClients]       = useState([])
  const [search, setSearch]         = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [client, setClient]         = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // forms / panels
  const [showNewClient, setShowNewClient]   = useState(false)
  const [editingClient, setEditingClient]   = useState(false)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showNewLead, setShowNewLead]       = useState(false)
  const [selectedLead, setSelectedLead]     = useState(null)   // lead detail panel
  const [showNewInteraction, setShowNewInteraction] = useState(false)

  // new-contact form state
  const [contactForm, setContactForm] = useState({ name: '', position: '', phone: '', email: '', whatsapp: '', is_primary: false })
  // new-lead form state
  const [leadForm, setLeadForm] = useState({ title: '', description: '', status: 'new', source: '', estimated_value: '', next_follow_up: '' })
  // new-interaction form state
  const [interactionForm, setInteractionForm] = useState({ type: 'call', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [savingContact, setSavingContact]           = useState(false)
  const [savingLead, setSavingLead]                 = useState(false)
  const [savingInteraction, setSavingInteraction]   = useState(false)

  useEffect(() => { fetchClients() }, [])
  useEffect(() => { if (selectedId) fetchClient(selectedId) }, [selectedId])

  async function fetchClients() {
    try {
      const res = await api.get('/crm/clients/')
      const data = res.data
      setClients(Array.isArray(data) ? data : (data.results ?? []))
    } finally {
      setLoadingList(false)
    }
  }

  async function fetchClient(id) {
    setLoadingDetail(true)
    try {
      const res = await api.get(`/crm/clients/${id}/`)
      setClient(res.data)
      setSelectedLead(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function createClient(form) {
    await api.post('/crm/clients/', form)
    setShowNewClient(false)
    fetchClients()
  }

  async function updateClient(form) {
    await api.patch(`/crm/clients/${client.id}/`, form)
    setEditingClient(false)
    fetchClients()
    fetchClient(client.id)
  }

  async function createContact(e) {
    e.preventDefault()
    setSavingContact(true)
    try {
      await api.post('/crm/contacts/', { ...contactForm, client: client.id })
      setShowNewContact(false)
      setContactForm({ name: '', position: '', phone: '', email: '', whatsapp: '', is_primary: false })
      fetchClient(client.id)
      fetchClients()
    } finally { setSavingContact(false) }
  }

  async function createLead(e) {
    e.preventDefault()
    setSavingLead(true)
    try {
      const payload = { ...leadForm, client: client.id }
      if (!payload.estimated_value) delete payload.estimated_value
      if (!payload.next_follow_up) delete payload.next_follow_up
      if (!payload.source) delete payload.source
      await api.post('/crm/leads/', payload)
      setShowNewLead(false)
      setLeadForm({ title: '', description: '', status: 'new', source: '', estimated_value: '', next_follow_up: '' })
      fetchClient(client.id)
      fetchClients()
    } finally { setSavingLead(false) }
  }

  async function updateLeadStatus(leadId, status) {
    await api.patch(`/crm/leads/${leadId}/`, { status })
    fetchClient(client.id)
    if (selectedLead?.id === leadId) setSelectedLead(l => ({ ...l, status }))
  }

  async function createInteraction(e) {
    e.preventDefault()
    setSavingInteraction(true)
    try {
      await api.post('/crm/interactions/', { ...interactionForm, lead: selectedLead.id })
      setShowNewInteraction(false)
      setInteractionForm({ type: 'call', notes: '', date: new Date().toISOString().slice(0, 10) })
      // refresh interactions for selected lead
      const res = await api.get(`/crm/interactions/?lead=${selectedLead.id}`)
      setSelectedLead(l => ({ ...l, interactions: res.data }))
      fetchClient(client.id)
    } finally { setSavingInteraction(false) }
  }

  async function openLead(lead) {
    const res = await api.get(`/crm/interactions/?lead=${lead.id}`)
    setSelectedLead({ ...lead, interactions: res.data })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-2rem)] -m-6 overflow-hidden">

      {/* Client list */}
      <ClientList
        clients={clients} selectedId={selectedId}
        onSelect={id => { setSelectedId(id); setEditingClient(false) }}
        onNew={() => setShowNewClient(true)}
        search={search} setSearch={setSearch}
      />

      {/* Main area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">

        {/* New client modal */}
        {showNewClient && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">New Client</h2>
              <ClientForm onSave={createClient} onCancel={() => setShowNewClient(false)} />
            </div>
          </div>
        )}

        {!selectedId && !showNewClient && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a client to view details</p>
          </div>
        )}

        {selectedId && loadingDetail && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Loading…</p>
          </div>
        )}

        {selectedId && client && !loadingDetail && (
          <div className="p-6 space-y-6">

            {/* Client header */}
            {editingClient ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Edit Client</h2>
                <ClientForm
                  initial={{ name: client.name, type: client.type, address: client.address, website: client.website, notes: client.notes }}
                  onSave={updateClient}
                  onCancel={() => setEditingClient(false)}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">{client.type}{client.address ? ` · ${client.address}` : ''}</p>
                    {client.website && <a href={client.website} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">{client.website}</a>}
                    {client.notes && <p className="text-sm text-gray-600 mt-2">{client.notes}</p>}
                  </div>
                  <button onClick={() => setEditingClient(true)}
                    className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                    ✎ Edit
                  </button>
                </div>
              </div>
            )}

            {/* Contacts */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">Contacts</h3>
                <button onClick={() => setShowNewContact(v => !v)}
                  className="text-xs text-primary-600 hover:text-primary-800">+ Add</button>
              </div>

              {showNewContact && (
                <form onSubmit={createContact} className="bg-white rounded-xl border border-gray-200 p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[['Name *', 'name', true], ['Position', 'position', false], ['Phone', 'phone', false], ['Email', 'email', false], ['WhatsApp', 'whatsapp', false]].map(([lbl, key, req]) => (
                      <div key={key} className={key === 'name' ? 'col-span-2' : ''}>
                        <label className="text-xs text-gray-500">{lbl}</label>
                        <input required={req} value={contactForm[key]} onChange={e => setContactForm(p => ({ ...p, [key]: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                    ))}
                    <div className="col-span-2 flex items-center gap-2">
                      <input type="checkbox" id="primary" checked={contactForm.is_primary} onChange={e => setContactForm(p => ({ ...p, is_primary: e.target.checked }))} />
                      <label htmlFor="primary" className="text-sm text-gray-600">Primary contact</label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowNewContact(false)} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                    <button type="submit" disabled={savingContact} className="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {savingContact ? 'Saving…' : 'Add Contact'}
                    </button>
                  </div>
                </form>
              )}

              {client.contacts.length === 0 && !showNewContact && (
                <p className="text-sm text-gray-400">No contacts yet.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {client.contacts.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                      {c.is_primary && <span className="text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full">Primary</span>}
                    </div>
                    {c.position && <p className="text-xs text-gray-400 mt-0.5">{c.position}</p>}
                    <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                      {c.phone && <p>📞 {c.phone}</p>}
                      {c.whatsapp && <p>💬 {c.whatsapp}</p>}
                      {c.email && <p>✉️ {c.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Leads */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">Leads</h3>
                <button onClick={() => setShowNewLead(v => !v)}
                  className="text-xs text-primary-600 hover:text-primary-800">+ Add</button>
              </div>

              {showNewLead && (
                <form onSubmit={createLead} className="bg-white rounded-xl border border-gray-200 p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Title *</label>
                      <input required value={leadForm.title} onChange={e => setLeadForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Lift Maintenance Contract"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <select value={leadForm.status} onChange={e => setLeadForm(p => ({ ...p, status: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Source</label>
                      <select value={leadForm.source} onChange={e => setLeadForm(p => ({ ...p, source: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                        <option value="">— None —</option>
                        {LEAD_SOURCES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Est. Value (SGD)</label>
                      <input type="number" min="0" step="0.01" value={leadForm.estimated_value} onChange={e => setLeadForm(p => ({ ...p, estimated_value: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Next Follow-up</label>
                      <input type="date" value={leadForm.next_follow_up} onChange={e => setLeadForm(p => ({ ...p, next_follow_up: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Description</label>
                      <textarea value={leadForm.description} onChange={e => setLeadForm(p => ({ ...p, description: e.target.value }))} rows={2}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowNewLead(false)} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                    <button type="submit" disabled={savingLead} className="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {savingLead ? 'Saving…' : 'Add Lead'}
                    </button>
                  </div>
                </form>
              )}

              {client.leads.length === 0 && !showNewLead && (
                <p className="text-sm text-gray-400">No leads yet.</p>
              )}
              <div className="space-y-2">
                {client.leads.map(lead => (
                  <div key={lead.id}
                    className={`bg-white rounded-xl border px-4 py-3 cursor-pointer hover:border-primary-300 transition ${selectedLead?.id === lead.id ? 'border-primary-400 shadow-sm' : 'border-gray-200'}`}
                    onClick={() => selectedLead?.id === lead.id ? setSelectedLead(null) : openLead(lead)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-800 text-sm truncate">{lead.title}</span>
                      <select
                        value={lead.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateLeadStatus(lead.id, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border-none focus:outline-none cursor-pointer ${LEAD_STATUS_STYLE[lead.status]}`}
                      >
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      {lead.source && <span>{label(lead.source)}</span>}
                      {lead.estimated_value && <span>SGD {Number(lead.estimated_value).toLocaleString()}</span>}
                      {lead.next_follow_up && <span>Follow up: {lead.next_follow_up}</span>}
                      <span>{lead.interaction_count} interaction{lead.interaction_count !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Interaction panel */}
                    {selectedLead?.id === lead.id && (
                      <div className="mt-3 border-t border-gray-100 pt-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Interactions</span>
                          <button onClick={() => setShowNewInteraction(v => !v)}
                            className="text-xs text-primary-600 hover:text-primary-800">+ Log</button>
                        </div>

                        {showNewInteraction && (
                          <form onSubmit={createInteraction} className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500">Type</label>
                                <select value={interactionForm.type} onChange={e => setInteractionForm(p => ({ ...p, type: e.target.value }))}
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                                  {INTERACTION_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">Date</label>
                                <input type="date" value={interactionForm.date} onChange={e => setInteractionForm(p => ({ ...p, date: e.target.value }))}
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-500">Notes</label>
                                <textarea value={interactionForm.notes} onChange={e => setInteractionForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setShowNewInteraction(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                              <button type="submit" disabled={savingInteraction} className="bg-primary-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {savingInteraction ? 'Saving…' : 'Log'}
                              </button>
                            </div>
                          </form>
                        )}

                        {selectedLead.interactions?.length === 0 && (
                          <p className="text-xs text-gray-400">No interactions logged.</p>
                        )}
                        <div className="space-y-2">
                          {selectedLead.interactions?.map(i => (
                            <div key={i.id} className="flex gap-2 text-xs text-gray-600">
                              <span className="shrink-0 mt-0.5">{INTERACTION_ICON[i.type]}</span>
                              <div>
                                <span className="font-medium">{label(i.type)}</span>
                                <span className="text-gray-400 ml-1">{i.date}{i.by_name ? ` · ${i.by_name}` : ''}</span>
                                {i.notes && <p className="text-gray-500 mt-0.5">{i.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
