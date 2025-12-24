import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Country {
  name: string
  code: string
  flag: string
  dialCode: string
}

const countries: Country[] = [
  { name: 'Afghanistan', code: 'AF', flag: '🇦🇫', dialCode: '+93' },
  { name: 'Albania', code: 'AL', flag: '🇦🇱', dialCode: '+355' },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿', dialCode: '+213' },
  { name: 'Andorra', code: 'AD', flag: '🇦🇩', dialCode: '+376' },
  { name: 'Angola', code: 'AO', flag: '🇦🇴', dialCode: '+244' },
  { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬', dialCode: '+1268' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', dialCode: '+54' },
  { name: 'Armenia', code: 'AM', flag: '🇦🇲', dialCode: '+374' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', dialCode: '+43' },
  { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', dialCode: '+994' },
  { name: 'Bahamas', code: 'BS', flag: '🇧🇸', dialCode: '+1242' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', dialCode: '+973' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', dialCode: '+880' },
  { name: 'Barbados', code: 'BB', flag: '🇧🇧', dialCode: '+1246' },
  { name: 'Belarus', code: 'BY', flag: '🇧🇾', dialCode: '+375' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', dialCode: '+32' },
  { name: 'Belize', code: 'BZ', flag: '🇧🇿', dialCode: '+501' },
  { name: 'Benin', code: 'BJ', flag: '🇧🇯', dialCode: '+229' },
  { name: 'Bhutan', code: 'BT', flag: '🇧🇹', dialCode: '+975' },
  { name: 'Bolivia', code: 'BO', flag: '🇧🇴', dialCode: '+591' },
  { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦', dialCode: '+387' },
  { name: 'Botswana', code: 'BW', flag: '🇧🇼', dialCode: '+267' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', dialCode: '+55' },
  { name: 'Brunei', code: 'BN', flag: '🇧🇳', dialCode: '+673' },
  { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', dialCode: '+359' },
  { name: 'Burkina Faso', code: 'BF', flag: '🇧🇫', dialCode: '+226' },
  { name: 'Burundi', code: 'BI', flag: '🇧🇮', dialCode: '+257' },
  { name: 'Cambodia', code: 'KH', flag: '🇰🇭', dialCode: '+855' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲', dialCode: '+237' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
  { name: 'Cape Verde', code: 'CV', flag: '🇨🇻', dialCode: '+238' },
  { name: 'Central African Republic', code: 'CF', flag: '🇨🇫', dialCode: '+236' },
  { name: 'Chad', code: 'TD', flag: '🇹🇩', dialCode: '+235' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', dialCode: '+56' },
  { name: 'China', code: 'CN', flag: '🇨🇳', dialCode: '+86' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', dialCode: '+57' },
  { name: 'Comoros', code: 'KM', flag: '🇰🇲', dialCode: '+269' },
  { name: 'Congo', code: 'CG', flag: '🇨🇬', dialCode: '+242' },
  { name: 'Costa Rica', code: 'CR', flag: '🇨🇷', dialCode: '+506' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', dialCode: '+385' },
  { name: 'Cuba', code: 'CU', flag: '🇨🇺', dialCode: '+53' },
  { name: 'Cyprus', code: 'CY', flag: '🇨🇾', dialCode: '+357' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', dialCode: '+420' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', dialCode: '+45' },
  { name: 'Djibouti', code: 'DJ', flag: '🇩🇯', dialCode: '+253' },
  { name: 'Dominica', code: 'DM', flag: '🇩🇲', dialCode: '+1767' },
  { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴', dialCode: '+1809' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', dialCode: '+593' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', dialCode: '+20' },
  { name: 'El Salvador', code: 'SV', flag: '🇸🇻', dialCode: '+503' },
  { name: 'Equatorial Guinea', code: 'GQ', flag: '🇬🇶', dialCode: '+240' },
  { name: 'Eritrea', code: 'ER', flag: '🇪🇷', dialCode: '+291' },
  { name: 'Estonia', code: 'EE', flag: '🇪🇪', dialCode: '+372' },
  { name: 'Eswatini', code: 'SZ', flag: '🇸🇿', dialCode: '+268' },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', dialCode: '+251' },
  { name: 'Fiji', code: 'FJ', flag: '🇫🇯', dialCode: '+679' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮', dialCode: '+358' },
  { name: 'France', code: 'FR', flag: '🇫🇷', dialCode: '+33' },
  { name: 'Gabon', code: 'GA', flag: '🇬🇦', dialCode: '+241' },
  { name: 'Gambia', code: 'GM', flag: '🇬🇲', dialCode: '+220' },
  { name: 'Georgia', code: 'GE', flag: '🇬🇪', dialCode: '+995' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', dialCode: '+49' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', dialCode: '+233' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷', dialCode: '+30' },
  { name: 'Grenada', code: 'GD', flag: '🇬🇩', dialCode: '+1473' },
  { name: 'Guatemala', code: 'GT', flag: '🇬🇹', dialCode: '+502' },
  { name: 'Guinea', code: 'GN', flag: '🇬🇳', dialCode: '+224' },
  { name: 'Guinea-Bissau', code: 'GW', flag: '🇬🇼', dialCode: '+245' },
  { name: 'Guyana', code: 'GY', flag: '🇬🇾', dialCode: '+592' },
  { name: 'Haiti', code: 'HT', flag: '🇭🇹', dialCode: '+509' },
  { name: 'Honduras', code: 'HN', flag: '🇭🇳', dialCode: '+504' },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺', dialCode: '+36' },
  { name: 'Iceland', code: 'IS', flag: '🇮🇸', dialCode: '+354' },
  { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', dialCode: '+62' },
  { name: 'Iran', code: 'IR', flag: '🇮🇷', dialCode: '+98' },
  { name: 'Iraq', code: 'IQ', flag: '🇮🇶', dialCode: '+964' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', dialCode: '+353' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', dialCode: '+972' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', dialCode: '+39' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', dialCode: '+225' },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', dialCode: '+1876' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', dialCode: '+81' },
  { name: 'Jordan', code: 'JO', flag: '🇯🇴', dialCode: '+962' },
  { name: 'Kazakhstan', code: 'KZ', flag: '🇰🇿', dialCode: '+7' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', dialCode: '+254' },
  { name: 'Kiribati', code: 'KI', flag: '🇰🇮', dialCode: '+686' },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼', dialCode: '+965' },
  { name: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬', dialCode: '+996' },
  { name: 'Laos', code: 'LA', flag: '🇱🇦', dialCode: '+856' },
  { name: 'Latvia', code: 'LV', flag: '🇱🇻', dialCode: '+371' },
  { name: 'Lebanon', code: 'LB', flag: '🇱🇧', dialCode: '+961' },
  { name: 'Lesotho', code: 'LS', flag: '🇱🇸', dialCode: '+266' },
  { name: 'Liberia', code: 'LR', flag: '🇱🇷', dialCode: '+231' },
  { name: 'Libya', code: 'LY', flag: '🇱🇾', dialCode: '+218' },
  { name: 'Liechtenstein', code: 'LI', flag: '🇱🇮', dialCode: '+423' },
  { name: 'Lithuania', code: 'LT', flag: '🇱🇹', dialCode: '+370' },
  { name: 'Luxembourg', code: 'LU', flag: '🇱🇺', dialCode: '+352' },
  { name: 'Madagascar', code: 'MG', flag: '🇲🇬', dialCode: '+261' },
  { name: 'Malawi', code: 'MW', flag: '🇲🇼', dialCode: '+265' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', dialCode: '+60' },
  { name: 'Maldives', code: 'MV', flag: '🇲🇻', dialCode: '+960' },
  { name: 'Mali', code: 'ML', flag: '🇲🇱', dialCode: '+223' },
  { name: 'Malta', code: 'MT', flag: '🇲🇹', dialCode: '+356' },
  { name: 'Marshall Islands', code: 'MH', flag: '🇲🇭', dialCode: '+692' },
  { name: 'Mauritania', code: 'MR', flag: '🇲🇷', dialCode: '+222' },
  { name: 'Mauritius', code: 'MU', flag: '🇲🇺', dialCode: '+230' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', dialCode: '+52' },
  { name: 'Micronesia', code: 'FM', flag: '🇫🇲', dialCode: '+691' },
  { name: 'Moldova', code: 'MD', flag: '🇲🇩', dialCode: '+373' },
  { name: 'Monaco', code: 'MC', flag: '🇲🇨', dialCode: '+377' },
  { name: 'Mongolia', code: 'MN', flag: '🇲🇳', dialCode: '+976' },
  { name: 'Montenegro', code: 'ME', flag: '🇲🇪', dialCode: '+382' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', dialCode: '+212' },
  { name: 'Mozambique', code: 'MZ', flag: '🇲🇿', dialCode: '+258' },
  { name: 'Myanmar', code: 'MM', flag: '🇲🇲', dialCode: '+95' },
  { name: 'Namibia', code: 'NA', flag: '🇳🇦', dialCode: '+264' },
  { name: 'Nauru', code: 'NR', flag: '🇳🇷', dialCode: '+674' },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵', dialCode: '+977' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', dialCode: '+31' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', dialCode: '+64' },
  { name: 'Nicaragua', code: 'NI', flag: '🇳🇮', dialCode: '+505' },
  { name: 'Niger', code: 'NE', flag: '🇳🇪', dialCode: '+227' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', dialCode: '+234' },
  { name: 'North Korea', code: 'KP', flag: '🇰🇵', dialCode: '+850' },
  { name: 'North Macedonia', code: 'MK', flag: '🇲🇰', dialCode: '+389' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', dialCode: '+47' },
  { name: 'Oman', code: 'OM', flag: '🇴🇲', dialCode: '+968' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', dialCode: '+92' },
  { name: 'Palau', code: 'PW', flag: '🇵🇼', dialCode: '+680' },
  { name: 'Palestine', code: 'PS', flag: '🇵🇸', dialCode: '+970' },
  { name: 'Panama', code: 'PA', flag: '🇵🇦', dialCode: '+507' },
  { name: 'Papua New Guinea', code: 'PG', flag: '🇵🇬', dialCode: '+675' },
  { name: 'Paraguay', code: 'PY', flag: '🇵🇾', dialCode: '+595' },
  { name: 'Peru', code: 'PE', flag: '🇵🇪', dialCode: '+51' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', dialCode: '+63' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', dialCode: '+48' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', dialCode: '+351' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', dialCode: '+974' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴', dialCode: '+40' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', dialCode: '+7' },
  { name: 'Rwanda', code: 'RW', flag: '🇷🇼', dialCode: '+250' },
  { name: 'Saint Kitts and Nevis', code: 'KN', flag: '🇰🇳', dialCode: '+1869' },
  { name: 'Saint Lucia', code: 'LC', flag: '🇱🇨', dialCode: '+1758' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', flag: '🇻🇨', dialCode: '+1784' },
  { name: 'Samoa', code: 'WS', flag: '🇼🇸', dialCode: '+685' },
  { name: 'San Marino', code: 'SM', flag: '🇸🇲', dialCode: '+378' },
  { name: 'Sao Tome and Principe', code: 'ST', flag: '🇸🇹', dialCode: '+239' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', dialCode: '+966' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', dialCode: '+221' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', dialCode: '+381' },
  { name: 'Seychelles', code: 'SC', flag: '🇸🇨', dialCode: '+248' },
  { name: 'Sierra Leone', code: 'SL', flag: '🇸🇱', dialCode: '+232' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', dialCode: '+65' },
  { name: 'Slovakia', code: 'SK', flag: '🇸🇰', dialCode: '+421' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮', dialCode: '+386' },
  { name: 'Solomon Islands', code: 'SB', flag: '🇸🇧', dialCode: '+677' },
  { name: 'Somalia', code: 'SO', flag: '🇸🇴', dialCode: '+252' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', dialCode: '+27' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', dialCode: '+82' },
  { name: 'South Sudan', code: 'SS', flag: '🇸🇸', dialCode: '+211' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', dialCode: '+34' },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', dialCode: '+94' },
  { name: 'Sudan', code: 'SD', flag: '🇸🇩', dialCode: '+249' },
  { name: 'Suriname', code: 'SR', flag: '🇸🇷', dialCode: '+597' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', dialCode: '+46' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', dialCode: '+41' },
  { name: 'Syria', code: 'SY', flag: '🇸🇾', dialCode: '+963' },
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼', dialCode: '+886' },
  { name: 'Tajikistan', code: 'TJ', flag: '🇹🇯', dialCode: '+992' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', dialCode: '+255' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', dialCode: '+66' },
  { name: 'Timor-Leste', code: 'TL', flag: '🇹🇱', dialCode: '+670' },
  { name: 'Togo', code: 'TG', flag: '🇹🇬', dialCode: '+228' },
  { name: 'Tonga', code: 'TO', flag: '🇹🇴', dialCode: '+676' },
  { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹', dialCode: '+1868' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', dialCode: '+216' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', dialCode: '+90' },
  { name: 'Turkmenistan', code: 'TM', flag: '🇹🇲', dialCode: '+993' },
  { name: 'Tuvalu', code: 'TV', flag: '🇹🇻', dialCode: '+688' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', dialCode: '+256' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', dialCode: '+380' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', dialCode: '+971' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
  { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', dialCode: '+598' },
  { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', dialCode: '+998' },
  { name: 'Vanuatu', code: 'VU', flag: '🇻🇺', dialCode: '+678' },
  { name: 'Vatican City', code: 'VA', flag: '🇻🇦', dialCode: '+39' },
  { name: 'Venezuela', code: 'VE', flag: '🇻🇪', dialCode: '+58' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', dialCode: '+84' },
  { name: 'Yemen', code: 'YE', flag: '🇾🇪', dialCode: '+967' },
  { name: 'Zambia', code: 'ZM', flag: '🇿🇲', dialCode: '+260' },
  { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', dialCode: '+263' }
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
    countries.find(c => c.dialCode === defaultCountry) || countries.find(c => c.dialCode === '+91') || countries[0]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Update selected country when defaultCountry changes
  useEffect(() => {
    const country = countries.find(c => c.dialCode === defaultCountry) || countries.find(c => c.dialCode === '+91')
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
    setSearchQuery('') // Clear search when country is selected
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

  // Filter countries based on search query
  const filteredCountries = searchQuery
    ? countries.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.dialCode.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries

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
              flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              border-slate-300 dark:border-slate-600
              min-w-[85px] sm:min-w-[100px] justify-between
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}
              transition-all text-xs sm:text-sm
              ${inputClassName || ''}
            `}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-base sm:text-lg">{selectedCountry.flag}</span>
              <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{selectedCountry.dialCode}</span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-72 max-h-96 overflow-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
              {/* Search input for countries */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 p-2 border-b border-slate-300 dark:border-slate-600 z-10">
                <input
                  type="text"
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="py-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
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
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No countries found
                  </div>
                )}
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
            flex-1 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg border 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            border-slate-300 dark:border-slate-600
            text-sm sm:text-base
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

