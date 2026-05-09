"""
Setup database tables for campaigns system
"""
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def setup_campaigns_tables():
    """Create campaigns and leads tables"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("Creating campaigns table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                id SERIAL PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                name VARCHAR(200) NOT NULL,
                script TEXT NOT NULL,
                business_name VARCHAR(100),
                business_type VARCHAR(50) DEFAULT 'general',
                status VARCHAR(20) DEFAULT 'draft',
                total_leads INTEGER DEFAULT 0,
                calls_made INTEGER DEFAULT 0,
                calls_connected INTEGER DEFAULT 0,
                calls_resolved INTEGER DEFAULT 0,
                calling_hours_start TIME DEFAULT '10:00',
                calling_hours_end TIME DEFAULT '18:00',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        print("Creating campaign_leads table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_leads (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                status VARCHAR(20) DEFAULT 'pending',
                call_link_id VARCHAR(50),
                call_attempts INTEGER DEFAULT 0,
                last_contact TIMESTAMP,
                outcome VARCHAR(50),
                notes TEXT,
                transcript JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        print("Creating call_links table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS call_links (
                id SERIAL PRIMARY KEY,
                link_id VARCHAR(50) UNIQUE NOT NULL,
                campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
                lead_id INTEGER REFERENCES campaign_leads(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'active',
                clicks INTEGER DEFAULT 0,
                last_clicked TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign 
            ON campaign_leads(campaign_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_leads_status 
            ON campaign_leads(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_call_links_link_id 
            ON call_links(link_id)
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Campaign tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    setup_campaigns_tables()
