import { useEffect, useState, useRef } from 'react'
import api from '../api/axios'

function fmtSize(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function ProjectFiles({ projectId, folderUrl, smbPath }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInput = useRef(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/projects/projects/${projectId}/files/`)
      // DRF may return a plain array or a paginated object — guard it.
      setFiles(Array.isArray(res.data) ? res.data : (res.data?.results ?? []))
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load files.')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/projects/projects/${projectId}/files/`, form)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const handleDownload = async (name) => {
    setError('')
    try {
      const res = await api.get(
        `/projects/projects/${projectId}/files/download/`,
        { params: { name }, responseType: 'blob' },
      )
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(`Could not download ${name}.`)
    }
  }

  const copySmb = () => {
    if (!smbPath) return
    navigator.clipboard?.writeText(smbPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-3">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="font-semibold text-gray-700">Project Files</span>
        <div className="flex items-center gap-2">
          {folderUrl && (
            <a href={folderUrl} target="_blank" rel="noreferrer"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1 rounded-lg transition">
              📂 Open folder
            </a>
          )}
          <button onClick={() => fileInput.current?.click()} disabled={uploading}
            className="text-xs bg-gray-700 hover:bg-gray-900 disabled:opacity-50 text-white font-semibold px-2.5 py-1 rounded-lg transition">
            {uploading ? 'Uploading…' : '↑ Upload'}
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {smbPath && (
        <div className="px-4 py-1.5 text-xs text-gray-400 border-b border-gray-100 flex items-center gap-2">
          <span className="font-mono truncate">{smbPath}</span>
          <button onClick={copySmb} className="text-gray-500 hover:text-gray-700 shrink-0">
            {copied ? 'copied ✓' : 'copy path'}
          </button>
        </div>
      )}

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-gray-100">
        {loading ? (
          <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
        ) : files.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400">No files yet. Upload here, or drop files into the folder over the mapped drive.</p>
        ) : (
          files.map((f) => (
            <div key={f.name} className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{f.is_dir ? '📁' : '📄'}</span>
                <span className="text-sm text-gray-700 truncate">{f.name}</span>
                {!f.is_dir && <span className="text-xs text-gray-400 shrink-0">{fmtSize(f.size)}</span>}
              </div>
              {!f.is_dir && (
                <button onClick={() => handleDownload(f.name)}
                  className="text-xs text-blue-600 hover:text-blue-800 shrink-0">↓ download</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
