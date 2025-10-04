"""
AI Chatbot Service for CMS
Python Flask service with NLTK for natural language processing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import re
import json
import nltk
from datetime import datetime
import os
import requests

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.tag import pos_tag
from nltk.stem import PorterStemmer

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize NLP components
stemmer = PorterStemmer()
stop_words = set(stopwords.words('english'))

# Intent patterns and keywords
INTENT_PATTERNS = {
    'track_package': {
        'keywords': ['track', 'tracking', 'package', 'shipment', 'delivery', 'location', 'where', 'status'],
        'patterns': [r'[A-Z0-9]{6,}', r'track.*[A-Z0-9]+', r'where.*package', r'status.*package'],
        'confidence_threshold': 0.6
    },
    'file_complaint': {
        'keywords': ['complaint', 'complain', 'issue', 'problem', 'damaged', 'lost', 'delayed', 'wrong', 'late'],
        'patterns': [r'file.*complaint', r'report.*issue', r'package.*damaged', r'delivery.*late'],
        'confidence_threshold': 0.7
    },
    'cost_inquiry': {
        'keywords': ['cost', 'price', 'pricing', 'estimate', 'shipping', 'charges', 'fee', 'rate'],
        'patterns': [r'how.*much', r'cost.*shipping', r'price.*delivery', r'estimate.*cost'],
        'confidence_threshold': 0.6
    },
    'location_update': {
        'keywords': ['location', 'where', 'current', 'position', 'update', 'status'],
        'patterns': [r'where.*package', r'current.*location', r'package.*location'],
        'confidence_threshold': 0.7
    },
    'support_contact': {
        'keywords': ['support', 'help', 'contact', 'agent', 'human', 'call', 'email', 'phone'],
        'patterns': [r'speak.*agent', r'contact.*support', r'need.*help'],
        'confidence_threshold': 0.6
    },
    'greeting': {
        'keywords': ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings'],
        'patterns': [r'^(hi|hello|hey)', r'good\s+(morning|afternoon|evening)'],
        'confidence_threshold': 0.8
    },
    'goodbye': {
        'keywords': ['bye', 'goodbye', 'thanks', 'thank you', 'done', 'finish'],
        'patterns': [r'(bye|goodbye)', r'thank\s*you', r'that.*all'],
        'confidence_threshold': 0.8
    }
}

# Entity patterns
ENTITY_PATTERNS = {
    'tracking_number': r'[A-Z0-9]{6,}',
    'weight': r'(\d+(?:\.\d+)?)\s*(kg|kilogram|grams?|g)',
    'phone_number': r'(\+91|91)?[\s-]?[6-9]\d{9}',
    'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    'delivery_speed': r'(standard|express|same.?day|urgent|fast)',
    'complaint_category': r'(delayed|damaged|lost|wrong|poor|billing|behavior)'
}

# Session storage (in production, use Redis or database)
sessions = {}

def preprocess_text(text):
    """Preprocess text for NLP analysis"""
    # Convert to lowercase
    text = text.lower()
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords and punctuation
    tokens = [token for token in tokens if token.isalnum() and token not in stop_words]
    
    # Stem words
    stemmed_tokens = [stemmer.stem(token) for token in tokens]
    
    return tokens, stemmed_tokens

def extract_entities(text):
    """Extract entities from text using regex patterns"""
    entities = {}
    
    for entity_type, pattern in ENTITY_PATTERNS.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            entities[entity_type] = matches
    
    return entities

def classify_intent(text):
    """Classify user intent using keyword matching and pattern recognition"""
    tokens, stemmed_tokens = preprocess_text(text)
    text_lower = text.lower()
    
    intent_scores = {}
    
    for intent, config in INTENT_PATTERNS.items():
        score = 0
        
        # Keyword matching
        keyword_matches = sum(1 for keyword in config['keywords'] if keyword in text_lower)
        score += keyword_matches * 0.3
        
        # Pattern matching
        pattern_matches = sum(1 for pattern in config['patterns'] if re.search(pattern, text_lower))
        score += pattern_matches * 0.4
        
        # Stemmed token matching
        stemmed_keyword_matches = sum(1 for keyword in config['keywords'] 
                                    if stemmer.stem(keyword) in stemmed_tokens)
        score += stemmed_keyword_matches * 0.2
        
        # Normalize score
        max_possible_score = len(config['keywords']) * 0.3 + len(config['patterns']) * 0.4 + len(config['keywords']) * 0.2
        if max_possible_score > 0:
            score = score / max_possible_score
        
        if score >= config['confidence_threshold']:
            intent_scores[intent] = score
    
    # Return the intent with highest score
    if intent_scores:
        best_intent = max(intent_scores, key=intent_scores.get)
        return best_intent, intent_scores[best_intent]
    
    return 'unknown', 0.0

def generate_response(intent, entities, text, session_id):
    """Generate appropriate response based on intent and entities"""
    
    responses = {
        'track_package': {
            'message': "I'll help you track your package. I can see you might have a tracking number. Let me check that for you.",
            'quickReplies': ['Show tracking details', 'Get delivery updates', 'Contact support']
        },
        'file_complaint': {
            'message': "I'll help you file a complaint. Please provide:\n\n1. Your tracking number (if applicable)\n2. Brief description of the issue",
            'quickReplies': ['Delayed delivery', 'Damaged package', 'Lost package', 'Other issue']
        },
        'cost_inquiry': {
            'message': "I'll help you estimate shipping costs. Our pricing:\n\n📦 Standard (3 days): ₹50 base + ₹15/kg\n🚀 Express (1 day): ₹50 base + ₹22.5/kg\n⚡ Same-day: ₹50 base + ₹30/kg\n\nWhat's your package weight?",
            'quickReplies': ['Under 1kg', '1-5kg', '5-10kg', 'Over 10kg']
        },
        'location_update': {
            'message': "To check your package location, I'll need your tracking number. Please provide your tracking ID.",
            'quickReplies': ['I have tracking number', 'Lost tracking number', 'Contact support']
        },
        'support_contact': {
            'message': "I can connect you with our support team:\n\n📞 Phone: 1800-XXX-XXXX (9 AM - 9 PM)\n📧 Email: support@cms.com\n💬 Live Chat: Available (9 AM - 6 PM)",
            'quickReplies': ['Call now', 'Send email', 'Live chat']
        },
        'greeting': {
            'message': "Hello! 👋 I'm your CMS assistant. I can help you with:\n\n📦 Track packages\n📝 File complaints\n💰 Get shipping costs\n📍 Location updates\n📞 Contact support\n\nHow can I assist you today?",
            'quickReplies': ['Track package', 'File complaint', 'Get pricing', 'Contact support']
        },
        'goodbye': {
            'message': "Thank you for using CMS! 😊 Have a great day! Feel free to chat with me anytime you need assistance.",
            'quickReplies': ['Track another package', 'New inquiry']
        },
        'unknown': {
            'message': "I'm not sure I understood that. Here are some things I can help with:\n\n• Type a tracking number to track your package\n• Say 'file complaint' to report an issue\n• Ask 'shipping cost' for pricing information\n• Type 'support' to contact our team",
            'quickReplies': ['Track package', 'File complaint', 'Get pricing', 'Contact support']
        }
    }
    
    if intent == 'track_package':
        tracking_numbers = entities.get('tracking_number')
        if tracking_numbers and len(tracking_numbers) > 0:
            tracking_id = tracking_numbers[0]
            package_info = get_package_status(tracking_id)
            if package_info['found']:
                return {
                    'message': f"Your package {tracking_id} is currently {package_info['status']} at {package_info['location']}. Expected delivery: {package_info['eta']}.",
                    'quickReplies': ['Get more details', 'Change delivery']
                }
            else:
                return {
                    'message': f"❌ Sorry, I couldn't find any package with tracking ID {tracking_id}. Please double-check the number and try again.",
                    'quickReplies': ['Try again', 'Contact support']
                }
        else:
            return {
                'message': "Please provide the tracking ID so I can help you track your package.",
                'quickReplies': ['Enter tracking ID', 'Contact support']
            }
        return responses['track_package']

def get_package_status(tracking_id):
    """Fetches package status from the main CMS backend."""
    cms_api_url = os.environ.get('CMS_API_URL', 'http://localhost:5000')
    try:
        response = requests.get(f"{cms_api_url}/api/tracking/{tracking_id}")
        response.raise_for_status()  # Raise an exception for HTTP errors
        data = response.json()
        if data['success'] and data['data']:
            package = data['data']
            return {
                'found': True,
                'status': package['status'],
                'location': package['currentLocation'],
                'eta': package['expectedDeliveryDate']
            }
        else:
            return {'found': False, 'message': data.get('message', 'Package not found.')}
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching package status for {tracking_id}: {e}")
        return {'found': False, 'message': 'Error connecting to tracking service.'}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'CMS Chatbot Service',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/process', methods=['POST'])
def process_message():
    """Process chatbot message and return response"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'error': 'Missing message in request'
            }), 400
        
        message = data['message']
        session_id = data.get('sessionId', f'session_{datetime.now().timestamp()}')
        user_id = data.get('userId')
        context = data.get('context', {})
        
        # Log the message
        logger.info(f"Processing message: '{message}' for session: {session_id}")
        
        # Classify intent
        intent, confidence = classify_intent(message)
        
        # Extract entities
        entities = extract_entities(message)
        
        # Generate response
        response_data = generate_response(intent, entities, message, session_id)
        
        # Store in session
        if session_id not in sessions:
            sessions[session_id] = {
                'messages': [],
                'context': {},
                'created_at': datetime.now().isoformat()
            }
        
        sessions[session_id]['messages'].append({
            'timestamp': datetime.now().isoformat(),
            'user_message': message,
            'intent': intent,
            'confidence': confidence,
            'entities': entities,
            'bot_response': response_data['message']
        })
        
        # Update context
        sessions[session_id]['context'].update(context)
        
        return jsonify({
            'message': response_data['message'],
            'intent': intent,
            'confidence': confidence,
            'entities': entities,
            'quickReplies': response_data.get('quickReplies', []),
            'sessionId': session_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': "I'm sorry, I'm having trouble processing your request right now. Please try again or contact our support team."
        }), 500

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get session history"""
    try:
        if session_id in sessions:
            return jsonify(sessions[session_id])
        else:
            return jsonify({
                'error': 'Session not found'
            }), 404
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        return jsonify({
            'error': 'Internal server error'
        }), 500

@app.route('/api/session/reset', methods=['POST'])
def reset_session():
    """Reset session context"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({
                'error': 'Missing sessionId'
            }), 400
        
        if session_id in sessions:
            del sessions[session_id]
        
        return jsonify({
            'message': 'Session reset successfully'
        })
        
    except Exception as e:
        logger.error(f"Error resetting session: {str(e)}")
        return jsonify({
            'error': 'Internal server error'
        }), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get chatbot analytics"""
    try:
        total_sessions = len(sessions)
        total_messages = sum(len(session['messages']) for session in sessions.values())
        
        intent_distribution = {}
        for session in sessions.values():
            for msg in session['messages']:
                intent = msg.get('intent', 'unknown')
                intent_distribution[intent] = intent_distribution.get(intent, 0) + 1
        
        return jsonify({
            'total_sessions': total_sessions,
            'total_messages': total_messages,
            'intent_distribution': intent_distribution,
            'active_sessions': len([s for s in sessions.values() 
                                 if (datetime.now() - datetime.fromisoformat(s['created_at'])).seconds < 3600])
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({
            'error': 'Internal server error'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting CMS Chatbot Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)