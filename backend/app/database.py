import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class Database:
    """PostgreSQL database client with connection pooling"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        
        if not self.database_url:
            logger.warning("DATABASE_URL not found. Database features disabled.")
            self.conn = None
            return
        
        self.conn = None
        self._connect()
    
    def _connect(self):
        """Establish database connection"""
        try:
            if self.conn:
                try:
                    self.conn.close()
                except:
                    pass
            
            self.conn = psycopg2.connect(
                self.database_url,
                connect_timeout=10,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5
            )
            logger.info("PostgreSQL database connected")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            self.conn = None
    
    def _ensure_connection(self):
        """Ensure database connection is alive"""
        if not self.conn:
            self._connect()
            return
        
        try:
            # Test connection
            cursor = self.conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
        except:
            logger.warning("Database connection lost, reconnecting...")
            self._connect()
    
    async def save_call_log(self, call_data: Dict) -> bool:
        """Save call log to database"""
        if not self.conn:
            return False
        
        try:
            self._ensure_connection()
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO call_logs (phone_number, duration, transcript, language, message_count, sentiment)
                VALUES (%(phone_number)s, %(duration)s, %(transcript)s, %(language)s, %(message_count)s, %(sentiment)s)
            """, call_data)
            self.conn.commit()
            cursor.close()
            return True
        except Exception as e:
            logger.error(f"Failed to save call log: {e}")
            self.conn.rollback()
            return False
    
    async def get_call_logs(self, limit: int = 50) -> List[Dict]:
        """Retrieve recent call logs"""
        if not self.conn:
            return []
        
        try:
            self._ensure_connection()
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT * FROM call_logs
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            results = cursor.fetchall()
            cursor.close()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to get call logs: {e}")
            return []
    
    async def save_knowledge_doc(self, doc_data: Dict) -> bool:
        """Save knowledge base document with business type and name"""
        if not self.conn:
            return False
        
        try:
            self._ensure_connection()
            cursor = self.conn.cursor()
            
            # Add business_type and business_name fields
            business_type = doc_data.get('business_type', 'general')
            business_name = doc_data.get('business_name', 'default')
            
            cursor.execute("""
                INSERT INTO knowledge_base (title, content, metadata, business_type, business_name)
                VALUES (%(title)s, %(content)s, %(metadata)s, %(business_type)s, %(business_name)s)
            """, {
                'title': doc_data['title'],
                'content': doc_data['content'],
                'metadata': doc_data.get('metadata'),
                'business_type': business_type,
                'business_name': business_name
            })
            self.conn.commit()
            cursor.close()
            return True
        except Exception as e:
            logger.error(f"Failed to save document: {e}")
            self.conn.rollback()
            return False
    
    async def search_knowledge(self, query: str, limit: int = 5, business_type: str = None, business_name: str = None) -> List[Dict]:
        """Search knowledge base with optional business type and name filter"""
        if not self.conn:
            return []
        
        try:
            self._ensure_connection()
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # If query is empty or very short, just return all docs for the business
            if not query or len(query.strip()) < 3:
                if business_type and business_name:
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        WHERE business_type = %s
                        AND (business_name = %s OR business_name = 'default')
                        ORDER BY 
                            CASE WHEN business_name = %s THEN 0 ELSE 1 END,
                            created_at DESC
                        LIMIT %s
                    """, (business_type, business_name, business_name, limit))
                elif business_type:
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        WHERE business_type = %s
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (business_type, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (limit,))
            else:
                # Extract keywords from query for better matching
                keywords = [word.lower() for word in query.split() if len(word) > 2]
                
                if business_type and business_name:
                    # Search for specific business instance
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        WHERE (content ILIKE %s OR title ILIKE %s)
                        AND business_type = %s
                        AND (business_name = %s OR business_name = 'default')
                        ORDER BY 
                            CASE WHEN business_name = %s THEN 0 ELSE 1 END,
                            created_at DESC
                        LIMIT %s
                    """, (f"%{query}%", f"%{query}%", business_type, business_name, business_name, limit))
                elif business_type:
                    # Search only for specific business type (all instances)
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        WHERE (content ILIKE %s OR title ILIKE %s)
                        AND (business_type = %s OR business_type = 'general')
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (f"%{query}%", f"%{query}%", business_type, limit))
                else:
                    # Search all knowledge
                    cursor.execute("""
                        SELECT * FROM knowledge_base
                        WHERE content ILIKE %s OR title ILIKE %s
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (f"%{query}%", f"%{query}%", limit))
            
            results = cursor.fetchall()
            
            # If no results with query, try returning all docs for the business
            if not results and business_type and business_name:
                cursor.execute("""
                    SELECT * FROM knowledge_base
                    WHERE business_type = %s
                    AND (business_name = %s OR business_name = 'default')
                    ORDER BY 
                        CASE WHEN business_name = %s THEN 0 ELSE 1 END,
                        created_at DESC
                    LIMIT %s
                """, (business_type, business_name, business_name, limit))
                results = cursor.fetchall()
            
            cursor.close()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to search knowledge: {e}")
            return []

# Global database instance
db = Database()

async def init_db():
    """Initialize database tables (run once)"""
    logger.info("Database initialization complete")
    # Tables should be created via Supabase dashboard:
    # - call_logs (id, phone_number, duration, transcript, sentiment, created_at)
    # - knowledge_base (id, title, content, embedding, created_at)
