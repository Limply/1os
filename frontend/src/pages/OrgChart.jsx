import { useEffect, useRef, useState } from 'react'
import { Tree, TreeNode } from 'react-organizational-chart'
import html2canvas from 'html2canvas'
import api from '../api/axios'
import { getUser } from '../api/auth'

// Colour by depth level
const LEVEL_COLORS = {
  0: { bg: '#1A1A2E', text: '#fff', border: '#1A1A2E' },
  1: { bg: '#16213E', text: '#fff', border: '#16213E' },
  2: { bg: '#0F3460', text: '#fff', border: '#0F3460' },
  3: { bg: '#f8fafc',  text: '#1e293b', border: '#cbd5e1' },
}
const levelColor = depth => LEVEL_COLORS[Math.min(depth, 3)]

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function StaffCard({ node, depth, onSelect, highlight, isLeaf }) {
  const colors = levelColor(depth)
  const isHighlighted = highlight && node.full_name?.toLowerCase().includes(highlight.toLowerCase())

  return (
    <div
      onClick={() => onSelect(node)}
      className="cursor-pointer group"
      style={{ display: 'inline-flex', alignItems: 'center', minWidth: isLeaf ? 'auto' : 120 }}
    >
      <div
        className="rounded-xl shadow-md transition-all group-hover:shadow-lg group-hover:-translate-y-0.5 select-none"
        style={{
          backgroundColor: isHighlighted ? '#f59e0b' : colors.bg,
          color: isHighlighted ? '#000' : colors.text,
          border: `2px solid ${isHighlighted ? '#f59e0b' : colors.border}`,
          padding: isLeaf ? '8px 10px' : '10px',
          display: 'flex',
          alignItems: 'center',
          gap: isLeaf ? 8 : 0,
          flexDirection: isLeaf ? 'row' : 'column',
          minWidth: isLeaf ? 'auto' : 120,
        }}
      >
        {/* Avatar on left for leaf cards, top for others */}
        {node.photo_url ? (
          <img src={node.photo_url} alt={node.full_name}
            className="rounded-full object-cover border-2 flex-shrink-0"
            style={{ width: isLeaf ? 28 : 40, height: isLeaf ? 28 : 40, borderColor: 'rgba(255,255,255,0.3)' }} />
        ) : (
          <div className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              width: isLeaf ? 28 : 40,
              height: isLeaf ? 28 : 40,
              backgroundColor: 'rgba(0,0,0,0.2)',
              color: isHighlighted ? '#000' : colors.text,
            }}>
            {initials(node.full_name)}
          </div>
        )}

        {/* Text info */}
        <div style={{ textAlign: isLeaf ? 'left' : 'center', minWidth: isLeaf ? 'auto' : '100%' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1', margin: 0 }}>{node.full_name}</p>
          {node.position_name && (
            <p style={{ fontSize: isLeaf ? '0.7rem' : '0.75rem', marginTop: 0.5, opacity: 0.8, margin: 0 }}>{node.position_name}</p>
          )}
          {!isLeaf && node.department_name && (
            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>{node.department_name}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function renderTree(node, depth, onSelect, highlight) {
  if (!node) return null
  const card = <StaffCard node={node} depth={depth} onSelect={onSelect} highlight={highlight} isLeaf={false} />
  if (!node.children || node.children.length === 0) {
    return <TreeNode key={node.id} label={card} />
  }
  return (
    <TreeNode key={node.id} label={card}>
      {node.children.map(child => renderTree(child, depth + 1, onSelect, highlight))}
    </TreeNode>
  )
}

function HorizontalNode({ node, depth, onSelect, highlight }) {
  if (!node) return null
  const hasChildren = node.children?.length > 0
  const allLeaves = hasChildren && node.children.every(c => !c.children?.length)

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <StaffCard node={node} depth={depth} onSelect={onSelect} highlight={highlight} isLeaf={false} />

      {hasChildren && (
        <>
          {/* horizontal line from card toward children */}
          <div style={{ width: 20, height: 2, background: '#cbd5e1', flexShrink: 0 }} />

          {allLeaves ? (
            /* leaf workers — side by side, NO wrapping, NO connecting lines */
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, alignItems: 'flex-start', overflowX: 'auto' }}>
              {node.children.map(child => (
                <StaffCard key={child.id} node={child} depth={depth + 1} onSelect={onSelect} highlight={highlight} isLeaf />
              ))}
            </div>
          ) : (
            /* non-leaf children — with vertical branch and horizontal stubs */
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 10 }}>
              {/* vertical bar connecting all children */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#cbd5e1',
              }} />
              {node.children.map(child => (
                <div key={child.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {/* horizontal stub from vertical bar to child */}
                  <div style={{
                    position: 'absolute',
                    left: -10,
                    top: '50%',
                    width: 10,
                    height: 2,
                    background: '#cbd5e1',
                    transform: 'translateY(-50%)',
                  }} />
                  <HorizontalNode node={child} depth={depth + 1} onSelect={onSelect} highlight={highlight} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function OrgChart() {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(0.9)
  const [search, setSearch] = useState('')
  const [orientation, setOrientation] = useState('top') // 'top' = vertical, 'left' = horizontal
  const treeRef = useRef(null)
  const currentUser = getUser()
  const isManager = ['superadmin', 'admin', 'manager'].includes(currentUser?.role)

  useEffect(() => {
    api.get('/hr/org-tree/').then(res => {
      setTree(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function exportPNG() {
    if (!treeRef.current) return
    const canvas = await html2canvas(treeRef.current, { scale: 2, backgroundColor: '#f8fafc' })
    const link = document.createElement('a')
    link.download = 'org-chart.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading org chart...</div>
  if (!tree) return <div className="flex items-center justify-center h-64 text-gray-400">No org chart data. Set manager relationships in the admin panel.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-gray-800 mr-2">Org Chart</h1>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400 w-44"
        />
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold">−</button>
          <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold">+</button>
          <button onClick={() => setScale(0.9)}
            className="px-3 h-8 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 ml-1">Fit</button>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden ml-2">
          <button onClick={() => setOrientation('top')}
            className={`px-3 py-1.5 text-xs font-medium transition ${orientation === 'top' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            Vertical
          </button>
          <button onClick={() => setOrientation('left')}
            className={`px-3 py-1.5 text-xs font-medium transition ${orientation === 'left' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            Horizontal
          </button>
        </div>
        <button onClick={exportPNG}
          className="ml-auto px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-700">
          Export PNG
        </button>
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-4">
        {[['Executive', 0], ['Manager', 1], ['Supervisor', 2], ['Worker', 3]].map(([label, d]) => (
          <div key={d} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: levelColor(d).bg, border: `1px solid ${levelColor(d).border}` }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Tree */}
      <div className="overflow-auto p-6">
        <div ref={treeRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'inline-block', minWidth: '100%' }}>
          {orientation === 'top' ? (
            <Tree
              label={<StaffCard node={tree} depth={0} onSelect={setSelected} highlight={search} />}
              lineWidth="2px"
              lineColor="#cbd5e1"
              lineBorderRadius="8px"
            >
              {tree.children?.map(child => renderTree(child, 1, setSelected, search))}
            </Tree>
          ) : (
            <HorizontalNode node={tree} depth={0} onSelect={setSelected} highlight={search} />
          )}
        </div>
      </div>

      {/* Staff modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              {selected.photo_url ? (
                <img src={selected.photo_url} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg">
                  {initials(selected.full_name)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-bold text-gray-800 text-base">{selected.full_name}</h2>
                <p className="text-sm text-primary-600">{selected.position_name || '—'}</p>
                <p className="text-xs text-gray-400">{selected.department_name || '—'}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Reports to</span><span>{selected.manager_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Direct reports</span><span>{selected.direct_reports}</span></div>
              {selected.phone && <div className="flex justify-between"><span className="text-gray-400">Phone</span><span>{selected.phone}</span></div>}
              {selected.email && <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="truncate ml-4">{selected.email}</span></div>}
              {selected.join_date && <div className="flex justify-between"><span className="text-gray-400">Joined</span><span>{selected.join_date}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Emp No.</span><span className="font-mono">{selected.emp_no}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}