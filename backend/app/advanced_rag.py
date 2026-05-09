"""
Advanced RAG with embeddings and semantic search
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sentence_transformers import SentenceTransformer
import logging
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AdvancedRAG:
    """Advanced RAG with semantic search using embeddings"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL not found in environment")
        
        self.model = SentenceTransformer('all-MiniLM-L6-v2')  # Free, fast embeddings
        logger.info("Advanced RAG initialized with sentence-transformers")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        embedding = self.model.encode(text)
        return embedding.tolist()
    
    def add_document_with_embedding(self, title: str, content: str) -> bool:
        """Add document with embedding to database"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Generate embedding
            embedding = self.generate_embedding(content)
            
            # Insert with embedding
            cursor.execute("""
                INSERT INTO knowledge_base (title, content, embedding)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (title, content, embedding))
            
            doc_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Added document with embedding: {title} (ID: {doc_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            return False
    
    def semantic_search(self, query: str, limit: int = 5) -> List[Dict]:
        """Semantic search using embeddings"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Generate query embedding
            query_embedding = self.generate_embedding(query)
            
            # Search using cosine similarity
            cursor.execute("""
                SELECT id, title, content, 
                       1 - (embedding <=> %s::vector) as similarity
                FROM knowledge_base
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (query_embedding, query_embedding, limit))
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'id': row['id'],
                    'title': row['title'],
                    'content': row['content'],
                    'similarity': float(row['similarity'])
                })
            
            cursor.close()
            conn.close()
            
            logger.info(f"Semantic search found {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    def update_all_embeddings(self) -> int:
        """Update embeddings for all documents without them"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Get documents without embeddings
            cursor.execute("""
                SELECT id, content FROM knowledge_base
                WHERE embedding IS NULL
            """)
            
            docs = cursor.fetchall()
            updated = 0
            
            for doc_id, content in docs:
                embedding = self.generate_embedding(content)
                
                cursor.execute("""
                    UPDATE knowledge_base
                    SET embedding = %s
                    WHERE id = %s
                """, (embedding, doc_id))
                
                updated += 1
                print(f"Updated embedding for document ID: {doc_id}")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Updated {updated} embeddings")
            return updated
            
        except Exception as e:
            logger.error(f"Failed to update embeddings: {e}")
            return 0

# Global instance
advanced_rag = AdvancedRAG()
