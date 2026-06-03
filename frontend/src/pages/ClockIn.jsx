import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { getUser } from '../api/auth'

export default function ClockIn() {
  const [user, setUser] = useState(getUser())
  const [employee, setEmployee] = useState(null)
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

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      const video = videoRef.current
      canvasRef.current.width = video.videoWidth
      canvasRef.current.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      canvasRef.current.toBlob(blob => {
        setPhotoBlob(blob)
        setPhotoPreview(canvasRef.current.toDataURL())
        stopCamera()
      }, 'image/jpeg')
    }
  }

  // Get GPS location
  const getGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords
        setGpsCoords({ lat: latitude, lng: longitude, accuracy })
        setGpsError('')
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
      }

      const res = await api.post('/hr/attendance/clock_in/', formData)
      if (res.data.success) {
        setClockedIn(true)
        setMessage(`✓ ${res.data.message}`)
        setPhotoBlob(null)
        setPhotoPreview(null)
        setGpsCoords(null)
        setTimeout(() => setMessage(''), 3000)
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
      }

      const res = await api.post('/hr/attendance/clock_out/', formData)
      if (res.data.success) {
        setClockedIn(false)
        setMessage(`✓ ${res.data.message} (${res.data.hours_worked}h)`)
        setPhotoBlob(null)
        setPhotoPreview(null)
        setGpsCoords(null)
        setTimeout(() => setMessage(''), 3000)
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
        <p className="text-blue-300 text-sm">{employee?.position?.title || '—'}</p>
        <div className="text-4xl font-mono font-bold mt-4">{currentTime.toLocaleTimeString()}</div>
        <div className="text-sm text-blue-200 mt-1">{currentTime.toLocaleDateString()}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {/* Camera Section */}
        <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-6">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-96 object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-96 object-cover bg-black"
              style={{ transform: cameraActive ? 'scaleX(-1)' : 'none' }}
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

        {/* GPS Section */}
        <div className="w-full bg-blue-800 bg-opacity-50 rounded-lg p-4 mb-6">
          <button
            onClick={getGPS}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            📍 Get GPS Location
          </button>
          {gpsCoords && (
            <div className="text-white text-sm mt-3">
              <p>✓ Latitude: {gpsCoords.lat.toFixed(6)}</p>
              <p>✓ Longitude: {gpsCoords.lng.toFixed(6)}</p>
              <p className="text-gray-300">Accuracy: ±{gpsCoords.accuracy.toFixed(0)}m</p>
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

        {/* Status Message */}
        {message && (
          <div className={`w-full p-4 rounded-lg mb-6 text-center text-white font-semibold ${
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
              disabled={!photoBlob || loading}
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
