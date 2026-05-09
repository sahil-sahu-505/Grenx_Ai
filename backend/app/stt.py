import whisper
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class WhisperSTT:
    """Speech-to-Text using OpenAI Whisper (free, open source)"""
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize Whisper model
        Models: tiny, base, small, medium, large
        base is good balance of speed and accuracy
        """
        logger.info(f"Loading Whisper {model_size} model...")
        self.model = whisper.load_model(model_size)
        logger.info("Whisper model loaded successfully")
    
    async def transcribe(self, audio_data: bytes, language: Optional[str] = None) -> str:
        """
        Transcribe audio to text
        
        Args:
            audio_data: Raw audio bytes
            language: Optional language code (e.g., 'en', 'hi')
        
        Returns:
            Transcribed text
        """
        try:
            # Convert bytes to numpy array
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Transcribe
            result = self.model.transcribe(
                audio_np,
                language=language,
                fp16=False
            )
            
            text = result["text"].strip()
            logger.info(f"Transcribed: {text}")
            return text
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""
    
    async def transcribe_file(self, audio_path: str, language: Optional[str] = None) -> str:
        """Transcribe audio file"""
        try:
            result = self.model.transcribe(audio_path, language=language)
            return result["text"].strip()
        except Exception as e:
            logger.error(f"File transcription error: {e}")
            return ""
