"""
Conversation Manager - Track and manage multi-turn conversations
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class ConversationManager:
    """Manage conversation sessions and history"""
    
    def __init__(self):
        self.conversations: Dict[str, Dict] = {}
        logger.info("Conversation Manager initialized")
    
    def create_session(self, user_id: Optional[str] = None) -> str:
        """Create new conversation session"""
        session_id = str(uuid.uuid4())
        
        self.conversations[session_id] = {
            'session_id': session_id,
            'user_id': user_id,
            'created_at': datetime.now(),
            'last_activity': datetime.now(),
            'messages': [],
            'context': {},
            'sentiment': 'neutral'
        }
        
        logger.info(f"Created session: {session_id}")
        return session_id
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None):
        """Add message to conversation"""
        if session_id not in self.conversations:
            logger.warning(f"Session not found: {session_id}")
            return False
        
        message = {
            'role': role,
            'content': content,
            'timestamp': datetime.now(),
            'metadata': metadata or {}
        }
        
        self.conversations[session_id]['messages'].append(message)
        self.conversations[session_id]['last_activity'] = datetime.now()
        
        return True
    
    def get_conversation(self, session_id: str) -> Optional[Dict]:
        """Get conversation by session ID"""
        return self.conversations.get(session_id)
    
    def get_messages(self, session_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get messages from conversation"""
        if session_id not in self.conversations:
            return []
        
        messages = self.conversations[session_id]['messages']
        
        if limit:
            return messages[-limit:]
        
        return messages
    
    def update_context(self, session_id: str, key: str, value):
        """Update conversation context"""
        if session_id in self.conversations:
            self.conversations[session_id]['context'][key] = value
    
    def get_context(self, session_id: str, key: str):
        """Get context value"""
        if session_id in self.conversations:
            return self.conversations[session_id]['context'].get(key)
        return None
    
    def update_sentiment(self, session_id: str, sentiment: str):
        """Update conversation sentiment"""
        if session_id in self.conversations:
            self.conversations[session_id]['sentiment'] = sentiment
    
    def get_summary(self, session_id: str) -> Dict:
        """Get conversation summary"""
        if session_id not in self.conversations:
            return {}
        
        conv = self.conversations[session_id]
        
        return {
            'session_id': session_id,
            'message_count': len(conv['messages']),
            'duration': (conv['last_activity'] - conv['created_at']).seconds,
            'sentiment': conv['sentiment'],
            'context': conv['context']
        }
    
    def cleanup_old_sessions(self, max_age_hours: int = 24):
        """Remove old inactive sessions"""
        now = datetime.now()
        to_remove = []
        
        for session_id, conv in self.conversations.items():
            age_hours = (now - conv['last_activity']).seconds / 3600
            if age_hours > max_age_hours:
                to_remove.append(session_id)
        
        for session_id in to_remove:
            del self.conversations[session_id]
            logger.info(f"Cleaned up session: {session_id}")
        
        return len(to_remove)

# Global instance
conversation_manager = ConversationManager()
