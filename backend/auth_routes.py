"""
Authentication API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.auth import AuthManager, get_current_user_dep, create_reset_token, verify_reset_token
from app.users import user_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response Models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    agent_name: Optional[str] = None
    agent_voice: Optional[str] = None
    default_language: Optional[str] = None
    greeting_message: Optional[str] = None
    fallback_phone_number: Optional[str] = None


# ============================================
# PUBLIC ROUTES (No authentication required)
# ============================================

@router.post("/signup", response_model=LoginResponse)
async def signup(request: SignupRequest):
    """Register a new user account"""
    try:
        # Validate password strength
        if len(request.password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )
        
        # Create user
        user = await user_manager.create_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            company_name=request.company_name,
            phone=request.phone
        )
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered or registration failed"
            )
        
        # Create access token
        token = AuthManager.create_access_token(
            user_id=user['id'],
            email=user['email'],
            role=user['role']
        )
        
        return LoginResponse(
            access_token=token,
            user={
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "company_name": user['company_name'],
                "role": user['role'],
                "wallet_balance": float(user['wallet_balance'])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    try:
        # Authenticate user
        user = await user_manager.authenticate_user(
            email=request.email,
            password=request.password
        )
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Create access token
        token = AuthManager.create_access_token(
            user_id=user['id'],
            email=user['email'],
            role=user['role']
        )
        
        return LoginResponse(
            access_token=token,
            user={
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "company_name": user['company_name'],
                "role": user['role'],
                "wallet_balance": float(user['wallet_balance'])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset link"""
    try:
        # Get user by email
        from app.database import db
        from psycopg2.extras import RealDictCursor
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not available")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT id, email FROM users WHERE email = %s", (request.email,))
        user = cursor.fetchone()
        
        if not user:
            # Don't reveal if email exists or not (security)
            return {"message": "If the email exists, a reset link has been sent"}
        
        # Create reset token
        reset_token = create_reset_token(user['id'])
        
        # Save token to database
        cursor.execute("""
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (%s, %s, NOW() + INTERVAL '1 hour')
        """, (user['id'], reset_token))
        
        db.conn.commit()
        cursor.close()
        
        # TODO: Send email with reset link
        # For now, just log it
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
        logger.info(f"Password reset link for {request.email}: {reset_link}")
        
        return {"message": "If the email exists, a reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process request")


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        # Verify token
        user_id = verify_reset_token(request.token)
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        
        # Check if token was already used
        from app.database import db
        from psycopg2.extras import RealDictCursor
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not available")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, used, expires_at 
            FROM password_reset_tokens 
            WHERE token = %s AND user_id = %s
        """, (request.token, user_id))
        
        token_record = cursor.fetchone()
        
        if not token_record or token_record['used']:
            cursor.close()
            raise HTTPException(status_code=400, detail="Token already used or invalid")
        
        # Validate password
        if len(request.new_password) < 8:
            cursor.close()
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )
        
        # Hash new password
        password_hash = AuthManager.hash_password(request.new_password)
        
        # Update password
        cursor.execute("""
            UPDATE users 
            SET password_hash = %s 
            WHERE id = %s
        """, (password_hash, user_id))
        
        # Mark token as used
        cursor.execute("""
            UPDATE password_reset_tokens 
            SET used = TRUE 
            WHERE token = %s
        """, (request.token,))
        
        db.conn.commit()
        cursor.close()
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


# ============================================
# PROTECTED ROUTES (Authentication required)
# ============================================

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user_dep)):
    """Get current user information"""
    try:
        user = await user_manager.get_user_by_id(current_user['user_id'])
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "company_name": user['company_name'],
            "phone": user['phone'],
            "role": user['role'],
            "status": user['status'],
            "wallet_balance": float(user['wallet_balance']),
            "assigned_phone_number": user['assigned_phone_number'],
            "fallback_phone_number": user['fallback_phone_number'],
            "agent_name": user['agent_name'],
            "agent_voice": user['agent_voice'],
            "default_language": user['default_language'],
            "greeting_message": user['greeting_message'],
            "business_hours": user['business_hours'],
            "created_at": user['created_at'].isoformat() if user['created_at'] else None,
            "last_login": user['last_login'].isoformat() if user['last_login'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user information")


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user_dep)
):
    """Update user profile"""
    try:
        # Convert request to dict and remove None values
        updates = {k: v for k, v in request.dict().items() if v is not None}
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        success = await user_manager.update_user(current_user['user_id'], updates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return {"message": "Profile updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/wallet")
async def get_wallet_balance(current_user: dict = Depends(get_current_user_dep)):
    """Get wallet balance and recent transactions"""
    try:
        from app.database import db
        from psycopg2.extras import RealDictCursor
        
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database not available")
        
        db._ensure_connection()
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get balance
        cursor.execute("""
            SELECT wallet_balance 
            FROM users 
            WHERE id = %s
        """, (current_user['user_id'],))
        
        result = cursor.fetchone()
        balance = float(result['wallet_balance']) if result else 0.0
        
        # Get recent transactions
        cursor.execute("""
            SELECT id, type, amount, description, reference_id, 
                   balance_after, created_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (current_user['user_id'],))
        
        transactions = cursor.fetchall()
        cursor.close()
        
        return {
            "balance": balance,
            "transactions": [
                {
                    "id": t['id'],
                    "type": t['type'],
                    "amount": float(t['amount']),
                    "description": t['description'],
                    "reference_id": t['reference_id'],
                    "balance_after": float(t['balance_after']),
                    "created_at": t['created_at'].isoformat()
                }
                for t in transactions
            ]
        }
        
    except Exception as e:
        logger.error(f"Get wallet error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get wallet information")
