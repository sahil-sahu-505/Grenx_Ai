import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

function LandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    email: '',
    need: ''
  })
  const [formStatus, setFormStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormStatus({ type: '', message: '' })

    try {
      const response = await fetch('/api/callback-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setFormStatus({
          type: 'success',
          message: data.message || 'Thank you! We\'ll call you back within 24 hours.'
        })
        // Reset form
        setFormData({
          name: '',
          business_name: '',
          phone: '',
          email: '',
          need: ''
        })
      } else {
        setFormStatus({
          type: 'error',
          message: data.detail || 'Something went wrong. Please try again.'
        })
      }
    } catch (error) {
      setFormStatus({
        type: 'error',
        message: 'Failed to submit. Please check your connection and try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="logo">🤖 Voice AI SaaS</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <Link to="/login" className="btn btn-outline">Login</Link>
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Replace Your Call Center with AI Voice Agents</h1>
          <p className="hero-subtitle">
            Handle unlimited calls 24/7 at ₹4.25/minute • 12 Indian Languages • 99.9% Uptime
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary btn-large">Book Free Demo</Link>
            <a href="#pricing" className="btn btn-secondary btn-large">See Cost Savings</a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="stat">
          <div className="stat-number">500+</div>
          <div className="stat-label">Businesses Served</div>
        </div>
        <div className="stat">
          <div className="stat-number">₹4.25</div>
          <div className="stat-label">Per Minute</div>
        </div>
        <div className="stat">
          <div className="stat-number">99.9%</div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat">
          <div className="stat-number">12</div>
          <div className="stat-label">Languages</div>
        </div>
      </section>

      {/* Integrations */}
      <section className="integrations">
        <h3>Integrates with your existing tools</h3>
        <div className="integration-logos">
          <div className="logo-item">Zoho CRM</div>
          <div className="logo-item">Google Sheets</div>
          <div className="logo-item">WhatsApp</div>
          <div className="logo-item">Slack</div>
          <div className="logo-item">Jira</div>
          <div className="logo-item">Gmail</div>
          <div className="logo-item">MailChimp</div>
          <div className="logo-item">Facebook</div>
        </div>
      </section>

      {/* Why Voice AI */}
      <section id="features" className="why-voice-ai">
        <h2>Why Voice AI?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">🕐</div>
            <h3>24/7 Availability</h3>
            <p>Never miss a call. Your AI agent works round the clock, even on holidays.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🎓</div>
            <h3>One-Time Training</h3>
            <p>Train once with your business info. No repeated training needed.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📊</div>
            <h3>Detailed Reports</h3>
            <p>Get full transcripts, sentiment analysis, and call analytics.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">⚡</div>
            <h3>Easy Setup</h3>
            <p>Go live in 48 hours. No technical knowledge required.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🌍</div>
            <h3>Multilingual</h3>
            <p>Speak 12 Indian languages. Switch languages mid-call.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📈</div>
            <h3>Unlimited Scale</h3>
            <p>Handle 1 call or 10,000 calls simultaneously.</p>
          </div>
        </div>
      </section>

      {/* Human vs AI Comparison */}
      <section className="comparison">
        <h2>Human Employee vs AI Voice Agent</h2>
        <div className="comparison-grid">
          <div className="comparison-column human">
            <h3>👤 Human Employee</h3>
            <div className="cost-breakdown">
              <div className="cost-item">
                <span>Monthly Salary</span>
                <span>₹25,000</span>
              </div>
              <div className="cost-item">
                <span>PF + ESI (13%)</span>
                <span>₹3,250</span>
              </div>
              <div className="cost-item">
                <span>Bonus (8.33%)</span>
                <span>₹2,083</span>
              </div>
              <div className="cost-item">
                <span>Training Cost</span>
                <span>₹5,000</span>
              </div>
              <div className="cost-total">
                <span>Annual Cost</span>
                <span>₹4,23,996</span>
              </div>
            </div>
            <ul className="pros-cons">
              <li className="con">❌ Works 8 hours/day</li>
              <li className="con">❌ Takes leaves</li>
              <li className="con">❌ Needs training</li>
              <li className="con">❌ 1 call at a time</li>
            </ul>
          </div>

          <div className="comparison-column ai">
            <h3>🤖 AI Voice Agent</h3>
            <div className="cost-breakdown">
              <div className="cost-item">
                <span>One-time Setup</span>
                <span>₹40,000</span>
              </div>
              <div className="cost-item">
                <span>Per Minute Rate</span>
                <span>₹4.25</span>
              </div>
              <div className="cost-item">
                <span>1000 mins/month</span>
                <span>₹4,250</span>
              </div>
              <div className="cost-item">
                <span>Annual Cost</span>
                <span>₹91,000</span>
              </div>
              <div className="cost-total savings">
                <span>Save in Year 1</span>
                <span>₹2,92,996</span>
              </div>
            </div>
            <ul className="pros-cons">
              <li className="pro">✅ Works 24/7/365</li>
              <li className="pro">✅ Never takes leave</li>
              <li className="pro">✅ Train once</li>
              <li className="pro">✅ Unlimited calls</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Powerful Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎙️</div>
            <h3>Human-Like Voice</h3>
            <p>Natural conversations that customers love. Sounds just like a real person.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📞</div>
            <h3>Inbound + Outbound</h3>
            <p>Handle incoming calls and make outbound sales/reminder calls automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>CRM Integration</h3>
            <p>Auto-update Zoho, Salesforce, Google Sheets after every call.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Custom Knowledge Base</h3>
            <p>Upload your business docs. AI learns your products, services, policies.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-Time Analytics</h3>
            <p>Live dashboard with call volume, sentiment, resolution rate, and more.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Smart Human Handover</h3>
            <p>Transfer complex calls to humans seamlessly with full context.</p>
          </div>
        </div>
      </section>

      {/* Multilingual Section */}
      <section className="multilingual">
        <h2>Speak 12 Indian Languages</h2>
        <p className="section-subtitle">Covers 96% of Indian population • Switch languages mid-call</p>
        <div className="languages-grid">
          <div className="language">🇮🇳 Hindi (हिन्दी)</div>
          <div className="language">🇬🇧 English</div>
          <div className="language">🇮🇳 Gujarati (ગુજરાતી)</div>
          <div className="language">🇮🇳 Tamil (தமிழ்)</div>
          <div className="language">🇮🇳 Telugu (తెలుగు)</div>
          <div className="language">🇮🇳 Bengali (বাংলা)</div>
          <div className="language">🇮🇳 Marathi (मराठी)</div>
          <div className="language">🇮🇳 Malayalam (മലയാളം)</div>
          <div className="language">🇮🇳 Kannada (ಕನ್ನಡ)</div>
          <div className="language">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</div>
          <div className="language">🇮🇳 Odia (ଓଡ଼ିଆ)</div>
          <div className="language">🇮🇳 Assamese (অসমীয়া)</div>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="setup-steps">
        <h2>Go Live in 48 Hours</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h3>SOP Setup</h3>
            <p>Share your business process. We document everything.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Voice Design</h3>
            <p>Choose voice, language, personality. We customize it.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Integration & Testing</h3>
            <p>Connect your CRM. Test with real scenarios.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Go Live</h3>
            <p>Start receiving calls. We monitor 24/7.</p>
          </div>
        </div>
        <p className="setup-note">✨ We do all the technical work. You just provide business info.</p>
      </section>

      {/* Use Cases */}
      <section className="use-cases">
        <h2>Built for Every Industry</h2>
        <div className="use-cases-grid">
          <div className="use-case">
            <h3>🎧 Customer Support</h3>
            <p>Answer FAQs, track orders, resolve issues</p>
            <div className="use-case-stats">
              <span>70% call volume reduction</span>
              <span>24/7 availability</span>
            </div>
          </div>
          <div className="use-case">
            <h3>📈 Sales & Lead Qualification</h3>
            <p>Qualify leads, book demos, follow up</p>
            <div className="use-case-stats">
              <span>3x more calls/day</span>
              <span>50% cost reduction</span>
            </div>
          </div>
          <div className="use-case">
            <h3>📅 Appointment Booking</h3>
            <p>Schedule appointments, send reminders</p>
            <div className="use-case-stats">
              <span>90% booking accuracy</span>
              <span>Zero no-shows</span>
            </div>
          </div>
          <div className="use-case">
            <h3>💰 Surveys & Collections</h3>
            <p>Collect feedback, payment reminders</p>
            <div className="use-case-stats">
              <span>80% response rate</span>
              <span>60% faster collection</span>
            </div>
          </div>
        </div>
        <div className="industries">
          <h3>Industries We Serve</h3>
          <div className="industry-icons">
            <span>🏥 Healthcare</span>
            <span>💼 Finance</span>
            <span>🛒 E-Commerce</span>
            <span>🎓 Education</span>
            <span>🏠 Real Estate</span>
            <span>🔧 Services</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <h2>Simple, Transparent Pricing</h2>
        <p className="section-subtitle">No hidden fees • No lock-in • Cancel anytime</p>
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Setup</h3>
            <div className="price">₹40,000</div>
            <div className="price-label">One-time</div>
            <ul className="pricing-features">
              <li>✅ Complete SOP documentation</li>
              <li>✅ Voice & personality customization</li>
              <li>✅ Knowledge base setup</li>
              <li>✅ CRM integration</li>
              <li>✅ Testing & training</li>
              <li>✅ Go-live support</li>
            </ul>
            <Link to="/signup" className="btn btn-primary btn-block">Get Started</Link>
          </div>

          <div className="pricing-card featured">
            <div className="badge">Most Popular</div>
            <h3>Voice Calls</h3>
            <div className="price">₹4.25</div>
            <div className="price-label">Per Minute</div>
            <ul className="pricing-features">
              <li>✅ Unlimited concurrent calls</li>
              <li>✅ 12 Indian languages</li>
              <li>✅ Real-time transcripts</li>
              <li>✅ Sentiment analysis</li>
              <li>✅ Call recordings</li>
              <li>✅ 24/7 monitoring</li>
            </ul>
            <Link to="/signup" className="btn btn-primary btn-block">Get Started</Link>
          </div>

          <div className="pricing-card">
            <h3>Triggers</h3>
            <div className="price">₹0.01</div>
            <div className="price-label">Per Trigger</div>
            <ul className="pricing-features">
              <li>✅ CRM updates</li>
              <li>✅ WhatsApp notifications</li>
              <li>✅ Email alerts</li>
              <li>✅ Slack messages</li>
              <li>✅ Webhook calls</li>
              <li>✅ Custom automations</li>
            </ul>
            <Link to="/signup" className="btn btn-primary btn-block">Get Started</Link>
          </div>
        </div>
        <div className="trust-badges">
          <span>🔒 GDPR Compliant</span>
          <span>🛡️ SOC Type II</span>
          <span>🔐 End-to-End Encrypted</span>
          <span>📞 TRAI Approved</span>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>How long does setup take?</summary>
            <p>Typically 48 hours from payment to go-live. We handle all technical work.</p>
          </details>
          <details className="faq-item">
            <summary>How good is the voice quality?</summary>
            <p>Our AI uses advanced TTS that sounds 95% human-like. Most customers can't tell the difference.</p>
          </details>
          <details className="faq-item">
            <summary>Do I need any technical knowledge?</summary>
            <p>No! Just provide your business info. We handle all setup, integration, and maintenance.</p>
          </details>
          <details className="faq-item">
            <summary>Can the AI transfer calls to humans?</summary>
            <p>Yes! Smart handover when AI can't answer or customer requests human agent.</p>
          </details>
          <details className="faq-item">
            <summary>How does pricing compare to human agents?</summary>
            <p>Save 70-80% compared to hiring human agents. No salary, PF, ESI, or training costs.</p>
          </details>
          <details className="faq-item">
            <summary>What reports do I get?</summary>
            <p>Full transcripts, call recordings, sentiment analysis, resolution rate, and custom reports.</p>
          </details>
          <details className="faq-item">
            <summary>Which languages are supported?</summary>
            <p>12 Indian languages including Hindi, English, Tamil, Telugu, Bengali, and more.</p>
          </details>
          <details className="faq-item">
            <summary>Is there a minimum commitment?</summary>
            <p>No lock-in. Pay only for what you use. Cancel anytime.</p>
          </details>
          <details className="faq-item">
            <summary>Can I change the AI's behavior?</summary>
            <p>Yes! Update knowledge base, scripts, and personality anytime from dashboard.</p>
          </details>
          <details className="faq-item">
            <summary>What if I need help?</summary>
            <p>24/7 support via WhatsApp, email, and phone. Dedicated account manager included.</p>
          </details>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="contact">
        <h2>Get Free Callback</h2>
        <p className="section-subtitle">We'll call you within 2 hours</p>
        
        {formStatus.message && (
          <div className={`form-message ${formStatus.type}`}>
            {formStatus.message}
          </div>
        )}
        
        <form className="contact-form" onSubmit={handleSubmit}>
          <input 
            type="text" 
            name="name"
            placeholder="Your Name *" 
            value={formData.name}
            onChange={handleInputChange}
            required 
          />
          <input 
            type="text" 
            name="business_name"
            placeholder="Business Name" 
            value={formData.business_name}
            onChange={handleInputChange}
          />
          <input 
            type="tel" 
            name="phone"
            placeholder="Phone Number *" 
            value={formData.phone}
            onChange={handleInputChange}
            required 
          />
          <input 
            type="email" 
            name="email"
            placeholder="Email *" 
            value={formData.email}
            onChange={handleInputChange}
            required 
          />
          <select 
            name="need"
            value={formData.need}
            onChange={handleInputChange}
            required
          >
            <option value="">What do you need? *</option>
            <option value="Customer Support">Customer Support</option>
            <option value="Sales Calling">Sales Calling</option>
            <option value="Appointment Booking">Appointment Booking</option>
            <option value="Payment Reminders">Payment Reminders</option>
            <option value="Surveys">Surveys</option>
            <option value="Other">Other</option>
          </select>
          <button 
            type="submit" 
            className="btn btn-primary btn-large"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Get Free Callback'}
          </button>
        </form>
        <div className="contact-info">
          <div>📧 info@voiceai.com</div>
          <div>📞 +91 98765 43210</div>
          <div>📍 Mumbai, India</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-column">
            <h4>🤖 Voice AI SaaS</h4>
            <p>Replace your call center with AI</p>
          </div>
          <div className="footer-column">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
          <div className="footer-column">
            <h4>Solutions</h4>
            <a href="#use-cases">Customer Support</a>
            <a href="#use-cases">Sales</a>
            <a href="#use-cases">Appointments</a>
            <a href="#use-cases">Collections</a>
          </div>
          <div className="footer-column">
            <h4>Contact</h4>
            <a href="mailto:info@voiceai.com">Email Us</a>
            <a href="tel:+919876543210">Call Us</a>
            <a href="#contact">Get Callback</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Voice AI SaaS. All rights reserved. Made in India 🇮🇳</p>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a 
        href="https://wa.me/919876543210?text=Hi,%20I%20want%20to%20know%20more%20about%20Voice%20AI" 
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
      >
        💬
      </a>
    </div>
  )
}

export default LandingPage
