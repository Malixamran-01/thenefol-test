import React, { useEffect, useState } from 'react'
import { Mail, MessageSquare, Save, Send, CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function AlertSettings() {
  const [cfg, setCfg] = useState<any>({ whatsapp_token: '', whatsapp_phone_id: '', notify_phone: '', smtp_provider: 'gmail', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', notify_email: '', from_email: '' })
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('Hello from Nefol Admin!')
  const [testTo, setTestTo] = useState('')
  const [testSubject, setTestSubject] = useState('Test Email from Nefol')
  const [testBody, setTestBody] = useState('This is a test email.')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState({ email: false, whatsapp: false })
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/alerts/config')
      const data = await res.json()
      if (data?.data) setCfg({ ...cfg, ...data.data })
    } catch {}
  }
  useEffect(()=>{ load() }, [])

  const handleProviderChange = (provider: string) => {
    const defaults: any = {
      gmail: { smtp_host: '', smtp_port: 587 },
      hostinger: { smtp_host: 'smtp.hostinger.com', smtp_port: 587 },
      godaddy: { smtp_host: 'smtpout.secureserver.net', smtp_port: 587 },
      custom: { smtp_host: '', smtp_port: 587 }
    }
    setCfg({ ...cfg, smtp_provider: provider, ...defaults[provider] })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/alerts/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
      const data = await res.json()
      if (!res.ok) {
        setTestResult({ type: 'save', success: false, message: data?.error || 'Failed to save' })
        return
      }
      setTestResult({ type: 'save', success: true, message: 'Settings saved successfully!' })
      setTimeout(() => setTestResult(null), 3000)
    } catch (error: any) {
      setTestResult({ type: 'save', success: false, message: error.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const testWhatsApp = async () => {
    if (!testPhone) {
      setTestResult({ type: 'whatsapp', success: false, message: 'Please enter a phone number' })
      return
    }
    setTesting({ ...testing, whatsapp: true })
    try {
      const res = await fetch('/api/alerts/test/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_number: testPhone, message: testMsg }) })
      const data = await res.json()
      if (!res.ok) {
        setTestResult({ type: 'whatsapp', success: false, message: data?.error || 'Failed to send' })
        return
      }
      setTestResult({ type: 'whatsapp', success: true, message: 'WhatsApp message sent successfully!' })
    } catch (error: any) {
      setTestResult({ type: 'whatsapp', success: false, message: error.message || 'Failed to send' })
    } finally {
      setTesting({ ...testing, whatsapp: false })
    }
  }

  const testEmail = async () => {
    if (!testTo) {
      setTestResult({ type: 'email', success: false, message: 'Please enter recipient email' })
      return
    }
    setTesting({ ...testing, email: true })
    try {
      const res = await fetch('/api/alerts/test/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo, subject: testSubject, text: testBody }) })
      const data = await res.json()
      if (!res.ok) {
        setTestResult({ type: 'email', success: false, message: data?.error || 'Failed to send' })
        return
      }
      setTestResult({ type: 'email', success: true, message: 'Email sent successfully!' })
    } catch (error: any) {
      setTestResult({ type: 'email', success: false, message: error.message || 'Failed to send' })
    } finally {
      setTesting({ ...testing, email: false })
    }
  }

  const getProviderInfo = (provider: string) => {
    const info: any = {
      gmail: {
        title: 'Gmail SMTP Configuration',
        description: 'Use your Gmail account to send emails. You need to generate an App Password.',
        instructions: [
          '1. Go to your Google Account settings',
          '2. Enable 2-Step Verification',
          '3. Generate an App Password for "Mail"',
          '4. Use your Gmail address and the App Password below'
        ],
        host: 'Automatically configured',
        port: '587 (TLS)'
      },
      hostinger: {
        title: 'Hostinger SMTP Configuration',
        description: 'Use your Hostinger email account to send emails.',
        instructions: [
          '1. Log in to your Hostinger control panel',
          '2. Go to Email section',
          '3. Use your full email address (e.g., noreply@yourdomain.com)',
          '4. Use your email account password'
        ],
        host: 'smtp.hostinger.com',
        port: '587 (TLS)'
      },
      godaddy: {
        title: 'GoDaddy SMTP Configuration',
        description: 'Use your GoDaddy email account to send emails.',
        instructions: [
          '1. Log in to your GoDaddy account',
          '2. Go to Email & Office Dashboard',
          '3. Use your full email address (e.g., noreply@yourdomain.com)',
          '4. Use your email account password'
        ],
        host: 'smtpout.secureserver.net',
        port: '587 (TLS)'
      },
      custom: {
        title: 'Custom SMTP Configuration',
        description: 'Configure your own SMTP server settings.',
        instructions: [
          '1. Enter your SMTP server hostname',
          '2. Enter the SMTP port (usually 587 for TLS, 465 for SSL)',
          '3. Enter your SMTP username and password',
          '4. Test the connection before saving'
        ],
        host: 'Your SMTP server',
        port: '587 or 465'
      }
    }
    return info[provider] || info.custom
  }

  const providerInfo = getProviderInfo(cfg.smtp_provider || 'gmail')

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Email & WhatsApp Settings
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Configure notification and alert settings
          </p>
        </div>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          testResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {testResult.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Email Marketing Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Email Marketing Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email Provider
            </label>
            <select 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              value={cfg.smtp_provider||'gmail'} 
              onChange={e=>handleProviderChange(e.target.value)}
            >
              <option value="gmail">Gmail</option>
              <option value="hostinger">Hostinger</option>
              <option value="godaddy">GoDaddy</option>
              <option value="custom">Custom SMTP</option>
            </select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-2 mb-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">{providerInfo.title}</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">{providerInfo.description}</p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  {providerInfo.instructions.map((inst: string, idx: number) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
                <div className="mt-3 text-sm">
                  <span className="font-medium">SMTP Host:</span> <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{providerInfo.host}</code>
                  {' '}
                  <span className="font-medium ml-3">Port:</span> <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{providerInfo.port}</code>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SMTP Host {cfg.smtp_provider !== 'gmail' && <span className="text-red-500">*</span>}
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                placeholder={providerInfo.host}
                value={cfg.smtp_host||''} 
                onChange={e=>setCfg({ ...cfg, smtp_host: e.target.value })}
                disabled={cfg.smtp_provider === 'gmail'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SMTP Port {cfg.smtp_provider !== 'gmail' && <span className="text-red-500">*</span>}
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                type="number" 
                placeholder={providerInfo.port}
                value={cfg.smtp_port||587} 
                onChange={e=>setCfg({ ...cfg, smtp_port: Number(e.target.value) })}
                disabled={cfg.smtp_provider === 'gmail'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SMTP Username/Email <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                placeholder="your-email@domain.com"
                value={cfg.smtp_user||''} 
                onChange={e=>setCfg({ ...cfg, smtp_user: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SMTP Password/App Password <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                type="password" 
                placeholder="Enter password"
                value={cfg.smtp_pass||''} 
                onChange={e=>setCfg({ ...cfg, smtp_pass: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                From Email Address
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                placeholder="noreply@yourdomain.com"
                value={cfg.from_email||''} 
                onChange={e=>setCfg({ ...cfg, from_email: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notification Email (for alerts)
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                placeholder="admin@yourdomain.com"
                value={cfg.notify_email||''} 
                onChange={e=>setCfg({ ...cfg, notify_email: e.target.value })} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">WhatsApp Configuration (Meta Cloud API)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">WhatsApp Phone ID</label>
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="WhatsApp Phone ID"
              value={cfg.whatsapp_phone_id||''} 
              onChange={e=>setCfg({ ...cfg, whatsapp_phone_id: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Access Token</label>
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              type="password"
              placeholder="Access Token"
              value={cfg.whatsapp_token||''} 
              onChange={e=>setCfg({ ...cfg, whatsapp_token: e.target.value })} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Notify Phone (with country code)</label>
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="+1234567890"
              value={cfg.notify_phone||''} 
              onChange={e=>setCfg({ ...cfg, notify_phone: e.target.value })} 
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Test Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Test Email</span>
          </h3>
          <div className="space-y-3">
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Recipient Email"
              value={testTo} 
              onChange={e=>setTestTo(e.target.value)} 
            />
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Subject"
              value={testSubject} 
              onChange={e=>setTestSubject(e.target.value)} 
            />
            <textarea 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Email Body"
              rows={3}
              value={testBody} 
              onChange={e=>setTestBody(e.target.value)} 
            />
            <button 
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              onClick={testEmail}
              disabled={testing.email}
            >
              <Send className="h-4 w-4" />
              <span>{testing.email ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Test WhatsApp</span>
          </h3>
          <div className="space-y-3">
            <input 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Phone with country code (+1234567890)"
              value={testPhone} 
              onChange={e=>setTestPhone(e.target.value)} 
            />
            <textarea 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Message"
              rows={4}
              value={testMsg} 
              onChange={e=>setTestMsg(e.target.value)} 
            />
            <button 
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              onClick={testWhatsApp}
              disabled={testing.whatsapp}
            >
              <Send className="h-4 w-4" />
              <span>{testing.whatsapp ? 'Sending...' : 'Send Test WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


