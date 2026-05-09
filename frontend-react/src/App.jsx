import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CallLink from './pages/CallLink'
import Dashboard from './components/Dashboard'
import VoiceCall from './components/VoiceCall'
import Chat from './components/Chat'
import TextToSpeech from './components/TextToSpeech'
import KnowledgeBase from './components/KnowledgeBase'
import Analytics from './components/Analytics'
import CallLogs from './components/CallLogs'
import PhoneNumbers from './components/PhoneNumbers'
import Integrations from './components/Integrations'
import Billing from './components/Billing'
import Campaigns from './components/Campaigns'
import Header from './components/Header'
import Tabs from './components/Tabs'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Failed to parse user data:', e)
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
    
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5em'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={<LandingPage />} 
        />
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/signup" 
          element={
            user ? <Navigate to="/dashboard" /> : <Signup onLogin={handleLogin} />
          } 
        />

        {/* Public Call Link Route */}
        <Route 
          path="/call" 
          element={<CallLink />} 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <div className="app">
                <Header user={user} onLogout={handleLogout} />
                <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="content">
                  {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
                  {activeTab === 'voice-call' && <VoiceCall />}
                  {activeTab === 'chat' && <Chat />}
                  {activeTab === 'tts' && <TextToSpeech />}
                  {activeTab === 'knowledge' && <KnowledgeBase />}
                  {activeTab === 'analytics' && <Analytics />}
                  {activeTab === 'logs' && <CallLogs />}
                  {activeTab === 'phone-numbers' && <PhoneNumbers />}
                  {activeTab === 'integrations' && <Integrations />}
                  {activeTab === 'billing' && <Billing />}
                  {activeTab === 'campaigns' && <Campaigns />}
                </div>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route 
          path="*" 
          element={<Navigate to="/" />} 
        />
      </Routes>
    </Router>
  )
}

export default App
