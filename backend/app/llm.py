import os
from groq import Groq
import google.generativeai as genai
import httpx
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class LLMProvider:
    """LLM provider supporting Groq, Google Gemini, and Ollama (all free)"""
    
    def __init__(self, provider: str = "groq"):
        """
        Initialize LLM provider
        
        Args:
            provider: 'groq', 'gemini', or 'ollama'
        """
        self.provider = provider
        
        if provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY not found in environment")
            self.client = Groq(api_key=api_key)
            self.model = "llama-3.3-70b-versatile"  # Updated to supported model
            
        elif provider == "gemini":
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not found in environment")
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        
        elif provider == "ollama":
            # Ollama runs locally - no API key needed!
            self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
            self.model = os.getenv("OLLAMA_MODEL", "llama3.2")  # Default model
            logger.info(f"Using Ollama at {self.ollama_url} with model {self.model}")
        
        logger.info(f"LLM initialized with provider: {provider}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """
        Generate chat response
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Optional system instruction
            temperature: Creativity (0-1)
            max_tokens: Max response length
        
        Returns:
            AI response text
        """
        try:
            if self.provider == "groq":
                return await self._groq_chat(messages, system_prompt, temperature, max_tokens)
            elif self.provider == "gemini":
                return await self._gemini_chat(messages, system_prompt, temperature, max_tokens)
            elif self.provider == "ollama":
                return await self._ollama_chat(messages, system_prompt, temperature, max_tokens)
        except Exception as e:
            logger.error(f"LLM error: {e}")
            return "I apologize, I'm having trouble processing that right now."
    
    async def _groq_chat(self, messages, system_prompt, temperature, max_tokens):
        """Groq API call"""
        if system_prompt:
            messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    async def _gemini_chat(self, messages, system_prompt, temperature, max_tokens):
        """Gemini API call"""
        # Convert messages to Gemini format
        prompt = ""
        if system_prompt:
            prompt += f"System: {system_prompt}\n\n"
        
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
        
        prompt += "Assistant:"
        
        response = self.model.generate_content(
            prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens
            }
        )
        
        return response.text
    
    async def _ollama_chat(self, messages, system_prompt, temperature, max_tokens):
        """Ollama API call (local)"""
        # Prepare messages for Ollama
        ollama_messages = []
        
        if system_prompt:
            ollama_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        ollama_messages.extend(messages)
        
        # Call Ollama API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": ollama_messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["message"]["content"]
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")

class VoiceAgent:
    """AI Voice Agent with conversation memory"""
    
    def __init__(self, provider: str = "groq", knowledge_base: Optional[str] = None, custom_prompt: Optional[str] = None):
        self.llm = LLMProvider(provider)
        self.conversation_history: List[Dict[str, str]] = []
        self.knowledge_base = knowledge_base
        
        # Use custom prompt if provided, otherwise use default
        if custom_prompt:
            self.system_prompt = custom_prompt
        else:
            self.system_prompt = """You are a helpful AI voice assistant having a real-time voice conversation.
You can hear the user speaking and respond with your voice. Keep responses very concise (1-2 sentences).
Be friendly, natural, and conversational. Speak as if you're on a phone call."""
        
        if knowledge_base:
            self.system_prompt += f"\n\nKnowledge Base:\n{knowledge_base}"
    
    async def respond(self, user_message: str) -> str:
        """Generate response to user message"""
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        response = await self.llm.chat(
            messages=self.conversation_history,
            system_prompt=self.system_prompt,
            temperature=0.7,
            max_tokens=150  # Keep responses short for voice
        )
        
        self.conversation_history.append({
            "role": "assistant",
            "content": response
        })
        
        # Keep only last 10 messages to manage context
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        return response
    
    def reset(self):
        """Clear conversation history"""
        self.conversation_history = []
