import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "smart-cafe-secret-key-super-secure-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smart-cafe-jwt-secret-xyz-987654")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Database Configuration (MySQL)
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "123456")
    DB_NAME = os.getenv("DB_NAME", "smart_coffee_db")
    DB_CHARSET = "utf8mb4"

    # AI Configuration
    ML_RANDOM_STATE = 42
    MIN_SUPPORT_APRIORI = float(os.getenv("MIN_SUPPORT_APRIORI", "0.01"))
    MIN_CONFIDENCE_APRIORI = float(os.getenv("MIN_CONFIDENCE_APRIORI", "0.5"))
