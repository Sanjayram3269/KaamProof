import os
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/kaamproof.db")
APP_ORIGIN = os.getenv("APP_ORIGIN", "http://localhost:5173").rstrip("/")
PRODUCTION = os.getenv("ENVIRONMENT") == "production"
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_BYTES = 8 * 1024 * 1024
SESSION_SECONDS = 60 * 60 * 8
REFRESH_SECONDS = 60 * 60 * 24 * 14
if PRODUCTION and (not APP_ORIGIN.startswith("https://") or DATABASE_URL.startswith("sqlite")):
    raise RuntimeError("Production requires an HTTPS APP_ORIGIN and PostgreSQL DATABASE_URL")
