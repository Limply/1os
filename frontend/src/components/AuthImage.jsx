import { useEffect, useState } from 'react'

export default function AuthImage({ src, alt = '', className = '', onClick, style }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) return
    let objectUrl = null
    setError(false)
    setBlobUrl(null)
    const token = localStorage.getItem('access_token')
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => {
        if (!res.ok) throw new Error(res.status)
        return res.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => setError(true))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])

  if (error) return (
    <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className}`} style={style}>
      Failed
    </div>
  )
  if (!blobUrl) return (
    <div className={`bg-gray-100 animate-pulse ${className}`} style={style} />
  )
  return <img src={blobUrl} alt={alt} className={className} style={style} onClick={onClick} />
}
