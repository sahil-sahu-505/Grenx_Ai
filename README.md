# 🤖 Grenx AI - Voice AI SaaS Platform

AI-powered voice agent platform for businesses with multi-language support, business-specific knowledge bases, and outbound campaign management.

## 🚀 Features

### Core Voice AI
- ✅ Real-time speech recognition (11 languages)
- ✅ LLM response generation (Groq API)
- ✅ Text-to-speech (Edge-TTS)
- ✅ Business-specific AI agents (7 types)
- ✅ Knowledge base with RAG

### Dashboard Features
- ✅ Campaign management
- ✅ Lead tracking with CSV upload
- ✅ Call logs with transcripts
- ✅ Analytics dashboard
- ✅ Knowledge base manager
- ✅ Phone number management
- ✅ Integrations (Zoho, Google Sheets, WhatsApp, Slack)
- ✅ Billing & usage tracking

### Outbound Campaigns
- ✅ Create campaigns with custom scripts
- ✅ Upload leads via CSV
- ✅ Generate unique call links
- ✅ WhatsApp integration
- ✅ Lead status tracking
- ✅ Manual call fallback

## 🛠️ Tech Stack

**Frontend:**
- React + Vite
- React Router
- Web Speech API

**Backend:**
- Python FastAPI
- PostgreSQL (Neon)
- Groq API (LLM)
- Edge-TTS

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Groq API key

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@host/database
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Setup database:
```bash
python setup_campaigns_db.py
```

Start backend:
```bash
python start_server.py
```

### Frontend Setup

```bash
cd frontend-react
npm install
npm run dev
```

## 🎯 Usage

### 1. Create Campaign
1. Go to Campaigns tab
2. Click "Create Campaign"
3. Fill in campaign details
4. Upload CSV with leads (format: name,phone,email)
5. Click "Create Campaign"

### 2. Manage Leads
1. Click "View Leads" on campaign
2. Send call links via WhatsApp/Email
3. Track lead status (Pending → Link Sent → Clicked → Completed)
4. Use manual call fallback for non-responders

### 3. Voice Calls
- Inbound: Use Voice Call tab
- Outbound: Use campaign call links or manual call button

## 📊 Database Schema

### Campaigns
- Campaign information
- Business details
- Calling hours
- Statistics (leads, calls made, connected, resolved)

### Campaign Leads
- Lead contact information
- Status tracking
- Call history
- Conversation transcripts

### Call Links
- Unique call link generation
- Expiry tracking
- Click analytics

## 🌐 Deployment

### Frontend (Vercel)
```bash
cd frontend-react
vercel deploy
```

### Backend (Render)
1. Create new Web Service on Render
2. Connect GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python start_server.py`
5. Add environment variables

## 🔧 Configuration

### Business Types
- Restaurant
- Hotel
- Salon
- Clinic
- Shop
- Gym
- General

### Supported Languages
English, Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Urdu

## 📝 API Endpoints

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/{id}/status` - Update status
- `GET /api/campaigns/{id}/leads` - Get leads
- `POST /api/campaigns/{id}/upload-leads` - Upload CSV
- `POST /api/campaigns/{id}/send-link` - Send call link

### Call Links
- `GET /api/call-link/{link_id}` - Get call data
- `POST /api/call-link/{link_id}/track` - Track events

### Voice & Chat
- `POST /api/chat` - Chat with AI
- `POST /api/tts` - Text-to-speech
- `GET /api/call-logs` - Get call logs

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License

## 🔗 Links

- [Groq API](https://console.groq.com)
- [Neon Database](https://neon.tech)
- [Edge-TTS](https://github.com/rany2/edge-tts)

## 📞 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for businesses to automate customer conversations**# Terminal 2 - Frontend  
cd frontend-react
npm run dev
```

### 5. Access

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## 📖 Usage

1. Go to **Voice Call** tab
2. Select **Business Type** (Restaurant, Hotel, Salon, etc.)
3. Select **Business Name** from dropdown
4. Select **Language**
5. Click **"📞 Start Call"**
6. Allow microphone access
7. Speak naturally!

## ✨ Features

- 🎤 Voice calls with speech recognition
- 🗣️ 11 languages supported
- 🏢 Multiple business types (Restaurant, Hotel, Salon, Clinic, Shop, Gym)
- 📚 Business-specific knowledge bases
- 🔊 Natural voice responses (Edge-TTS)
- 💬 Text chat alternative
- 📊 Analytics dashboard
- 100% FREE stack!

## 📝 Adding Your Business

1. Go to **Knowledge Base** tab
2. Click **"➕ Add Knowledge"**
3. Select business type
4. Enter business name (e.g., "My Restaurant")
5. Add content (menu, services, prices, hours)
6. **Leave "Generate embedding" UNCHECKED**
7. Save

Your business will appear in Voice Call dropdown!

## 🛠️ Troubleshooting

**Voice not working?**
- Use Chrome or Edge browser
- Allow microphone access
- Click "🎤 Test Microphone" button

**AI not using knowledge?**
- Select business name from dropdown (not "default")
- Check Knowledge Base tab has entries for that business

**Slow loading?**
- Don't use embeddings (leave checkbox unchecked)
- Check database connection

## 📁 Project Structure

```
backend/          # FastAPI backend
  app/            # Core modules
  api_routes.py   # API endpoints
  start_server.py # Server startup
  requirements.txt

frontend-react/   # React frontend
  src/
    components/   # UI components
  package.json

.env              # Environment variables (create this)
start_all.bat     # Windows startup script
README.md         # This file
```

## 🔧 API Endpoints

- `POST /api/chat` - Chat with AI
- `POST /api/tts` - Text-to-speech
- `GET /api/knowledge` - Get knowledge
- `POST /api/knowledge` - Add knowledge
- `GET /api/business-names` - List businesses
- `POST /api/admin/fix-database` - Setup database
- `POST /api/admin/setup-demo-knowledge` - Load demo data

Full docs: http://localhost:8000/docs

## 📄 License

MIT License - Free to use!

---

**Built with ❤️ using 100% free tools: Groq + Neon + Edge-TTS**
