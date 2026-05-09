import { useState, useEffect } from 'react'
import './Dashboard.css'

const API_URL = '/api'

function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    knowledgeCount: '-',
    callCount: '-',
    llmProvider: '-',
    avgMessages: '-'
  })

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`)
      const data = await response.json()
      
      setStats({
        knowledgeCount: data.overview.knowledge_entries,
        callCount: data.overview.total_calls,
        llmProvider: data.overview.llm_provider,
        avgMessages: data.quality_metrics?.avg_messages_per_call?.toFixed(1) || '-'
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  return (
    <div className="dashboard">
      <h2>System Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Knowledge Entries</h3>
          <div className="value">{stats.knowledgeCount}</div>
        </div>
        <div className="stat-card">
          <h3>Total Calls</h3>
          <div className="value">{stats.callCount}</div>
        </div>
        <div className="stat-card">
          <h3>LLM Provider</h3>
          <div className="value" style={{fontSize: '1.5em'}}>{stats.llmProvider}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Messages/Call</h3>
          <div className="value">{stats.avgMessages}</div>
        </div>
      </div>

      <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Quick Actions</h3>
      <div className="quick-actions">
        <button className="btn btn-primary" onClick={() => setActiveTab('voice-call')}>
          📞 Start Voice Call
        </button>
        <button className="btn btn-primary" onClick={() => setActiveTab('chat')}>
          💬 Chat with AI
        </button>
        <button className="btn btn-primary" onClick={() => setActiveTab('tts')}>
          🔊 Generate Speech
        </button>
        <button className="btn btn-primary" onClick={() => setActiveTab('knowledge')}>
          📚 Add Knowledge
        </button>
      </div>
    </div>
  )
}

export default Dashboard
