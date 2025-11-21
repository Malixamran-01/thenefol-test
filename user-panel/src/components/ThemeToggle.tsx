import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="neu w-12 h-12 flex items-center justify-center hover:scale-110 transition-all duration-300"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="w-6 h-6 rounded-full border-2 border-slate-600 dark:border-slate-300 flex items-center justify-center relative">
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          theme === 'light' 
            ? 'bg-slate-600' 
            : 'bg-slate-300'
        }`} />
      </div>
    </button>
  )
}

export default ThemeToggle
