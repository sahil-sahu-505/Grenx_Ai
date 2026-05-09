"""
User management module
"""
import logging
from typing import Optional, Dict, List
from datetime import datetime
from psycopg2.extras import RealDictCursor
from app.database import db
from app.auth import AuthManager

logger = logging.getLogger(__name__)


class UserManager:
    """Manage user accounts"""
    
    @staticmethod
    async def create_user(
        email: str,
        password: str,
        full_name: str,
        company_name: Optional[str] = None,
        phone: Optional[str] = None,
        role: str = "customer"
    ) -> Optional[Dict]:
        """Create a new user account"""
        if not db.conn:
            logger.error("Database not connected")
            return None
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor(cursor_factory=RealDictCursor)
            
            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                cursor.close()
                logger.warning(f"User already exists: {email}")
                return None
            
            # Hash password
            password_hash = AuthManager.hash_password(password)
            
            # Insert user
            cursor.execute("""
                INSERT INTO users (
                    email, password_hash, full_name, company_name, phone, role, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'active')
                RETURNING id, email, full_name, company_name, phone, role, 
                          wallet_balance, created_at
            """, (email, password_hash, full_name, company_name, phone, role))
            
            user = cursor.fetchone()
            db.conn.commit()
            cursor.close()
            
            logger.info(f"User created: {email}")
            return dict(user) if user else None
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            db.conn.rollback()
            return None
    
    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[Dict]:
        """Authenticate user and return user data"""
        if not db.conn:
            return None
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor(cursor_factory=RealDictCursor)
            
            # Get user
            cursor.execute("""
                SELECT id, email, password_hash, full_name, company_name, 
                       role, status, wallet_balance
                FROM users 
                WHERE email = %s
            """, (email,))
            
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                return None
            
            # Verify password
            if not AuthManager.verify_password(password, user['password_hash']):
                cursor.close()
                return None
            
            # Check if account is active
            if user['status'] != 'active':
                cursor.close()
                logger.warning(f"Inactive account login attempt: {email}")
                return None
            
            # Update last login
            cursor.execute("""
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (user['id'],))
            db.conn.commit()
            
            cursor.close()
            
            # Remove password hash from response
            user_dict = dict(user)
            del user_dict['password_hash']
            
            return user_dict
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    @staticmethod
    async def get_user_by_id(user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        if not db.conn:
            return None
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, email, full_name, company_name, phone, role, status,
                       wallet_balance, assigned_phone_number, fallback_phone_number,
                       agent_name, agent_voice, default_language, greeting_message,
                       business_hours, created_at, last_login
                FROM users 
                WHERE id = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            cursor.close()
            
            return dict(user) if user else None
            
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            return None
    
    @staticmethod
    async def update_user(user_id: int, updates: Dict) -> bool:
        """Update user profile"""
        if not db.conn or not updates:
            return False
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor()
            
            # Build update query dynamically
            allowed_fields = [
                'full_name', 'company_name', 'phone', 'agent_name', 
                'agent_voice', 'default_language', 'greeting_message',
                'business_hours', 'fallback_phone_number'
            ]
            
            update_fields = []
            values = []
            
            for field, value in updates.items():
                if field in allowed_fields:
                    update_fields.append(f"{field} = %s")
                    values.append(value)
            
            if not update_fields:
                return False
            
            values.append(user_id)
            
            query = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            
            cursor.execute(query, values)
            db.conn.commit()
            cursor.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            db.conn.rollback()
            return False
    
    @staticmethod
    async def update_wallet_balance(user_id: int, amount: float, description: str, reference_id: Optional[str] = None) -> bool:
        """Update user wallet balance and log transaction"""
        if not db.conn:
            return False
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor(cursor_factory=RealDictCursor)
            
            # Get current balance
            cursor.execute("SELECT wallet_balance FROM users WHERE id = %s", (user_id,))
            result = cursor.fetchone()
            
            if not result:
                cursor.close()
                return False
            
            current_balance = float(result['wallet_balance'])
            new_balance = current_balance + amount
            
            # Don't allow negative balance
            if new_balance < 0:
                cursor.close()
                logger.warning(f"Insufficient balance for user {user_id}")
                return False
            
            # Update balance
            cursor.execute("""
                UPDATE users 
                SET wallet_balance = %s 
                WHERE id = %s
            """, (new_balance, user_id))
            
            # Log transaction
            transaction_type = 'credit' if amount > 0 else 'debit'
            cursor.execute("""
                INSERT INTO transactions (
                    user_id, type, amount, description, reference_id, balance_after
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, transaction_type, abs(amount), description, reference_id, new_balance))
            
            db.conn.commit()
            cursor.close()
            
            logger.info(f"Wallet updated for user {user_id}: {amount} ({description})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update wallet: {e}")
            db.conn.rollback()
            return False
    
    @staticmethod
    async def get_all_users(limit: int = 100, offset: int = 0, status: Optional[str] = None) -> List[Dict]:
        """Get all users (admin only)"""
        if not db.conn:
            return []
        
        try:
            db._ensure_connection()
            cursor = db.conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT id, email, full_name, company_name, phone, role, status,
                       wallet_balance, assigned_phone_number, created_at, last_login
                FROM users 
                WHERE role = 'customer'
            """
            
            params = []
            
            if status:
                query += " AND status = %s"
                params.append(status)
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            users = cursor.fetchall()
            cursor.close()
            
            return [dict(user) for user in users]
            
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            return []


# Global instance
user_manager = UserManager()
