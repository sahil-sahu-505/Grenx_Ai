"""
Advanced Logging System
"""

import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

class CustomLogger:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Setup file handlers
        self.setup_loggers()
    
    def setup_loggers(self):
        """Setup different log files for different purposes"""
        
        # Error log
        error_handler = logging.FileHandler(self.log_dir / "errors.log")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        # Access log
        access_handler = logging.FileHandler(self.log_dir / "access.log")
        access_handler.setLevel(logging.INFO)
        access_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(message)s'
        ))
        
        # Performance log
        perf_handler = logging.FileHandler(self.log_dir / "performance.log")
        perf_handler.setLevel(logging.INFO)
        
        # Create loggers
        self.error_logger = logging.getLogger("error")
        self.error_logger.addHandler(error_handler)
        self.error_logger.setLevel(logging.ERROR)
        
        self.access_logger = logging.getLogger("access")
        self.access_logger.addHandler(access_handler)
        self.access_logger.setLevel(logging.INFO)
        
        self.perf_logger = logging.getLogger("performance")
        self.perf_logger.addHandler(perf_handler)
        self.perf_logger.setLevel(logging.INFO)
    
    def log_error(self, error: Exception, context: Dict[str, Any] = None):
        """Log error with context"""
        error_data = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or {}
        }
        self.error_logger.error(json.dumps(error_data))
    
    def log_access(self, endpoint: str, method: str, status: int, duration: float):
        """Log API access"""
        access_data = {
            "timestamp": datetime.now().isoformat(),
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "duration_ms": round(duration * 1000, 2)
        }
        self.access_logger.info(json.dumps(access_data))
    
    def log_performance(self, operation: str, duration: float, metadata: Dict = None):
        """Log performance metrics"""
        perf_data = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "duration_ms": round(duration * 1000, 2),
            "metadata": metadata or {}
        }
        self.perf_logger.info(json.dumps(perf_data))

# Global logger instance
app_logger = CustomLogger()
