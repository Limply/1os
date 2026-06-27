import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { key: 'blue',   label: 'Blue',   color: '#2563eb' },
  { key: 'green',  label: 'Green',  color: '#16a34a' },
  { key: 'purple', label: 'Purple', color: '#9333ea' },
  { key: 'orange', label: 'Orange', color: '#ea580c' },
  { key: 'teal',   label: 'Teal',   color: '#0d9488' },
  { key: 'rose',   label: 'Rose',   color: '#e11d48' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'blue')
  const [darkMode, setDarkModeState] = useState(() => localStorage.getItem('darkMode') || 'light')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'blue') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = darkMode === 'dark' || darkMode === 'vscode' || (darkMode === 'system' && prefersDark)
    root.classList.toggle('dark', isDark)
    root.setAttribute('data-dark', darkMode === 'vscode' ? 'vscode' : 'default')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, darkMode, setDarkMode: setDarkModeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
