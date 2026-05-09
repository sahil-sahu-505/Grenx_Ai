import { useState } from 'react'
import './TextToSpeech.css'

const API_URL = '/api'

function TextToSpeech() {
  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [voice, setVoice] = useState('en-US-AriaNeural')
  const [isGenerating, setIsGenerating] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioSize, setAudioSize] = useState(0)

  const voices = [
    { value: 'en-US-AriaNeural', label: 'English (US) - Aria' },
    { value: 'hi-IN-SwaraNeural', label: 'Hindi - Swara' },
    { value: 'bn-IN-TanishaaNeural', label: 'Bengali - Tanishaa' },
    { value: 'te-IN-ShrutiNeural', label: 'Telugu - Shruti' },
    { value: 'mr-IN-AarohiNeural', label: 'Marathi - Aarohi' },
    { value: 'ta-IN-PallaviNeural', label: 'Tamil - Pallavi' },
    { value: 'gu-IN-DhwaniNeural', label: 'Gujarati - Dhwani' },
    { value: 'kn-IN-SapnaNeural', label: 'Kannada - Sapna' },
    { value: 'ml-IN-SobhanaNeural', label: 'Malayalam - Sobhana' },
    { value: 'pa-IN-SukhwinderNeural', label: 'Punjabi - Sukhwinder' }
  ]

  const languages = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'bn', label: 'Bengali' },
    { value: 'te', label: 'Telugu' },
    { value: 'mr', label: 'Marathi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'kn', label: 'Kannada' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'pa', label: 'Punjabi' }
  ]

  const generateSpeech = async () => {
    if (!text.trim()) {
      alert('Please enter text to convert')
      return
    }

    setIsGenerating(true)
    setTranslatedText('')
    setAudioUrl(null)

    try {
      const targetLang = voice.split('-')[0]
      let finalText = text

      // Translate if needed
      if (sourceLang !== targetLang && sourceLang !== 'auto') {
        const translateResponse = await fetch(`${API_URL}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            source_lang: sourceLang,
            target_lang: targetLang
          })
        })

        const translateData = await translateResponse.json()
        if (translateData.success) {
          finalText = translateData.translated_text
          setTranslatedText(finalText)
        }
      }

      // Generate speech
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalText, voice })
      })

      const data = await response.json()

      if (data.success && data.audio_base64) {
        const audioBlob = base64ToBlob(data.audio_base64, 'audio/mpeg')
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        setAudioSize(data.audio_size)
      }
    } catch (error) {
      console.error('TTS error:', error)
      alert('Failed to generate speech')
    } finally {
      setIsGenerating(false)
    }
  }

  const translateOnly = async () => {
    if (!text.trim()) {
      alert('Please enter text to translate')
      return
    }

    setIsGenerating(true)

    try {
      const targetLang = voice.split('-')[0]

      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      })

      const data = await response.json()

      if (data.success) {
        setTranslatedText(data.translated_text)
      }
    } catch (error) {
      console.error('Translation error:', error)
      alert('Failed to translate')
    } finally {
      setIsGenerating(false)
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

  const downloadAudio = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = 'speech.mp3'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="tts">
      <h2>Text-to-Speech</h2>

      <div className="form-group">
        <label>Enter Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Source Language</label>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Voice (Target Language)</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={generateSpeech}
          disabled={isGenerating || !text.trim()}
        >
          {isGenerating ? 'Processing...' : '🔊 Generate Speech'}
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={translateOnly}
          disabled={isGenerating || !text.trim()}
        >
          🌐 Translate Only
        </button>
      </div>

      {translatedText && (
        <div className="translation-result">
          <h4>Translation:</h4>
          <p>{translatedText}</p>
        </div>
      )}

      {audioUrl && (
        <div className="audio-result">
          <div className="success-message">
            ✅ Audio generated successfully!<br />
            Size: {(audioSize / 1024).toFixed(2)} KB
          </div>
          <audio controls autoPlay style={{width: '100%', marginTop: '15px'}}>
            <source src={audioUrl} type="audio/mpeg" />
          </audio>
          <button className="btn btn-secondary" onClick={downloadAudio} style={{marginTop: '10px'}}>
            ⬇️ Download Audio
          </button>
        </div>
      )}
    </div>
  )
}

export default TextToSpeech
