"""
Configuration settings for CMS Chatbot Service
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Flask settings
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    PORT = int(os.environ.get('PORT', 8000))
    HOST = os.environ.get('HOST', '0.0.0.0')
    
    # NLTK settings
    NLTK_DATA_PATH = os.environ.get('NLTK_DATA_PATH', './nltk_data')
    
    # Session settings
    SESSION_TIMEOUT = timedelta(hours=1)
    MAX_SESSIONS = int(os.environ.get('MAX_SESSIONS', 1000))
    
    # API settings
    CMS_API_URL = os.environ.get('CMS_API_URL', 'http://localhost:5000')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', 60))
    
    # NLP settings
    DEFAULT_CONFIDENCE_THRESHOLD = float(os.environ.get('DEFAULT_CONFIDENCE_THRESHOLD', 0.6))
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    SECRET_KEY = os.environ.get('SECRET_KEY')  # Must be set in production
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}