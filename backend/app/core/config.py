import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage_data"

class Settings(BaseModel):
    PROJECT_NAME: str = "SelfHeal Storage"
    API_V1_STR: str = "/api"
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "selfheal_storage")
    STORAGE_PATH: str = str(STORAGE_DIR)
    
    # Heartbeat & Health Monitoring Config
    HEARTBEAT_INTERVAL_SECONDS: float = 3.0
    SLIDING_WINDOW_SIZE: int = 10
    BETA_WEIGHT: float = 0.6  # 60% slope, 40% missed heartbeats
    SLOPE_REF_MS_PER_SEC: float = 8.0  # Reference slope ms/s for normalization (8 ms/s = severe degradation)
    MISSED_HB_MAX: int = 4
    RISK_WARNING_THRESHOLD: float = 0.35
    RISK_CRITICAL_THRESHOLD: float = 0.70
    MAX_MISSED_HB_FAILSTOP: int = 4
    
    # Placement weights
    WEIGHT_LOAD: float = 0.50
    WEIGHT_DIVERSITY: float = 0.50
    WEIGHT_CPU: float = 0.35
    WEIGHT_IO: float = 0.35
    WEIGHT_STORAGE: float = 0.30
    EXCLUDE_AT_RISK_NODES: bool = True
    
    # Adaptive Replication Config
    DEFAULT_STANDARD_REPLICAS: int = 3
    DEFAULT_CRITICAL_REPLICAS: int = 4
    MIN_REPLICAS: int = 2
    MAX_REPLICAS: int = 5
    DORMANT_THRESHOLD_SECONDS: float = 120.0
    HIGH_ACCESS_THRESHOLD_RPS: float = 2.0  # accesses/minute or rps
    
    # Max file upload size in MB
    MAX_UPLOAD_SIZE_MB: int = 50
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

settings = Settings()
