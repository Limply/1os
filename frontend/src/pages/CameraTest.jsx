import { useRef, useState } from 'react'

export default function CameraTest() {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('Ready to test')
  const streamRef = useRef(null)

  const testCamera = async () => {
    setStatus('🔄 Requesting camera...')
    try {
      console.log('Browser support check:')
      console.log('  navigator.mediaDevices:', !!navigator.mediaDevices)
      console.log('  getUserMedia:', !!navigator.mediaDevices?.getUserMedia)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })

      console.log('✓ Camera stream obtained:', stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setStatus('✓ Camera is working! (click Stop to close)')
      }
    } catch (err) {
      console.error('❌ Camera error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
      })
      setStatus(`❌ ${err.name}: ${err.message}`)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      setStatus('Stopped')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-white">
        <h1 className="text-2xl font-bold mb-4">Camera Test</h1>

        <div className="bg-black rounded-lg w-full h-64 mb-4 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        <div className="bg-gray-700 rounded p-3 mb-4 text-sm font-mono">
          <p>Status: {status}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={testCamera}
            className="flex-1 bg-primary-600 hover:bg-primary-700 py-2 rounded font-bold"
          >
            Test Camera
          </button>
          <button
            onClick={stopCamera}
            className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-bold"
          >
            Stop
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>1. Click "Test Camera"</p>
          <p>2. Allow camera permission in browser popup</p>
          <p>3. Check browser console (F12) for details</p>
        </div>
      </div>
    </div>
  )
}
