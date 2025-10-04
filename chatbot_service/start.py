#!/usr/bin/env python3
"""
Startup script for CMS Chatbot Service
Handles NLTK data download and service initialization
"""

import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check Python version compatibility"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python version: {sys.version}")

def install_dependencies():
    """Install required Python packages"""
    try:
        logger.info("Installing dependencies...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        logger.info("Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install dependencies: {e}")
        sys.exit(1)

def download_nltk_data():
    """Download required NLTK data"""
    try:
        import nltk
        logger.info("Downloading NLTK data...")
        
        # Download required datasets
        datasets = ['punkt', 'stopwords', 'averaged_perceptron_tagger']
        for dataset in datasets:
            try:
                nltk.data.find(f'tokenizers/{dataset}' if dataset == 'punkt' 
                             else f'taggers/{dataset}' if dataset == 'averaged_perceptron_tagger'
                             else f'corpora/{dataset}')
                logger.info(f"NLTK dataset '{dataset}' already exists")
            except LookupError:
                logger.info(f"Downloading NLTK dataset: {dataset}")
                nltk.download(dataset, quiet=True)
        
        logger.info("NLTK data ready")
        
    except ImportError:
        logger.error("NLTK not installed. Please run: pip install nltk")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to download NLTK data: {e}")
        sys.exit(1)

def check_environment():
    """Check environment variables and configuration"""
    logger.info("Checking environment configuration...")
    
    # Optional environment variables
    env_vars = {
        'PORT': '8000',
        'DEBUG': 'False',
        'LOG_LEVEL': 'INFO',
        'CMS_API_URL': 'http://localhost:5000'
    }
    
    for var, default in env_vars.items():
        value = os.environ.get(var, default)
        logger.info(f"{var}: {value}")

def start_service():
    """Start the chatbot service"""
    try:
        port = os.environ.get('PORT', 8000)
        debug = os.environ.get('DEBUG', 'False').lower() == 'true'
        
        logger.info(f"Starting CMS Chatbot Service on port {port}")
        logger.info(f"Debug mode: {debug}")
        os.environ['CMS_API_URL'] = os.environ.get('CMS_API_URL', 'http://localhost:5000')
        
        # Import and run the Flask app
        from app import app
        app.run(host='0.0.0.0', port=int(port), debug=debug)
        
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("CMS Chatbot Service Startup")
    print("=" * 40)
    
    # Check Python version
    check_python_version()
    
    # Check if we need to install dependencies
    if '--install' in sys.argv or not os.path.exists('requirements.txt'):
        install_dependencies()
    
    # Download NLTK data
    download_nltk_data()
    
    # Check environment
    check_environment()
    
    # Start service
    print("\nStarting chatbot service...")
    print("   Press Ctrl+C to stop")
    print("   Health check: http://localhost:8000/health")
    print("   API docs: http://localhost:8000/api/")
    print()
    
    start_service()

if __name__ == '__main__':
    main()