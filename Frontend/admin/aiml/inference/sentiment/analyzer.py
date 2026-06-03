import os
import sys
import joblib
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import MODEL_PATHS, DEFAULT_SENTIMENTS
from utils.helpers import clean_text, tokenize, calculate_caps_ratio

_SENTIMENT_MODEL = None

def get_sentiment_model():
    global _SENTIMENT_MODEL
    if _SENTIMENT_MODEL is None:
        path = MODEL_PATHS["sentiment"]
        if os.path.exists(path):
            try:
                _SENTIMENT_MODEL = joblib.load(path)
                print(f"Loaded Sentiment model from {path}")
            except Exception as e:
                print(f"[WARN] Failed to load Sentiment model: {e}")
        else:
            print(f"[WARN] Sentiment model not found at {path}. Using rules-based fallback.")
    return _SENTIMENT_MODEL

def predict_sentiment(text: str) -> dict:
    """Analyze text sentiment, urgency score, and tone indicators."""
    model = get_sentiment_model()
    cleaned = clean_text(text)
    caps_ratio = calculate_caps_ratio(text)
    
    # 1. Prediction using ML Model
    if model is not None:
        try:
            sentiment = model.predict([cleaned])[0]
        except Exception as e:
            print(f"ML sentiment prediction failed: {e}")
            model = None
            
    # 2. Rule-based fallback
    if model is None:
        lower = cleaned.lower()
        if any(w in lower for w in ["angry", "worst", "terrible", "pathetic", "useless", "nonsense", "shout"]):
            sentiment = "angry"
        elif any(w in lower for w in ["urgently", "immediate", "suffer", "problem", "broken", "leak"]):
            sentiment = "frustrated"
        elif any(w in lower for w in ["delay", "waiting", "please", "help"]):
            sentiment = "concerned"
        elif any(w in lower for w in ["thank", "good", "solved", "happy"]):
            sentiment = "satisfied"
        else:
            sentiment = "neutral"
            
    # Urgency rating 1-5
    lower_text = text.lower()
    urgency = 1
    if any(w in lower_text for w in ["fire", "spark", "dangling", "explode", "critical"]):
        urgency = 5
    elif any(w in lower_text for w in ["urgently", "burst", "overflow", "terrible", "no supply"]):
        urgency = 4
    elif any(w in lower_text for w in ["delay", "waiting", "many days"]):
        urgency = 3
    elif any(w in lower_text for w in ["broken", "footpath", "dirty"]):
        urgency = 2
        
    # Tone indicators
    tone_indicators = []
    if caps_ratio > 0.4:
        tone_indicators.append("Shouting (Caps)")
    if any(w in lower_text for w in ["urgently", "immediate", "fast", "asap"]):
        tone_indicators.append("Urgent Request")
    if any(w in lower_text for w in ["please", "request", "kindly"]):
        tone_indicators.append("Polite Tone")
    if any(w in lower_text for w in ["wasted", "nonsense", "lazy", "corruption"]):
        tone_indicators.append("Aggressive/Frustrated")
        
    if not tone_indicators:
        tone_indicators.append("Normal/Informative")
        
    # Key phrases
    tokens = tokenize(text)
    key_phrases = tokens[:4]

    return {
        "sentiment": sentiment,
        "urgency": urgency,
        "key_phrases": key_phrases,
        "tone_indicators": tone_indicators,
        "caps_ratio": round(caps_ratio, 2)
    }
