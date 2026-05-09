import logging
from typing import Optional
from app.stt import WhisperSTT
from app.llm import VoiceAgent
from app.tts import EdgeTTS
from app.database import db

logger = logging.getLogger(__name__)

class VoicePipeline:
    """Complete voice pipeline: Audio → STT → LLM → TTS → Audio"""
    
    def __init__(
        self,
        language: str = "en",
        llm_provider: str = "groq",
        knowledge_base: Optional[str] = None
    ):
        """
        Initialize voice pipeline
        
        Args:
            language: Language code (en, hi, etc.)
            llm_provider: 'groq' or 'gemini'
            knowledge_base: Optional knowledge base text
        """
        logger.info("Initializing voice pipeline...")
        
        # Initialize components
        self.stt = WhisperSTT(model_size="base")
        self.agent = VoiceAgent(provider=llm_provider, knowledge_base=knowledge_base)
        self.tts = EdgeTTS(voice=language)
        
        self.language = language
        self.call_transcript = []
        
        logger.info("Voice pipeline ready")
    
    async def process_audio(self, audio_data: bytes) -> bytes:
        """
        Process audio input and return audio response
        
        Args:
            audio_data: Input audio bytes
        
        Returns:
            Response audio bytes
        """
        try:
            # 1. Speech to Text
            user_text = await self.stt.transcribe(audio_data, language=self.language)
            if not user_text:
                return b""
            
            self.call_transcript.append({"role": "user", "text": user_text})
            
            # 2. LLM Response
            ai_response = await self.agent.respond(user_text)
            self.call_transcript.append({"role": "assistant", "text": ai_response})
            
            # 3. Text to Speech
            response_audio = await self.tts.synthesize(ai_response)
            
            return response_audio
            
        except Exception as e:
            logger.error(f"Pipeline error: {e}")
            return b""
    
    async def process_text(self, text: str) -> str:
        """Process text input (for testing without audio)"""
        try:
            response = await self.agent.respond(text)
            return response
        except Exception as e:
            logger.error(f"Text processing error: {e}")
            return "Sorry, I encountered an error."
    
    async def end_call(self):
        """Save call log and cleanup"""
        try:
            call_data = {
                "transcript": self.call_transcript,
                "language": self.language,
                "message_count": len(self.call_transcript)
            }
            await db.save_call_log(call_data)
            logger.info("Call log saved")
        except Exception as e:
            logger.error(f"Failed to save call log: {e}")
        
        self.call_transcript = []
        self.agent.reset()
