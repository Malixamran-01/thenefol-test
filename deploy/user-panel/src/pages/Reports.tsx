import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Calendar, TrendingUp, DollarSign, Users, BarChart3, PieChart, FileText } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

interface ReportData {
  id: string
  name: string
  type: 'earnings' | 'referrals' | 'performance' | 'monthly'
  description: string
  lastGenerated: string
  size: string
  format: 'PDF' | 'CSV' | 'Excel'
}

interface ReportStats {
  totalReports: number
  thisMonthReports: number
  totalDownloads: number
  lastReportDate: string
}

export default function Reports() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | '90days' | '1year'>('30days')
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setReports([])
        setStats(null)
        return
      }

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/affiliate/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
        
        // Calculate stats from real data
        const totalReports = data.reports?.length || 0
        const thisMonthReports = data.reports?.filter((r: any) => {
          const reportDate = new Date(r.lastGenerated)
          const currentDate = new Date()
          return reportDate.getMonth() === currentDate.getMonth() && 
                 reportDate.getFullYear() === currentDate.getFullYear()
        }).length || 0
        
        const totalDownloads = data.reports?.reduce((sum: number, r: any) => sum + (r.downloads || 0), 0) || 0
        const lastReportDate = data.reports?.length > 0 ? data.reports[0].lastGenerated : null
        
        setStats({
          totalReports,
          thisMonthReports,
          totalDownloads,
          lastReportDate
        })
      } else {
        console.error('Failed to fetch reports')
        setReports([])
        setStats(null)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      setReports([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: string) => {
    setGeneratingReport(reportType)
    
    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(null)
      alert(`${reportType} report generated successfully!`)
    }, 2000)
  }

  const downloadReport = (reportId: string, reportName: string) => {
    // Simulate download
    alert(`Downloading ${reportName}...`)
  }

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'earnings':
        return <DollarSign className="h-6 w-6 text-green-600" />
      case 'referrals':
        return <Users className="h-6 w-6 text-blue-600" />
      case 'performance':
        return <TrendingUp className="h-6 w-6 text-purple-600" />
      case 'monthly':
        return <Calendar className="h-6 w-6 text-orange-600" />
      default:
        return <FileText className="h-6 w-6 text-gray-600" />
    }
  }

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'earnings':
        return 'Earnings Report'
      case 'referrals':
        return 'Referral Report'
      case 'performance':
        return 'Performance Report'
      case 'monthly':
        return 'Monthly Report'
      default:
        return 'Report'
    }
  }

  if (loading) {
    return (
      <main className="py-10 dark:bg-slate-900 min-h-screen flex items-center justify-center">
      </main>
    )
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.location.hash = '#/user/affiliate-partner'}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Affiliate Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Reports & Analytics</h1>
              <p className="text-slate-600 dark:text-slate-400">Generate and download detailed reports about your affiliate performance</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalReports}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">This Month</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.thisMonthReports}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Downloads</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.totalDownloads}</p>
                </div>
                <Download className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Last Report</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {new Date(stats.lastReportDate).toLocaleDateString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        )}

        {/* Generate New Report */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold dark:text-slate-100 mb-4">Generate New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => generateReport('earnings')}
              disabled={generatingReport === 'earnings'}
              className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <DollarSign className="h-8 w-8 text-green-600 mb-2" />
              <span className="font-medium dark:text-slate-100">Earnings Report</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">Commission details</span>
              {generatingReport === 'earnings' && (
                <div className="mt-2"></div>
              )}
            </button>
            <button
              onClick={() => generateReport('referrals')}
              disabled={generatingReport === 'referrals'}
              className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <span className="font-medium dark:text-slate-100">Referral Report</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">Referral analytics</span>
              {generatingReport === 'referrals' && (
                <div className="mt-2"></div>
              )}
            </button>
            <button
              onClick={() => generateReport('performance')}
              disabled={generatingReport === 'performance'}
              className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <span className="font-medium dark:text-slate-100">Performance Report</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">Performance metrics</span>
              {generatingReport === 'performance' && (
                <div className="mt-2"></div>
              )}
            </button>
            <button
              onClick={() => generateReport('monthly')}
              disabled={generatingReport === 'monthly'}
              className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Calendar className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium dark:text-slate-100">Monthly Summary</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">Monthly overview</span>
              {generatingReport === 'monthly' && (
                <div className="mt-2"></div>
              )}
            </button>
          </div>
        </div>

        {/* Available Reports */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold dark:text-slate-100">Available Reports</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as '7days' | '30days' | '90days' | '1year')}
                className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-4">
                  {getReportIcon(report.type)}
                  <div>
                    <h3 className="font-semibold dark:text-slate-100">{report.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{report.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        Generated: {new Date(report.lastGenerated).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        Size: {report.size}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        Format: {report.format}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.format === 'PDF' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    report.format === 'CSV' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {report.format}
                  </span>
                  <button
                    onClick={() => downloadReport(report.id, report.name)}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold dark:text-slate-100 mb-2">No Reports Available</h3>
              <p className="text-slate-600 dark:text-slate-400">Generate your first report to get started</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
