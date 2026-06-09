import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

const EXT_ICONS = {
  pdf:  { icon: '📄', color: 'text-red-500' },
  doc:  { icon: '📝', color: 'text-blue-600' },
  docx: { icon: '📝', color: 'text-blue-600' },
  xls:  { icon: '📊', color: 'text-green-600' },
  xlsx: { icon: '📊', color: 'text-green-600' },
  ppt:  { icon: '📋', color: 'text-orange-500' },
  pptx: { icon: '📋', color: 'text-orange-500' },
  zip:  { icon: '🗜️', color: 'text-gray-500' },
  rar:  { icon: '🗜️', color: 'text-gray-500' },
  txt:  { icon: '📃', color: 'text-gray-400' },
  img:  { icon: '🖼️', color: 'text-purple-500' },
}

function fileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return EXT_ICONS[ext] || { icon: '📁', color: 'text-gray-400' }
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function TaskDocumentModal({ task, onClose }) {
  const [docs, setDocs] = useState([])
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchDocs() }, [task.id])

  async function fetchDocs() {
    const res = await api.get(`/projects/task-documents/?task=${task.id}`)
    setDocs(res.data.results || res.data)
  }

  function handleFileChange(e) {
    setFile(e.target.files[0] || null)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('task', task.id)
    form.append('file', file)
    form.append('comment', comment)
    try {
      await api.post('/projects/task-documents/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
      setComment('')
      if (fileRef.current) fileRef.current.value = ''
      fetchDocs()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return
    await api.delete(`/projects/task-documents/${id}/`)
    fetchDocs()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Task Documents</p>
            <h2 className="text-base font-bold text-gray-800">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {/* Document table */}
        <div className="flex-1 overflow-y-auto">
          {docs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No documents yet. Add one below.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">File</th>
                  <th className="px-4 py-2 text-left">Comment</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Uploaded By</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Date</th>
                  <th className="px-2 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map((d, i) => {
                  const { icon, color } = fileIcon(d.filename)
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        <a href={d.file} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-blue-600 transition">
                          <span className={`text-lg ${color}`}>{icon}</span>
                          <span className="text-sm text-gray-700 hover:underline">{d.filename}</span>
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-600 whitespace-pre-wrap">
                        {d.comment || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{d.uploaded_by_name || '—'}</td>
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap text-xs">{new Date(d.created_at).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => handleDelete(d.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                          title="Delete">✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="border-t border-gray-100 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Add Document</p>
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">File</label>
              <input ref={fileRef} type="file" onChange={handleFileChange}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                  file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
              {file && <p className="text-xs text-gray-400 mt-1">{file.name} · {fileSize(file.size)}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Comment</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5">Cancel</button>
            <button type="submit" disabled={!file || uploading}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold px-4 py-1.5 rounded-lg transition">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
