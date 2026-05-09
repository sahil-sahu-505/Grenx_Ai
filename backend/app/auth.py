"""
Authentication module - JWT-based authentication
"""
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()


class AuthManager:
    """Handle authentication operations"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def create_access_token(user_id: int, email: str, role: str = "customer") -> str:
        """Create a JWT access token"""
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return token
    
    @staticmethod
    def decode_token(token: str) -> Dict:
        """Decode and verify a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    @staticmethod
    def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
        """Get current user from JWT token (dependency for protected routes)"""
        token = credentials.credentials
        payload = AuthManager.decode_token(token)
        return payload
    
    @staticmethod
    def get_current_admin(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
        """Get current admin user (dependency for admin routes)"""
        token = credentials.credentials
        payload = AuthManager.decode_token(token)
        
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return payload


# Dependency functions for FastAPI routes
def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Dependency to get current user"""
    return AuthManager.get_current_user(credentials)


def get_current_admin_dep(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Dependency to get current admin"""
    return AuthManager.get_current_admin(credentials)


# Optional: Create a reset token for password reset
def create_reset_token(user_id: int) -> str:
    """Create a password reset token (valid for 1 hour)"""
    expire = datetime.utcnow() + timedelta(hours=1)
    
    payload = {
        "user_id": user_id,
        "type": "reset",
        "exp": expire
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_reset_token(token: str) -> Optional[int]:
    """Verify a password reset token and return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("user_id")
    except:
        return None
