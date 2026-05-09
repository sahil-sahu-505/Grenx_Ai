import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './CallLink.css'

function CallLink() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [callData, setCallData] = useState(null)
  const [error, setError] = useState(null)
  const [callStarted, setCallStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [recognition, setRecognition] = useState(null)

  const linkId = searchParams.get('id')
  const leadId = searchParams.get('lead')

  useEffect(() => {
    if (linkId && leadId) {
      loadCallData()
    } else {
      setError('Invalid call link - missing parameters')
      setLoading(false)
    }
  }, [linkId, leadId])

  const loadCallData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/call-link/${linkId}?lead=${leadId}`)
      const data = await response.json()
      
      if (response.ok) {
        setCallData(data)
        // Track that link was clicked
        await fetch(`/api/call-link/${linkId}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: leadId, event: 'clicked' })
        })
      } else {
        setError(data.message || 'Invalid or expired link')
      }
    } catch (err) {
      setError('Failed to load call information')
    } finally {
      setLoading(false)
    }
  }

  const startCall = async () => {
    setCallStarted(true)
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      alert('Text-to-Speech not supported in this browser. Please use Chrome or Edge.')
      return
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = false
    recognitionInstance.lang = 'en-IN'

    recognitionInstance.onresult = async (event) => {
      const lastResult = event.results[event.results.length - 1]
      const userMessage = lastResult[0].transcript

      console.log('User said:', userMessage)

      // Add user message to transcript
      setTranscript(prev => [...prev, { role: 'user', text: userMessage }])

      // Get AI response
      await getAIResponse(userMessage)
    }

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'network') {
        alert('Network error: Please check your internet connection')
      }
    }

    setRecognition(recognitionInstance)

    // Start with AI greeting
    console.log('Starting AI greeting...')
    await speakAIGreeting()
    
    // Start listening after greeting
    setTimeout(() => {
      try {
        recognitionInstance.start()
        setIsListening(true)
        console.log('Started listening...')
      } catch (err) {
        console.error('Failed to start recognition:', err)
      }
    }, 1000)
  }

  const speakAIGreeting = async () => {
    const greeting = callData.greeting || `Hello ${callData.lead_name}, this is calling from ${callData.business_name}. ${callData.script.substring(0, 200)}`
    
    setTranscript(prev => [...prev, { role: 'assistant', text: greeting }])
    await speakText(greeting)
  }

  const getAIResponse = async (userMessage) => {
    try {
      setIsListening(false)
      if (recognition) recognition.stop()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          use_knowledge: true,
          business_type: callData.business_type || 'general',
          business_name: callData.business_name || 'default',
          session_id: `call_link_${linkId}_${leadId}`
        })
      })

      const data = await response.json()
      
      // Add AI response to transcript
      setTranscript(prev => [...prev, { role: 'assistant', text: data.response }])
      
      // Speak the response
      await speakText(data.response)

      // Resume listening
      if (recognition) {
        recognition.start()
        setIsListening(true)
      }

      // Track conversation progress
      await fetch(`/api/call-link/${linkId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lead_id: leadId, 
          event: 'message',
          data: { user: userMessage, ai: data.response }
        })
      })

    } catch (err) {
      console.error('Failed to get AI response:', err)
    }
  }

  const speakText = async (text) => {
    return new Promise((resolve) => {
      setIsSpeaking(true)
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-IN'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsSpeaking(false)
        resolve()
      }

      // Small delay to ensure speech synthesis is ready
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 100)
    })
  }

  const endCall = async () => {
    if (recognition) {
      recognition.stop()
    }
    window.speechSynthesis.cancel()
    
    // Track call completion
    await fetch(`/api/call-link/${linkId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lead_id: leadId, 
        event: 'completed',
        data: { transcript, duration: transcript.length }
      })
    })

    setCallStarted(false)
    setIsListening(false)
    setIsSpeaking(false)
  }

  if (loading) {
    return (
      <div className="call-link-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading call information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="call-link-page">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>Call Link Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="call-link-page">
      <div className="call-container">
        {!callStarted ? (
          <div className="call-start">
            <div className="business-logo">🤖</div>
            <h1>{callData.business_name}</h1>
            <p className="call-purpose">{callData.campaign_name}</p>
            <p className="lead-name">Hello {callData.lead_name}!</p>
            <p className="call-description">
              We'd like to speak with you about {callData.campaign_name.toLowerCase()}. 
              This call will be handled by our AI assistant.
            </p>
            <button className="start-call-btn" onClick={startCall}>
              📞 Start Call
            </button>
            <p className="call-note">
              Make sure your microphone is enabled. The call will start automatically.
            </p>
          </div>
        ) : (
          <div className="call-active">
            <div className="call-header">
              <div className="business-info">
                <div className="business-avatar">🤖</div>
                <div>
                  <h3>{callData.business_name}</h3>
                  <p className="call-status">
                    {isSpeaking ? '🔊 AI Speaking...' : isListening ? '🎤 Listening...' : '⏸️ Paused'}
                  </p>
                </div>
              </div>
              <button className="end-call-btn" onClick={endCall}>
                ❌ End Call
              </button>
            </div>

            <div className="transcript-container">
              <h4>Conversation</h4>
              <div className="transcript-messages">
                {transcript.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-bubble">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="call-controls">
              <div className="status-indicator">
                {isListening && <span className="pulse">🎤 Listening...</span>}
                {isSpeaking && <span className="pulse">🔊 Speaking...</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CallLink
