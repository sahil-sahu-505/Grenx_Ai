"""
Rate Limiting for API endpoints
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.limits = {
            "chat": (20, 60),  # 20 requests per 60 seconds
            "tts": (10, 60),   # 10 requests per 60 seconds
            "translate": (30, 60),  # 30 requests per 60 seconds
            "default": (50, 60)  # 50 requests per 60 seconds
        }
    
    def is_allowed(self, client_id: str, endpoint: str = "default") -> Tuple[bool, int]:
        """
        Check if request is allowed
        Returns: (is_allowed, remaining_requests)
        """
        now = datetime.now()
        limit, window = self.limits.get(endpoint, self.limits["default"])
        
        # Clean old requests
        cutoff = now - timedelta(seconds=window)
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > cutoff
        ]
        
        # Check limit
        current_count = len(self.requests[client_id])
        
        if current_count >= limit:
            return False, 0
        
        # Add new request
        self.requests[client_id].append(now)
        remaining = limit - current_count - 1
        
        return True, remaining
    
    def get_reset_time(self, client_id: str) -> int:
        """Get seconds until rate limit resets"""
        if not self.requests[client_id]:
            return 0
        
        oldest_request = min(self.requests[client_id])
        reset_time = oldest_request + timedelta(seconds=60)
        remaining = (reset_time - datetime.now()).total_seconds()
        
        return max(0, int(remaining))

# Global rate limiter instance
rate_limiter = RateLimiter()
