import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../api/axios'

// The 5 core elements. English is primary; Chinese shows in a tooltip on title hover.
// `key` matches the backend field on CompanyStrategy; the field stores markdown.
const ELEMENTS = [
  {
    key: 'direction', en: 'Direction', zh: '方向',
    descEn: 'The overall trajectory, including vision and mission.',
    descZh: '公司前进的总体方向，愿景与使命。',
    accent: { badge: 'bg-primary-100 text-primary-700', ring: 'border-primary-200', bar: 'bg-primary-500', arrow: 'text-primary-400' },
  },
  {
    key: 'objectives', en: 'Objectives', zh: '目标',
    descEn: 'Clear, measurable goals (KPI / OKR) — both short- and long-term.',
    descZh: '可衡量的具体目标（KPI / OKR），短期和长期都有。',
    accent: { badge: 'bg-green-100 text-green-700', ring: 'border-green-200', bar: 'bg-green-500', arrow: 'text-green-400' },
  },
  {
    key: 'strategy', en: 'Strategy', zh: '战略',
    descEn: 'The high-level plan for achieving the objectives — what to do.',
    descZh: '实现目标的总体路径或计划，是“做什么”的问题。',
    accent: { badge: 'bg-purple-100 text-purple-700', ring: 'border-purple-200', bar: 'bg-purple-500', arrow: 'text-purple-400' },
  },
  {
    key: 'tactics', en: 'Tactics', zh: '战术',
    descEn: 'The specific actions and methods used — how to do it.',
    descZh: '执行战略的具体行动或操作方式，是“怎么做”的问题。',
    accent: { badge: 'bg-orange-100 text-orange-700', ring: 'border-orange-200', bar: 'bg-orange-500', arrow: 'text-orange-400' },
  },
  {
    key: 'monitoring', en: 'Monitoring', zh: '监控',
    descEn: 'Tracking progress, measuring performance, and making adjustments.',
    descZh: '跟踪和评估目标执行的过程和结果，及时调整。',
    accent: { badge: 'bg-red-100 text-red-600', ring: 'border-red-200', bar: 'bg-red-500', arrow: 'text-red-400' },
  },
]

// Tailwind has no default styling for raw HTML elements, so map each markdown
// node to classed components for a clean, compact look.
const MD = {
  h2: p => <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1" {...p} />,
  h3: p => <h4 className="text-sm font-semibold text-gray-700 mt-3 mb-1" {...p} />,
  h4: p => <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-2 mb-1" {...p} />,
  p:  p => <p className="text-sm text-gray-600 my-1.5 leading-relaxed" {...p} />,
  strong: p => <strong className="font-semibold text-gray-800" {...p} />,
  em: p => <em className="text-gray-500" {...p} />,
  a:  p => <a className="text-primary-600 hover:underline" target="_blank" rel="noreferrer" {...p} />,
  ul: p => <ul className="list-disc pl-5 my-1.5 space-y-0.5 text-sm text-gray-600 marker:text-gray-300" {...p} />,
  ol: p => <ol className="list-decimal pl-5 my-1.5 space-y-0.5 text-sm text-gray-600 marker:text-gray-400" {...p} />,
  li: p => <li className="leading-relaxed" {...p} />,
  input: p => <input {...p} disabled className="mr-1.5 align-middle accent-primary-500" />,
  code: p => <code className="bg-gray-100 text-gray-700 rounded px-1 py-0.5 text-[12px]" {...p} />,
  hr: () => <hr className="my-3 border-gray-100" />,
  table: p => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden" {...p} />
    </div>
  ),
  thead: p => <thead className="bg-gray-50" {...p} />,
  th: p => <th className="text-left font-semibold text-gray-600 px-2.5 py-1.5 border-b border-gray-200" {...p} />,
  td: p => <td className="text-gray-600 px-2.5 py-1.5 border-b border-gray-100 align-top" {...p} />,
}

function TitleWithTooltip({ el }) {
  return (
    <span className="group relative inline-block">
      <h2 className="text-lg font-bold text-gray-800 cursor-help border-b border-dotted border-gray-300">
        {el.en}
      </h2>
      <span className="pointer-events-none absolute left-0 top-full mt-1 z-20 hidden group-hover:block w-64 rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-lg">
        <span className="block text-sm font-bold">{el.zh}</span>
        <span className="block mt-1 text-gray-300">{el.descZh}</span>
      </span>
    </span>
  )
}

function ElementCard({ el, idx, isLast, value, editing, onChange }) {
  return (
    <div className="relative">
      <div className={`bg-white rounded-xl border ${el.accent.ring} p-5 flex gap-4`}>
        <div className="flex flex-col items-center shrink-0">
          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${el.accent.badge}`}>
            {idx + 1}
          </span>
          <span className={`flex-1 w-0.5 mt-2 ${el.accent.bar} opacity-30 ${isLast ? 'hidden' : ''}`} />
        </div>

        <div className="flex-1 min-w-0">
          <TitleWithTooltip el={el} />
          <p className="text-sm text-gray-500 mt-1.5">{el.descEn}</p>

          {editing ? (
            <textarea
              value={value}
              onChange={e => onChange(el.key, e.target.value)}
              rows={Math.min(20, Math.max(5, value.split('\n').length + 1))}
              placeholder="Markdown supported — headings, lists, tables, checklists."
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-gray-800 resize-y
                focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
            />
          ) : value.trim() ? (
            <div className="mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-300 italic">Not set yet.</p>
          )}
        </div>
      </div>

      {!isLast && (
        <div className="flex justify-center py-1">
          <svg className={`w-5 h-5 ${el.accent.arrow}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </div>
  )
}

const EMPTY = { direction: '', objectives: '', strategy: '', tactics: '', monitoring: '' }

export default function Strategy() {
  const [saved, setSaved]     = useState(EMPTY)   // last persisted values
  const [form, setForm]       = useState(EMPTY)   // working copy while editing
  const [canEdit, setCanEdit] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/dashboard/strategy/')
      .then(res => {
        const { can_edit, ...fields } = res.data
        const next = { ...EMPTY, ...fields }
        setSaved(next)
        setForm(next)
        setCanEdit(!!can_edit)
      })
      .catch(() => setError('Could not load the business strategy.'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function startEdit() {
    setForm(saved)
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    setForm(saved)
    setError('')
    setEditing(false)
  }

  function handleSync() {
    if (!window.confirm('Refresh from the NAS file? This replaces the current strategy content with what is in 1OS_5Core_Elements.md.')) return
    setSyncing(true)
    setError('')
    setSynced(false)
    api.post('/dashboard/strategy/sync/')
      .then(res => {
        const { can_edit, synced_from, ...fields } = res.data
        const next = { ...EMPTY, ...fields }
        setSaved(next)
        setForm(next)
        setEditing(false)
        setSynced(true)
      })
      .catch(err => setError(err?.response?.data?.detail || 'Could not refresh from NAS.'))
      .finally(() => setSyncing(false))
  }

  function handleSave() {
    setSaving(true)
    setError('')
    api.put('/dashboard/strategy/', form)
      .then(res => {
        const { can_edit, ...fields } = res.data
        const next = { ...EMPTY, ...fields }
        setSaved(next)
        setForm(next)
        setEditing(false)
      })
      .catch(err => setError(err?.response?.data?.detail || 'Could not save. Please try again.'))
      .finally(() => setSaving(false))
  }

  const shown = editing ? form : saved

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Business Strategy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            The 5 core elements of our business — hover a title for the Chinese term.
          </p>
        </div>
        {canEdit && !loading && !editing && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Reload the strategy from 1OS_5Core_Elements.md on the NAS"
              className="rounded-lg border border-gray-200 text-sm font-medium text-gray-700 px-4 py-2 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {syncing ? 'Refreshing…' : 'Refresh from NAS'}
            </button>
            <button
              onClick={startEdit}
              className="rounded-lg border border-gray-200 text-sm font-medium text-gray-700 px-4 py-2 hover:bg-gray-50 transition"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          <div className="space-y-0">
            {ELEMENTS.map((el, i) => (
              <ElementCard
                key={el.key}
                el={el}
                idx={i}
                isLast={i === ELEMENTS.length - 1}
                value={shown[el.key]}
                editing={editing}
                onChange={handleChange}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {synced && !error && <p className="text-sm text-green-600">Refreshed from NAS file.</p>}

          {editing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary-600 text-white text-sm font-medium px-4 py-2
                  hover:bg-primary-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-lg border border-gray-200 text-sm font-medium text-gray-600 px-4 py-2 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
