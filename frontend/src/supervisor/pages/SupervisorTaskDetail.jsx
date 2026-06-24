import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { getUser } from '../../api/auth'
import TaskPhotoModal from '../../components/TaskPhotoModal'
import TaskDocumentModal from '../../components/TaskDocumentModal'

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

const STATUS = {
  todo:        { label: 'To Do',       color: C.muted,   icon: '○' },
  in_progress: { label: 'In Progress', color: C.amber,   icon: '◑' },
  review:      { label: 'Review',      color: C.blue,    icon: '◉' },
  done:        { label: 'Done',        color: C.green,   icon: '●' },
  issue:       { label: 'Issue',       color: C.red,     icon: '!' },
}

const PRIORITY_COLOR = { low: C.muted, medium: C.yellow, high: C.amber, urgent: C.red }

function buildWaLink(task) {
  const text = [`Task: ${task.title}`, `Assigned to: ${task.assigned_to_name || 'Unassigned'}`].join('\n')
  const encoded = encodeURIComponent(text)
  const raw = (task.assigned_to_phone || '').replace(/\D/g, '')
  const phone = raw.length === 8 ? `65${raw}` : raw
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

export default function SupervisorTaskDetail() {
  const { taskId } = useParams()
  const navigate   = useNavigate()
  const user       = getUser()

  const [task, setTask]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [comments, setComments]   = useState([])
  const [draft, setDraft]         = useState('')
  const [posting, setPosting]     = useState(false)
  const [attachPicker, setAttachPicker] = useState(false)
  const [photoModal, setPhotoModal]     = useState(false)
  const [docModal, setDocModal]         = useState(false)

  useEffect(() => { loadTask() }, [taskId])

  async function loadTask() {
    try {
      const [taskRes, commentsRes] = await Promise.all([
        api.get(`/projects/tasks/${taskId}/`),
        api.get(`/projects/task-comments/?task=${taskId}`),
      ])
      setTask(taskRes.data)
      setComments(commentsRes.data.results || commentsRes.data)
    } catch {
      navigate('/supervisor/tasks', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(val) {
    if (val === task.status || saving) return
    setSaving(true)
    try {
      const res = await api.patch(`/projects/tasks/${taskId}/`, { status: val })
      setTask(res.data)
    } finally {
      setSaving(false)
    }
  }

  async function postComment() {
    const body = draft.trim()
    if (!body || posting) return
    setPosting(true)
    try {
      const res = await api.post('/projects/task-comments/', { task: taskId, body })
      setComments(prev => [...prev, res.data])
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(id) {
    await api.delete(`/projects/task-comments/${id}/`)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>
      Loading…
    </div>
  )

  if (!task) return null

  const st = STATUS[task.status] || STATUS.todo

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif", paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ background: C.panel, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={() => navigate('/supervisor/tasks')}
          style={{ color: C.muted, padding: '2px 0', flexShrink: 0, marginTop: 2, cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: st.color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            {st.icon} {st.label}
            {task.priority && (
              <span style={{ marginLeft: 10, color: PRIORITY_COLOR[task.priority] }}>· {task.priority}</span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{task.title}</div>
          {(task.group || task.assigned_to_name) && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              {task.group && <span>{task.group}</span>}
              {task.assigned_to_name && <span>{task.group ? ' · ' : ''}Assigned: {task.assigned_to_name}</span>}
            </div>
          )}
          {(task.start_date || task.end_date) && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {task.start_date || '—'} → {task.end_date || '—'}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Status */}
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Update Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 20 }}>
          {Object.entries(STATUS).map(([val, { label, color, icon }]) => (
            <button key={val} onClick={() => changeStatus(val)} disabled={saving}
              style={{
                padding: '8px 4px', borderRadius: 10,
                border: `1.5px solid ${task.status === val ? color : C.border}`,
                background: task.status === val ? `${color}22` : C.card,
                color: task.status === val ? color : C.muted,
                fontSize: 9, fontWeight: 800, textAlign: 'center', lineHeight: 1.4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Actions
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {/* WhatsApp */}
          <a href={buildWaLink(task)} target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '12px 4px', color: '#25D366', textDecoration: 'none', fontSize: 11, fontWeight: 700,
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            WhatsApp
          </a>

          {/* Attach */}
          <div style={{ flex: 1, position: 'relative' }}>
            <button onClick={() => setAttachPicker(p => !p)}
              style={{
                width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: attachPicker ? `${C.blue}22` : C.card,
                border: `1px solid ${attachPicker ? C.blue : C.border}`, borderRadius: 12,
                padding: '12px 4px', color: C.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              Attach {(task.photo_count > 0 || task.doc_count > 0) ? `(${(task.photo_count||0)+(task.doc_count||0)})` : ''}
            </button>
            {attachPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 10,
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden',
              }}>
                <button onClick={() => { setPhotoModal(true); setAttachPicker(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: C.blue, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Photos {task.photo_count > 0 ? `(${task.photo_count})` : ''}
                </button>
                <button onClick={() => { setDocModal(true); setAttachPicker(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: C.amber, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Files {task.doc_count > 0 ? `(${task.doc_count})` : ''}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Comments {comments.length > 0 ? `(${comments.length})` : ''}
        </div>

        {comments.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '16px 0 20px' }}>No comments yet</div>
        )}

        {comments.map(c => (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, marginBottom: 4 }}>
                  {c.author_name || c.author_email || 'Unknown'}
                  <span style={{ color: C.muted, fontWeight: 400, marginLeft: 6 }}>
                    {new Date(c.created_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{c.body}</div>
              </div>
              {(c.author === user.id || user.role === 'admin') && (
                <button onClick={() => deleteComment(c.id)}
                  style={{ color: C.muted, fontSize: 14, padding: '0 2px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
              )}
            </div>
          </div>
        ))}

        {/* New comment */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            style={{
              flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '10px 12px', color: C.text, fontSize: 13, resize: 'none',
              fontFamily: "'Barlow', sans-serif",
            }}
          />
          <button onClick={postComment} disabled={posting || !draft.trim()}
            style={{
              background: C.yellow, color: '#0D1720', borderRadius: 10,
              padding: '0 16px', fontWeight: 800, fontSize: 13,
              opacity: (!draft.trim() || posting) ? 0.4 : 1,
              cursor: (!draft.trim() || posting) ? 'not-allowed' : 'pointer',
              alignSelf: 'stretch',
            }}>
            {posting ? '…' : 'Post'}
          </button>
        </div>

      </div>

      {photoModal && <TaskPhotoModal task={task} onClose={() => { setPhotoModal(false); loadTask() }} />}
      {docModal   && <TaskDocumentModal task={task} onClose={() => { setDocModal(false); loadTask() }} />}
    </div>
  )
}
