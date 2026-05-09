import { useState, useEffect } from 'react'
import './Analytics.css'

const API_URL = '/api'

function Analytics() {
  const [stats, setStats] = useState(null)
  const [popularQueries, setPopularQueries] = useState([])
  const [hourlyDistribution, setHourlyDistribution] = useState({})
  const [timeRange, setTimeRange] = useState(7) // days
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/analytics/calls?days=${timeRange}`)
      const data = await response.json()

      if (data.stats) setStats(data.stats)
      if (data.popular_queries) setPopularQueries(data.popular_queries)
      if (data.hourly_distribution) setHourlyDistribution(data.hourly_distribution)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/call-logs?limit=1000`)
      const data = await response.json()
      
      if (!data.logs || data.logs.length === 0) {
        alert('No data to export')
        return
      }

      // Convert to CSV
      const headers = ['ID', 'Date', 'Query', 'Response', 'Duration (s)', 'Language', 'Sentiment']
      const rows = data.logs.map(log => [
        log.id,
        new Date(log.created_at).toLocaleString(),
        (log.query || '').replace(/,/g, ';'),
        (log.response || '').substring(0, 100).replace(/,/g, ';'),
        log.duration_seconds || 0,
        log.language || 'en',
        log.sentiment || 'neutral'
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Analytics exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export analytics')
    }
  }

  const maxCalls = Math.max(...Object.values(hourlyDistribution), 1)

  // Calculate sentiment breakdown
  const sentimentData = stats ? {
    positive: Math.round((stats.positive_calls || 0) / (stats.total_calls || 1) * 100),
    neutral: Math.round((stats.neutral_calls || 0) / (stats.total_calls || 1) * 100),
    negative: Math.round((stats.negative_calls || 0) / (stats.total_calls || 1) * 100)
  } : { positive: 0, neutral: 0, negative: 0 }

  // Calculate resolution rate
  const resolutionRate = stats ? Math.round((stats.resolved_calls || 0) / (stats.total_calls || 1) * 100) : 0

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="analytics-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={1}>Last 24 Hours</option>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading analytics...</div>
      ) : (
        <>
          {/* Key Metrics */}
          {stats && (
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-icon">📞</div>
                <div className="metric-content">
                  <span className="metric-label">Total Calls</span>
                  <span className="metric-value">{stats.total_calls || 0}</span>
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-icon">⏱️</div>
                <div className="metric-content">
                  <span className="metric-label">Avg Duration</span>
                  <span className="metric-value">{stats.avg_duration_seconds || 0}s</span>
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <span className="metric-label">Resolution Rate</span>
                  <span className="metric-value">{resolutionRate}%</span>
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-icon">😊</div>
                <div className="metric-content">
                  <span className="metric-label">Positive Sentiment</span>
                  <span className="metric-value">{sentimentData.positive}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Sentiment Breakdown */}
          <div className="chart-section">
            <h3>Sentiment Distribution</h3>
            <div className="sentiment-chart">
              <div className="sentiment-bar">
                <div 
                  className="sentiment-segment positive" 
                  style={{ width: `${sentimentData.positive}%` }}
                  title={`Positive: ${sentimentData.positive}%`}
                >
                  {sentimentData.positive > 10 && `${sentimentData.positive}%`}
                </div>
                <div 
                  className="sentiment-segment neutral" 
                  style={{ width: `${sentimentData.neutral}%` }}
                  title={`Neutral: ${sentimentData.neutral}%`}
                >
                  {sentimentData.neutral > 10 && `${sentimentData.neutral}%`}
                </div>
                <div 
                  className="sentiment-segment negative" 
                  style={{ width: `${sentimentData.negative}%` }}
                  title={`Negative: ${sentimentData.negative}%`}
                >
                  {sentimentData.negative > 10 && `${sentimentData.negative}%`}
                </div>
              </div>
              <div className="sentiment-legend">
                <div className="legend-item">
                  <span className="legend-color positive"></span>
                  <span>Positive ({sentimentData.positive}%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color neutral"></span>
                  <span>Neutral ({sentimentData.neutral}%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color negative"></span>
                  <span>Negative ({sentimentData.negative}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Queries */}
          <div className="chart-section">
            <h3>Top 5 Common Queries</h3>
            <div className="popular-queries">
              {popularQueries.length === 0 ? (
                <div className="empty-state">No queries yet</div>
              ) : (
                popularQueries.slice(0, 5).map((q, i) => (
                  <div key={i} className="query-item">
                    <span className="query-rank">#{i + 1}</span>
                    <span className="query-text">{q.query}</span>
                    <span className="query-count">{q.frequency}x</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="chart-section">
            <h3>Call Volume by Hour</h3>
            <div className="hourly-chart">
              {Object.keys(hourlyDistribution).length === 0 ? (
                <div className="empty-state">No hourly data available</div>
              ) : (
                Object.entries(hourlyDistribution).map(([hour, count]) => {
                  const height = (count / maxCalls) * 100
                  return (
                    <div key={hour} className="chart-bar-container">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${hour}:00 - ${count} calls`}
                      >
                        <span className="bar-count">{count}</span>
                      </div>
                      <span className="bar-label">{hour}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Analytics
