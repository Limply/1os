import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'

export default function ClockIn() {
  const [user] = useState(getUser())
  const [employee, setEmployee] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [geofenceStatus, setGeofenceStatus] = useState(null) // null | 'ok' | 'fail'
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

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch current user's employee data
  useEffect(() => {
    if (user?.id) {
      api.get(`/hr/employees/?limit=999`).then(res => {
        const results = res.data.results || []
        let empData = results.find(e => e.user === user.id)
        if (!empData && user.first_name) {
          empData = results.find(e =>
            e.first_name.toLowerCase() === user.first_name.toLowerCase()
          )
        }
        setEmployee(empData || results[0])
      }).catch(console.error)
    }
  }, [user])

  // Fetch today's schedule for this employee
  useEffect(() => {
    if (employee?.id) {
      const today = new Date().toISOString().split('T')[0]
      api.get(`/hr/work-schedules/?date=${today}&employee=${employee.id}`).then(res => {
        const s = res.data.results?.[0] || null
        setSchedule(s)
      }).catch(console.error)
    }
  }, [employee])

  // Check if already clocked in today
  useEffect(() => {
    if (employee?.id) {
      const today = new Date().toISOString().split('T')[0]
      api.get(`/hr/attendance/?employee=${employee.id}`).then(res => {
        const todayRecord = res.data.results?.find(r => r.date === today)
        if (todayRecord) {
          setTodayRecord(todayRecord)
          setClockedIn(!!todayRecord.clock_in && !todayRecord.clock_out)
        }
      }).catch(console.error)
    }
  }, [employee])

  // Start camera
  const startCamera = async () => {
    try {
      setMessage('🔄 Opening camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        setMessage('')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setMessage(`❌ Camera: ${err.name} — ${err.message}`)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      setCameraActive(false)
    }
  }

  // Capture photo with timestamp watermark
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      const video = videoRef.current
      canvasRef.current.width = video.videoWidth
      canvasRef.current.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Add timestamp + location watermark
      const now = new Date()
      const timestamp = now.toLocaleString()
      const coords = gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : ''
      const address = gpsCoords?.address || ''

      const lines = [timestamp, address, coords].filter(Boolean)
      const barHeight = 30 + lines.length * 28

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.fillRect(0, canvasRef.current.height - barHeight, canvasRef.current.width, barHeight)

      ctx.fillStyle = '#FFFFFF'
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? 'bold 20px Arial' : '17px Arial'
        ctx.fillText(line, 15, canvasRef.current.height - barHeight + 26 + i * 28)
      })

      canvasRef.current.toBlob(blob => {
        setPhotoBlob(blob)
        setPhotoPreview(canvasRef.current.toDataURL())
        stopCamera()
      }, 'image/jpeg')
    }
  }

  // Get GPS location and reverse geocode to address
  const getGPS = async () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setGpsCoords({ lat: latitude, lng: longitude, accuracy })
        setGpsError('')

        // Geofence check against today's schedule
        if (schedule) {
          const toRad = d => d * Math.PI / 180
          const R = 6371000
          const dLat = toRad(parseFloat(schedule.location_lat) - latitude)
          const dLng = toRad(parseFloat(schedule.location_lng) - longitude)
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(parseFloat(schedule.location_lat))) * Math.sin(dLng / 2) ** 2
          const distance = Math.round(2 * Math.asin(Math.sqrt(a)) * R)
          if (distance <= schedule.radius) {
            setGeofenceStatus('ok')
            setGeofenceMsg(`✅ Within ${distance}m of ${schedule.location_name}`)
          } else {
            setGeofenceStatus('fail')
            setGeofenceMsg(`❌ ${distance}m away — must be within ${schedule.radius}m of ${schedule.location_name}`)
          }
        }

        // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          if (data.address) {
            const address = data.address.road || data.address.village || data.address.town || data.address.city || ''
            if (address) {
              setGpsCoords(prev => ({ ...prev, address }))
            }
          }
        } catch (err) {
          console.error('Geocoding error:', err)
        }
      },
      error => {
        setGpsError(`GPS error: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Retake photo
  const retakePhoto = () => {
    setPhotoBlob(null)
    setPhotoPreview(null)
    startCamera()
  }

  // Clock in
  const handleClockIn = async () => {
    if (!photoBlob) {
      setMessage('Please take a photo')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'clock-in.jpg')
      if (gpsCoords) {
        formData.append('gps_lat', gpsCoords.lat)
        formData.append('gps_lng', gpsCoords.lng)
        if (gpsCoords.address) {
          formData.append('address', gpsCoords.address)
        }
      }

      const res = await api.post('/hr/attendance/clock_in/', formData)
      if (res.data.success) {
        setClockedIn(true)
        setMessage(`✓ Clock In Accepted at ${new Date().toLocaleTimeString()}\n⏰ Remember to Clock Out later!`)
        setPhotoBlob(null)
        setPhotoPreview(null)
        setGpsCoords(null)
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage(`✗ ${res.data.message}`)
      }
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Clock out
  const handleClockOut = async () => {
    if (!photoBlob) {
      setMessage('Please take a photo')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'clock-out.jpg')
      if (gpsCoords) {
        formData.append('gps_lat', gpsCoords.lat)
        formData.append('gps_lng', gpsCoords.lng)
        if (gpsCoords.address) {
          formData.append('address', gpsCoords.address)
        }
      }

      const res = await api.post('/hr/attendance/clock_out/', formData)
      if (res.data.success) {
        setClockedIn(false)
        setMessage(`✓ Clock Out Accepted at ${new Date().toLocaleTimeString()}\n⏱️ Total Hours: ${res.data.hours_worked}h\n✅ Have a great day!`)
        setPhotoBlob(null)
        setPhotoPreview(null)
        setGpsCoords(null)
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage(`✗ ${res.data.message}`)
      }
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex flex-col">
      {/* Header */}
      <div className="bg-blue-950 text-white p-6 text-center">
        <h1 className="text-3xl font-bold">Clock In/Out</h1>
        <p className="text-blue-200 mt-2">{user?.first_name} {user?.last_name}</p>
        <p className="text-blue-300 text-sm">{employee?.position_name || '—'}</p>
        <div className="text-4xl font-mono font-bold mt-4">{currentTime.toLocaleTimeString()}</div>
        <div className="text-sm text-blue-200 mt-1">{currentTime.toLocaleDateString()}</div>
        {schedule ? (
          <div className="mt-3 bg-blue-900 bg-opacity-60 rounded-lg px-4 py-2 text-sm inline-block">
            📋 {schedule.location_name} &nbsp;|&nbsp; {schedule.shift_start} – {schedule.shift_end}
          </div>
        ) : (
          <div className="mt-3 bg-red-900 bg-opacity-60 rounded-lg px-4 py-2 text-sm inline-block text-red-200">
            ⚠️ No schedule assigned for today
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {/* GPS Section - TOP */}
        <div className="w-full bg-blue-800 bg-opacity-50 rounded-lg p-4 mb-6">
          <button
            onClick={getGPS}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            📍 Get GPS Location
          </button>
          {gpsCoords && (
            <div className="text-white text-sm mt-3">
              {gpsCoords.address && (
                <p className="font-semibold mb-2">📍 {gpsCoords.address}</p>
              )}
              <p>Latitude: {gpsCoords.lat.toFixed(6)}</p>
              <p>Longitude: {gpsCoords.lng.toFixed(6)}</p>
              <p className="text-gray-300">Accuracy: ±{gpsCoords.accuracy.toFixed(0)}m</p>
              {geofenceMsg && (
                <p className={`mt-2 font-semibold ${geofenceStatus === 'ok' ? 'text-green-300' : 'text-red-300'}`}>
                  {geofenceMsg}
                </p>
              )}
              <a
                href={`https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition text-xs"
              >
                🗺️ View on Google Maps
              </a>
            </div>
          )}
          {gpsError && <p className="text-red-300 text-sm mt-2">{gpsError}</p>}
        </div>

        {/* Camera Section */}
        <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-6">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full object-cover" style={{ height: '307px' }} />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full object-cover bg-black"
              style={{ height: '307px', transform: cameraActive ? 'scaleX(-1)' : 'none' }}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Camera Controls */}
        <div className="w-full flex gap-3 mb-6">
          {!cameraActive && !photoPreview && (
            <button
              onClick={startCamera}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              📷 Open Camera
            </button>
          )}
          {cameraActive && (
            <>
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                📸 Take Photo
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </>
          )}
          {photoPreview && (
            <button
              onClick={retakePhoto}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              🔄 Retake Photo
            </button>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className={`w-full p-4 rounded-lg mb-6 text-center text-white font-semibold whitespace-pre-line ${
            message.startsWith('✓') ? 'bg-green-600 bg-opacity-70' : 'bg-red-600 bg-opacity-70'
          }`}>
            {message}
          </div>
        )}

        {/* Clock In/Out Buttons */}
        <div className="w-full flex gap-4">
          {!clockedIn ? (
            <button
              onClick={handleClockIn}
              disabled={!photoBlob || loading || !schedule || geofenceStatus === 'fail'}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-4 px-6 rounded-lg text-xl transition"
            >
              {loading ? '⏳ Clocking In...' : '✓ Clock In'}
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              disabled={!photoBlob || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-bold py-4 px-6 rounded-lg text-xl transition"
            >
              {loading ? '⏳ Clocking Out...' : '✗ Clock Out'}
            </button>
          )}
        </div>

        {/* Status Info */}
        {todayRecord && (
          <div className="w-full mt-6 bg-blue-800 bg-opacity-50 rounded-lg p-4 text-white text-sm">
            <p>Clock In: {todayRecord.clock_in ? new Date(todayRecord.clock_in).toLocaleTimeString() : '—'}</p>
            {todayRecord.clock_out && (
              <>
                <p>Clock Out: {new Date(todayRecord.clock_out).toLocaleTimeString()}</p>
                <p>Hours: {todayRecord.hours}h</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
