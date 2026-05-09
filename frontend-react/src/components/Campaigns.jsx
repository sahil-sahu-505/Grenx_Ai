import { useState, useEffect } from 'react'
import './Campaigns.css'

function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [showLeadsModal, setShowLeadsModal] = useState(false)
  const [campaignLeads, setCampaignLeads] = useState([])
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    script: '',
    calling_hours_start: '10:00',
    calling_hours_end: '18:00',
    leads_file: null,
    business_name: '',
    business_type: 'general'
  })

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.script) {
      alert('Please fill in campaign name and script')
      return
    }

    try {
      // First create the campaign
      const campaignData = {
        name: newCampaign.name,
        script: newCampaign.script,
        calling_hours_start: newCampaign.calling_hours_start,
        calling_hours_end: newCampaign.calling_hours_end,
        business_name: newCampaign.business_name,
        business_type: newCampaign.business_type
      }

      const createResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      })

      if (!createResponse.ok) {
        alert('Failed to create campaign')
        return
      }

      const createResult = await createResponse.json()
      const campaignId = createResult.campaign_id

      // If CSV file is provided, upload leads
      if (newCampaign.leads_file) {
        const formData = new FormData()
        formData.append('file', newCampaign.leads_file)

        const uploadResponse = await fetch(`/api/campaigns/${campaignId}/upload-leads`, {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          alert(`Campaign created with ${uploadResult.leads_added} leads!`)
        } else {
          alert('Campaign created but failed to upload leads')
        }
      } else {
        alert('Campaign created successfully!')
      }

      setShowCreateModal(false)
      setNewCampaign({
        name: '',
        script: '',
        calling_hours_start: '10:00',
        calling_hours_end: '18:00',
        leads_file: null,
        business_name: '',
        business_type: 'general'
      })
      loadCampaigns()
    } catch (error) {
      console.error('Failed to create campaign:', error)
      alert('Failed to create campaign')
    }
  }

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadCampaigns()
      } else {
        alert('Failed to update campaign status')
      }
    } catch (error) {
      console.error('Failed to toggle status:', error)
      alert('Failed to update campaign status')
    }
  }

  const viewCampaignDetails = (campaign) => {
    setSelectedCampaign(campaign)
  }

  const viewCampaignLeads = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/leads`)
      const data = await response.json()
      setCampaignLeads(data.leads || [])
      setSelectedCampaign(campaign)
      setShowLeadsModal(true)
    } catch (error) {
      console.error('Failed to load leads:', error)
      alert('Failed to load campaign leads')
    }
  }

  const sendCallLink = async (leadId, method) => {
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, method })
      })

      const data = await response.json()

      if (response.ok) {
        if (method === 'whatsapp' && data.whatsapp_url) {
          // Open WhatsApp with pre-filled message
          window.open(data.whatsapp_url, '_blank')
        }
        alert(`Call link generated!\n\nLink: ${data.link}\n\n${method === 'whatsapp' ? 'Opening WhatsApp...' : 'Copy this link and send via email'}`)
        viewCampaignLeads(selectedCampaign) // Refresh leads
      } else {
        alert('Failed to send link')
      }
    } catch (error) {
      console.error('Failed to send link:', error)
      alert('Failed to send link')
    }
  }

  const manualCall = (lead) => {
    // Open voice call with pre-loaded campaign data
    const callUrl = `/dashboard?tab=voice-call&campaign=${selectedCampaign.id}&lead=${lead.id}&name=${lead.name}&phone=${lead.phone}`
    window.location.href = callUrl
  }

  const downloadResults = async (campaignId) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/results`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `campaign-${campaignId}-results.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download results:', error)
      alert('Failed to download results')
    }
  }

  return (
    <div className="campaigns">
      <div className="page-header">
        <div>
          <h2>Outbound Campaigns</h2>
          <p className="page-subtitle">Automate outbound calling with AI</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <h3>No Campaigns Yet</h3>
          <p>Create your first outbound calling campaign to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign.id} className={`campaign-card ${campaign.status}`}>
              <div className="campaign-header">
                <h3>{campaign.name}</h3>
                <span className={`status-badge ${campaign.status}`}>
                  {campaign.status === 'active' ? '🟢 Active' : 
                   campaign.status === 'paused' ? '⏸️ Paused' : 
                   campaign.status === 'completed' ? '✅ Completed' : '📝 Draft'}
                </span>
              </div>

              <div className="campaign-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Leads</span>
                  <span className="stat-value">{campaign.total_leads || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Calls Made</span>
                  <span className="stat-value">{campaign.calls_made || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Connected</span>
                  <span className="stat-value">{campaign.calls_connected || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Resolved</span>
                  <span className="stat-value">{campaign.calls_resolved || 0}</span>
                </div>
              </div>

              <div className="campaign-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(campaign.calls_made / campaign.total_leads) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {campaign.calls_made} / {campaign.total_leads} calls
                </span>
              </div>

              <div className="campaign-info">
                <p><strong>Calling Hours:</strong> {campaign.calling_hours_start} - {campaign.calling_hours_end}</p>
                <p><strong>Created:</strong> {new Date(campaign.created_at).toLocaleDateString()}</p>
              </div>

              <div className="campaign-actions">
                {campaign.status !== 'completed' && (
                  <button
                    className={`btn ${campaign.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                  >
                    {campaign.status === 'active' ? '⏸️ Pause' : '▶️ Start'}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => viewCampaignLeads(campaign)}
                >
                  👥 View Leads
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => downloadResults(campaign.id)}
                >
                  📥 Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Campaign</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="e.g., Summer Sale Follow-up"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={newCampaign.business_name}
                    onChange={(e) => setNewCampaign({...newCampaign, business_name: e.target.value})}
                    placeholder="e.g., Pizza Hut"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Business Type</label>
                  <select
                    value={newCampaign.business_type}
                    onChange={(e) => setNewCampaign({...newCampaign, business_type: e.target.value})}
                    className="form-input"
                  >
                    <option value="general">General</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel</option>
                    <option value="salon">Salon</option>
                    <option value="clinic">Clinic</option>
                    <option value="shop">Shop</option>
                    <option value="gym">Gym</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Call Script *</label>
                <textarea
                  value={newCampaign.script}
                  onChange={(e) => setNewCampaign({...newCampaign, script: e.target.value})}
                  placeholder="Enter the script AI should follow during calls..."
                  rows={6}
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calling Hours Start</label>
                  <input
                    type="time"
                    value={newCampaign.calling_hours_start}
                    onChange={(e) => setNewCampaign({...newCampaign, calling_hours_start: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Calling Hours End</label>
                  <input
                    type="time"
                    value={newCampaign.calling_hours_end}
                    onChange={(e) => setNewCampaign({...newCampaign, calling_hours_end: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Leads (CSV)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setNewCampaign({...newCampaign, leads_file: e.target.files[0]})}
                  className="form-input"
                />
                <p className="form-hint">CSV should have columns: name, phone, email (optional)</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createCampaign}>
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && !showLeadsModal && (
        <div className="modal-overlay" onClick={() => setSelectedCampaign(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCampaign.name}</h3>
              <button className="close-btn" onClick={() => setSelectedCampaign(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Campaign Script</h4>
                <div className="script-box">{selectedCampaign.script}</div>
              </div>

              <div className="detail-section">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Total Leads</span>
                    <span className="stat-value">{selectedCampaign.total_leads}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Calls Made</span>
                    <span className="stat-value">{selectedCampaign.calls_made}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Connected</span>
                    <span className="stat-value">{selectedCampaign.calls_connected}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Resolved</span>
                    <span className="stat-value">{selectedCampaign.calls_resolved}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCampaign(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Leads Modal */}
      {showLeadsModal && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setShowLeadsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 {selectedCampaign.name} - Leads</h3>
              <button className="close-btn" onClick={() => setShowLeadsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="leads-table-container">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Last Contact</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignLeads.map(lead => (
                      <tr key={lead.id}>
                        <td>{lead.name}</td>
                        <td>{lead.phone}</td>
                        <td>
                          <span className={`lead-status ${lead.status}`}>
                            {lead.status === 'pending' && '⏳ Pending'}
                            {lead.status === 'link_sent' && '📤 Link Sent'}
                            {lead.status === 'clicked' && '👁️ Clicked'}
                            {lead.status === 'completed' && '✅ Completed'}
                            {lead.status === 'no_response' && '❌ No Response'}
                          </span>
                        </td>
                        <td>{lead.last_contact ? new Date(lead.last_contact).toLocaleString() : 'Never'}</td>
                        <td>
                          <div className="lead-actions">
                            {lead.status === 'pending' && (
                              <>
                                <button
                                  className="btn-small btn-whatsapp"
                                  onClick={() => sendCallLink(lead.id, 'whatsapp')}
                                  title="Send via WhatsApp"
                                >
                                  💬
                                </button>
                                <button
                                  className="btn-small btn-email"
                                  onClick={() => sendCallLink(lead.id, 'email')}
                                  title="Send via Email"
                                >
                                  📧
                                </button>
                              </>
                            )}
                            {(lead.status === 'no_response' || lead.status === 'link_sent') && (
                              <button
                                className="btn-small btn-call"
                                onClick={() => manualCall(lead)}
                                title="Manual Call"
                              >
                                📞 Call
                              </button>
                            )}
                            {lead.status === 'completed' && (
                              <button
                                className="btn-small btn-view"
                                onClick={() => alert('View transcript feature coming soon')}
                                title="View Details"
                              >
                                👁️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLeadsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Campaigns
