"""
Additional API routes for the voice agent
"""

from fastapi import APIRouter, HTTPException, Request, File, UploadFile
from pydantic import BaseModel
from typing import Optional, List
from app.database import db
from app.llm import VoiceAgent
from app.tts import EdgeTTS
from app.advanced_rag import advanced_rag
from app.conversation_manager import conversation_manager
from app.analytics import analytics
from app.monitoring import monitor
from app.rate_limiter import rate_limiter
from app.logger import app_logger
from app.business_agents import get_agent_config, list_business_types
from psycopg2.extras import RealDictCursor
import os
import time
import logging

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    use_knowledge: bool = True
    session_id: Optional[str] = None
    use_semantic_search: bool = False
    business_type: str = "general"  # restaurant, hotel, salon, etc.
    business_name: str = "default"  # Specific business: "Hotel Taj", "Pizza Hut"

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[dict]] = None
    session_id: str

class TTSRequest(BaseModel):
    text: str
    voice: str = "en"

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"
    
class KnowledgeEntry(BaseModel):
    title: str
    content: str
    business_type: str = "general"  # restaurant, hotel, salon, etc.
    business_name: str = "default"  # Specific business name: "Hotel Taj", "Pizza Hut", etc.
    generate_embedding: bool = True

class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 5

class CallbackRequest(BaseModel):
    name: str
    business_name: str = None
    phone: str
    email: str = None
    need: str = None

# Initialize agent
llm_provider = os.getenv("LLM_PROVIDER", "ollama")

# Note: Middleware should be added to main app, not router
# Rate limiting will be checked in each endpoint instead

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with AI agent - OPTIMIZED FOR LOW LATENCY"""
    try:
        start_time = time.time()
        monitor.increment_request()
        
        # Create or get session
        session_id = request.session_id
        if not session_id:
            session_id = conversation_manager.create_session()
        
        # Get conversation history (last 5 messages for context)
        conversation_history = conversation_manager.get_messages(session_id, limit=5)
        
        # Add user message to session
        conversation_manager.add_message(session_id, "user", request.message)
        
        # Search knowledge base - OPTIMIZED
        context = None
        sources = None
        
        if request.use_knowledge:
            if request.use_semantic_search:
                # Use semantic search with embeddings
                results = advanced_rag.semantic_search(request.message, limit=2)
            else:
                # Use basic text search with business type and name filter
                results = await db.search_knowledge(
                    request.message, 
                    limit=3,  # Increased to 3 for better context
                    business_type=request.business_type,
                    business_name=request.business_name
                )
            
            print(f"🔍 Knowledge search for: '{request.message}' (business: {request.business_type}/{request.business_name})")
            print(f"📚 Found {len(results) if results else 0} results")
            if results:
                for r in results:
                    print(f"  - {r.get('title', 'No title')} [Type: {r.get('business_type', 'N/A')}, Name: {r.get('business_name', 'N/A')}]")
            
            if results:
                # Use full context for better responses
                context = "\n\n".join([
                    f"[{doc['title']}]\n{doc['content']}"
                    for doc in results
                ])
                sources = [{"title": doc["title"], "id": doc["id"]} for doc in results]
                print(f"✅ Using knowledge context ({len(context)} chars)")
        
        # Get business-specific agent configuration
        agent_config = get_agent_config(request.business_type)
        
        # Enhance system prompt with business name and conversation awareness
        enhanced_prompt = agent_config["system_prompt"]
        if request.business_name and request.business_name != "default":
            enhanced_prompt = f"""You are the AI assistant for {request.business_name}.

{agent_config["system_prompt"]}

CRITICAL RULES:
1. You are {request.business_name} - always refer to yourself as "{request.business_name}"
2. ONLY answer questions about {request.business_name} using the knowledge base
3. DO NOT repeat what the customer says back to them
4. DO NOT greet the customer again if the conversation has already started
5. Continue the conversation naturally - you're in the middle of a call
6. Keep responses SHORT and focused on the customer's question
7. If asked about something not in the knowledge base, say "Let me check what we have" then list available items"""
        
        # Add conversation history to prompt if exists
        if conversation_history and len(conversation_history) > 0:
            enhanced_prompt += f"\n\nCONVERSATION SO FAR: This is an ongoing conversation. You have already greeted the customer. Continue naturally without repeating greetings."
        
        # Create agent with context and business-specific prompt
        agent = VoiceAgent(
            provider=llm_provider, 
            knowledge_base=context,
            custom_prompt=enhanced_prompt
        )
        
        # Get response with timeout
        response = await agent.respond(request.message)
        
        # Limit response length for faster TTS
        if len(response) > 300:
            response = response[:300] + "..."
        
        # Add agent response to session
        conversation_manager.add_message(session_id, "assistant", response, {
            "sources": sources
        })
        
        # Log performance
        duration = time.time() - start_time
        print(f"Chat response time: {duration:.2f}s")
        
        return ChatResponse(response=response, sources=sources, session_id=session_id)
        
    except Exception as e:
        monitor.increment_error()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech and return audio data"""
    try:
        from fastapi.responses import Response
        import base64
        
        tts = EdgeTTS(voice=request.voice)
        audio = await tts.synthesize(request.text)
        
        # Return audio as base64 so it can be played in browser
        audio_base64 = base64.b64encode(audio).decode('utf-8')
        
        return {
            "success": True,
            "audio_size": len(audio),
            "audio_base64": audio_base64,
            "message": "Audio generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/translate")
async def translate_text(request: TranslateRequest):
    """Translate text using Google Translate (free)"""
    try:
        from deep_translator import GoogleTranslator
        
        # Map language codes
        lang_map = {
            "en": "en", "hi": "hi", "ta": "ta", "te": "te",
            "bn": "bn", "gu": "gu", "kn": "kn", "ml": "ml",
            "mr": "mr", "pa": "pa"
        }
        
        source = lang_map.get(request.source_lang, "auto")
        target = lang_map.get(request.target_lang, "en")
        
        if source == "auto":
            translator = GoogleTranslator(source='auto', target=target)
        else:
            translator = GoogleTranslator(source=source, target=target)
        
        translated = translator.translate(request.text)
        
        return {
            "success": True,
            "original_text": request.text,
            "translated_text": translated,
            "source_lang": request.source_lang,
            "target_lang": request.target_lang
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/knowledge")
async def get_knowledge(limit: int = 50):
    """Get all knowledge base entries - OPTIMIZED"""
    try:
        # Use direct SQL for faster retrieval
        if not db.conn:
            return {"count": 0, "entries": []}
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get only essential fields for listing
        cursor.execute("""
            SELECT id, title, 
                   SUBSTRING(content, 1, 200) as content,
                   business_type, business_name,
                   CASE WHEN embedding IS NOT NULL THEN true ELSE false END as embedding,
                   created_at
            FROM knowledge_base
            ORDER BY created_at DESC
            LIMIT %s
        """, (limit,))
        
        results = cursor.fetchall()
        cursor.close()
        
        return {
            "count": len(results),
            "entries": [dict(row) for row in results]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge")
async def add_knowledge(entry: KnowledgeEntry):
    """Add new knowledge entry with business type and name"""
    try:
        if entry.generate_embedding:
            # Use advanced RAG with embeddings
            success = advanced_rag.add_document_with_embedding(entry.title, entry.content)
        else:
            # Use basic storage with business type and name
            success = await db.save_knowledge_doc({
                "title": entry.title,
                "content": entry.content,
                "metadata": None,
                "business_type": entry.business_type,
                "business_name": entry.business_name
            })
        
        if success:
            return {"success": True, "message": f"Knowledge added for {entry.business_name} ({entry.business_type})"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add knowledge")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge/semantic-search")
async def semantic_search(request: SemanticSearchRequest):
    """Semantic search using embeddings"""
    try:
        results = advanced_rag.semantic_search(request.query, limit=request.limit)
        return {
            "query": request.query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge/update-embeddings")
async def update_embeddings():
    """Update embeddings for all knowledge entries"""
    try:
        count = advanced_rag.update_all_embeddings()
        return {
            "success": True,
            "updated_count": count,
            "message": f"Updated {count} embeddings"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/call-logs")
async def get_call_logs(limit: int = 50):
    """Get recent call logs"""
    try:
        logs = await db.get_call_logs(limit=limit)
        return {
            "count": len(logs),
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/call-logs/{call_id}")
async def get_call_detail(call_id: int):
    """Get detailed information for a specific call"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get call details
        cursor.execute("""
            SELECT * FROM call_logs WHERE id = %s
        """, (call_id,))
        
        call = cursor.fetchone()
        cursor.close()
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        # Convert to dict and add additional fields
        call_dict = dict(call)
        
        # Parse transcript if it's stored as JSON string
        if call_dict.get('transcript'):
            import json
            try:
                if isinstance(call_dict['transcript'], str):
                    call_dict['transcript'] = json.loads(call_dict['transcript'])
            except:
                pass
        
        # Add mock data for fields not yet in database
        if not call_dict.get('sentiment'):
            call_dict['sentiment'] = 'neutral'
        if not call_dict.get('resolved'):
            call_dict['resolved'] = True
        if not call_dict.get('confidence_score'):
            call_dict['confidence_score'] = '85%'
        
        return call_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/call-logs/{call_id}/flag")
async def flag_call(call_id: int):
    """Flag a call for review"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        # Update call with flagged status
        cursor.execute("""
            UPDATE call_logs 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"flagged": true}'::jsonb
            WHERE id = %s
        """, (call_id,))
        
        db.conn.commit()
        cursor.close()
        
        return {"success": True, "message": "Call flagged for review"}
        
    except Exception as e:
        logger.error(f"Failed to flag call: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    """Get comprehensive system statistics - FAST"""
    try:
        # Use faster queries with limits
        knowledge_count = 0
        call_count = 0
        
        if db.conn:
            db._ensure_connection()
            cursor = db.conn.cursor()
            
            # Fast count queries
            cursor.execute("SELECT COUNT(*) FROM knowledge_base")
            knowledge_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM call_logs")
            call_count = cursor.fetchone()[0]
            
            cursor.close()
        
        return {
            "overview": {
                "knowledge_entries": knowledge_count,
                "total_calls": call_count,
                "llm_provider": llm_provider,
                "database": "PostgreSQL (Neon)",
                "tts": "Edge-TTS"
            },
            "quality_metrics": {
                "avg_messages_per_call": 3.5  # Static for now
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/calls")
async def get_call_analytics(days: int = 7):
    """Get detailed call analytics"""
    try:
        stats = analytics.get_call_stats(days=days)
        popular = analytics.get_popular_queries(limit=10)
        hourly = analytics.get_hourly_distribution()
        
        return {
            "stats": stats,
            "popular_queries": popular,
            "hourly_distribution": hourly
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/quality")
async def get_quality_metrics():
    """Get response quality metrics"""
    try:
        return analytics.get_response_quality()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation/{session_id}")
async def get_conversation(session_id: str):
    """Get conversation by session ID"""
    try:
        conversation = conversation_manager.get_conversation(session_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation/{session_id}/summary")
async def get_conversation_summary(session_id: str):
    """Get conversation summary"""
    try:
        summary = conversation_manager.get_summary(session_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return summary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Comprehensive health check"""
    try:
        health = monitor.get_system_health()
        return {
            "status": health["status"],
            "system": health,
            "services": {
                "database": "healthy",
                "llm": llm_provider,
                "tts": "edge-tts"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-types")
async def get_business_types():
    """Get list of available business types"""
    try:
        types = list_business_types()
        configs = {t: get_agent_config(t) for t in types}
        return {
            "business_types": types,
            "configs": {
                t: {
                    "name": configs[t]["name"],
                    "greeting": configs[t]["greeting"]
                } for t in types
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-names")
async def get_business_names(business_type: str = None):
    """Get list of available business names, optionally filtered by type"""
    try:
        if not db.conn:
            return {"business_names": []}
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if business_name column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='knowledge_base' AND column_name='business_name'
        """)
        has_business_name = cursor.fetchone() is not None
        
        if not has_business_name:
            # Column doesn't exist yet, return empty list
            cursor.close()
            return {"business_names": []}
        
        if business_type:
            # Get business names for specific type
            cursor.execute("""
                SELECT DISTINCT business_name, business_type, COUNT(*) as knowledge_count
                FROM knowledge_base
                WHERE business_type = %s
                GROUP BY business_name, business_type
                ORDER BY business_name
            """, (business_type,))
        else:
            # Get all business names
            cursor.execute("""
                SELECT DISTINCT business_name, business_type, COUNT(*) as knowledge_count
                FROM knowledge_base
                GROUP BY business_name, business_type
                ORDER BY business_type, business_name
            """)
        
        results = cursor.fetchall()
        cursor.close()
        
        return {
            "business_names": [dict(row) for row in results]
        }
    except Exception as e:
        logger.error(f"Failed to get business names: {e}")
        return {"business_names": []}

@router.get("/metrics")
async def get_metrics():
    """Get system metrics"""
    try:
        return monitor.get_system_health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/fix-database")
async def fix_database():
    """Admin endpoint to add missing database columns"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        # Add business_type column
        cursor.execute("""
            ALTER TABLE knowledge_base 
            ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'general'
        """)
        
        # Add business_name column
        cursor.execute("""
            ALTER TABLE knowledge_base 
            ADD COLUMN IF NOT EXISTS business_name VARCHAR(100) DEFAULT 'default'
        """)
        
        db.conn.commit()
        cursor.close()
        
        return {
            "success": True,
            "message": "Database columns added successfully! Refresh your browser."
        }
    except Exception as e:
        logger.error(f"Failed to fix database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/setup-demo-knowledge")
async def setup_demo_knowledge():
    """Admin endpoint to clear all knowledge and add demo data"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        # Clear existing knowledge
        logger.info("Clearing existing knowledge...")
        cursor.execute("DELETE FROM knowledge_base")
        db.conn.commit()
        
        # Demo knowledge data
        demo_data = [
            # RESTAURANTS
            ("restaurant", "Pizza Hut", "Pizza Hut Menu and Info", """Welcome to Pizza Hut! We are a restaurant serving delicious pizzas and Italian food.

Our menu includes:
- Margherita Pizza - ₹299
- Pepperoni Pizza - ₹399
- Veggie Supreme Pizza - ₹349
- Garlic Bread - ₹99
- Pasta Alfredo - ₹199
- Coke - ₹50

We offer home delivery and takeout.
Phone: +91 98765 11111
Location: Downtown, Main Street
Hours: 11 AM to 11 PM daily
Delivery time: 30-40 minutes
Minimum order: ₹200
Payment: Cash, Card, UPI accepted"""),
            
            ("restaurant", "McDonald's", "McDonald's Menu and Info", """Welcome to McDonald's! We serve burgers, fries, and fast food.

Our menu includes:
- Big Mac - ₹250
- McChicken Burger - ₹180
- Veg Burger - ₹120
- French Fries - ₹80
- Chicken Nuggets - ₹150
- McFlurry Ice Cream - ₹100

We offer quick service and delivery.
Phone: +91 98765 22222
Location: Mall Road, City Center
Hours: 10 AM to 12 AM daily
Delivery time: 20-30 minutes
Minimum order: ₹150
Payment: Cash, Card, UPI accepted"""),
            
            # HOTELS
            ("hotel", "Hotel Taj", "Hotel Taj Rooms and Services", """Welcome to Hotel Taj! We are a luxury hotel offering premium accommodation.

Room types and rates:
- Standard Room - ₹5000 per night
- Deluxe Room - ₹8000 per night
- Executive Suite - ₹12000 per night
- Presidential Suite - ₹20000 per night

Amenities:
- Swimming pool, Gym, Spa
- Restaurant and Bar
- Free WiFi and Parking
- 24/7 Room Service

Check-in: 2 PM
Check-out: 11 AM
Phone: +91 98765 33333
Location: Beach Road, Premium Area
Cancellation: Free up to 24 hours before check-in"""),
            
            ("hotel", "Marriott Hotel", "Marriott Hotel Rooms and Services", """Welcome to Marriott Hotel! We offer comfortable stays and excellent service.

Room types and rates:
- Classic Room - ₹4000 per night
- Superior Room - ₹6000 per night
- Junior Suite - ₹9000 per night
- Royal Suite - ₹15000 per night

Amenities:
- Fitness center and Pool
- Multi-cuisine Restaurant
- Business Center
- Free WiFi throughout

Check-in: 3 PM
Check-out: 12 PM
Phone: +91 98765 44444
Location: Airport Road, Business District
Cancellation: Free up to 48 hours before arrival"""),
            
            # SALONS
            ("salon", "Glamour Spa", "Glamour Spa Services and Prices", """Welcome to Glamour Spa! We offer beauty and wellness services.

Our services:
- Haircut (Men) - ₹300
- Haircut (Women) - ₹500
- Hair Color - ₹1500
- Facial - ₹800
- Manicure - ₹400
- Pedicure - ₹500
- Full Body Massage - ₹2000
- Bridal Makeup - ₹5000

We use premium products and have expert stylists.
Phone: +91 98765 55555
Location: Fashion Street, Downtown
Hours: 10 AM to 8 PM (Closed Mondays)
Appointment required
Cancellation: 24 hours notice required"""),
            
            ("salon", "Beauty Studio", "Beauty Studio Services and Prices", """Welcome to Beauty Studio! Your destination for beauty and grooming.

Our services:
- Men's Haircut - ₹250
- Women's Haircut - ₹400
- Hair Spa - ₹1200
- Facial Treatment - ₹600
- Nail Art - ₹300
- Waxing - ₹500
- Threading - ₹100
- Party Makeup - ₹3000

Walk-ins welcome!
Phone: +91 98765 66666
Location: Mall Complex, 2nd Floor
Hours: 9 AM to 9 PM daily
Online booking available
Membership discounts available"""),
            
            # CLINICS
            ("clinic", "City Health Clinic", "City Health Clinic Services", """Welcome to City Health Clinic! We provide quality healthcare services.

Our doctors:
- Dr. Sharma - General Physician (₹500)
- Dr. Patel - Pediatrician (₹600)
- Dr. Kumar - Cardiologist (₹800)
- Dr. Singh - Dermatologist (₹700)

Services:
- General consultation
- Health checkups
- Lab tests available
- Vaccination
- Minor procedures

Phone: +91 98765 77777
Location: Hospital Road, Medical District
Hours: 8 AM to 8 PM (Mon-Sat), 9 AM to 2 PM (Sun)
Emergency: 24/7
Appointment recommended
Insurance accepted"""),
            
            ("clinic", "MediCare Center", "MediCare Center Services", """Welcome to MediCare Center! Your trusted healthcare partner.

Our specialists:
- Dr. Reddy - General Medicine (₹400)
- Dr. Gupta - Orthopedic (₹700)
- Dr. Mehta - ENT Specialist (₹600)
- Dr. Verma - Gynecologist (₹800)

Facilities:
- Digital X-Ray
- Ultrasound
- ECG
- Pharmacy on-site
- Home visit available

Phone: +91 98765 88888
Location: Main Road, City Center
Hours: 7 AM to 10 PM daily
Walk-in and appointments both accepted
All major insurance accepted"""),
            
            # SHOPS
            ("shop", "Fashion Store", "Fashion Store Products", """Welcome to Fashion Store! We sell trendy clothing and accessories.

Our products:
- Men's T-Shirts - ₹500-₹1000
- Women's Tops - ₹600-₹1500
- Jeans - ₹1200-₹2500
- Dresses - ₹1500-₹3000
- Shoes - ₹1000-₹3000
- Bags - ₹800-₹2000
- Accessories - ₹200-₹1000

We offer latest fashion trends.
Phone: +91 98765 99999
Location: Shopping Mall, Ground Floor
Hours: 10 AM to 10 PM daily
Home delivery available
Easy returns within 7 days
Payment: Cash, Card, UPI, EMI available"""),
            
            ("shop", "Electronics Hub", "Electronics Hub Products", """Welcome to Electronics Hub! We sell electronics and gadgets.

Our products:
- Mobile Phones - ₹10000-₹80000
- Laptops - ₹30000-₹150000
- Headphones - ₹500-₹5000
- Smart Watches - ₹2000-₹20000
- Cameras - ₹15000-₹100000
- Gaming Consoles - ₹25000-₹50000
- Accessories - ₹100-₹5000

Authorized dealer for all major brands.
Phone: +91 98765 00000
Location: Tech Plaza, 1st Floor
Hours: 10 AM to 9 PM daily
Free home delivery
1 year warranty on all products
EMI options available"""),
            
            # GYMS
            ("gym", "Fitness First Gym", "Fitness First Gym Membership", """Welcome to Fitness First Gym! Get fit with us!

Membership plans:
- Monthly - ₹2000
- Quarterly - ₹5000 (Save ₹1000)
- Half Yearly - ₹9000 (Save ₹3000)
- Yearly - ₹15000 (Save ₹9000)

Facilities:
- Modern equipment
- Personal trainers
- Cardio zone
- Weight training
- Zumba and Yoga classes
- Steam and Sauna
- Locker rooms

Phone: +91 98765 12345
Location: Sports Complex, Near Stadium
Hours: 5 AM to 11 PM daily
Free trial session available
Diet consultation included"""),
            
            ("gym", "PowerHouse Gym", "PowerHouse Gym Membership", """Welcome to PowerHouse Gym! Build your strength!

Membership plans:
- 1 Month - ₹1500
- 3 Months - ₹4000
- 6 Months - ₹7000
- 12 Months - ₹12000

Features:
- Professional trainers
- CrossFit area
- Functional training
- Group classes
- Nutrition guidance
- Supplements store
- Parking available

Phone: +91 98765 54321
Location: Gym Street, Fitness Zone
Hours: 6 AM to 10 PM (Mon-Sat), 7 AM to 8 PM (Sun)
Student discounts available
Couple membership offers""")
        ]
        
        # Insert demo data
        logger.info("Adding demo knowledge...")
        for business_type, business_name, title, content in demo_data:
            cursor.execute("""
                INSERT INTO knowledge_base (title, content, business_type, business_name, metadata)
                VALUES (%s, %s, %s, %s, %s)
            """, (title, content, business_type, business_name, None))
        
        db.conn.commit()
        cursor.close()
        
        return {
            "success": True,
            "message": "Demo knowledge added successfully! 12 businesses (2 per type)",
            "businesses": {
                "restaurants": ["Pizza Hut", "McDonald's"],
                "hotels": ["Hotel Taj", "Marriott Hotel"],
                "salons": ["Glamour Spa", "Beauty Studio"],
                "clinics": ["City Health Clinic", "MediCare Center"],
                "shops": ["Fashion Store", "Electronics Hub"],
                "gyms": ["Fitness First Gym", "PowerHouse Gym"]
            }
        }
    except Exception as e:
        logger.error(f"Failed to setup demo knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/callback-request")
async def create_callback_request(request: CallbackRequest):
    """Save callback request from landing page contact form"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        # Insert callback request
        cursor.execute("""
            INSERT INTO callback_requests (name, business_name, phone, email, need, status)
            VALUES (%s, %s, %s, %s, %s, 'new')
            RETURNING id
        """, (
            request.name,
            request.business_name,
            request.phone,
            request.email,
            request.need
        ))
        
        request_id = cursor.fetchone()[0]
        db.conn.commit()
        cursor.close()
        
        logger.info(f"New callback request created: {request_id} - {request.name} ({request.phone})")
        
        return {
            "success": True,
            "message": "Thank you! We'll call you back within 24 hours.",
            "request_id": request_id
        }
    except Exception as e:
        logger.error(f"Failed to save callback request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/phone-numbers")
async def get_phone_numbers():
    """Get user's assigned phone numbers"""
    try:
        # Mock data for now - will be replaced with actual user data
        phone_numbers = [
            {
                "id": 1,
                "number": "+91 98765 43210",
                "status": "active",
                "assigned_date": "2026-01-15T00:00:00",
                "total_calls": 156,
                "calls_this_month": 42,
                "forwarding_number": "+91 98765 00000"
            }
        ]
        
        return {"phone_numbers": phone_numbers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/phone-numbers/{phone_id}/status")
async def update_phone_status(phone_id: int):
    """Update phone number status"""
    try:
        # Mock implementation
        return {"success": True, "message": "Status updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/phone-numbers/{phone_id}/forwarding")
async def update_phone_forwarding(phone_id: int):
    """Update call forwarding number"""
    try:
        # Mock implementation
        return {"success": True, "message": "Forwarding updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/phone-numbers/request")
async def request_phone_number():
    """Request additional phone number"""
    try:
        # Mock implementation - would send email to admin
        return {"success": True, "message": "Request submitted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations")
async def get_integrations():
    """Get user's integrations"""
    try:
        # Mock data - will be replaced with actual database query
        integrations = [
            {
                "id": 1,
                "integration_type": "zoho",
                "status": "connected",
                "last_sync": "2026-05-09T10:00:00"
            }
        ]
        
        return {"integrations": integrations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str):
    """Disconnect an integration"""
    try:
        # Mock implementation
        return {"success": True, "message": "Integration disconnected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/{integration_id}/test")
async def test_integration(integration_id: str):
    """Test integration connection"""
    try:
        # Mock implementation
        return {"success": True, "message": "Connection successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/billing/usage")
async def get_billing_usage():
    """Get billing and usage information"""
    try:
        # Mock data - will be replaced with actual user data
        billing_data = {
            "wallet_balance": 2500.00,
            "total_calls": 156,
            "minutes_used": 342,
            "plan_minutes": 1000,
            "total_cost": 1453.50,
            "avg_cost_per_call": 9.32,
            "invoices": [
                {
                    "id": 1,
                    "date": "2026-05-01T00:00:00",
                    "description": "Monthly usage - April 2026",
                    "amount": 1200.00,
                    "status": "paid"
                },
                {
                    "id": 2,
                    "date": "2026-04-01T00:00:00",
                    "description": "Monthly usage - March 2026",
                    "amount": 980.50,
                    "status": "paid"
                }
            ]
        }
        
        return billing_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/billing/topup")
async def topup_wallet():
    """Initiate wallet top-up"""
    try:
        # Mock implementation - would integrate with Razorpay
        import random
        order_id = f"order_{random.randint(100000, 999999)}"
        
        return {
            "success": True,
            "order_id": order_id,
            "message": "Payment initiated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/billing/invoice/{invoice_id}")
async def download_invoice(invoice_id: int):
    """Download invoice PDF"""
    try:
        # Mock implementation - would generate actual PDF
        from fastapi.responses import Response
        
        pdf_content = b"Mock PDF content"
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice-{invoice_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Campaign Management Endpoints
@router.get("/campaigns")
async def get_campaigns():
    """Get all outbound campaigns"""
    try:
        if not db.conn:
            return {"campaigns": []}
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT * FROM campaigns 
            ORDER BY created_at DESC
        """)
        
        campaigns = cursor.fetchall()
        cursor.close()
        
        return {"campaigns": [dict(row) for row in campaigns]}
    except Exception as e:
        logger.error(f"Failed to get campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns")
async def create_campaign(request: Request):
    """Create new outbound campaign with CSV upload"""
    try:
        # Get JSON data from request body
        body = await request.json()
        
        name = body.get('name')
        script = body.get('script')
        calling_hours_start = body.get('calling_hours_start', '10:00')
        calling_hours_end = body.get('calling_hours_end', '18:00')
        business_name = body.get('business_name')
        business_type = body.get('business_type', 'general')
        
        if not name or not script:
            raise HTTPException(status_code=400, detail="Name and script are required")
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Create campaign
        cursor.execute("""
            INSERT INTO campaigns (
                name, script, business_name, business_type,
                calling_hours_start, calling_hours_end, status
            ) VALUES (%s, %s, %s, %s, %s, %s, 'draft')
            RETURNING id
        """, (name, script, business_name, business_type, calling_hours_start, calling_hours_end))
        
        campaign_id = cursor.fetchone()['id']
        db.conn.commit()
        cursor.close()
        
        logger.info(f"Created campaign: {campaign_id} - {name}")
        
        return {
            "success": True,
            "message": "Campaign created successfully",
            "campaign_id": campaign_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: int, request: Request):
    """Update campaign status (active/paused)"""
    try:
        body = await request.json()
        new_status = body.get("status")
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        cursor.execute("""
            UPDATE campaigns 
            SET status = %s, updated_at = NOW()
            WHERE id = %s
        """, (new_status, campaign_id))
        
        db.conn.commit()
        cursor.close()
        
        logger.info(f"Updated campaign {campaign_id} status to: {new_status}")
        
        return {
            "success": True,
            "message": f"Campaign status updated to {new_status}"
        }
    except Exception as e:
        logger.error(f"Failed to update campaign status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns/{campaign_id}/results")
async def download_campaign_results(campaign_id: int):
    """Download campaign results as CSV"""
    try:
        from fastapi.responses import Response
        import io
        
        # Mock CSV data
        csv_content = """Name,Phone,Status,Duration,Outcome,Timestamp
John Doe,+91 98765 11111,Connected,45s,Interested,2026-05-09 10:30:00
Jane Smith,+91 98765 22222,Connected,32s,Not Interested,2026-05-09 10:35:00
Bob Johnson,+91 98765 33333,No Answer,0s,No Answer,2026-05-09 10:40:00
Alice Brown,+91 98765 44444,Connected,67s,Callback Requested,2026-05-09 10:45:00
"""
        
        return Response(
            content=csv_content.encode('utf-8'),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=campaign-{campaign_id}-results.csv"}
        )
    except Exception as e:
        logger.error(f"Failed to download campaign results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns/{campaign_id}/leads")
async def get_campaign_leads(campaign_id: int):
    """Get all leads for a campaign"""
    try:
        if not db.conn:
            return {"leads": []}
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT * FROM campaign_leads 
            WHERE campaign_id = %s
            ORDER BY created_at DESC
        """, (campaign_id,))
        
        leads = cursor.fetchall()
        cursor.close()
        
        return {"leads": [dict(row) for row in leads]}
    except Exception as e:
        logger.error(f"Failed to get campaign leads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{campaign_id}/upload-leads")
async def upload_campaign_leads(campaign_id: int, file: UploadFile = File(...)):
    """Upload CSV file with leads for a campaign"""
    try:
        import csv
        import io
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Read CSV file
        contents = await file.read()
        csv_text = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        leads_added = 0
        for row in csv_reader:
            name = row.get('name', '').strip()
            phone = row.get('phone', '').strip()
            email = row.get('email', '').strip()
            
            if name and phone:
                cursor.execute("""
                    INSERT INTO campaign_leads (campaign_id, name, phone, email, status)
                    VALUES (%s, %s, %s, %s, 'pending')
                """, (campaign_id, name, phone, email if email else None))
                leads_added += 1
        
        # Update campaign total_leads
        cursor.execute("""
            UPDATE campaigns 
            SET total_leads = (SELECT COUNT(*) FROM campaign_leads WHERE campaign_id = %s),
                updated_at = NOW()
            WHERE id = %s
        """, (campaign_id, campaign_id))
        
        db.conn.commit()
        cursor.close()
        
        logger.info(f"Uploaded {leads_added} leads to campaign {campaign_id}")
        
        return {
            "success": True,
            "message": f"Successfully uploaded {leads_added} leads",
            "leads_added": leads_added
        }
    except Exception as e:
        logger.error(f"Failed to upload leads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{campaign_id}/send-link")
async def send_call_link(campaign_id: int, request: Request):
    """Send call link to a lead via WhatsApp or Email"""
    try:
        body = await request.json()
        lead_id = body.get("lead_id")
        method = body.get("method")  # 'whatsapp' or 'email'
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get lead and campaign info
        cursor.execute("""
            SELECT cl.*, c.name as campaign_name, c.business_name
            FROM campaign_leads cl
            JOIN campaigns c ON c.id = cl.campaign_id
            WHERE cl.id = %s AND cl.campaign_id = %s
        """, (lead_id, campaign_id))
        
        lead = cursor.fetchone()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Generate unique call link
        import secrets
        from datetime import datetime, timedelta
        
        link_id = secrets.token_urlsafe(16)
        expires_at = datetime.now() + timedelta(days=7)
        
        # Save call link
        cursor.execute("""
            INSERT INTO call_links (link_id, campaign_id, lead_id, expires_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (link_id, campaign_id, lead_id, expires_at))
        
        # Update lead status and link_id
        cursor.execute("""
            UPDATE campaign_leads 
            SET status = 'link_sent', 
                call_link_id = %s,
                last_contact = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """, (link_id, lead_id))
        
        db.conn.commit()
        
        # Generate call link URL
        call_link = f"http://localhost:5173/call?id={link_id}&lead={lead_id}"
        
        logger.info(f"Generated call link for lead {lead_id}: {call_link}")
        
        if method == "whatsapp":
            # WhatsApp message template
            from urllib.parse import quote
            message = f"Hello {lead['name']}! {lead['business_name']} would like to speak with you. Click here to connect: {call_link}"
            encoded_message = quote(message)
            whatsapp_url = f"https://wa.me/{lead['phone'].replace('+', '').replace(' ', '')}?text={encoded_message}"
            logger.info(f"WhatsApp URL: {whatsapp_url}")
            
        elif method == "email":
            # Email template
            logger.info(f"Email to {lead['email']} with link: {call_link}")
        
        cursor.close()
        
        return {
            "success": True,
            "message": f"Call link sent via {method}",
            "link": call_link,
            "whatsapp_url": whatsapp_url if method == "whatsapp" else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send call link: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/call-link/{link_id}")
async def get_call_link_data(link_id: str, lead: int = None):
    """Get call link data for customer"""
    try:
        if not lead:
            raise HTTPException(status_code=400, detail="Lead ID is required")
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get call link with campaign and lead info
        cursor.execute("""
            SELECT 
                cl.link_id,
                cl.status as link_status,
                cl.expires_at,
                c.id as campaign_id,
                c.name as campaign_name,
                c.script,
                c.business_name,
                c.business_type,
                l.id as lead_id,
                l.name as lead_name,
                l.phone,
                l.email
            FROM call_links cl
            JOIN campaigns c ON c.id = cl.campaign_id
            JOIN campaign_leads l ON l.id = cl.lead_id
            WHERE cl.link_id = %s AND l.id = %s
        """, (link_id, lead))
        
        result = cursor.fetchone()
        cursor.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Invalid or expired link")
        
        # Check if expired
        from datetime import datetime
        if result['expires_at'] and result['expires_at'] < datetime.now():
            raise HTTPException(status_code=404, detail="Link has expired")
        
        call_data = {
            "link_id": result['link_id'],
            "lead_id": result['lead_id'],
            "lead_name": result['lead_name'],
            "campaign_id": result['campaign_id'],
            "campaign_name": result['campaign_name'],
            "business_name": result['business_name'] or "Our Company",
            "business_type": result['business_type'] or "general",
            "script": result['script'],
            "greeting": f"Hello {result['lead_name']}! Thank you for connecting with us.",
            "valid": True
        }
        
        return call_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call link data: {e}")
        raise HTTPException(status_code=404, detail="Invalid or expired link")

@router.post("/call-link/{link_id}/track")
async def track_call_link_event(link_id: str, request: Request):
    """Track call link events (clicked, message, completed)"""
    try:
        body = await request.json()
        lead_id = body.get("lead_id")
        event = body.get("event")  # 'clicked', 'message', 'completed'
        data = body.get("data", {})
        
        if not db.conn:
            return {"success": True, "message": "Event tracked (no DB)"}
        
        db._ensure_connection()
        cursor = db.conn.cursor()
        
        logger.info(f"Call link event: {event} for lead {lead_id}")
        
        # Update call link clicks
        if event == "clicked":
            cursor.execute("""
                UPDATE call_links 
                SET clicks = clicks + 1, last_clicked = NOW()
                WHERE link_id = %s
            """, (link_id,))
            
            cursor.execute("""
                UPDATE campaign_leads 
                SET status = 'clicked', last_contact = NOW(), updated_at = NOW()
                WHERE id = %s
            """, (lead_id,))
        
        # Save transcript on completion
        elif event == "completed":
            import json
            transcript_json = json.dumps(data.get('transcript', []))
            
            cursor.execute("""
                UPDATE campaign_leads 
                SET status = 'completed', 
                    transcript = %s::jsonb,
                    call_attempts = call_attempts + 1,
                    last_contact = NOW(),
                    updated_at = NOW()
                WHERE id = %s
            """, (transcript_json, lead_id))
            
            # Update campaign stats
            cursor.execute("""
                UPDATE campaigns 
                SET calls_made = calls_made + 1,
                    calls_connected = calls_connected + 1,
                    calls_resolved = calls_resolved + 1
                WHERE id = (SELECT campaign_id FROM campaign_leads WHERE id = %s)
            """, (lead_id,))
        
        db.conn.commit()
        cursor.close()
        
        return {"success": True, "message": "Event tracked"}
    except Exception as e:
        logger.error(f"Failed to track call link event: {e}")
        return {"success": False, "message": str(e)}
