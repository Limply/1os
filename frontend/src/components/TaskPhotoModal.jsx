import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

export default function TaskPhotoModal({ task, onClose }) {
  const [photos, setPhotos] = useState([])
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    fetchPhotos()
  }, [task.id])

  async function fetchPhotos() {
    const res = await api.get(`/projects/task-photos/?task=${task.id}`)
    setPhotos(res.data.results || res.data)
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('task', task.id)
    form.append('photo', file)
    form.append('comment', comment)
    try {
      await api.post('/projects/task-photos/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
      setPreview(null)
      setComment('')
      if (fileRef.current) fileRef.current.value = ''
      fetchPhotos()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this photo?')) return
    await api.delete(`/projects/task-photos/${id}/`)
    fetchPhotos()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Task Photos</p>
            <h2 className="text-base font-bold text-gray-800">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {/* Photo table */}
        <div className="flex-1 overflow-y-auto">
          {photos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No photos yet. Add one below.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left w-20">Photo</th>
                  <th className="px-4 py-2 text-left">Comment</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Uploaded By</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Date</th>
                  <th className="px-2 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {photos.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">
                      <img
                        src={p.photo}
                        alt="task"
                        className="w-14 h-14 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                        onClick={() => setLightbox(p.photo)}
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-pre-wrap">
                      {p.comment || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{p.uploaded_by_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap text-xs">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => handleDelete(p.id)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="border-t border-gray-100 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Add Photo</p>
          <div className="flex gap-3 items-start">
            <div className="shrink-0">
              <label className="cursor-pointer">
                <div className={`w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-2xl transition
                  ${preview ? 'border-transparent p-0' : 'border-gray-300 hover:border-blue-400 text-gray-300 hover:text-blue-400'}`}>
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                    : '+'}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
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

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-60 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  )
}
