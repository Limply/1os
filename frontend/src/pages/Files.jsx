import { useState, useEffect } from 'react'

export default function Files() {
  const [filesUrl, setFilesUrl] = useState(null)

  useEffect(() => {
    fetch('/api/auth/tenant-info/')
      .then(r => r.json())
      .then(d => { if (d.files_url) setFilesUrl(d.files_url) })
      .catch(() => {})
  }, [])

  if (!filesUrl) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Files</h1>
          <p className="text-sm text-gray-500 mt-0.5">Shared file storage</p>
        </div>
        <p className="text-sm text-gray-400">Files URL not configured.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Files</h1>
          <p className="text-sm text-gray-500 mt-0.5">Shared file storage</p>
        </div>
        <a
          href={filesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:underline"
        >
          Open in new tab ↗
        </a>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white"
           style={{ minHeight: 'calc(100vh - 160px)' }}>
        <iframe
          src={filesUrl}
          title="File Browser"
          className="w-full h-full"
          style={{ minHeight: 'calc(100vh - 160px)' }}
        />
      </div>
    </div>
  )
}
