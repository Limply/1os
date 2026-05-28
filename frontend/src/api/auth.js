import axios from 'axios'
import api from './axios'

export async function login(email, password) {
  const res = await axios.post('/api/auth/token/', { email, password })
  localStorage.setItem('access_token', res.data.access)
  localStorage.setItem('refresh_token', res.data.refresh)
  // fetch and cache user profile after login
  const me = await api.get('/auth/me/')
  localStorage.setItem('user', JSON.stringify(me.data))
  return res.data
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function isLoggedIn() {
  return !!localStorage.getItem('access_token')
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {}
  } catch {
    return {}
  }
}
