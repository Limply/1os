import { useEffect, useRef, useState } from 'react'
import { ClipboardList, AlertTriangle, Loader2, Check, X } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../api/auth'

export default function ClockInWidget({ employee: empProp = null, compact = false }) {
  const user = getUser()
  const [employee, setEmployee] = useState(empProp)
  const [schedule, setSchedule] = useState(null)
  const [geofenceStatus, setGeofenceStatus] = useState(null)
  const [geofenceMsg, setGeofenceMsg] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [clockedIn, setClockedIn] = useState(false)
  const [todayRecord, setTodayRecord] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Stop camera on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Fetch employee if not passed as prop
  useEffect(() => {
    if (empProp) { setEmployee(empProp); return }
    if (!user?.id) return
    api.get('/hr/employees/?limit=999').then(res => {
      const results = res.data.results || []
      let emp = results.find(e => e.user === user.id)
      if (!emp && user.first_name)
        emp = results.find(e => e.first_name?.toLowerCase() === user.first_name?.toLowerCase())
      setEmployee(emp || results[0])
    }).catch(console.error)
  }, [empProp, user?.id])

  // Fetch today's schedule
  useEffect(() => {
    if (!employee?.id) return
    const d = new Date()
    const dd = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
    api.get(`/hr/work-schedules/?date=${dd}&employee=${employee.id}`)
      .then(res => setSchedule(res.data.results?.[0] || null))
      .catch(console.error)
  }, [employee?.id])

  // Fetch today's attendance
  useEffect(() => {
    if (!employee?.id) return
    const today = new Date().toISOString().split('T')[0]
    api.get(`/hr/attendance/?employee=${employee.id}`).then(res => {
      const rec = (res.data.results || res.data).find(r => r.date === today)
      if (rec) { setTodayRecord(rec); setClockedIn(!!rec.clock_in && !rec.clock_out) }
    }).catch(console.error)
  }, [employee?.id])

  const startCamera = async () => {
    try {
      setMessage('Opening camera…')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        setMessage('')
      }
    } catch (err) {
      setMessage(`Camera error: ${err.name} — ${err.message}`)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const video = videoRef.current
    canvasRef.current.width = video.videoWidth
    canvasRef.current.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const now = new Date()
    const lines = [
      now.toLocaleString(),
      gpsCoords?.address || '',
      gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : '',
    ].filter(Boolean)
    const barH = 30 + lines.length * 28
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, canvasRef.current.height - barH, canvasRef.current.width, barH)
    ctx.fillStyle = '#FFF'
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 20px Arial' : '17px Arial'
      ctx.fillText(line, 15, canvasRef.current.height - barH + 26 + i * 28)
    })
    canvasRef.current.toBlob(blob => {
      setPhotoBlob(blob)
      setPhotoPreview(canvasRef.current.toDataURL())
      stopCamera()
    }, 'image/jpeg')
  }

  const retakePhoto = () => { setPhotoBlob(null); setPhotoPreview(null); startCamera() }

  const getGPS = async () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude, accuracy } = pos.coords
        setGpsCoords({ lat: latitude, lng: longitude, accuracy })
        setGpsError('')

        if (schedule) {
          const toRad = d => d * Math.PI / 180
          const dLat = toRad(parseFloat(schedule.location_lat) - latitude)
          const dLng = toRad(parseFloat(schedule.location_lng) - longitude)
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(latitude)) * Math.cos(toRad(parseFloat(schedule.location_lat))) * Math.sin(dLng/2)**2
          const dist = Math.round(2 * Math.asin(Math.sqrt(a)) * 6371000)
          if (dist <= schedule.radius) {
            setGeofenceStatus('ok')
            setGeofenceMsg(`Within ${dist}m of ${schedule.location_name}`)
          } else {
            setGeofenceStatus('fail')
            setGeofenceMsg(`${dist}m away — must be within ${schedule.radius}m`)
          }
        }

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

  const postClockAction = async (action) => {
    if (!photoBlob) { setMessage('Please take a photo first'); return }
    setLoading(true)
    const formData = new FormData()
    formData.append('photo', photoBlob, `${action}.jpg`)
    if (gpsCoords) {
      formData.append('gps_lat', gpsCoords.lat)
      formData.append('gps_lng', gpsCoords.lng)
      if (gpsCoords.address) formData.append('address', gpsCoords.address)
    }
    try {
      const res = await api.post(`/hr/attendance/${action}/`, formData)
      if (res.data.success) {
        setClockedIn(action === 'clock_in')
        const msg = action === 'clock_in'
          ? `Clock In accepted at ${new Date().toLocaleTimeString()}\nRemember to clock out later!`
          : `Clock Out accepted at ${new Date().toLocaleTimeString()}\nTotal: ${res.data.hours_worked}h\nHave a great day!`
        setMessage(msg)
        setPhotoBlob(null); setPhotoPreview(null); setGpsCoords(null)
        setTimeout(() => setMessage(''), 5000)
        // Refresh today's record
        const today = new Date().toISOString().split('T')[0]
        api.get(`/hr/attendance/?employee=${employee.id}`).then(r => {
          const rec = (r.data.results || r.data).find(x => x.date === today)
          if (rec) setTodayRecord(rec)
        })
      } else {
        setMessage(`✗ ${res.data.message}`)
      }
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const cameraH = compact ? '220px' : '307px'

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>

      {/* Schedule info */}
      {schedule ? (
        <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-2 text-sm text-primary-800">
          <ClipboardList className="w-4 h-4 inline mr-1.5 text-primary-600" /><strong>{schedule.location_name}</strong> &nbsp;·&nbsp; {schedule.shift_start} – {schedule.shift_end}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 inline mr-1.5" />No schedule assigned for today
        </div>
      )}

      {/* Live clock */}
      <div className="text-center">
        <p className="text-2xl font-mono font-bold text-gray-800">{currentTime.toLocaleTimeString()}</p>
        <p className="text-xs text-gray-400">{currentTime.toLocaleDateString()}</p>
      </div>

      {/* GPS */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <button onClick={getGPS}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition">
          📍 Get GPS Location
        </button>
        {gpsCoords && (
          <div className="mt-2 text-sm space-y-0.5">
            {gpsCoords.address && <p className="font-medium text-gray-800">📍 {gpsCoords.address}</p>}
            <p className="text-gray-400 text-xs">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} · ±{gpsCoords.accuracy.toFixed(0)}m</p>
            {geofenceMsg && (
              <p className={`text-xs font-semibold mt-1 ${geofenceStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                {geofenceMsg}
              </p>
            )}
            <a href={`https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:underline">
              🗺️ View on Google Maps
            </a>
          </div>
        )}
        {gpsError && <p className="text-red-500 text-xs mt-2">{gpsError}</p>}
      </div>

      {/* Camera */}
      <div className="bg-black rounded-xl overflow-hidden">
        {photoPreview ? (
          <img src={photoPreview} alt="Preview" className="w-full object-cover" style={{ height: cameraH }} />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full object-cover bg-black"
            style={{ height: cameraH, transform: cameraActive ? 'scaleX(-1)' : 'none' }} />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Camera controls */}
      <div className="flex gap-2">
        {!cameraActive && !photoPreview && (
          <button onClick={startCamera}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            📷 Open Camera
          </button>
        )}
        {cameraActive && (
          <>
            <button onClick={capturePhoto}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
              📸 Take Photo
            </button>
            <button onClick={stopCamera}
              className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
              Cancel
            </button>
          </>
        )}
        {photoPreview && (
          <button onClick={retakePhoto}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            Retake
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm font-semibold text-center whitespace-pre-line ${
          message.startsWith('Clock In accepted') || message.startsWith('Clock Out accepted') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Clock In / Out */}
      <div className="flex gap-3">
        {!clockedIn ? (
          <button onClick={() => postClockAction('clock_in')}
            disabled={!photoBlob || loading || !schedule || geofenceStatus === 'fail'}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-base transition">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Clocking In…</> : <><Check className="w-4 h-4 inline mr-1" />Clock In</>}
          </button>
        ) : (
          <button onClick={() => postClockAction('clock_out')}
            disabled={!photoBlob || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-base transition">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Clocking Out…</> : <><X className="w-4 h-4 inline mr-1" />Clock Out</>}
          </button>
        )}
      </div>

      {/* Today summary */}
      {todayRecord && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Today</p>
          <div className="flex justify-between"><span className="text-gray-500">Clock In</span><span>{todayRecord.clock_in ? new Date(todayRecord.clock_in).toLocaleTimeString() : '—'}</span></div>
          {todayRecord.clock_out && (
            <>
              <div className="flex justify-between"><span className="text-gray-500">Clock Out</span><span>{new Date(todayRecord.clock_out).toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hours</span><span>{todayRecord.hours}h</span></div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
