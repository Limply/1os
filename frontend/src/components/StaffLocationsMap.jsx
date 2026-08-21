import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AuthImage from './AuthImage'

const STATUS_DOT = {
  present:  '#16a34a',
  late:     '#ca8a04',
  absent:   '#dc2626',
  half_day: '#6366f1',
  leave:    '#9333ea',
  pending:  '#9ca3af',
}

function dotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block; width:16px; height:16px; border-radius:50%;
      background:${color}; border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

const SINGAPORE_CENTER = [1.3521, 103.8198]

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16 })
  }, [points, map])
  return null
}

export default function StaffLocationsMap({ results, onPhotoClick }) {
  const points = useMemo(() => {
    return (results || [])
      .map(r => {
        const gps = r.clock_in_gps || r.clock_out_gps
        if (!gps || gps.lat == null || gps.lng == null) return null
        return { ...r, lat: parseFloat(gps.lat), lng: parseFloat(gps.lng), fromClockOut: !r.clock_in_gps }
      })
      .filter(Boolean)
  }, [results])

  const center = points.length
    ? [points.reduce((s, p) => s + p.lat, 0) / points.length, points.reduce((s, p) => s + p.lng, 0) / points.length]
    : SINGAPORE_CENTER

  if (points.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
        No staff GPS locations recorded for this day yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: 520 }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map(p => (
          <Marker key={p.employee_id} position={[p.lat, p.lng]} icon={dotIcon(STATUS_DOT[p.status] || '#9ca3af')}>
            <Popup>
              <div className="text-xs space-y-1 min-w-[160px]">
                <p className="font-semibold text-gray-800">{p.employee_name}</p>
                <p className="text-gray-500 capitalize">{p.status?.replace('_', ' ')}</p>
                {p.clock_in && <p className="text-gray-500">In: {p.clock_in.slice(11, 16)}</p>}
                {p.clock_out && <p className="text-gray-500">Out: {p.clock_out.slice(11, 16)}</p>}
                {p.location && <p className="text-gray-400">{p.location}</p>}
                {(p.clock_in_photo || p.clock_out_photo) && onPhotoClick && (
                  <button onClick={() => onPhotoClick(p)} className="block mt-1">
                    <AuthImage
                      src={p.clock_in_photo || p.clock_out_photo}
                      alt=""
                      className="w-16 h-16 rounded object-cover border border-gray-200 hover:opacity-80"
                    />
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
