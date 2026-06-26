import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Design mockups live here. To add one:
//   1. Write a small component (static JSX styled like the app).
//   2. Add an entry: { key: 'slug', label: 'Name', element: <YourMock /> }
// They render live at /mock_up_page (unlisted — no sidebar link).
// ─────────────────────────────────────────────────────────────────────────
const MOCKUPS = []

export default function MockupPage() {
  const [active, setActive] = useState(MOCKUPS[0]?.key ?? null)
  const current = MOCKUPS.find(m => m.key === active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Design Mockups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Internal preview — not linked in the sidebar.</p>
        </div>
        {MOCKUPS.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {MOCKUPS.map(m => (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                  active === m.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {MOCKUPS.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium">No mockups yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Ask Claude to add a design here, then refresh to preview it live.
          </p>
          <p className="text-xs text-gray-300 mt-4">
            Added in <code>frontend/src/pages/MockupPage.jsx</code> → the <code>MOCKUPS</code> array.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          {current?.element ?? <p className="text-sm text-gray-400">Select a mockup above.</p>}
        </div>
      )}
    </div>
  )
}
