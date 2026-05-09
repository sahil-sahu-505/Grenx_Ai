import { useState, useEffect } from 'react'
import './KnowledgeBase.css'

const API_URL = '/api'

function KnowledgeBase() {
  const [knowledge, setKnowledge] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [businessType, setBusinessType] = useState('general')
  const [businessName, setBusinessName] = useState('default')
  const [businessTypes, setBusinessTypes] = useState({})
  const [generateEmbedding, setGenerateEmbedding] = useState(false)  // Changed to false by default
  const [isLoading, setIsLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    // Load business types immediately (lightweight)
    loadBusinessTypes()
    // Don't load knowledge until user needs it
  }, [])

  const loadBusinessTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/business-types`)
      const data = await response.json()
      setBusinessTypes(data.configs || {})
    } catch (error) {
      console.error('Failed to load business types:', error)
    }
  }

  const loadKnowledge = async () => {
    if (dataLoaded) return  // Don't reload if already loaded
    
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/knowledge?limit=100`)
      const data = await response.json()
      setKnowledge(data.entries || [])
      setDataLoaded(true)
    } catch (error) {
      console.error('Failed to load knowledge:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load knowledge when component becomes visible
  useEffect(() => {
    loadKnowledge()
  }, [])

  const saveKnowledge = async () => {
    if (!title.trim() || !content.trim() || !businessName.trim()) {
      alert('Please fill in all fields including business name')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          content, 
          business_type: businessType,
          business_name: businessName,
          generate_embedding: generateEmbedding 
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || 'Knowledge added successfully!')
        setTitle('')
        setContent('')
        setBusinessType('general')
        setBusinessName('default')
        setShowForm(false)
        setDataLoaded(false)  // Force reload
        loadKnowledge()
      }
    } catch (error) {
      console.error('Failed to save knowledge:', error)
      alert('Failed to save knowledge')
    } finally {
      setIsLoading(false)
    }
  }

  const updateEmbeddings = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/knowledge/update-embeddings`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        alert(`Updated ${data.updated_count} embeddings!`)
        setDataLoaded(false)  // Force reload
        loadKnowledge()
      }
    } catch (error) {
      console.error('Failed to update embeddings:', error)
      alert('Failed to update embeddings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="knowledge-base">
      <h2>Knowledge Base</h2>

      <div className="button-group">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          ➕ Add Knowledge
        </button>
        <button className="btn btn-secondary" onClick={updateEmbeddings} disabled={isLoading}>
          🔄 Update All Embeddings
        </button>
      </div>

      {showForm && (
        <div className="knowledge-form">
          <h3>Add New Knowledge</h3>
          
          <div className="form-group">
            <label>Business Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              {Object.keys(businessTypes).map(type => (
                <option key={type} value={type}>
                  {businessTypes[type]?.name || type}
                </option>
              ))}
            </select>
            <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
              Select business category (Restaurant, Hotel, Salon, etc.)
            </small>
          </div>
          
          <div className="form-group">
            <label>Business Name *</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Hotel Taj, Pizza Hut, Beauty Salon Downtown"
            />
            <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
              Enter specific business name (e.g., "Hotel Taj Mahal", "McDonald's Downtown")
            </small>
          </div>
          
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter content..."
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={generateEmbedding}
              onChange={(e) => setGenerateEmbedding(e.target.checked)}
            />
            <span>Generate embedding (⚠️ Not recommended - use text search for faster results)</span>
          </label>
          <small style={{color: '#666', marginTop: '5px', display: 'block', marginLeft: '25px'}}>
            Leave unchecked for faster voice calls. Text search works perfectly!
          </small>
          <div className="button-group" style={{marginTop: '15px'}}>
            <button className="btn btn-primary" onClick={saveKnowledge} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="knowledge-list">
        {isLoading ? (
          <div className="empty-state">Loading knowledge...</div>
        ) : knowledge.length === 0 ? (
          <div className="empty-state">No knowledge entries found. Click "Add Knowledge" to get started.</div>
        ) : (
          knowledge.map(entry => (
            <div key={entry.id} className="knowledge-item">
              <div className="knowledge-header">
                <h4>{entry.title}</h4>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{fontSize: '0.85em', color: '#666'}}>
                    {entry.business_type} / {entry.business_name}
                  </span>
                  <span className="knowledge-id">#{entry.id}</span>
                </div>
              </div>
              <p>{entry.content}</p>
              <span className={`badge ${entry.embedding ? '' : 'warning'}`}>
                {entry.embedding ? '✓ Embedded' : 'Text search only'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default KnowledgeBase
