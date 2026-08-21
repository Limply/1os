import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Thermometer, Loader2 } from 'lucide-react'
import { getUser } from '../api/auth'
import api from '../api/axios'
import ClockInWidget from '../components/ClockInWidget'

export default function ClockIn() {
  const user = getUser()
  const location = useLocation()
  const navigate = useNavigate()
  const isSupervisorRoute = location.pathname.startsWith('/supervisor')
  const [time, setTime] = useState(new Date())
  const [showMcConfirm, setShowMcConfirm] = useState(false)
  const [mcLoading, setMcLoading] = useState(false)
  const [mcMessage, setMcMessage] = useState('')

  const [cameraActive, setCameraActive] = useState(false)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsError, setGpsError] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }
    } catch (err) {
      setMcMessage(`Camera error: ${err.name} — ${err.message}`)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  const getGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        setGpsCoords({ lat: latitude, lng: longitude })
        setGpsError('')
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          const addr = data.address?.road || data.address?.village || data.address?.town || data.address?.city || ''
          if (addr) setGpsCoords(prev => ({ ...prev, address: addr }))
        } catch {}
      },
      err => setGpsError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const openMcConfirm = () => {
    setMcMessage('')
    setPhotoBlob(null)
    setPhotoPreview(null)
    setGpsCoords(null)
    setGpsError('')
    setShowMcConfirm(true)
    startCamera()
    getGPS()
  }

  const closeMcConfirm = () => {
    stopCamera()
    setShowMcConfirm(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const video = videoRef.current
    canvasRef.current.width = video.videoWidth
    canvasRef.current.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const lines = [
      `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`,
      'MC Report',
      gpsCoords?.address || (gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : ''),
    ].filter(Boolean)
    const barH = 30 + lines.length * 26
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, canvasRef.current.height - barH, canvasRef.current.width, barH)
    ctx.fillStyle = '#FFF'
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 20px Arial' : '16px Arial'
      ctx.fillText(line, 15, canvasRef.current.height - barH + 26 + i * 26)
    })
    canvasRef.current.toBlob(blob => {
      setPhotoBlob(blob)
      setPhotoPreview(canvasRef.current.toDataURL())
      stopCamera()
    }, 'image/jpeg')
  }

  const retakePhoto = () => {
    setPhotoBlob(null)
    setPhotoPreview(null)
    startCamera()
  }

  const reportMc = async () => {
    if (!photoBlob) return
    setMcLoading(true)
    try {
      const fd = new FormData()
      fd.append('photo', photoBlob, 'mc.jpg')
      if (gpsCoords) {
        fd.append('gps_lat', gpsCoords.lat)
        fd.append('gps_lng', gpsCoords.lng)
        if (gpsCoords.address) fd.append('address', gpsCoords.address)
      }
      await api.post('/hr/leave-applications/report_mc/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setShowMcConfirm(false)
      setMcMessage('MC reported for today. Your supervisor/HR has been notified.')
    } catch (err) {
      setMcMessage(err.response?.data?.detail || 'Failed to report MC.')
    } finally {
      setMcLoading(false)
      setTimeout(() => setMcMessage(''), 6000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex flex-col">
      {/* Header */}
      <div className="bg-primary-950 text-white px-6 py-5 text-center relative">
        {isSupervisorRoute && (
          <button onClick={() => navigate('/supervisor')}
            className="absolute left-4 top-5 flex items-center gap-1 text-primary-200 hover:text-white text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        )}
        <h1 className="text-2xl font-bold">Clock In / Out</h1>
        <p className="text-primary-200 text-sm mt-1">{user?.first_name} {user?.last_name}</p>
        <p className="text-3xl font-mono font-bold mt-2">{time.toLocaleTimeString()}</p>
        <p className="text-primary-300 text-xs">{time.toLocaleDateString()}</p>
      </div>

      {/* Widget */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-3">
        <button onClick={openMcConfirm}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
          <Thermometer className="w-4 h-4" /> Report MC for Today
        </button>

        {mcMessage && !showMcConfirm && (
          <div className="p-3 rounded-xl text-sm font-semibold text-center bg-white/90 text-gray-800">
            {mcMessage}
          </div>
        )}

        <ClockInWidget />
      </div>

      {/* MC confirm modal */}
      {showMcConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Report MC — {time.toLocaleDateString()}</h2>
            <p className="text-sm text-gray-600">
              Take a photo to confirm. This will be sent to HR for approval.
            </p>

            {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
            {gpsCoords && !photoPreview && (
              <p className="text-xs text-gray-400">
                📍 {gpsCoords.address || `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`}
              </p>
            )}

            <div className="bg-black rounded-xl overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="MC report" className="w-full object-cover" style={{ height: '220px' }} />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full object-cover bg-black"
                  style={{ height: '220px', transform: cameraActive ? 'scaleX(-1)' : 'none' }} />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {mcMessage && (
              <div className="p-3 rounded-xl text-sm font-semibold text-center bg-red-50 text-red-700">
                {mcMessage}
              </div>
            )}

            <div className="flex gap-3">
              {photoPreview ? (
                <>
                  <button onClick={retakePhoto} disabled={mcLoading}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
                    Retake
                  </button>
                  <button onClick={reportMc} disabled={mcLoading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                    {mcLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Confirming…</> : 'Confirm MC'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeMcConfirm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
                    Cancel
                  </button>
                  <button onClick={capturePhoto} disabled={!cameraActive}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                    📸 Take Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
