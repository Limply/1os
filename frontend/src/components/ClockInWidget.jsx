import { useEffect, useRef, useState } from 'react'
import { ClipboardList, AlertTriangle, Loader2, Check, X } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../api/auth'

const OFFICE = { name: 'Astronic Office', lat: 1.3772153, lng: 103.8707002, radius: 300 }

function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
  return Math.round(2 * Math.asin(Math.sqrt(a)) * 6371000)
}

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
  const [healthDeclared, setHealthDeclared] = useState(false)
  const [clockedIn, setClockedIn] = useState(false)
  const [todayRecord, setTodayRecord] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [matchedSite, setMatchedSite] = useState(null)

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

  // Fetch employee if not passed as prop (self-service — works regardless of HR module access)
  useEffect(() => {
    if (empProp) { setEmployee(empProp); return }
    if (!user?.id) return
    api.get('/hr/employees/me/').then(res => {
      setEmployee(res.data)
    }).catch(err => {
      setMessage(`Couldn't load your employee profile: ${err.response?.data?.detail || err.message}`)
    })
  }, [empProp, user?.id])

  // Fetch today's schedule (self-service)
  useEffect(() => {
    if (!employee?.id) return
    const d = new Date()
    const dd = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
    api.get(`/hr/work-schedules/mine/?date=${dd}`)
      .then(res => setSchedule(res.data.results?.[0] || null))
      .catch(err => setMessage(`Couldn't load today's schedule: ${err.response?.data?.detail || err.message}`))
  }, [employee?.id])

  // Fetch projects for remote clock-in
  useEffect(() => {
    api.get('/projects/projects/?limit=999').then(res => {
      setProjects(res.data.results || res.data)
    }).catch(() => {})
  }, [])

  // Fetch today's attendance (self-service)
  useEffect(() => {
    if (!employee?.id) return
    api.get('/hr/attendance/mine/').then(res => {
      const rec = (res.data.results || [])[0]
      if (rec) { setTodayRecord(rec); setClockedIn(!!rec.clock_in && !rec.clock_out) }
    }).catch(err => setMessage(`Couldn't load today's attendance: ${err.response?.data?.detail || err.message}`))
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
    const project = projects.find(p => String(p.id) === String(selectedProject))
    const siteName = matchedSite || project?.name || gpsCoords?.address || ''
    const lines = [
      now.toLocaleString(),
      siteName,
      gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : '',
      !clockedIn ? 'I am healthy ✓' : '',
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

        const site = schedule
          ? { name: schedule.location_name, lat: parseFloat(schedule.location_lat), lng: parseFloat(schedule.location_lng), radius: schedule.radius }
          : OFFICE
        const dist = distanceMeters(latitude, longitude, site.lat, site.lng)
        if (dist <= site.radius) {
          setGeofenceStatus('ok')
          setGeofenceMsg(`Within ${dist}m of ${site.name}`)
          setMatchedSite(site.name)
        } else {
          setGeofenceStatus('fail')
          setGeofenceMsg(`${dist}m away — must be within ${site.radius}m of ${site.name}`)
          setMatchedSite(null)
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
    if (action === 'clock_in' && geofenceStatus === 'fail' && selectedProject)
      formData.append('project_id', selectedProject)
    if (action === 'clock_in')
      formData.append('health_declared', healthDeclared)
    try {
      const res = await api.post(`/hr/attendance/${action}/`, formData)
      if (res.data.success) {
        setClockedIn(action === 'clock_in')
        const msg = action === 'clock_in'
          ? `Clock In accepted at ${new Date().toLocaleTimeString()}\nRemember to clock out later!`
          : `Clock Out accepted at ${new Date().toLocaleTimeString()}\nTotal: ${res.data.hours_worked}h\nHave a great day!`
        setMessage(msg)
        setPhotoBlob(null); setPhotoPreview(null); setGpsCoords(null); setHealthDeclared(false)
        setTimeout(() => setMessage(''), 5000)
        // Refresh today's record
        api.get('/hr/attendance/mine/').then(r => {
          const rec = (r.data.results || [])[0]
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 inline mr-1.5" />No schedule assigned for today — you can still clock in
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
            {geofenceStatus === 'fail' && (
              <div className="mt-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Project (required to clock in remotely)</label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Select a project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_no ? `${p.project_no} — ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>
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

      {/* Health declaration (clock-in only) */}
      {!clockedIn && (
        <label className="flex items-center gap-3 bg-primary-50 border-2 border-primary-200 rounded-xl p-4 text-lg font-semibold text-gray-800 cursor-pointer">
          <input type="checkbox" checked={healthDeclared}
            onChange={e => setHealthDeclared(e.target.checked)}
            className="w-7 h-7 shrink-0 accent-primary-600" />
          <span>I am feeling healthy today.</span>
        </label>
      )}

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
          <button onClick={startCamera} disabled={!clockedIn ? !healthDeclared : false}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            📷 {!clockedIn && !healthDeclared ? 'Declare health status above first' : 'Open Camera'}
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
            disabled={!photoBlob || loading || !healthDeclared || (geofenceStatus === 'fail' && !selectedProject)}
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
