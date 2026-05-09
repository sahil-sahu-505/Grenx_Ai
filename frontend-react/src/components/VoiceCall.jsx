import { useState, useEffect, useRef } from 'react'
import './VoiceCall.css'

const API_URL = '/api'

function VoiceCall() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [statusText, setStatusText] = useState('Ready to call')
  const [statusColor, setStatusColor] = useState('#495057')
  const [transcript, setTranscript] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [selectedVoice, setSelectedVoice] = useState('en-IN-NeerjaNeural')
  const [businessType, setBusinessType] = useState('general')
  const [businessName, setBusinessName] = useState('default')
  const [businessTypes, setBusinessTypes] = useState({})
  const [availableBusinessNames, setAvailableBusinessNames] = useState([])
  
  const recognitionRef = useRef(null)
  const isRecognitionRunning = useRef(false)
  const isRecognitionStarting = useRef(false)
  const callSessionId = useRef(null)
  const isCallActiveRef = useRef(false)
  const isSpeakingRef = useRef(false)

  // Load business types on component mount
  useEffect(() => {
    console.log('Loading business types...')
    fetch('/api/business-types')
      .then(res => res.json())
      .then(data => {
        console.log('Business types loaded:', data)
        setBusinessTypes(data.configs || {})
      })
      .catch(err => console.error('Failed to load business types:', err))
  }, [])
  
  // Load business names when business type changes
  useEffect(() => {
    if (businessType) {
      console.log('Business type changed to:', businessType)
      loadBusinessNames(businessType)
    }
  }, [businessType])
  
  const loadBusinessNames = async (type = null) => {
    try {
      const url = type ? `/api/business-names?business_type=${type}` : '/api/business-names'
      console.log('Loading business names from:', url)
      const response = await fetch(url)
      const data = await response.json()
      console.log('Business names loaded:', data)
      setAvailableBusinessNames(data.business_names || [])
      
      // Auto-select first business name if available
      if (data.business_names && data.business_names.length > 0) {
        setBusinessName(data.business_names[0].business_name)
      } else {
        setBusinessName('default')
      }
    } catch (err) {
      console.error('Failed to load business names:', err)
      setAvailableBusinessNames([])
    }
  }
  
  // Handle business name selection - update business type automatically
  const handleBusinessNameChange = (selectedName) => {
    setBusinessName(selectedName)
    
    // Find the business type for this business name
    const business = availableBusinessNames.find(b => b.business_name === selectedName)
    if (business && business.business_type) {
      console.log(`Auto-updating business type to: ${business.business_type} for ${selectedName}`)
      setBusinessType(business.business_type)
    }
  }

  const languages = [
    { value: 'auto|en-IN-NeerjaNeural', label: '🌐 Auto-detect (Multi-language)' },
    { value: 'en-US|en-IN-NeerjaNeural', label: '🇺🇸 English (US)' },
    { value: 'hi-IN|hi-IN-SwaraNeural', label: '🇮🇳 Hindi (हिंदी)' },
    { value: 'ta-IN|ta-IN-PallaviNeural', label: '🇮🇳 Tamil (தமிழ்)' },
    { value: 'te-IN|te-IN-ShrutiNeural', label: '🇮🇳 Telugu (తెలుగు)' },
    { value: 'bn-IN|bn-IN-TanishaaNeural', label: '🇮🇳 Bengali (বাংলা)' },
    { value: 'gu-IN|gu-IN-DhwaniNeural', label: '🇮🇳 Gujarati (ગુજરાતી)' },
    { value: 'kn-IN|kn-IN-SapnaNeural', label: '🇮🇳 Kannada (ಕನ್ನಡ)' },
    { value: 'ml-IN|ml-IN-SobhanaNeural', label: '🇮🇳 Malayalam (മലയാളം)' },
    { value: 'mr-IN|mr-IN-AarohiNeural', label: '🇮🇳 Marathi (मराठी)' },
    { value: 'pa-IN|pa-IN-GurpreetNeural', label: '🇮🇳 Punjabi (ਪੰਜਾਬੀ)' }
  ]

  const startVoiceCall = async () => {
    console.log('Starting voice call...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      
      setIsCallActive(true)
      isCallActiveRef.current = true  // Set ref immediately
      callSessionId.current = 'call-' + Date.now()
      setStatusText('🎤 Ready - Start speaking!')
      setStatusColor('#28a745')
      setTranscript([])
      
      console.log('Initializing speech recognition...')
      const initialized = initSpeechRecognition()
      
      if (initialized) {
        console.log('Starting to listen...')
        setTimeout(() => {
          console.log('Calling startListening() - resetting flags first')
          // Force reset flags before starting
          isRecognitionStarting.current = false
          isRecognitionRunning.current = false
          startListening()
        }, 500)
      } else {
        console.error('Speech recognition initialization failed')
        setStatusText('Speech recognition not supported')
        setStatusColor('#dc3545')
      }
    } catch (error) {
      console.error('Microphone error:', error)
      alert('Microphone access denied. Please allow microphone access and try again.')
      setStatusText('Microphone access denied')
      setStatusColor('#dc3545')
    }
  }

  const endVoiceCall = () => {
    setIsCallActive(false)
    isCallActiveRef.current = false  // Set ref immediately
    setIsSpeaking(false)
    isRecognitionRunning.current = false
    isRecognitionStarting.current = false
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log('Stop error:', e)
      }
    }
    
    setStatusText('Call Ended')
    setStatusColor('#6c757d')
  }

  const initSpeechRecognition = () => {
    console.log('initSpeechRecognition called')
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const msg = 'Speech recognition not supported. Please use Chrome or Edge browser.'
      console.error(msg)
      alert(msg)
      return false
    }

    console.log('Speech recognition is supported')
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = selectedLanguage === 'auto' ? 'en-US' : selectedLanguage
    
    console.log('Recognition configured with language:', recognitionRef.current.lang)

    recognitionRef.current.onstart = () => {
      console.log('✅ Recognition STARTED')
      isRecognitionStarting.current = false
      isRecognitionRunning.current = true
      setStatusText('🎤 Listening... Speak now')
      setStatusColor('#28a745')
    }

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      console.log('✅ User said:', transcript)

      // Ignore if AI is speaking or transcript is too short
      if (isSpeakingRef.current) {
        console.log('⏭️ Ignoring - AI is speaking (echo prevention)')
        return
      }
      
      if (transcript.length < 3) {
        console.log('⏭️ Ignoring - transcript too short')
        return
      }

      // Stop recognition immediately to prevent echo
      try {
        recognitionRef.current.stop()
        isRecognitionRunning.current = false
      } catch (e) {
        console.log('Stop error:', e)
      }

      setStatusText('✅ Heard you! Processing...')
      setStatusColor('#17a2b8')

      addToTranscript(transcript, 'user')
      await getAIResponse(transcript)

      setTimeout(() => {
        if (isCallActiveRef.current && !isSpeaking && !isRecognitionRunning.current) {
          startListening()
        }
      }, 1000)
    }

    recognitionRef.current.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      isRecognitionStarting.current = false
      isRecognitionRunning.current = false

      if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected - Microphone may not be working')
        console.log('💡 TIP: Check if microphone is muted or not selected correctly')
        setStatusText('⚠️ No speech detected - Check microphone')
        setStatusColor('#ffc107')
        setTimeout(() => {
          if (isCallActiveRef.current && !isSpeaking && !isRecognitionRunning.current) {
            console.log('🔄 Restarting recognition...')
            startListening()
          }
        }, 2000)
      } else if (event.error === 'not-allowed') {
        alert('❌ Microphone access denied!\n\nPlease:\n1. Click the 🔒 icon in address bar\n2. Allow microphone access\n3. Refresh the page')
        endVoiceCall()
      } else if (event.error === 'audio-capture') {
        alert('❌ Microphone not found!\n\nPlease:\n1. Connect a microphone\n2. Check Windows sound settings\n3. Refresh the page')
        endVoiceCall()
      } else if (event.error === 'network') {
        console.error('❌ Network error - Speech recognition service temporarily unavailable')
        console.log('💡 Will retry in 3 seconds...')
        setStatusText('⚠️ Network hiccup - Retrying...')
        setStatusColor('#ffc107')
        // Don't end the call, just retry
        setTimeout(() => {
          if (isCallActiveRef.current && !isSpeaking && !isRecognitionRunning.current) {
            console.log('🔄 Retrying after network error...')
            startListening()
          }
        }, 3000)
      } else {
        console.error('❌ Unknown error:', event.error)
        alert(`Speech recognition error: ${event.error}\n\nPlease check console for details.`)
        setStatusText('❌ Error: ' + event.error)
        setStatusColor('#dc3545')
      }
    }

    recognitionRef.current.onend = () => {
      console.log('Recognition ended')
      isRecognitionStarting.current = false
      isRecognitionRunning.current = false

      if (isCallActiveRef.current && !isSpeaking && !isRecognitionRunning.current) {
        setTimeout(() => {
          if (isCallActiveRef.current && !isSpeaking) {
            startListening()
          }
        }, 800)
      }
    }

    console.log('✅ Speech recognition initialized successfully')
    return true
  }

  const startListening = () => {
    console.log('🎤 startListening called', {
      isRecognitionStarting: isRecognitionStarting.current,
      isRecognitionRunning: isRecognitionRunning.current,
      isSpeaking,
      isCallActive,
      isCallActiveRef: isCallActiveRef.current
    })
    
    if (isRecognitionStarting.current) {
      console.log('⏭️ Skipping - already starting')
      return
    }
    
    if (isRecognitionRunning.current) {
      console.log('⏭️ Skipping - already running')
      return
    }
    
    if (isSpeaking) {
      console.log('⏭️ Skipping - AI is speaking')
      return
    }
    
    if (!isCallActiveRef.current) {
      console.log('⏭️ Skipping - call not active (ref check)')
      return
    }

    try {
      isRecognitionStarting.current = true
      console.log('▶️ Calling recognition.start()...')
      recognitionRef.current.start()
      console.log('✅ Recognition.start() called successfully')
    } catch (e) {
      console.error('❌ Could not start recognition:', e)
      isRecognitionStarting.current = false
      isRecognitionRunning.current = false
      
      // Show error to user
      setStatusText('❌ Speech recognition error - Check console')
      setStatusColor('#dc3545')
      alert('Speech recognition failed to start. Please check:\n1. Microphone is connected\n2. Microphone permissions are granted\n3. Using Chrome or Edge browser\n\nError: ' + e.message)
      
      // Try again after a delay
      setTimeout(() => {
        if (isCallActiveRef.current && !isSpeaking) {
          console.log('🔄 Retrying speech recognition...')
          startListening()
        }
      }, 2000)
    }
  }

  const addToTranscript = (text, speaker) => {
    const time = new Date().toLocaleTimeString()
    setTranscript(prev => [...prev, { text, speaker, time }])
  }

  const getAIResponse = async (userMessage) => {
    try {
      setIsSpeaking(true)
      isSpeakingRef.current = true  // Set ref immediately
      setStatusText('🤖 AI is thinking...')
      setStatusColor('#667eea')

      console.log('📤 Sending to backend:', userMessage)
      console.log('📤 API URL:', `${API_URL}/chat`)
      console.log('📤 Full URL:', window.location.origin + `${API_URL}/chat`)
      
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          use_knowledge: true,
          use_semantic_search: false,
          session_id: callSessionId.current,
          business_type: businessType,
          business_name: businessName
        })
      })

      console.log('📥 Backend response status:', response.status)
      console.log('📥 Backend response ok:', response.ok)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📥 Backend response data:', data)

      if (data.response) {
        addToTranscript(data.response, 'ai')
        setStatusText('🤖 AI is speaking...')
        setStatusColor('#764ba2')
        console.log('🔊 Playing AI response...')
        await speakText(data.response)
        console.log('✅ AI response complete')
      }

      setIsSpeaking(false)
      isSpeakingRef.current = false  // Reset ref
      setTimeout(() => {
        if (isCallActiveRef.current && !isSpeakingRef.current && !isRecognitionRunning.current) {
          console.log('🔄 Restarting listening after AI response (with delay to prevent echo)')
          startListening()
        }
      }, 1000)  // Increased delay to 1 second to prevent echo
    } catch (error) {
      console.error('❌ AI response error:', error)
      alert('Failed to get AI response: ' + error.message)
      setStatusText('❌ AI error - Try again')
      setStatusColor('#dc3545')
      setIsSpeaking(false)
      isSpeakingRef.current = false  // Reset ref
      
      // Restart listening after error
      setTimeout(() => {
        if (isCallActiveRef.current) {
          startListening()
        }
      }, 1000)
    }
  }

  const speakText = async (text) => {
    try {
      console.log('🔊 speakText called with:', text.substring(0, 50) + '...')
      
      // CRITICAL: Stop speech recognition before playing audio to prevent echo
      if (recognitionRef.current && isRecognitionRunning.current) {
        console.log('🛑 Stopping recognition before AI speaks (echo prevention)')
        try {
          recognitionRef.current.stop()
          isRecognitionRunning.current = false
        } catch (e) {
          console.log('Stop error:', e)
        }
      }
      
      const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text

      console.log('📤 Requesting TTS from backend...')
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncatedText, voice: selectedVoice })
      })

      console.log('📥 TTS response status:', response.status)
      const data = await response.json()
      console.log('📥 TTS response data:', { success: data.success, audio_size: data.audio_size })

      if (data.success && data.audio_base64) {
        console.log('🎵 Creating audio blob...')
        const audioBlob = base64ToBlob(data.audio_base64, 'audio/mpeg')
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        console.log('▶️ Playing audio...')
        return new Promise((resolve) => {
          audio.onended = () => {
            console.log('✅ Audio playback finished')
            URL.revokeObjectURL(audioUrl)
            resolve()
          }
          audio.onerror = (e) => {
            console.error('❌ Audio playback error:', e)
            resolve()
          }
          audio.play().then(() => {
            console.log('✅ Audio.play() started successfully')
          }).catch((e) => {
            console.error('❌ Audio.play() failed:', e)
            resolve()
          })
        })
      } else {
        console.error('❌ TTS failed - no audio data received')
      }
    } catch (error) {
      console.error('❌ TTS error:', error)
    }
  }

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  return (
    <div className="voice-call">
      <h2>Voice Call with AI</h2>
      
      {/* Test Buttons */}
      <div style={{marginBottom: '20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
        <button 
          className="btn btn-secondary"
          onClick={async () => {
            try {
              console.log('🔍 Testing backend connection...')
              const response = await fetch('/api/stats')
              const data = await response.json()
              console.log('✅ Backend connected:', data)
              alert('✅ Backend is working!\n\nLLM: ' + data.overview.llm_provider + '\nDatabase: ' + data.overview.database)
            } catch (error) {
              console.error('❌ Backend connection failed:', error)
              alert('❌ Backend connection failed!\n\nError: ' + error.message + '\n\nMake sure backend is running on port 8000')
            }
          }}
        >
          🔧 Test Backend
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={async () => {
            try {
              console.log('🎤 Testing microphone...')
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              console.log('✅ Microphone access granted')
              
              // Get audio tracks
              const tracks = stream.getAudioTracks()
              console.log('🎤 Audio tracks:', tracks)
              
              if (tracks.length > 0) {
                const track = tracks[0]
                console.log('🎤 Active microphone:', track.label)
                alert('✅ Microphone is working!\n\nDevice: ' + track.label + '\n\nYou can now start the voice call.')
              }
              
              // Stop the stream
              stream.getTracks().forEach(track => track.stop())
            } catch (error) {
              console.error('❌ Microphone test failed:', error)
              alert('❌ Microphone test failed!\n\nError: ' + error.message + '\n\nPlease:\n1. Connect a microphone\n2. Allow microphone access\n3. Check Windows sound settings')
            }
          }}
        >
          🎤 Test Microphone
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => {
            const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
            console.log('🗣️ Speech Recognition supported:', isSupported)
            console.log('🌐 Browser:', navigator.userAgent)
            
            if (isSupported) {
              alert('✅ Speech Recognition is supported!\n\nBrowser: ' + (navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Edge') ? 'Edge' : 'Other') + '\n\nYou can use voice call feature.')
            } else {
              alert('❌ Speech Recognition NOT supported!\n\nPlease use:\n• Google Chrome\n• Microsoft Edge\n• Brave\n\nFirefox and Safari are not supported.')
            }
          }}
        >
          🗣️ Test Speech Recognition
        </button>
      </div>
      
      <div className="call-container">
        {/* Business Selection Info */}
        <div style={{
          maxWidth: '400px', 
          margin: '0 auto 20px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '2px solid #667eea'
        }}>
          <div style={{fontSize: '0.9em', color: '#666', marginBottom: '5px'}}>
            Currently Selected:
          </div>
          <div style={{fontSize: '1.1em', fontWeight: 'bold', color: '#667eea'}}>
            {businessName !== 'default' ? businessName : 'General Business'}
          </div>
          <div style={{fontSize: '0.85em', color: '#888', marginTop: '3px'}}>
            Type: {businessTypes[businessType]?.name || businessType}
          </div>
        </div>
        
        <div className="form-group" style={{maxWidth: '400px', margin: '0 auto 15px'}}>
          <label>Select Business Type</label>
          <select 
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            disabled={isCallActive}
          >
            {Object.keys(businessTypes).map(type => (
              <option key={type} value={type}>
                {businessTypes[type]?.name || type}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{maxWidth: '400px', margin: '0 auto 20px'}}>
          <label>Business Name</label>
          {availableBusinessNames.length > 0 ? (
            <select
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              disabled={isCallActive}
            >
              {availableBusinessNames.map(business => (
                <option key={business.business_name} value={business.business_name}>
                  {business.business_name} ({business.knowledge_count} entries)
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter business name or use 'default'"
              disabled={isCallActive}
              style={{padding: '8px', fontSize: '14px'}}
            />
          )}
          <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
            {availableBusinessNames.length > 0 
              ? 'Select from available businesses' 
              : 'No businesses found for this type. Add knowledge first or use "default"'}
          </small>
        </div>

        <div className="form-group" style={{maxWidth: '400px', margin: '0 auto 30px'}}>
          <label>Select Language</label>
          <select 
            value={`${selectedLanguage}|${selectedVoice}`}
            onChange={(e) => {
              const [lang, voice] = e.target.value.split('|')
              setSelectedLanguage(lang)
              setSelectedVoice(voice)
            }}
            disabled={isCallActive}
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        <div className={`call-avatar ${isCallActive ? 'calling' : ''}`}>
          <div className="avatar-icon">🤖</div>
        </div>

        <div className="call-status" style={{color: statusColor}}>
          {statusText}
        </div>

        <div className="call-controls">
          {!isCallActive ? (
            <>
              <button className="call-btn call-btn-start" onClick={startVoiceCall}>
                📞 Start Call
              </button>
              <button 
                className="btn btn-info" 
                style={{marginTop: '10px', padding: '10px 20px', fontSize: '14px'}}
                onClick={async () => {
                  console.log('🧪 Testing full voice pipeline...')
                  try {
                    // Test chat API
                    console.log('1️⃣ Testing chat API...')
                    const chatResponse = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: 'Hello, this is a test',
                        use_knowledge: false,
                        session_id: 'test-' + Date.now()
                      })
                    })
                    const chatData = await chatResponse.json()
                    console.log('✅ Chat API response:', chatData)
                    
                    // Test TTS API
                    console.log('2️⃣ Testing TTS API...')
                    const ttsResponse = await fetch('/api/tts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: 'This is a test',
                        voice: selectedVoice
                      })
                    })
                    const ttsData = await ttsResponse.json()
                    console.log('✅ TTS API response:', ttsData)
                    
                    alert('✅ Full pipeline test successful!\n\nChat: ' + chatData.response.substring(0, 50) + '...\nTTS: Audio generated (' + ttsData.audio_size + ' bytes)')
                  } catch (error) {
                    console.error('❌ Pipeline test failed:', error)
                    alert('❌ Pipeline test failed: ' + error.message)
                  }
                }}
              >
                🧪 Test Full Pipeline
              </button>
            </>
          ) : (
            <button className="call-btn call-btn-end" onClick={endVoiceCall}>
              📵 End Call
            </button>
          )}
        </div>

        {transcript.length > 0 && (
          <div className="call-transcript">
            <h3>📝 Call Transcript</h3>
            <div className="transcript-content">
              {transcript.map((item, index) => (
                <div key={index} className={`transcript-item ${item.speaker}`}>
                  <div style={{fontSize: '0.85rem', opacity: 0.7, marginBottom: '3px'}}>
                    {item.speaker === 'user' ? '👤 You' : '🤖 AI'} - {item.time}
                  </div>
                  <div>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceCall
