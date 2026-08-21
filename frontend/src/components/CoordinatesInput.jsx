import { useEffect, useState } from 'react'

// Extracts lat/lng from a pasted Google Maps URL or raw "lat, lng" text
// (the format Google Maps gives you when you tap a pin and copy the coordinates).
// Prefers the !3d/!4d pin coords (exact place) over the @lat,lng viewport center.
export function parseGoogleMapsLocation(text) {
  const s = (text || '').trim()
  if (!s) return null
  const pin = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (pin) return { lat: pin[1], lng: pin[2] }
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at) return { lat: at[1], lng: at[2] }
  const q = s.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (q) return { lat: q[1], lng: q[2] }
  const raw = s.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/)
  if (raw) return { lat: raw[1], lng: raw[2] }
  return null
}

// Single-box coordinate entry: paste "1.314568, 103.891248" (as copied from Google Maps)
// or a full Google Maps link, or use the browser's current location.
export default function CoordinatesInput({ lat, lng, onChange, label = 'Coordinates', className = '' }) {
  const [text, setText] = useState(lat && lng ? `${lat}, ${lng}` : '')
  const [error, setError] = useState('')

  // Keep the box in sync when lat/lng are set from outside (e.g. "copy site from project").
  useEffect(() => {
    setText(lat && lng ? `${lat}, ${lng}` : '')
  }, [lat, lng])

  function apply(value) {
    setText(value)
    if (!value.trim()) { setError(''); onChange({ lat: '', lng: '' }); return }
    const loc = parseGoogleMapsLocation(value)
    if (loc) {
      setError('')
      onChange(loc)
    } else if (/^https?:\/\//.test(value.trim())) {
      setError("Couldn't find coordinates in that link — open it in Google Maps and copy the full URL (with @lat,lng), or paste \"lat, lng\"")
    } else {
      setError('')
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const la = pos.coords.latitude.toFixed(7)
      const ln = pos.coords.longitude.toFixed(7)
      setError('')
      onChange({ lat: la, lng: ln })
    })
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600">{label}</label>
        <button type="button" onClick={useCurrentLocation}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          📍 Use Current Location
        </button>
      </div>
      <input
        value={text}
        onChange={e => apply(e.target.value)}
        placeholder="Paste coordinates (1.314568, 103.891248) or a Google Maps link"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!error && lat && lng && <p className="text-xs text-green-600 mt-1">✓ {lat}, {lng}</p>}
    </div>
  )
}
