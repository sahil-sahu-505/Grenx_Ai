"""
Start the AI Voice Agent API Server
"""

import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    is_production = os.getenv("RENDER", False)  # Render sets this env var
    
    print("\n🚀 Starting AI Voice Agent Server")
    print("=" * 50)
    print(f"\n📍 Server: http://localhost:{port}")
    print(f"📖 API Docs: http://localhost:{port}/docs")
    print(f"🔍 Health Check: http://localhost:{port}/health")
    print("\n💡 Using:")
    print(f"   • LLM: {os.getenv('LLM_PROVIDER', 'ollama')}")
    print(f"   • Database: PostgreSQL (Neon)")
    print(f"   • TTS: Edge-TTS")
    print(f"   • Environment: {'Production' if is_production else 'Development'}")
    print("\n⏸️  Press Ctrl+C to stop\n")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,  # Disable reload in production to save memory
        log_level="info"
    )
