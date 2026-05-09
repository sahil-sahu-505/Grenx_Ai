from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.voice_pipeline import VoicePipeline
from app.database import init_db
from api_routes import router as api_router
from auth_routes import router as auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Voice Agent Platform...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="AI Voice Agent API",
    description="Free AI voice agent platform with Ollama + PostgreSQL",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(auth_router, tags=["Authentication"])
app.include_router(api_router, prefix="/api", tags=["API"])

@app.get("/")
async def root():
    return {
        "message": "AI Voice Agent Platform API",
        "status": "running",
        "version": "1.0.0",
        "features": {
            "llm": "Ollama (Local)",
            "database": "PostgreSQL",
            "tts": "Edge-TTS",
            "knowledge_base": "RAG with pgvector"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    pipeline = VoicePipeline()
    
    try:
        while True:
            data = await websocket.receive_bytes()
            response = await pipeline.process_audio(data)
            await websocket.send_bytes(response)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
