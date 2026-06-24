import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

const WSH_TYPE = {
  safe:         { label: 'Safe',         color: C.green  },
  unsafe:       { label: 'Unsafe',       color: C.red    },
  near_miss:    { label: 'Near Miss',    color: C.amber  },
  hazard:       { label: 'Hazard',       color: C.yellow },
  daily_report: { label: 'Daily Report', color: C.blue   },
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ── WSH record detail sheet ───────────────────────────────────────────────────
function WSHDetail({ record, onClose }) {
  const type     = WSH_TYPE[record.observation_type] || { label: record.observation_type, color: C.muted }
  const waText   = [
    `*WSH Observation Report*`,
    ``,
    `Project : ${record.project_name || ''}`,
    `Date : ${fmtDate(record.date)}`,
    `Area : ${record.area || '—'}`,
    ``,
    `*Type : ${type.label}*`,
    ``,
    `Observation :`,
    record.description || '—',
    record.action_taken ? `\nAction Taken :\n${record.action_taken}` : '',
  ].join('\n').trim()
  const waLink   = `https://wa.me/?text=${encodeURIComponent(waText)}`

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
        background: C.panel, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border}`,
        maxHeight: '85svh', display: 'flex', flexDirection: 'column',
        fontFamily: "'Barlow', sans-serif",
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 32px' }}>
          {/* Photo */}
          {record.photo_url && (
            <img src={record.photo_url} alt="wsh" style={{ width: '100%', borderRadius: 12, marginBottom: 14, objectFit: 'cover', maxHeight: 260 }} />
          )}

          {/* Type badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              background: `${type.color}22`, color: type.color, borderRadius: 20,
              fontSize: 11, fontWeight: 800, padding: '4px 12px', letterSpacing: '0.05em',
            }}>{type.label}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(record.date)}</span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{record.project_name}</div>
          {record.area && <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>📍 {record.area}</div>}

          {record.description && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Observation</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{record.description}</div>
            </div>
          )}
          {record.action_taken && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Action Taken</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{record.action_taken}</div>
            </div>
          )}

          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#25D366', color: '#fff', borderRadius: 12, padding: '12px 16px',
              fontWeight: 800, fontSize: 13, textDecoration: 'none',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.547 5.874L0 24l6.302-1.519A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.001-1.374l-.36-.214-3.733.9.942-3.64-.235-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            Share via WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupervisorReports() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'wsh'

  const [wshRecords,     setWshRecords]     = useState([])
  const [dailyRecords,   setDailyRecords]   = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selectedWsh,    setSelectedWsh]    = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/projects/wsh-photos/'),
      api.get('/projects/daily-reports/'),
    ]).then(([wshRes, dailyRes]) => {
      setWshRecords(wshRes.data || [])
      setDailyRecords(dailyRes.data || [])
    }).finally(() => setLoading(false))
  }, [])

  function setTab(t) { setParams({ tab: t }) }

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Barlow', sans-serif" }}>

      {/* Tabs */}
      <div style={{ display: 'flex', background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setTab('wsh')}
          style={{
            flex: 1, padding: '11px 4px', fontSize: 12, fontWeight: 700,
            color: tab === 'wsh' ? C.yellow : C.muted,
            borderBottom: tab === 'wsh' ? `2px solid ${C.yellow}` : '2px solid transparent',
            background: 'none', cursor: 'pointer',
          }}>
          WSH Records
        </button>
        <button onClick={() => setTab('daily')}
          style={{
            flex: 1, padding: '11px 4px', fontSize: 12, fontWeight: 700,
            color: tab === 'daily' ? C.yellow : C.muted,
            borderBottom: tab === 'daily' ? `2px solid ${C.yellow}` : '2px solid transparent',
            background: 'none', cursor: 'pointer',
          }}>
          Daily Reports
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: C.muted, fontSize: 13 }}>
          Loading…
        </div>
      ) : tab === 'wsh' ? (

        // ── WSH Records ────────────────────────────────────────────────────────
        <div style={{ padding: '10px 12px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {wshRecords.length} record{wshRecords.length !== 1 ? 's' : ''}
            </div>
            <button onClick={() => navigate('/supervisor/wsh-photo')}
              style={{
                background: C.yellow, color: '#0D1720', borderRadius: 20,
                padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}>
              + New
            </button>
          </div>

          {wshRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>No WSH records yet</div>
              <button onClick={() => navigate('/supervisor/wsh-photo')}
                style={{ color: C.yellow, fontSize: 12 }}>Take a WSH Photo →</button>
            </div>
          ) : wshRecords.map(r => {
            const type = WSH_TYPE[r.observation_type] || { label: r.observation_type, color: C.muted }
            return (
              <div key={r.id} onClick={() => setSelectedWsh(r)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  marginBottom: 10, overflow: 'hidden', cursor: 'pointer',
                  borderLeft: `3px solid ${type.color}`,
                  display: 'flex', gap: 0,
                }}>
                {/* Thumbnail */}
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 72, height: 72, background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                )}
                {/* Info */}
                <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: type.color,
                      background: `${type.color}1A`, borderRadius: 20, padding: '2px 8px',
                    }}>{type.label}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{fmtDate(r.date)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.project_name || r.project_no}
                  </div>
                  {r.area && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📍 {r.area}</div>}
                  {r.description && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.description}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      ) : (

        // ── Daily Reports ──────────────────────────────────────────────────────
        <div style={{ padding: '10px 12px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {dailyRecords.length} report{dailyRecords.length !== 1 ? 's' : ''}
            </div>
            <button onClick={() => navigate('/supervisor/daily-report')}
              style={{
                background: C.yellow, color: '#0D1720', borderRadius: 20,
                padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}>
              + New
            </button>
          </div>

          {dailyRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>No daily reports yet</div>
              <button onClick={() => navigate('/supervisor/daily-report')}
                style={{ color: C.yellow, fontSize: 12 }}>Submit first report →</button>
            </div>
          ) : dailyRecords.map(r => {
            const total = (r.supervisor_count || 0) + (r.g_workers_count || 0)
            return (
              <div key={r.id}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '12px 14px', marginBottom: 10,
                  borderLeft: `3px solid ${C.yellow}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{r.project_name}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{r.project_no}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>{fmtDate(r.date)}</div>
                    {r.work_start && r.work_end && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{r.work_start} – {r.work_end}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.text, background: C.panel, borderRadius: 8, padding: '3px 8px' }}>
                    👷 {total} pax
                  </span>
                  {r.supervisor_count > 0 && (
                    <span style={{ fontSize: 11, color: C.muted, background: C.panel, borderRadius: 8, padding: '3px 8px' }}>
                      Sup: {r.supervisor_count}
                    </span>
                  )}
                  {r.g_workers_count > 0 && (
                    <span style={{ fontSize: 11, color: C.muted, background: C.panel, borderRadius: 8, padding: '3px 8px' }}>
                      G: {r.g_workers_count}
                    </span>
                  )}
                </div>

                {r.activity_short && (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    {r.activity_short}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedWsh && <WSHDetail record={selectedWsh} onClose={() => setSelectedWsh(null)} />}
    </div>
  )
}
