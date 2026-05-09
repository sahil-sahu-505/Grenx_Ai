"""
Analytics and Insights for AI Voice Agent
"""

import psycopg2
from datetime import datetime, timedelta
from typing import Dict, List
import os
import logging

logger = logging.getLogger(__name__)

class Analytics:
    """Analytics and reporting for voice agent"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
    
    def get_call_stats(self, days: int = 7) -> Dict:
        """Get call statistics for last N days"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            since_date = datetime.now() - timedelta(days=days)
            
            # Total calls
            cursor.execute("""
                SELECT COUNT(*) FROM call_logs
                WHERE created_at >= %s
            """, (since_date,))
            total_calls = cursor.fetchone()[0]
            
            # Average duration
            cursor.execute("""
                SELECT AVG(duration) FROM call_logs
                WHERE created_at >= %s AND duration IS NOT NULL
            """, (since_date,))
            avg_duration = cursor.fetchone()[0] or 0
            
            # Calls by language
            cursor.execute("""
                SELECT language, COUNT(*) as count
                FROM call_logs
                WHERE created_at >= %s
                GROUP BY language
                ORDER BY count DESC
            """, (since_date,))
            by_language = dict(cursor.fetchall())
            
            # Sentiment distribution
            cursor.execute("""
                SELECT sentiment, COUNT(*) as count
                FROM call_logs
                WHERE created_at >= %s AND sentiment IS NOT NULL
                GROUP BY sentiment
            """, (since_date,))
            by_sentiment = dict(cursor.fetchall())
            
            cursor.close()
            conn.close()
            
            return {
                'total_calls': total_calls,
                'avg_duration_seconds': round(avg_duration, 2),
                'by_language': by_language,
                'by_sentiment': by_sentiment,
                'period_days': days
            }
            
        except Exception as e:
            logger.error(f"Failed to get call stats: {e}")
            return {}
    
    def get_knowledge_stats(self) -> Dict:
        """Get knowledge base statistics"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Total entries
            cursor.execute("SELECT COUNT(*) FROM knowledge_base")
            total = cursor.fetchone()[0]
            
            # With embeddings
            cursor.execute("SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL")
            with_embeddings = cursor.fetchone()[0]
            
            # Average content length
            cursor.execute("SELECT AVG(LENGTH(content)) FROM knowledge_base")
            avg_length = cursor.fetchone()[0] or 0
            
            cursor.close()
            conn.close()
            
            return {
                'total_entries': total,
                'with_embeddings': with_embeddings,
                'without_embeddings': total - with_embeddings,
                'avg_content_length': round(avg_length, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get knowledge stats: {e}")
            return {}
    
    def get_popular_queries(self, limit: int = 10) -> List[Dict]:
        """Get most common queries"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    transcript->>'user' as query,
                    COUNT(*) as frequency
                FROM call_logs
                WHERE transcript IS NOT NULL
                GROUP BY transcript->>'user'
                ORDER BY frequency DESC
                LIMIT %s
            """, (limit,))
            
            results = []
            for row in cursor.fetchall():
                if row[0]:  # Skip null queries
                    results.append({
                        'query': row[0],
                        'frequency': row[1]
                    })
            
            cursor.close()
            conn.close()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get popular queries: {e}")
            return []
    
    def get_hourly_distribution(self) -> Dict:
        """Get call distribution by hour of day"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    EXTRACT(HOUR FROM created_at) as hour,
                    COUNT(*) as count
                FROM call_logs
                GROUP BY hour
                ORDER BY hour
            """)
            
            distribution = {int(row[0]): row[1] for row in cursor.fetchall()}
            
            cursor.close()
            conn.close()
            
            return distribution
            
        except Exception as e:
            logger.error(f"Failed to get hourly distribution: {e}")
            return {}
    
    def get_response_quality(self) -> Dict:
        """Analyze response quality metrics"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Average messages per call
            cursor.execute("""
                SELECT AVG(message_count) FROM call_logs
                WHERE message_count IS NOT NULL
            """)
            avg_messages = cursor.fetchone()[0] or 0
            
            # Calls with positive sentiment
            cursor.execute("""
                SELECT COUNT(*) FROM call_logs
                WHERE sentiment IN ('positive', 'satisfied')
            """)
            positive_calls = cursor.fetchone()[0]
            
            # Total calls with sentiment
            cursor.execute("""
                SELECT COUNT(*) FROM call_logs
                WHERE sentiment IS NOT NULL
            """)
            total_with_sentiment = cursor.fetchone()[0] or 1
            
            cursor.close()
            conn.close()
            
            satisfaction_rate = (positive_calls / total_with_sentiment) * 100
            
            return {
                'avg_messages_per_call': round(avg_messages, 2),
                'satisfaction_rate': round(satisfaction_rate, 2),
                'positive_calls': positive_calls,
                'total_rated': total_with_sentiment
            }
            
        except Exception as e:
            logger.error(f"Failed to get response quality: {e}")
            return {}

# Global instance
analytics = Analytics()
