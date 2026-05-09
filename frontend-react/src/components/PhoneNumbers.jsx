import { useState, useEffect } from 'react'
import './PhoneNumbers.css'

function PhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestReason, setRequestReason] = useState('')

  useEffect(() => {
    loadPhoneNumbers()
  }, [])

  const loadPhoneNumbers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/phone-numbers')
      const data = await response.json()
      setPhoneNumbers(data.phone_numbers || [])
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (phoneId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const response = await fetch(`/api/phone-numbers/${phoneId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadPhoneNumbers()
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Failed to toggle status:', error)
      alert('Failed to update status')
    }
  }

  const updateForwarding = async (phoneId, forwardingNumber) => {
    try {
      const response = await fetch(`/api/phone-numbers/${phoneId}/forwarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwarding_number: forwardingNumber })
      })

      if (response.ok) {
        alert('Call forwarding updated successfully')
        loadPhoneNumbers()
      } else {
        alert('Failed to update call forwarding')
      }
    } catch (error) {
      console.error('Failed to update forwarding:', error)
      alert('Failed to update call forwarding')
    }
  }

  const requestAdditionalNumber = async () => {
    if (!requestReason.trim()) {
      alert('Please provide a reason for requesting additional number')
      return
    }

    try {
      const response = await fetch('/api/phone-numbers/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: requestReason })
      })

      if (response.ok) {
        alert('Request submitted successfully! Our team will contact you soon.')
        setShowRequestForm(false)
        setRequestReason('')
      } else {
        alert('Failed to submit request')
      }
    } catch (error) {
      console.error('Failed to request number:', error)
      alert('Failed to submit request')
    }
  }

  return (
    <div className="phone-numbers">
      <div className="page-header">
        <h2>Phone Number Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowRequestForm(true)}
        >
          ➕ Request Additional Number
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading phone numbers...</div>
      ) : phoneNumbers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📞</div>
          <h3>No Phone Numbers Assigned</h3>
          <p>Contact support to get your first phone number assigned</p>
        </div>
      ) : (
        <div className="phone-numbers-grid">
          {phoneNumbers.map(phone => (
            <div key={phone.id} className="phone-card">
              <div className="phone-header">
                <div className="phone-number">{phone.number}</div>
                <span className={`status-badge ${phone.status}`}>
                  {phone.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>

              <div className="phone-details">
                <div className="detail-row">
                  <span className="label">Assigned Date:</span>
                  <span className="value">{new Date(phone.assigned_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Total Calls:</span>
                  <span className="value">{phone.total_calls || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="label">This Month:</span>
                  <span className="value">{phone.calls_this_month || 0} calls</span>
                </div>
              </div>

              <div className="forwarding-section">
                <label className="forwarding-label">Call Forwarding (Human Handover)</label>
                <div className="forwarding-input-group">
                  <input
                    type="tel"
                    placeholder="+91 XXXXXXXXXX"
                    defaultValue={phone.forwarding_number || ''}
                    onBlur={(e) => {
                      if (e.target.value !== phone.forwarding_number) {
                        updateForwarding(phone.id, e.target.value)
                      }
                    }}
                    className="forwarding-input"
                  />
                </div>
                <p className="forwarding-hint">
                  Calls will be forwarded to this number when AI requests human assistance
                </p>
              </div>

              <div className="phone-actions">
                <button
                  className={`btn ${phone.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => toggleStatus(phone.id, phone.status)}
                >
                  {phone.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="modal-overlay" onClick={() => setShowRequestForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Additional Phone Number</h3>
              <button className="close-btn" onClick={() => setShowRequestForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>Reason for Request</label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g., Need separate number for different department, scaling operations, etc."
                rows={4}
                className="request-textarea"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRequestForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={requestAdditionalNumber}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhoneNumbers
