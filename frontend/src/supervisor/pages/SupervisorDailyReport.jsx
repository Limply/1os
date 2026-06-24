import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const C = {
  panel:  '#212D3E',
  card:   '#273447',
  border: '#2F4060',
  yellow: '#F5C518',
  amber:  '#E8942A',
  green:  '#2ECC71',
  red:    '#E74C3C',
  blue:   '#3A8EE6',
  text:   '#EEF2F7',
  muted:  '#7A90AA',
  bg:     '#1A2332',
}

const inputStyle = {
  width: '100%', background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 13,
  fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10, color: C.muted, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function formatWA({ project_label, date, company, supervisor_count, g_workers_count, activity_short, activity_items, personnel_names, work_start, work_end }) {
  const total = (supervisor_count || 0) + (g_workers_count || 0)
  const fmtDate = date ? date.split('-').reverse().join('/') : ''
  const activities = (activity_items || []).filter(Boolean).map((a, i) => `${i + 1}) ${a}`).join('\n')
  const personnel  = (personnel_names || []).filter(Boolean).map((p, i) => `${i + 1}) ${p}`).join('\n')
  return [
    `Project : ${project_label || ''}`,
    '',
    `*Date: ${fmtDate}*`,
    '',
    `*Company : ${company || ''}*`,
    '',
    `*Manpower Update :`,
    `Supervisor :${supervisor_count || 0}`,
    `G workers :${g_workers_count || 0}`,
    `#Total : ${total}*`,
    '',
    `Activity : ${activity_short || ''}`,
    '',
    activities,
    '',
    personnel,
    '',
    `*Total Manpower: ${total} Personnel.*`,
    '',
    `*Working hours : ${work_start || ''}  to  ${work_end || ''}*`,
  ].join('\n')
}

export default function SupervisorDailyReport() {
  const navigate = useNavigate()
  const photoRef = useRef()

  const today = new Date().toISOString().split('T')[0]
  const STORAGE_KEY = 'daily_report_last'

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
  }

  function persistForm(f, projId) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...f, _projectId: projId })) } catch {}
  }

  const last = loadSaved()

  const [projects,          setProjects]          = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(last?._projectId || '')
  const [loading,           setLoading]           = useState(true)
  const [saving,            setSaving]            = useState(false)
  const [saved,             setSaved]             = useState(null)
  const [photoFile,         setPhotoFile]         = useState(null)
  const [photoPreview,      setPhotoPreview]      = useState(null)

  const [form, setForm] = useState({
    date:             today,
    project_label:    last?.project_label    || '',
    company:          last?.company          || '',
    supervisor_count: last?.supervisor_count ?? 1,
    g_workers_count:  last?.g_workers_count  ?? 0,
    activity_short:   last?.activity_short   || '',
    activity_items:   last?.activity_items?.length ? last.activity_items : [''],
    personnel_names:  last?.personnel_names?.length ? last.personnel_names : [''],
    work_start:       last?.work_start       || '08:00',
    work_end:         last?.work_end         || '19:00',
  })

  // Load supervisor's default project + all active projects
  useEffect(() => {
    Promise.all([
      api.get('/dashboard/supervisor/'),
      api.get('/projects/projects/'),
    ]).then(([supRes, projRes]) => {
      const supervisorProjId = supRes.data?.project?.id || ''
      const all = (projRes.data || []).filter(p => p.status === 'active' || p.status === 'planning')
      setProjects(all)
      // prefer: last saved → supervisor's current → first in list
      const savedId   = last?._projectId
      const resolvedId = (savedId && all.find(p => String(p.id) === String(savedId)))
        ? savedId
        : (supervisorProjId || all[0]?.id || '')
      setSelectedProjectId(resolvedId)
      // only auto-fill project_label if nothing was saved
      if (!last?.project_label) {
        const proj = all.find(p => String(p.id) === String(resolvedId))
        if (proj) setForm(f => ({ ...f, project_label: proj.name }))
      }
    }).finally(() => setLoading(false))
  }, [])

  // When project selection changes, auto-fill label + company
  useEffect(() => {
    if (!selectedProjectId) return
    const proj = projects.find(p => String(p.id) === String(selectedProjectId))
    if (proj) setForm(f => ({ ...f, project_label: proj.name }))
    api.get(`/projects/projects/${selectedProjectId}/`)
      .then(r => {
        const updates = {}
        if (r.data?.client_name) updates.company = r.data.client_name
        if (r.data?.name) updates.project_label = r.data.name
        if (Object.keys(updates).length) setForm(f => ({ ...f, ...updates }))
      })
      .catch(() => {})
  }, [selectedProjectId])

  const selectedProject = projects.find(p => String(p.id) === String(selectedProjectId)) || null

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setListItem(key, idx, val) {
    setForm(f => {
      const arr = [...f[key]]
      arr[idx] = val
      return { ...f, [key]: arr }
    })
  }

  function addListItem(key) {
    setForm(f => ({ ...f, [key]: [...f[key], ''] }))
  }

  function removeListItem(key, idx) {
    setForm(f => {
      const arr = f[key].filter((_, i) => i !== idx)
      return { ...f, [key]: arr.length ? arr : [''] }
    })
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('project', selectedProjectId)
      fd.append('date', form.date)
      fd.append('company', form.company)
      fd.append('supervisor_count', form.supervisor_count)
      fd.append('g_workers_count', form.g_workers_count)
      fd.append('activity_short', form.activity_short)
      fd.append('activity_items', JSON.stringify(form.activity_items.filter(Boolean)))
      fd.append('personnel_names', JSON.stringify(form.personnel_names.filter(Boolean)))
      fd.append('work_start', form.work_start)
      fd.append('work_end', form.work_end)
      if (photoFile) fd.append('photo', photoFile)

      const res = await api.post('/projects/daily-reports/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      persistForm(form, selectedProjectId)
      setSaved(res.data)
    } finally {
      setSaving(false)
    }
  }

  const waText = formatWA(form)
  const waLink = `https://wa.me/?text=${encodeURIComponent(waText)}`

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
      Loading…
    </div>
  )

  // ── Success screen ────────────────────────────────────────────────────────────
  if (saved) {
    const savedWaText = formatWA(form)
    const savedWaLink = `https://wa.me/?text=${encodeURIComponent(savedWaText)}`

    async function shareAll() {
      // Combined: photo + text in one share action → WhatsApp shows photo with report as caption
      if (photoFile && navigator.canShare?.({ files: [photoFile] })) {
        try {
          await navigator.share({ files: [photoFile], text: savedWaText })
          return
        } catch (e) {
          if (e.name === 'AbortError') return
        }
      }
      // Fallback (desktop / no file share support): text-only link
      window.open(savedWaLink, '_blank')
    }

    return (
      <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", padding: 20 }}>
        <div style={{ background: C.card, border: `1px solid ${C.green}`, borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginBottom: 4 }}>Report Submitted</div>
          <div style={{ fontSize: 12, color: C.muted }}>{form.project_label} · {saved.date}</div>
        </div>

        {photoPreview && (
          <img src={photoPreview} alt="site" style={{ width: '100%', borderRadius: 14, marginBottom: 16, objectFit: 'cover', maxHeight: 220 }} />
        )}

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Report</div>
          <pre style={{ fontSize: 12, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
            {savedWaText}
          </pre>
        </div>

        <button onClick={shareAll}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#fff', borderRadius: 14,
            padding: '15px 20px', fontWeight: 800, fontSize: 15,
            width: '100%', marginBottom: 12, cursor: 'pointer',
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
          </svg>
          Send via WhatsApp
        </button>
        {photoFile && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 16 }}>
            Photo + report will be sent together
          </div>
        )}

        <button onClick={() => { setSaved(null); setPhotoFile(null); setPhotoPreview(null) }}
          style={{ display: 'block', width: '100%', textAlign: 'center', color: C.muted, fontSize: 12, padding: '10px 0', cursor: 'pointer' }}>
          Submit another report
        </button>
        <button onClick={() => navigate('/supervisor')}
          style={{ display: 'block', width: '100%', textAlign: 'center', color: C.yellow, fontSize: 12, padding: '4px 0', cursor: 'pointer' }}>
          ← Back to home
        </button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: C.panel, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/supervisor')} style={{ color: C.muted, cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Supervisor</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Daily Manpower Report</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Photo */}
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div onClick={() => photoRef.current?.click()}
            style={{
              background: C.card, border: `2px dashed ${photoPreview ? C.green : C.border}`,
              borderRadius: 14, overflow: 'hidden', cursor: 'pointer', minHeight: 140,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {photoPreview
              ? <img src={photoPreview} alt="site" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
              : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Tap to add site photo</div>
                </div>
              )
            }
          </div>
          {photoPreview && (
            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
              style={{
                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                color: '#fff', borderRadius: '50%', width: 28, height: 28,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>✕</button>
          )}
        </div>

        {/* Project selector + editable label */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Project</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', marginBottom: 6 }}
          >
            {projects.length === 0 && <option value="">No active projects</option>}
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_no} — {p.name}</option>
            ))}
          </select>
          <input
            value={form.project_label}
            onChange={e => set('project_label', e.target.value)}
            placeholder="Project name in report"
            style={{ ...inputStyle, borderColor: C.yellow + '66' }}
          />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            Edit above to change how the project name appears in the report
          </div>
        </div>

        {/* Date + Company */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Date">
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Company">
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Astronic - Schindler" style={inputStyle} />
          </Field>
        </div>

        {/* Manpower */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Manpower Update</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Supervisor</label>
              <input type="number" min="0" value={form.supervisor_count}
                onChange={e => set('supervisor_count', parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, fontSize: 18 }} />
            </div>
            <div>
              <label style={labelStyle}>G Workers</label>
              <input type="number" min="0" value={form.g_workers_count}
                onChange={e => set('g_workers_count', parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, fontSize: 18 }} />
            </div>
            <div>
              <label style={labelStyle}>Total</label>
              <div style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, fontSize: 18, color: C.yellow }}>
                {(form.supervisor_count || 0) + (form.g_workers_count || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Activity */}
        <Field label="Activity (summary)">
          <input value={form.activity_short} onChange={e => set('activity_short', e.target.value)}
            placeholder="e.g. SL1 & SL2 lift" style={inputStyle} />
        </Field>

        {/* Activity items */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Activity Details</label>
          {form.activity_items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
              <input value={item} onChange={e => setListItem('activity_items', i, e.target.value)}
                placeholder={`Activity ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
              {form.activity_items.length > 1 && (
                <button onClick={() => removeListItem('activity_items', i)}
                  style={{ color: C.red, fontSize: 16, flexShrink: 0, cursor: 'pointer' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={() => addListItem('activity_items')}
            style={{ fontSize: 11, color: C.blue, fontWeight: 700, marginTop: 2, cursor: 'pointer' }}>
            + Add activity
          </button>
        </div>

        {/* Personnel */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Personnel Names</label>
          {form.personnel_names.map((name, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
              <input value={name} onChange={e => setListItem('personnel_names', i, e.target.value)}
                placeholder={`Person ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
              {form.personnel_names.length > 1 && (
                <button onClick={() => removeListItem('personnel_names', i)}
                  style={{ color: C.red, fontSize: 16, flexShrink: 0, cursor: 'pointer' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={() => addListItem('personnel_names')}
            style={{ fontSize: 11, color: C.blue, fontWeight: 700, marginTop: 2, cursor: 'pointer' }}>
            + Add person
          </button>
        </div>

        {/* Working hours */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Working Hours</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
            <div>
              <label style={labelStyle}>From</label>
              <input type="time" value={form.work_start} onChange={e => set('work_start', e.target.value)} style={inputStyle} />
            </div>
            <span style={{ color: C.muted, fontWeight: 700, marginTop: 18 }}>→</span>
            <div>
              <label style={labelStyle}>To</label>
              <input type="time" value={form.work_end} onChange={e => set('work_end', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving || !selectedProjectId}
          style={{
            width: '100%', background: C.yellow, color: '#0D1720',
            borderRadius: 14, padding: '14px 20px', fontWeight: 900, fontSize: 15,
            opacity: (saving || !selectedProjectId) ? 0.5 : 1,
            cursor: (saving || !selectedProjectId) ? 'not-allowed' : 'pointer',
            marginBottom: 10,
          }}>
          {saving ? 'Submitting…' : 'Submit Report'}
        </button>

        {/* WA preview */}
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 11, color: C.muted, cursor: 'pointer', paddingBottom: 8 }}>Preview WhatsApp message</summary>
          <pre style={{ fontSize: 11, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginTop: 6, fontFamily: 'monospace' }}>
            {waText}
          </pre>
        </details>

      </div>
    </div>
  )
}
