import { createContext, useContext, useState, useEffect } from 'react'

export const THEME_PRESETS = {
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    chartColors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
  },
  finance: {
    id: 'finance',
    name: 'Finance Theme',
    primary: '#059669',
    secondary: '#d97706',
    chartColors: ['#059669', '#d97706', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate Theme',
    primary: '#3b82f6',
    secondary: '#6366f1',
    chartColors: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
  },
  startup: {
    id: 'startup',
    name: 'Startup Theme',
    primary: '#ec4899',
    secondary: '#f97316',
    chartColors: ['#ec4899', '#f97316', '#a78bfa', '#10b981', '#06b6d4', '#ef4444', '#f59e0b', '#84cc16']
  }
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('datapilot-theme') || 'dark'
  })

  const setTheme = (newTheme) => {
    if (THEME_PRESETS[newTheme]) {
      setThemeState(newTheme)
      localStorage.setItem('datapilot-theme', newTheme)
    }
  }

  useEffect(() => {
    // Clean up any old theme classes
    Object.keys(THEME_PRESETS).forEach((t) => {
      document.body.classList.remove(`theme-${t}`)
    })
    // Add current theme class
    document.body.classList.add(`theme-${theme}`)
  }, [theme])

  const preset = THEME_PRESETS[theme] || THEME_PRESETS.dark

  return (
    <ThemeContext.Provider value={{ theme, setTheme, preset, presets: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
