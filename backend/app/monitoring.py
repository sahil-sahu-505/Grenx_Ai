"""
System Monitoring and Health Checks
"""

import psutil
import time
from datetime import datetime
from typing import Dict, Any

class SystemMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health metrics"""
        
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Uptime
        uptime_seconds = time.time() - self.start_time
        uptime_hours = uptime_seconds / 3600
        
        return {
            "status": "healthy" if cpu_percent < 80 and memory.percent < 80 else "warning",
            "uptime_hours": round(uptime_hours, 2),
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "percent": disk.percent
            },
            "requests": {
                "total": self.request_count,
                "errors": self.error_count,
                "success_rate": round((self.request_count - self.error_count) / max(self.request_count, 1) * 100, 2)
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def increment_request(self):
        """Increment request counter"""
        self.request_count += 1
    
    def increment_error(self):
        """Increment error counter"""
        self.error_count += 1

# Global monitor instance
monitor = SystemMonitor()
