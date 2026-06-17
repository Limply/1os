const FILES_URL = 'https://files.sim-eng.com/files/'

export default function Files() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Files</h1>
          <p className="text-sm text-gray-500 mt-0.5">Shared file storage</p>
        </div>
        <a
          href={FILES_URL}
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
          src={FILES_URL}
          title="File Browser"
          className="w-full h-full"
          style={{ minHeight: 'calc(100vh - 160px)' }}
        />
      </div>
    </div>
  )
}
