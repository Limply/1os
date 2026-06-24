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

const TYPES = [
  { value: 'safe',         label: 'Safe Condition',  color: C.green  },
  { value: 'unsafe',       label: 'Unsafe Condition', color: C.red   },
  { value: 'near_miss',    label: 'Near Miss',        color: C.amber },
  { value: 'hazard',       label: 'Hazard',           color: C.yellow },
  { value: 'daily_report', label: 'Daily Report',     color: C.blue, full: true },
]

const inputStyle = {
  width: '100%', background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 13,
  fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10, color: C.muted, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

const STORAGE_KEY = 'wsh_photo_last'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

function formatWA({ project_label, date, area, observation_type, description, action_taken }) {
  const typeLabel = TYPES.find(t => t.value === observation_type)?.label || observation_type
  const fmtDate   = date ? date.split('-').reverse().join('/') : ''
  return [
    `*WSH Observation Report*`,
    ``,
    `Project : ${project_label || ''}`,
    `Date : ${fmtDate}`,
    `Area : ${area || '—'}`,
    ``,
    `*Type : ${typeLabel}*`,
    ``,
    `Observation :`,
    description || '—',
    ``,
    action_taken ? `Action Taken :\n${action_taken}` : '',
  ].filter(l => l !== undefined).join('\n').trim()
}

export default function SupervisorWSHPhoto() {
  const navigate = useNavigate()
  const photoRef = useRef()

  const today = new Date().toISOString().split('T')[0]
  const last  = loadSaved()

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
    area:             last?.area             || '',
    observation_type: last?.observation_type || 'safe',
    description:      '',
    action_taken:     '',
  })

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/supervisor/'),
      api.get('/projects/projects/'),
    ]).then(([supRes, projRes]) => {
      const supervisorProjId = supRes.data?.project?.id || ''
      const all = (projRes.data || []).filter(p => p.status === 'active' || p.status === 'planning')
      setProjects(all)
      const savedId    = last?._projectId
      const resolvedId = (savedId && all.find(p => String(p.id) === String(savedId)))
        ? savedId
        : (supervisorProjId || all[0]?.id || '')
      setSelectedProjectId(resolvedId)
      if (!last?.project_label) {
        const proj = all.find(p => String(p.id) === String(resolvedId))
        if (proj) setForm(f => ({ ...f, project_label: proj.name }))
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProjectId || !projects.length) return
    const proj = projects.find(p => String(p.id) === String(selectedProjectId))
    if (proj && !last?.project_label) setForm(f => ({ ...f, project_label: proj.name }))
  }, [selectedProjectId, projects])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!selectedProjectId || !photoFile) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('project',          selectedProjectId)
      fd.append('date',             form.date)
      fd.append('area',             form.area)
      fd.append('observation_type', form.observation_type)
      fd.append('description',      form.description)
      fd.append('action_taken',     form.action_taken)
      fd.append('photo',            photoFile)

      const res = await api.post('/projects/wsh-photos/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...form, _projectId: selectedProjectId,
          // don't persist description/action — they're observation-specific
          description: '', action_taken: '',
        }))
      } catch {}
      setSaved(res.data)
    } finally {
      setSaving(false)
    }
  }

  const waText = formatWA(form)
  const waLink = `https://wa.me/?text=${encodeURIComponent(waText)}`

  async function shareAll() {
    if (photoFile && navigator.canShare?.({ files: [photoFile] })) {
      try {
        await navigator.share({ files: [photoFile], text: waText })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    window.open(waLink, '_blank')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
      Loading…
    </div>
  )

  const waIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  )

  // ── Success screen ────────────────────────────────────────────────────────────
  if (saved) {
    const typeInfo  = TYPES.find(t => t.value === form.observation_type) || TYPES[0]
    const savedWaText = formatWA(form)
    const savedWaLink = `https://wa.me/?text=${encodeURIComponent(savedWaText)}`

    async function shareSuccess() {
      if (photoFile && navigator.canShare?.({ files: [photoFile] })) {
        try { await navigator.share({ files: [photoFile], text: savedWaText }); return }
        catch (e) { if (e.name === 'AbortError') return }
      }
      window.open(savedWaLink, '_blank')
    }

    return (
      <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", padding: 20 }}>
        <div style={{ background: C.card, border: `1px solid ${C.green}`, borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginBottom: 4 }}>WSH Record Saved</div>
          <div style={{ fontSize: 12, color: typeInfo.color, fontWeight: 700 }}>{typeInfo.label}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{form.project_label} · {saved.date}</div>
        </div>

        {photoPreview && (
          <img src={photoPreview} alt="wsh" style={{ width: '100%', borderRadius: 14, marginBottom: 16, objectFit: 'cover', maxHeight: 240 }} />
        )}

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Report</div>
          <pre style={{ fontSize: 12, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
            {savedWaText}
          </pre>
        </div>

        <button onClick={shareSuccess}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#fff', borderRadius: 14,
            padding: '15px 20px', fontWeight: 800, fontSize: 15,
            width: '100%', marginBottom: 8, cursor: 'pointer',
          }}>
          {waIcon}
          Send via WhatsApp {photoFile ? '(photo + report)' : ''}
        </button>

        <button onClick={() => { setSaved(null); setPhotoFile(null); setPhotoPreview(null); setForm(f => ({ ...f, description: '', action_taken: '' })) }}
          style={{ display: 'block', width: '100%', textAlign: 'center', color: C.muted, fontSize: 12, padding: '10px 0', cursor: 'pointer' }}>
          Record another observation
        </button>
        <button onClick={() => navigate('/supervisor/reports?tab=wsh')}
          style={{ display: 'block', width: '100%', textAlign: 'center', color: C.blue, fontSize: 12, padding: '4px 0', cursor: 'pointer' }}>
          View all WSH records →
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
          <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Workplace Safety</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>WSH Photo Record</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Photo — required */}
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div onClick={() => photoRef.current?.click()}
            style={{
              background: C.card,
              border: `2px ${photoPreview ? 'solid' : 'dashed'} ${photoPreview ? C.green : C.red}`,
              borderRadius: 14, overflow: 'hidden', cursor: 'pointer', minHeight: 160,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {photoPreview
              ? <img src={photoPreview} alt="wsh" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
              : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontSize: 13, color: C.red, fontWeight: 800 }}>Tap to take photo</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Required for WSH record</div>
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

        {/* Observation type */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => set('observation_type', t.value)}
                style={{
                  gridColumn: t.full ? '1 / -1' : undefined,
                  padding: '10px 8px', borderRadius: 10, fontWeight: 700, fontSize: 12,
                  border: `1.5px solid ${form.observation_type === t.value ? t.color : C.border}`,
                  background: form.observation_type === t.value ? `${t.color}22` : C.card,
                  color: form.observation_type === t.value ? t.color : C.muted,
                  cursor: 'pointer',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Project</label>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', marginBottom: 6 }}>
            {projects.length === 0 && <option value="">No active projects</option>}
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_no} — {p.name}</option>
            ))}
          </select>
          <input value={form.project_label} onChange={e => set('project_label', e.target.value)}
            placeholder="Project name in report"
            style={{ ...inputStyle, borderColor: C.yellow + '66' }} />
        </div>

        {/* Date + Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Area / Location</label>
            <input value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Level 3, Lift Shaft" style={inputStyle} />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Observation</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Describe what was observed…" rows={3}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Action taken */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Action Taken (optional)</label>
          <textarea value={form.action_taken} onChange={e => set('action_taken', e.target.value)}
            placeholder="What was done to address this…" rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving || !photoFile || !selectedProjectId}
          style={{
            width: '100%', background: !photoFile ? C.card : C.yellow,
            color: !photoFile ? C.muted : '#0D1720',
            border: !photoFile ? `1px solid ${C.border}` : 'none',
            borderRadius: 14, padding: '14px 20px', fontWeight: 900, fontSize: 15,
            opacity: (saving || !selectedProjectId) ? 0.6 : 1,
            cursor: (saving || !photoFile || !selectedProjectId) ? 'not-allowed' : 'pointer',
            marginBottom: 10,
          }}>
          {saving ? 'Saving…' : !photoFile ? 'Take a Photo First' : 'Save WSH Record'}
        </button>

        {/* WA preview */}
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 11, color: C.muted, cursor: 'pointer', paddingBottom: 8 }}>Preview report</summary>
          <pre style={{ fontSize: 11, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginTop: 6, fontFamily: 'monospace' }}>
            {waText}
          </pre>
        </details>

      </div>
    </div>
  )
}
