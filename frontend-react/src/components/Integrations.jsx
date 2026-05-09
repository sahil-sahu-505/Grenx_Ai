import { useState, useEffect } from 'react'
import './Integrations.css'

function Integrations() {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)

  const availableIntegrations = [
    {
      id: 'zoho',
      name: 'Zoho CRM',
      icon: '📊',
      description: 'Automatically create leads and update contacts in Zoho CRM',
      features: ['Auto-create leads', 'Update contact info', 'Log call activities']
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      icon: '📗',
      description: 'Log call data to Google Sheets in real-time',
      features: ['Real-time logging', 'Custom columns', 'Multiple sheets support']
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      description: 'Send WhatsApp messages after calls',
      features: ['Auto-send transcripts', 'Follow-up messages', 'Template support']
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: '💼',
      description: 'Get notifications in Slack channels',
      features: ['Call notifications', 'Daily summaries', 'Alert on keywords']
    },
    {
      id: 'gmail',
      name: 'Gmail',
      icon: '📧',
      description: 'Send email summaries and transcripts',
      features: ['Email transcripts', 'Daily reports', 'Custom templates']
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      icon: '🔗',
      description: 'Send call data to your custom endpoint',
      features: ['Real-time POST', 'Custom payload', 'Retry logic']
    }
  ]

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations')
      const data = await response.json()
      setIntegrations(data.integrations || [])
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntegrationStatus = (integrationId) => {
    const integration = integrations.find(i => i.integration_type === integrationId)
    return integration?.status || 'disconnected'
  }

  const toggleIntegration = async (integrationId) => {
    const currentStatus = getIntegrationStatus(integrationId)
    
    if (currentStatus === 'connected') {
      // Disconnect
      if (!confirm('Are you sure you want to disconnect this integration?')) {
        return
      }
      
      try {
        const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
          method: 'POST'
        })
        
        if (response.ok) {
          alert('Integration disconnected successfully')
          loadIntegrations()
        } else {
          alert('Failed to disconnect integration')
        }
      } catch (error) {
        console.error('Failed to disconnect:', error)
        alert('Failed to disconnect integration')
      }
    } else {
      // Connect - show setup modal
      alert(`Setup for ${integrationId} coming soon! This will open a configuration modal.`)
    }
  }

  const testConnection = async (integrationId) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('✅ Connection test successful!')
      } else {
        alert('❌ Connection test failed: ' + (data.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to test connection:', error)
      alert('❌ Connection test failed')
    }
  }

  return (
    <div className="integrations">
      <div className="page-header">
        <div>
          <h2>Integrations</h2>
          <p className="page-subtitle">Connect your favorite tools and automate workflows</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading integrations...</div>
      ) : (
        <div className="integrations-grid">
          {availableIntegrations.map(integration => {
            const status = getIntegrationStatus(integration.id)
            const isConnected = status === 'connected'
            
            return (
              <div key={integration.id} className={`integration-card ${isConnected ? 'connected' : ''}`}>
                <div className="integration-header">
                  <div className="integration-icon">{integration.icon}</div>
                  <div className="integration-info">
                    <h3>{integration.name}</h3>
                    <span className={`status-badge ${status}`}>
                      {isConnected ? '🟢 Connected' : '⚪ Not Connected'}
                    </span>
                  </div>
                </div>

                <p className="integration-description">{integration.description}</p>

                <div className="integration-features">
                  <strong>Features:</strong>
                  <ul>
                    {integration.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="integration-actions">
                  {isConnected ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => testConnection(integration.id)}
                      >
                        🧪 Test Connection
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        🔌 Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => toggleIntegration(integration.id)}
                    >
                      🔗 Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="integrations-info">
        <h3>💡 Need a Custom Integration?</h3>
        <p>Contact our support team to discuss custom integrations for your specific needs.</p>
        <button className="btn btn-outline">📧 Contact Support</button>
      </div>
    </div>
  )
}

export default Integrations
