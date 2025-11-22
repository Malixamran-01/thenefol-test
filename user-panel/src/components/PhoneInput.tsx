import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Country {
  name: string
  code: string
  flag: string
  dialCode: string
}

const countries: Country[] = [
  { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
  { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', dialCode: '+49' },
  { name: 'France', code: 'FR', flag: '🇫🇷', dialCode: '+33' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', dialCode: '+81' },
  { name: 'China', code: 'CN', flag: '🇨🇳', dialCode: '+86' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', dialCode: '+65' },
  { name: 'UAE', code: 'AE', flag: '🇦🇪', dialCode: '+971' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', dialCode: '+92' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', dialCode: '+880' },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', dialCode: '+94' },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵', dialCode: '+977' }
]

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onCountryCodeChange?: (code: string) => void
  defaultCountry?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  required?: boolean
  disabled?: boolean
  error?: string
  label?: string
  showLabel?: boolean
}

export default function PhoneInput({
  value,
  onChange,
  onCountryCodeChange,
  defaultCountry = '+91',
  placeholder,
  className = '',
  inputClassName = '',
  required = false,
  disabled = false,
  error,
  label,
  showLabel = false
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.dialCode === defaultCountry) || countries[0]
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Update selected country when defaultCountry changes
  useEffect(() => {
    const country = countries.find(c => c.dialCode === defaultCountry)
    if (country) {
      setSelectedCountry(country)
    }
  }, [defaultCountry])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setIsOpen(false)
    if (onCountryCodeChange) {
      onCountryCodeChange(country.dialCode)
    }
    // Remove old country code from value if present
    const phoneWithoutCode = value.replace(/^\+\d{1,4}\s*/, '').trim()
    onChange(phoneWithoutCode)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Only allow digits
    let digitsOnly = inputValue.replace(/\D/g, '')
    // For India (+91), limit to 10 digits for Shiprocket compatibility
    if (selectedCountry.dialCode === '+91') {
      digitsOnly = digitsOnly.slice(0, 10)
    }
    onChange(digitsOnly)
  }

  const getFullPhoneNumber = () => {
    if (!value) return ''
    return `${selectedCountry.dialCode} ${value}`.trim()
  }

  return (
    <div className={className}>
      {showLabel && label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        {/* Country Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-lg border 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              border-slate-300 dark:border-slate-600
              min-w-[100px] justify-between
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}
              transition-all
              ${inputClassName || ''}
            `}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-64 max-h-60 overflow-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
              <div className="py-1">
                {countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`
                      w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700
                      ${selectedCountry.code === country.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      transition-colors
                    `}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{country.name}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder={placeholder || (selectedCountry.dialCode === '+91' ? 'Enter 10-digit phone number' : 'Enter phone number')}
          required={required}
          disabled={disabled}
          maxLength={selectedCountry.dialCode === '+91' ? 10 : 15}
          className={`
            flex-1 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg border 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            border-slate-300 dark:border-slate-600
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            transition-all
            ${inputClassName}
          `}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      {/* Hidden input for form submission with full phone number */}
      <input type="hidden" name="phone" value={getFullPhoneNumber()} />
    </div>
  )
}

// Export countries list for use in other components
export { countries as phoneCountries }

