import './Tabs.css'

function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'voice-call', label: '📞 Voice Call' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'tts', label: '🔊 Text-to-Speech' },
    { id: 'knowledge', label: '📚 Knowledge Base' },
    { id: 'analytics', label: '📈 Analytics' },
    { id: 'logs', label: '📋 Call Logs' },
    { id: 'phone-numbers', label: '☎️ Phone Numbers' },
    { id: 'integrations', label: '🔗 Integrations' },
    { id: 'billing', label: '💳 Billing' },
    { id: 'campaigns', label: '📢 Campaigns' }
  ]

  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
