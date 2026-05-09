-- Voice AI SaaS Database Schema
-- Run this to create all necessary tables

-- ============================================
-- USERS TABLE (Multi-tenant foundation)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(20),
    
    -- Account status
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    role VARCHAR(20) DEFAULT 'customer', -- customer, admin
    
    -- Billing
    plan VARCHAR(50) DEFAULT 'pay_as_you_go', -- pay_as_you_go, monthly, yearly
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Phone number assigned
    assigned_phone_number VARCHAR(20),
    fallback_phone_number VARCHAR(20), -- For human handover
    
    -- Settings
    agent_name VARCHAR(100) DEFAULT 'AI Assistant',
    agent_voice VARCHAR(20) DEFAULT 'female', -- male, female
    default_language VARCHAR(10) DEFAULT 'en-IN',
    greeting_message TEXT,
    business_hours JSONB, -- {"start": "09:00", "end": "18:00", "days": [1,2,3,4,5]}
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB
);

-- ============================================
-- UPDATE EXISTING TABLES - Add user_id
-- ============================================

-- Add user_id to knowledge_base
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to call_logs
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- ============================================
-- TRANSACTIONS TABLE (Billing)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- debit, credit
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- call_id, payment_id, etc.
    balance_after DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- CALLBACK REQUESTS TABLE (Landing page form)
-- ============================================
CREATE TABLE IF NOT EXISTS callback_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    need VARCHAR(100), -- Customer Support, Sales, etc.
    status VARCHAR(20) DEFAULT 'new', -- new, called, converted, not_interested
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- low_balance, campaign_ended, human_handover, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255), -- Optional link to related resource
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================
-- SESSIONS TABLE (Optional - for JWT alternative)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- INTEGRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- zoho, google_sheets, whatsapp, slack, etc.
    status VARCHAR(20) DEFAULT 'disconnected', -- connected, disconnected, error
    credentials JSONB, -- Encrypted API keys, tokens, etc.
    settings JSONB, -- Integration-specific settings
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- ============================================
-- CAMPAIGNS TABLE (Outbound calling)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed
    start_date DATE,
    end_date DATE,
    calling_hours JSONB, -- {"start": "10:00", "end": "18:00"}
    script TEXT,
    knowledge_base_id INTEGER,
    
    -- Stats
    total_leads INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    calls_connected INTEGER DEFAULT 0,
    calls_resolved INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ============================================
-- CAMPAIGN LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_leads (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    custom_fields JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, called, no_answer, resolved, failed
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    call_id INTEGER, -- Reference to call_logs
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);

-- ============================================
-- HUMAN HANDOVER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS human_handovers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    call_id INTEGER REFERENCES call_logs(id) ON DELETE CASCADE,
    reason VARCHAR(100), -- customer_request, low_confidence, escalation, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, resolved
    transcript TEXT,
    notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_handovers_user_id ON human_handovers(user_id);
CREATE INDEX IF NOT EXISTS idx_handovers_status ON human_handovers(status);

-- ============================================
-- DEFAULT ADMIN USER (Change password after first login!)
-- ============================================
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
    'admin@voiceai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhJ6VpW',
    'Admin User',
    'admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- User dashboard stats view
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT cl.id) as total_calls,
    SUM(cl.duration) as total_minutes,
    COUNT(DISTINCT CASE WHEN cl.sentiment = 'positive' THEN cl.id END) as positive_calls,
    COUNT(DISTINCT CASE WHEN cl.created_at::date = CURRENT_DATE THEN cl.id END) as calls_today,
    u.wallet_balance
FROM users u
LEFT JOIN call_logs cl ON cl.user_id = u.id
GROUP BY u.id, u.wallet_balance;

-- Admin revenue view
CREATE OR REPLACE VIEW admin_revenue_stats AS
SELECT 
    DATE_TRUNC('month', t.created_at) as month,
    SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as revenue,
    COUNT(DISTINCT t.user_id) as active_customers
FROM transactions t
GROUP BY DATE_TRUNC('month', t.created_at)
ORDER BY month DESC;
