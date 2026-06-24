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

const SEVERITY = [
  { value: 'low',      label: 'Low',      color: C.muted  },
  { value: 'medium',   label: 'Medium',   color: C.amber  },
  { value: 'high',     label: 'High',     color: C.red    },
  { value: 'urgent',   label: 'Urgent',   color: '#FF1744' },
]

const RECIPIENTS = [
  { name: 'Alain',    email: 'alain@astronic.com.sg',      wa: '6596493863' },
  { name: 'Steve',    email: 'steve.wong@astronic.com.sg', wa: '6597927768' },
  { name: 'Lucus',    email: 'lucus@astronic.com.sg',      wa: '6591234567' },
  { name: 'Benjamin', email: 'lixin@astronic.com.sg',      wa: ''           },
  { name: 'HR Admin', email: 'admin@astronic.com.sg',      wa: ''           },
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

function formatWA({ project, subject, body, severity, senderName }) {
  const sev = SEVERITY.find(s => s.value === severity)?.label || severity
  return [
    `*[${sev.toUpperCase()}] Problem Report*`,
    `From: ${senderName}`,
    project ? `Project: ${project}` : '',
    ``,
    subject ? `*${subject}*\n` : '',
    body,
    ``,
    `-- Sent via 1OS Supervisor App`,
  ].filter(l => l !== undefined).join('\n').trim()
}

export default function SupervisorProblemReport() {
  const navigate = useNavigate()
  const photoRef = useRef()

  const [projects,          setProjects]          = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading,           setLoading]           = useState(true)
  const [submitting,        setSubmitting]        = useState(false)
  const [submitted,         setSubmitted]         = useState(null)
  const [photoFile,         setPhotoFile]         = useState(null)
  const [photoPreview,      setPhotoPreview]      = useState(null)
  const [senderName,        setSenderName]        = useState('')
  const [selectedEmails,    setSelectedEmails]    = useState(RECIPIENTS.map(r => r.email))

  const [form, setForm] = useState({
    subject:  '',
    body:     '',
    severity: 'medium',
  })

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/supervisor/'),
      api.get('/projects/projects/'),
    ]).then(([supRes, projRes]) => {
      const supervisorProjId = supRes.data?.project?.id || ''
      const all = (projRes.data || []).filter(p => p.status === 'active' || p.status === 'planning')
      setProjects(all)
      setSelectedProjectId(supervisorProjId || all[0]?.id || '')
      // grab sender name from auth
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        setSenderName(u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email || '')
      } catch {}
    }).finally(() => setLoading(false))
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const selectedProject = projects.find(p => String(p.id) === String(selectedProjectId))

  function toggleRecipient(email) {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    )
  }

  async function handleSubmit() {
    if (!form.body.trim() || selectedEmails.length === 0) return
    setSubmitting(true)
    try {
      const res = await api.post('/dashboard/problem-report/', {
        subject:    form.subject,
        body:       form.body,
        severity:   form.severity,
        project:    selectedProject ? `${selectedProject.project_no} — ${selectedProject.name}` : '',
        recipients: selectedEmails,
      })
      setSubmitted(res.data)
    } finally {
      setSubmitting(false)
    }
  }

  const waText = formatWA({
    project: selectedProject ? `${selectedProject.project_no} — ${selectedProject.name}` : '',
    subject: form.subject,
    body:    form.body,
    severity: form.severity,
    senderName,
  })

  // WhatsApp recipients — send to each one or open group picker
  const waNumbers = ['6596493863', '6597927768', '6598297028'] // Alain, Steve, Lucus placeholder
  const waLink    = `https://wa.me/?text=${encodeURIComponent(waText)}`

  async function shareWA() {
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>Loading…</div>
  )

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", padding: 20 }}>
        <div style={{ background: C.card, border: `1px solid ${C.green}`, borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginBottom: 6 }}>Report Submitted</div>
          {submitted.email_sent ? (
            <div style={{ fontSize: 12, color: C.muted }}>Email sent to {selectedEmails.length} recipient{selectedEmails.length !== 1 ? 's' : ''}</div>
          ) : (
            <div style={{ fontSize: 12, color: C.amber }}>Email not configured — share via WhatsApp below</div>
          )}
        </div>

        {/* Recipients */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Notified</div>
          {RECIPIENTS.filter(r => selectedEmails.includes(r.email)).map((r, i, arr) => (
            <div key={r.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, marginBottom: i < arr.length - 1 ? 8 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.email}</div>
              </div>
              <span style={{ fontSize: 16 }}>{submitted.email_sent ? '✉️' : '⏸'}</span>
            </div>
          ))}
        </div>

        {/* WA share */}
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Also notify via WhatsApp
        </div>
        <button onClick={shareWA}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#fff', borderRadius: 14,
            padding: '14px 20px', fontWeight: 800, fontSize: 14,
            width: '100%', marginBottom: 12, cursor: 'pointer',
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
          </svg>
          Send via WhatsApp {photoFile ? '(with photo)' : ''}
        </button>

        <button onClick={() => navigate('/supervisor')}
          style={{ display: 'block', width: '100%', textAlign: 'center', color: C.yellow, fontSize: 12, padding: '10px 0', cursor: 'pointer' }}>
          ← Back to home
        </button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  const sev = SEVERITY.find(s => s.value === form.severity) || SEVERITY[1]

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: C.panel, padding: '12px 16px', borderBottom: `1px solid ${C.red}33`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/supervisor')} style={{ color: C.muted, cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.red, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Report</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Report Problem</div>
        </div>
      </div>

      {/* Recipients — toggleable */}
      <div style={{ background: C.panel, padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Notify ({selectedEmails.length} selected)
          </div>
          <button onClick={() =>
            setSelectedEmails(selectedEmails.length === RECIPIENTS.length ? [] : RECIPIENTS.map(r => r.email))
          } style={{ fontSize: 10, color: C.blue, fontWeight: 700, cursor: 'pointer' }}>
            {selectedEmails.length === RECIPIENTS.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {RECIPIENTS.map(r => {
            const on = selectedEmails.includes(r.email)
            return (
              <button key={r.email} onClick={() => toggleRecipient(r.email)}
                style={{
                  fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '5px 12px',
                  border: `1.5px solid ${on ? C.red : C.border}`,
                  background: on ? `${C.red}22` : C.card,
                  color: on ? C.text : C.muted,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {on ? '✓ ' : ''}{r.name}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 7 }}>Tap to select / deselect · via email + WhatsApp</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Photo */}
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div onClick={() => photoRef.current?.click()}
            style={{
              background: C.card, border: `2px dashed ${photoPreview ? C.green : C.border}`,
              borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
              minHeight: photoPreview ? 0 : 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {photoPreview
              ? <img src={photoPreview} alt="problem" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', color: C.muted }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Add photo (optional)</span>
                </div>
              )
            }
          </div>
          {photoPreview && (
            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 28, height: 28, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </div>

        {/* Severity */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Severity</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {SEVERITY.map(s => (
              <button key={s.value} onClick={() => set('severity', s.value)}
                style={{
                  padding: '9px 4px', borderRadius: 10, fontWeight: 700, fontSize: 11,
                  border: `1.5px solid ${form.severity === s.value ? s.color : C.border}`,
                  background: form.severity === s.value ? `${s.color}22` : C.card,
                  color: form.severity === s.value ? s.color : C.muted,
                  cursor: 'pointer',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Project</label>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}>
            <option value="">— Not project specific —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_no} — {p.name}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Subject</label>
          <input value={form.subject} onChange={e => set('subject', e.target.value)}
            placeholder="e.g. Unsafe scaffolding at Level 4" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.body} onChange={e => set('body', e.target.value)}
            placeholder="Describe the problem clearly — what, where, how urgent…"
            rows={5} style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || !form.body.trim() || selectedEmails.length === 0}
          style={{
            width: '100%', background: sev.color, color: '#fff',
            borderRadius: 14, padding: '14px 20px', fontWeight: 900, fontSize: 15,
            opacity: (submitting || !form.body.trim() || selectedEmails.length === 0) ? 0.5 : 1,
            cursor: (submitting || !form.body.trim() || selectedEmails.length === 0) ? 'not-allowed' : 'pointer',
            marginBottom: 10,
          }}>
          {submitting ? 'Sending…' : `Send to ${selectedEmails.length} recipient${selectedEmails.length !== 1 ? 's' : ''}`}
        </button>

        {/* WA preview */}
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 11, color: C.muted, cursor: 'pointer', paddingBottom: 8 }}>Preview message</summary>
          <pre style={{ fontSize: 11, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginTop: 6, fontFamily: 'monospace' }}>
            {waText}
          </pre>
        </details>

      </div>
    </div>
  )
}
