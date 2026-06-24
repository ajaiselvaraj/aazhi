import os
import sys
import joblib
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import MODEL_PATHS
from utils.helpers import clean_text

_SPAM_MODEL = None
_FRAUD_MODEL = None

def get_spam_model():
    global _SPAM_MODEL
    if _SPAM_MODEL is None:
        path = MODEL_PATHS["spam"]
        if os.path.exists(path):
            try:
                _SPAM_MODEL = joblib.load(path)
                print(f"Loaded Spam model from {path}")
            except Exception as e:
                print(f"[WARN] Failed to load Spam model: {e}")
    return _SPAM_MODEL

def get_fraud_model():
    global _FRAUD_MODEL
    if _FRAUD_MODEL is None:
        path = MODEL_PATHS["fraud"]
        if os.path.exists(path):
            try:
                _FRAUD_MODEL = joblib.load(path)
                print(f"Loaded Fraud model from {path}")
            except Exception as e:
                print(f"[WARN] Failed to load Fraud model: {e}")
    return _FRAUD_MODEL

def predict_spam_and_anomaly(text: str, submit_count: int = 1) -> dict:
    """Predict if the text is spam and if the submission shows anomalous fraud behavior."""
    spam_model = get_spam_model()
    fraud_model = get_fraud_model()
    
    cleaned = clean_text(text)
    text_length = len(text)
    
    is_spam = False
    spam_confidence = 0.0
    
    # 1. Evaluate Spam
    if spam_model is not None:
        try:
            pred = spam_model.predict([cleaned])[0]
            probs = spam_model.predict_proba([cleaned])[0]
            is_spam = bool(pred == 1)
            spam_confidence = float(probs[1]) if is_spam else float(probs[0])
        except Exception as e:
            print(f"Spam prediction failed, falling back to heuristics: {e}")
            spam_model = None
            
    if spam_model is None:
        # Rule-based fallback
        lower = cleaned.lower()
        spam_keywords = ["buy cheap", "click here", "online casino", "telegram channel", "crypto tokens", "test 123", "test complaint"]
        is_spam = any(kw in lower for kw in spam_keywords)
        spam_confidence = 0.85 if is_spam else 0.95

    # 2. Evaluate Anomaly (Fraud)
    is_anomaly = False
    anomaly_score = 0.0
    
    if fraud_model is not None:
        try:
            # Features: submit_count, text_length, is_spam
            features = pd.DataFrame([{
                "submit_count": submit_count,
                "text_length": text_length,
                "is_spam": int(is_spam)
            }])
            
            # Predict anomaly (-1 = anomaly, 1 = normal)
            pred_anomaly = fraud_model.predict(features)[0]
            is_anomaly = bool(pred_anomaly == -1)
            
            # Distance score
            decision = float(fraud_model.decision_function(features)[0])
            # Normalize decision score to an anomaly score between 0 and 1
            # Isolation Forest decision_function returns negative values for anomalies, positive for normal
            anomaly_score = float(1.0 / (1.0 + np.exp(decision * 10)))
        except Exception as e:
            print(f"Anomaly prediction failed: {e}")
            fraud_model = None
            
    if fraud_model is None:
        # Heuristics for anomaly: high submit rate, extremely short text, or spam
        if submit_count > 5:
            is_anomaly = True
            anomaly_score = 0.85
        elif text_length < 8:
            is_anomaly = True
            anomaly_score = 0.75
        elif is_spam:
            is_anomaly = True
            anomaly_score = 0.60
        else:
            is_anomaly = False
            anomaly_score = 0.05

    # Reason generation
    reasons = []
    if is_spam:
        reasons.append("Contains promotional keywords or test markers (Spam).")
    if submit_count > 5:
        reasons.append(f"High submission rate detected ({submit_count} tickets from this host).")
    if text_length < 10:
        reasons.append("Extremely short text description.")
        
    reason = " ".join(reasons) if reasons else "Complaints submission patterns are within standard operational limits."

    return {
        "is_spam": is_spam,
        "spam_confidence": round(spam_confidence * 100, 2),
        "is_anomaly": is_anomaly,
        "anomaly_score": round(anomaly_score, 4),
        "reason": reason,
        "classification": "spam" if is_spam else "legitimate"
    }

# Removed random_chance helper to maintain strict authenticity
