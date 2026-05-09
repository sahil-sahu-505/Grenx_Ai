import { useState, useEffect } from 'react'
import './CallDetail.css'

function CallDetail({ callId, onClose }) {
  const [call, setCall] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (callId) {
      loadCallDetail()
    }
  }, [callId])

  const loadCallDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/call-logs/${callId}`)
      const data = await response.json()
      setCall(data)
    } catch (error) {
      console.error('Failed to load call detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const flagForReview = async () => {
    try {
      await fetch(`/api/call-logs/${callId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: true })
      })
      alert('Call flagged for review')
      loadCallDetail()
    } catch (error) {
      console.error('Failed to flag call:', error)
      alert('Failed to flag call')
    }
  }

  if (!callId) return null

  return (
    <div className="call-detail-overlay" onClick={onClose}>
      <div className="call-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Call Details #{callId}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : call ? (
          <div className="modal-content">
            {/* Call Info */}
            <div className="call-info-section">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Date & Time</span>
                  <span className="value">{new Date(call.created_at).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Duration</span>
                  <span className="value">{call.duration || call.duration_seconds || 0}s</span>
                </div>
                <div className="info-item">
                  <span className="label">Language</span>
                  <span className="value">{call.language || 'en-IN'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Phone Number</span>
                  <span className="value">{call.phone_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Sentiment & Resolution */}
            <div className="metrics-section">
              <div className="metric-card">
                <span className="metric-label">Sentiment</span>
                <span className={`sentiment-badge ${call.sentiment || 'neutral'}`}>
                  {call.sentiment || 'neutral'}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Resolution</span>
                <span className={`resolution-badge ${call.resolved ? 'resolved' : 'unresolved'}`}>
                  {call.resolved ? 'Resolved' : 'Unresolved'}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Confidence</span>
                <span className="confidence-value">{call.confidence_score || 'N/A'}</span>
              </div>
            </div>

            {/* Transcript */}
            <div className="transcript-section">
              <h3>Conversation Transcript</h3>
              <div className="transcript-messages">
                {call.transcript && call.transcript.length > 0 ? (
                  call.transcript.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                      <div className="message-header">
                        <span className="role-badge">{msg.role === 'user' ? '👤 Customer' : '🤖 AI'}</span>
                        <span className="timestamp">{msg.timestamp || ''}</span>
                      </div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No transcript available</div>
                )}
              </div>
            </div>

            {/* CRM Actions */}
            {call.crm_actions && call.crm_actions.length > 0 && (
              <div className="crm-section">
                <h3>CRM Actions Taken</h3>
                <div className="crm-actions-list">
                  {call.crm_actions.map((action, idx) => (
                    <div key={idx} className="crm-action-item">
                      <span className="action-icon">✓</span>
                      <span className="action-text">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Player (if available) */}
            {call.audio_url && (
              <div className="audio-section">
                <h3>Call Recording</h3>
                <audio controls src={call.audio_url} className="audio-player">
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={flagForReview}>
                🚩 Flag for Review
              </button>
              <button className="btn btn-outline" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="error">Call not found</div>
        )}
      </div>
    </div>
  )
}

export default CallDetail
