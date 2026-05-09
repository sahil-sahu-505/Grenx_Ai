import edge_tts
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class EdgeTTS:
    """Text-to-Speech using Microsoft Edge TTS (free, unlimited)"""
    
    # Best voices for Indian languages
    VOICES = {
        "en": "en-IN-NeerjaNeural",  # Indian English Female
        "en-male": "en-IN-PrabhatNeural",  # Indian English Male
        "hi": "hi-IN-SwaraNeural",  # Hindi Female
        "hi-male": "hi-IN-MadhurNeural",  # Hindi Male
        "ta": "ta-IN-PallaviNeural",  # Tamil Female
        "te": "te-IN-ShrutiNeural",  # Telugu Female
        "bn": "bn-IN-TanishaaNeural",  # Bengali Female
        "gu": "gu-IN-DhwaniNeural",  # Gujarati Female
        "kn": "kn-IN-SapnaNeural",  # Kannada Female
        "ml": "ml-IN-SobhanaNeural",  # Malayalam Female
        "mr": "mr-IN-AarohiNeural",  # Marathi Female
    }
    
    def __init__(self, voice: str = "en", rate: str = "+0%", pitch: str = "+0Hz"):
        """
        Initialize Edge TTS
        
        Args:
            voice: Language code or voice name
            rate: Speech rate (-50% to +100%)
            pitch: Voice pitch (-50Hz to +50Hz)
        """
        self.voice = self.VOICES.get(voice, voice)
        self.rate = rate
        self.pitch = pitch
        logger.info(f"Edge TTS initialized with voice: {self.voice}")
    
    async def synthesize(self, text: str, output_path: Optional[str] = None) -> bytes:
        """
        Convert text to speech
        
        Args:
            text: Text to synthesize
            output_path: Optional file path to save audio
        
        Returns:
            Audio bytes
        """
        try:
            communicate = edge_tts.Communicate(
                text,
                voice=self.voice,
                rate=self.rate,
                pitch=self.pitch
            )
            
            audio_data = b""
            
            if output_path:
                await communicate.save(output_path)
                with open(output_path, "rb") as f:
                    audio_data = f.read()
            else:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_data += chunk["data"]
            
            logger.info(f"Synthesized {len(text)} characters")
            return audio_data
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return b""
    
    @staticmethod
    async def list_voices():
        """List all available voices"""
        voices = await edge_tts.list_voices()
        return voices
