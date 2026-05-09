import { useState, useEffect } from 'react'
import CallDetail from './CallDetail'
import './CallLogs.css'

const API_URL = '/api'

function CallLogs() {
  const [logs, setLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredLogs, setFilteredLogs] = useState([])
  const [selectedCallId, setSelectedCallId] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = logs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredLogs(filtered)
    } else {
      setFilteredLogs(logs)
    }
  }, [searchTerm, logs])

  const loadLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/call-logs?limit=50`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const exportLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/call-logs?limit=1000`)
      const data = await response.json()

      const jsonStr = JSON.stringify(data.logs, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `call-logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Logs exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export logs')
    }
  }

  return (
    <div className="call-logs">
      <h2>Call Logs</h2>

      <div className="logs-controls">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search logs..."
          className="search-input"
        />
        <button className="btn btn-secondary" onClick={exportLogs}>
          📥 Export
        </button>
      </div>

      <div className="logs-list">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">No call logs found</div>
        ) : (
          filteredLogs.map(log => (
            <div 
              key={log.id} 
              className="log-item"
              onClick={() => setSelectedCallId(log.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="log-header">
                <span className="log-id">#{log.id}</span>
                <span className="log-date">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div className="log-content">
                <p><strong>Query:</strong> {
                  log.transcript && log.transcript.length > 0 
                    ? log.transcript[0].content 
                    : (log.query || 'N/A')
                }</p>
                <p><strong>Response:</strong> {
                  log.transcript && log.transcript.length > 1 
                    ? log.transcript[1].content.substring(0, 150) + '...'
                    : ((log.response || 'N/A').substring(0, 150) + '...')
                }</p>
                <p>
                  <strong>Duration:</strong> {log.duration || log.duration_seconds || 0}s | 
                  <strong> Language:</strong> {log.language || 'en'}
                </p>
              </div>
              <div className="log-footer">
                <span className="view-details">Click to view details →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Call Detail Modal */}
      {selectedCallId && (
        <CallDetail 
          callId={selectedCallId} 
          onClose={() => setSelectedCallId(null)} 
        />
      )}
    </div>
  )
}

export default CallLogs
