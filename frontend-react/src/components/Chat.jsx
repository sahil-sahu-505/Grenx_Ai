import { useState, useEffect, useRef } from 'react'
import './Chat.css'

const API_URL = '/api'

function Chat() {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your AI assistant. How can I help you today?", isUser: false }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useSemanticSearch, setUseSemanticSearch] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage = inputText.trim()
    setInputText('')
    setMessages(prev => [...prev, { text: userMessage, isUser: true }])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          use_knowledge: true,
          use_semantic_search: useSemanticSearch,
          session_id: sessionId
        })
      })

      const data = await response.json()

      if (data.session_id) {
        setSessionId(data.session_id)
      }

      setMessages(prev => [...prev, { 
        text: data.response, 
        isUser: false,
        sources: data.sources 
      }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isUser: false 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat">
      <h2>Chat with AI</h2>
      
      <div className="chat-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useSemanticSearch}
            onChange={(e) => setUseSemanticSearch(e.target.checked)}
          />
          <span>Use Semantic Search (slower but more accurate)</span>
        </label>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.isUser ? 'user' : 'agent'}`}>
              <div>{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  📚 Sources: {msg.sources.map(s => s.title).join(', ')}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message agent typing">
              <div>Typing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button 
            className="btn btn-primary" 
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat
