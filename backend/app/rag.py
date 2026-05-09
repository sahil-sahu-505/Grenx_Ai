import logging
from typing import List, Dict
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from app.database import db

logger = logging.getLogger(__name__)

class RAGSystem:
    """Retrieval Augmented Generation for knowledge base"""
    
    def __init__(self):
        """Initialize RAG with free embeddings"""
        logger.info("Initializing RAG system...")
        
        # Use free HuggingFace embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        
        logger.info("RAG system ready")
    
    async def add_document(self, title: str, content: str) -> bool:
        """
        Add document to knowledge base
        
        Args:
            title: Document title
            content: Document content
        
        Returns:
            Success status
        """
        try:
            # Split into chunks
            chunks = self.text_splitter.split_text(content)
            
            # Generate embeddings and save
            for i, chunk in enumerate(chunks):
                embedding = self.embeddings.embed_query(chunk)
                
                doc_data = {
                    "title": f"{title} (Part {i+1})",
                    "content": chunk,
                    "embedding": embedding
                }
                
                await db.save_knowledge_doc(doc_data)
            
            logger.info(f"Added document: {title} ({len(chunks)} chunks)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            return False
    
    async def search(self, query: str, top_k: int = 3) -> str:
        """
        Search knowledge base and return relevant context
        
        Args:
            query: Search query
            top_k: Number of results
        
        Returns:
            Combined context string
        """
        try:
            # Search database
            results = await db.search_knowledge(query, limit=top_k)
            
            if not results:
                return ""
            
            # Combine results
            context = "\n\n".join([
                f"[{doc['title']}]\n{doc['content']}"
                for doc in results
            ])
            
            return context
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return ""
    
    async def get_enhanced_prompt(self, query: str) -> str:
        """Get query with relevant context"""
        context = await self.search(query)
        
        if context:
            return f"""Based on the following information, answer the question:

{context}

Question: {query}

Answer:"""
        else:
            return query

# Global RAG instance
rag = RAGSystem()
