import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Trash2, Edit, Check } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import PhoneInput from '../components/PhoneInput'

interface Address {
  id: number
  name?: string
  phone: string
  country: string
  street: string
  area?: string
  landmark?: string
  city: string
  state: string
  zip: string
  address_type?: 'house' | 'apartment' | 'business' | 'other'
  address_label?: string
  is_default: boolean
  delivery_instructions?: string
  weekend_delivery?: {
    saturday: boolean
    sunday: boolean
  }
  is_house_type?: boolean
}

export default function ManageAddress() {
  const { isAuthenticated } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editAddress, setEditAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    country: 'India',
    zip: '',
    street: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    address_type: 'house' as 'house' | 'apartment' | 'business' | 'other',
    address_label: '',
    is_default: false,
    delivery_instructions: '',
    weekend_delivery: {
      saturday: false,
      sunday: false
    },
    is_house_type: false
  })
  const [countryCode, setCountryCode] = useState('+91')

  // Countries/Regions with country codes
  const countries = [
    { name: 'India', code: '+91' },
    { name: 'United States', code: '+1' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'Canada', code: '+1' },
    { name: 'Australia', code: '+61' },
    { name: 'Germany', code: '+49' },
    { name: 'France', code: '+33' },
    { name: 'Japan', code: '+81' },
    { name: 'China', code: '+86' },
    { name: 'Singapore', code: '+65' },
    { name: 'UAE', code: '+971' },
    { name: 'Pakistan', code: '+92' },
    { name: 'Bangladesh', code: '+880' },
    { name: 'Sri Lanka', code: '+94' },
    { name: 'Nepal', code: '+977' }
  ]

  // Indian States List
  const indianStates = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ]

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Update country code when country changes
  useEffect(() => {
    const selectedCountry = countries.find(c => c.name === addressForm.country)
    if (selectedCountry) {
      setCountryCode(selectedCountry.code)
    }
  }, [addressForm.country])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const addressesData = await api.user.getAddresses()
      // Parse weekend_delivery if it's a string
      const parsedAddresses = addressesData.map((addr: any) => ({
        ...addr,
        weekend_delivery: typeof addr.weekend_delivery === 'string' 
          ? JSON.parse(addr.weekend_delivery || '{}') 
          : addr.weekend_delivery || { saturday: false, sunday: false }
      }))
      setAddresses(parsedAddresses)
    } catch (error) {
      console.error('Failed to fetch addresses:', error)
      setAddresses([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await api.user.createAddress({
        name: addressForm.name,
        phone: `${countryCode}${addressForm.phone.replace(/\D/g, '')}`,
        street: addressForm.street,
        area: addressForm.area,
        landmark: addressForm.landmark,
        city: addressForm.city,
        state: addressForm.state,
        zip: addressForm.zip,
        country: addressForm.country,
        address_type: addressForm.address_type,
        address_label: addressForm.address_type === 'other' ? addressForm.address_label : undefined,
        is_default: addressForm.is_default,
        delivery_instructions: addressForm.delivery_instructions,
        weekend_delivery: addressForm.weekend_delivery,
        is_house_type: addressForm.is_house_type
      })
      
      await fetchAddresses()
      setShowAddForm(false)
      setAddressForm({
        name: '',
        phone: '',
        country: 'India',
        zip: '',
        street: '',
        area: '',
        landmark: '',
        city: '',
        state: '',
        address_type: 'house',
        address_label: '',
        is_default: false,
        delivery_instructions: '',
        weekend_delivery: {
          saturday: false,
          sunday: false
        },
        is_house_type: false
      })
      alert('Address added successfully!')
    } catch (error: any) {
      console.error('Failed to add address:', error)
      const errorMessage = error.message || 'Failed to add address. Please try again.'
      if (errorMessage.includes('Maximum 5 addresses')) {
        alert('You can only save up to 5 addresses. Please delete an existing address first.')
      } else {
        alert(errorMessage)
      }
    }
  }

  const handleEditAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editAddress) return
    
    try {
      await api.user.updateAddress(editAddress.id, {
        name: addressForm.name,
        phone: `${countryCode}${addressForm.phone.replace(/\D/g, '')}`,
        street: addressForm.street,
        area: addressForm.area,
        landmark: addressForm.landmark,
        city: addressForm.city,
        state: addressForm.state,
        zip: addressForm.zip,
        country: addressForm.country,
        address_type: addressForm.address_type,
        address_label: addressForm.address_type === 'other' ? addressForm.address_label : undefined,
        is_default: addressForm.is_default,
        delivery_instructions: addressForm.delivery_instructions,
        weekend_delivery: addressForm.weekend_delivery,
        is_house_type: addressForm.is_house_type
      })
      
      await fetchAddresses()
      setEditAddress(null)
      setShowAddForm(false)
      setAddressForm({
        name: '',
        phone: '',
        country: 'India',
        zip: '',
        street: '',
        area: '',
        landmark: '',
        city: '',
        state: '',
        address_type: 'house',
        address_label: '',
        is_default: false,
        delivery_instructions: '',
        weekend_delivery: {
          saturday: false,
          sunday: false
        },
        is_house_type: false
      })
      alert('Address updated successfully!')
    } catch (error) {
      console.error('Failed to update address:', error)
      alert('Failed to update address. Please try again.')
    }
  }

  const handleDelete = async (addressId: number) => {
    if (confirm('Are you sure you want to delete this address?')) {
      try {
        await api.user.deleteAddress(addressId)
        await fetchAddresses()
        alert('Address deleted successfully!')
      } catch (error) {
        console.error('Failed to delete address:', error)
        alert('Failed to delete address. Please try again.')
      }
    }
  }

  const handleSetDefault = async (addressId: number) => {
    try {
      await api.user.setDefaultAddress(addressId)
      await fetchAddresses()
      alert('Default address updated successfully!')
    } catch (error) {
      console.error('Failed to set default address:', error)
      alert('Failed to set default address. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">Loading your addresses...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Manage Address
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Manage your delivery addresses
          </p>
        </div>

        {/* Add Address Button */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setEditAddress(null)
              setAddressForm({
                name: '',
                phone: '',
                country: 'India',
                zip: '',
                street: '',
                area: '',
                landmark: '',
                city: '',
                state: '',
                address_type: 'house',
                address_label: '',
                is_default: false,
                delivery_instructions: '',
                weekend_delivery: {
                  saturday: false,
                  sunday: false
                },
                is_house_type: false
              })
            }}
            disabled={addresses.length >= 5}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
          {addresses.length >= 5 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Maximum 5 addresses reached. Delete an address to add a new one.
            </p>
          )}
        </div>

        {/* Add/Edit Address Form */}
        {(showAddForm || editAddress) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {editAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Fields marked with <span className="text-red-500 font-semibold">*</span> are required
              </p>
            </div>
            <form onSubmit={editAddress ? handleEditAddress : handleAddAddress} className="space-y-6">
              {/* Country/Region */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Country/Region <span className="text-red-500">*</span>
                </label>
                <select
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  required
                >
                  {countries.map((country) => (
                    <option key={country.name} value={country.name}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Full name (First and Last name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div>
                <PhoneInput
                  value={addressForm.phone}
                  onChange={(value) => setAddressForm({ ...addressForm, phone: value })}
                  onCountryCodeChange={setCountryCode}
                  defaultCountry={countryCode}
                  placeholder="Enter phone number"
                  required
                  showLabel
                  label="Mobile number"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.zip}
                  onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="123456"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">6 digits [0-9] PIN code</p>
              </div>

              {/* Flat, House no., Building, Company, Apartment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Flat, House no., Building, Company, Apartment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="House/Flat No., Building Name"
                  required
                />
              </div>

              {/* Area, Street, Sector, Village */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Area, Street, Sector, Village
                </label>
                <input
                  type="text"
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Area, Street, Sector, Village"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Landmark
                </label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="E.g. near apollo hospital"
                />
              </div>

              {/* Town/City */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Town/City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="City"
                  required
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  required
                >
                  <option value="">Choose a state</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Make this my default address */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Make this my default address
                </label>
              </div>

              {/* Delivery instructions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Delivery instructions (optional)
                </label>
                <textarea
                  value={addressForm.delivery_instructions}
                  onChange={(e) => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  rows={3}
                  placeholder="Add preferences, notes, access codes and more"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your instructions help us deliver your packages to your expectations and will be used when possible.
                </p>
              </div>

              {/* Address Type */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Address Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'house', label: 'House' },
                    { value: 'apartment', label: 'Apartment' },
                    { value: 'business', label: 'Business' },
                    { value: 'other', label: 'Other' }
                  ].map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="address_type"
                        value={type.value}
                        checked={addressForm.address_type === type.value}
                        onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value as 'house' | 'apartment' | 'business' | 'other', address_label: '' })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{type.label}</span>
                    </label>
                  ))}
                </div>
                {addressForm.address_type === 'house' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Independent house, villa, or builder floor (6 AM - 11 PM delivery)
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_house_type"
                        checked={addressForm.is_house_type}
                        onChange={(e) => setAddressForm({ ...addressForm, is_house_type: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_house_type" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        Confirm this is an independent house, villa, or builder floor
                      </label>
                    </div>
                  </div>
                )}
                {addressForm.address_type === 'other' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Address Name/Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressForm.address_label}
                      onChange={(e) => setAddressForm({ ...addressForm, address_label: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder="E.g. Friend's House, Relative's Place, etc."
                      required={addressForm.address_type === 'other'}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Please mention a name for this address to help identify it
                    </p>
                  </div>
                )}
              </div>

              {/* Weekend Delivery */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Can you receive deliveries at this address on weekends?
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700 dark:text-slate-300">Saturdays</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="saturday"
                          checked={addressForm.weekend_delivery.saturday === false}
                          onChange={() => setAddressForm({ 
                            ...addressForm, 
                            weekend_delivery: { ...addressForm.weekend_delivery, saturday: false } 
                          })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="saturday"
                          checked={addressForm.weekend_delivery.saturday === true}
                          onChange={() => setAddressForm({ 
                            ...addressForm, 
                            weekend_delivery: { ...addressForm.weekend_delivery, saturday: true } 
                          })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700 dark:text-slate-300">Sundays</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sunday"
                          checked={addressForm.weekend_delivery.sunday === false}
                          onChange={() => setAddressForm({ 
                            ...addressForm, 
                            weekend_delivery: { ...addressForm.weekend_delivery, sunday: false } 
                          })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sunday"
                          checked={addressForm.weekend_delivery.sunday === true}
                          onChange={() => setAddressForm({ 
                            ...addressForm, 
                            weekend_delivery: { ...addressForm.weekend_delivery, sunday: true } 
                          })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Instructions */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Do we need additional instructions to deliver to this address?
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Your instructions help us deliver your packages to your expectations and will be used when possible.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editAddress ? 'Update' : 'Save'} Address
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditAddress(null)
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Addresses Saved
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Add an address to make checkout faster
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {address.is_default && (
                      <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full mb-3">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Default</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {address.name && (
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {address.name}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {address.address_type && (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                            {address.address_type === 'other' && address.address_label ? address.address_label : address.address_type}
                          </span>
                        )}
                        {!address.is_default && (
                          <button
                            onClick={() => handleSetDefault(address.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 space-y-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {address.street}
                        </p>
                        {address.area && (
                          <p>{address.area}</p>
                        )}
                        {address.landmark && (
                          <p className="text-sm italic">Near {address.landmark}</p>
                        )}
                        <p>{address.city}, {address.state} - {address.zip}</p>
                      </div>
                      {address.phone && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Phone:</span> {address.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditAddress(address)
                        // Extract country code from phone if present
                        let phoneNumber = address.phone || ''
                        let extractedCountryCode = '+91' // default
                        for (const country of countries) {
                          if (phoneNumber.startsWith(country.code)) {
                            extractedCountryCode = country.code
                            phoneNumber = phoneNumber.replace(country.code, '').trim().replace(/\D/g, '')
                            break
                          }
                        }
                        setCountryCode(extractedCountryCode)
                        setAddressForm({
                          name: address.name || '',
                          phone: phoneNumber,
                          country: address.country || 'India',
                          zip: address.zip,
                          street: address.street,
                          area: address.area || '',
                          landmark: address.landmark || '',
                          city: address.city,
                          state: address.state,
                          address_type: address.address_type || 'house',
                          address_label: address.address_label || '',
                          is_default: address.is_default,
                          delivery_instructions: address.delivery_instructions || '',
                          weekend_delivery: address.weekend_delivery || { saturday: false, sunday: false },
                          is_house_type: address.is_house_type || false
                        })
                        setShowAddForm(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {!address.is_default && (
                      <button
                        onClick={() => handleDelete(address.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

