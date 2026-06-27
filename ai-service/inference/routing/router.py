import os
import sys
import joblib
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import MODEL_PATHS, DEFAULT_DEPARTMENTS
from utils.helpers import clean_text, tokenize, extract_keywords

# Cache model in memory
_ROUTER_MODEL = None

def get_router_model():
    global _ROUTER_MODEL
    if _ROUTER_MODEL is None:
        path = MODEL_PATHS["router"]
        if os.path.exists(path):
            try:
                _ROUTER_MODEL = joblib.load(path)
                print(f"Loaded Router model from {path}")
            except Exception as e:
                print(f"[WARN] Failed to load Router model: {e}")
        else:
            print(f"[WARN] Router model not found at {path}. Using rules-based fallback.")
    return _ROUTER_MODEL

def predict_route(text: str, category: str = None, location: str = None, keywords: list = None) -> dict:
    """Predict department, priority/severity, and confidence score."""
    model = get_router_model()
    cleaned = clean_text(text)
    
    # 1. Prediction using ML Model
    if model is not None:
        try:
            # Predict probability distribution
            probs = model.predict_proba([cleaned])[0]
            classes = model.classes_
            best_idx = np.argmax(probs)
            pred_dept = classes[best_idx]
            confidence = float(probs[best_idx])
            
            # Sort all classes by probability
            all_detected = [classes[idx] for idx in np.argsort(probs)[::-1] if probs[idx] > 0.05]
        except Exception as e:
            print(f"ML routing prediction failed, falling back to rules: {e}")
            model = None
            
    # 2. Rules-based Fallback
    if model is None:
        # Simple keyword heuristic
        lower = cleaned.lower()
        score = {dept: 0 for dept in DEFAULT_DEPARTMENTS}
        
        keywords_map = {
            "water": ["water", "pipe", "drain", "leak", "sewage", "manhole", "supply", "drinking"],
            "electricity": ["power", "electricity", "meter", "current", "wire", "spark", "transformer", "streetlight", "light"],
            "roads": ["road", "pothole", "pavement", "footpath", "traffic", "street", "highway"],
            "sanitation": ["garbage", "trash", "waste", "filth", "dump", "toilet", "cleans", "drainage"],
            "billing": ["bill", "charge", "payment", "fee", "receipt", "account", "invoice"],
            "property_tax": ["tax", "property", "house", "assessment", "rebate"],
        }
        
        for dept, kws in keywords_map.items():
            for kw in kws:
                if kw in lower:
                    score[dept] += 1
                    
        pred_dept = max(score, key=score.get)
        if score[pred_dept] == 0:
            pred_dept = "general"
        confidence = 0.50 if pred_dept != "general" else 0.30
        all_detected = [pred_dept]

    # Priority determination based on severity keywords
    priority = "medium"
    lower_text = text.lower()
    if any(w in lower_text for w in ["spark", "fire", "burst", "wire", "shock", "danger", "critical", "emergency"]):
        priority = "critical"
    elif any(w in lower_text for w in ["no supply", "dark", "flooding", "overflow", "terrible", "smell", "menace"]):
        priority = "high"
    elif any(w in lower_text for w in ["delay", "broken", "clean", "low"]):
        priority = "medium"
    else:
        priority = "low"

    extracted_kws = extract_keywords(text)
    
    # Calculate real explainability attributions
    explainability = []
    if model is not None:
        try:
            words = list(set(cleaned.split()))
            # Remove stopwords
            from utils.helpers import STOP_WORDS
            words = [w for w in words if w not in STOP_WORDS and len(w) > 2]
            
            orig_probs = model.predict_proba([cleaned])[0]
            classes = list(model.classes_)
            if pred_dept in classes:
                dept_idx = classes.index(pred_dept)
                orig_prob = orig_probs[dept_idx]
                
                for w in words:
                    perturbed = " ".join([word for word in cleaned.split() if word != w])
                    pert_probs = model.predict_proba([perturbed])[0]
                    pert_prob = pert_probs[dept_idx]
                    impact = orig_prob - pert_prob
                    if impact > 0.005:
                        explainability.append({
                            "name": f"Word: '{w}'",
                            "value": round(float(impact) * 100, 2),
                            "color": "#9b59b6"
                        })
                explainability.sort(key=lambda x: x["value"], reverse=True)
                explainability = explainability[:5]
        except Exception as e:
            print(f"Failed to compute explainability: {e}")

    # Deterministic rule-based explainability fallback based on keyword mappings
    if not explainability:
        lower_words = cleaned.split()
        for w in set(lower_words):
            if w in ["water", "pipe", "leak", "drain", "sewage", "supply"]:
                explainability.append({"name": f"Word: '{w}'", "value": 15.0, "color": "#2ECC71"})
            elif w in ["power", "wire", "current", "spark", "light", "electricity", "transformer"]:
                explainability.append({"name": f"Word: '{w}'", "value": 15.0, "color": "#2ECC71"})
            elif w in ["road", "pothole", "pavement", "street"]:
                explainability.append({"name": f"Word: '{w}'", "value": 15.0, "color": "#2ECC71"})
            elif w in ["garbage", "trash", "waste", "dump", "sanitation"]:
                explainability.append({"name": f"Word: '{w}'", "value": 15.0, "color": "#2ECC71"})
        
        # Sort and limit
        explainability.sort(key=lambda x: x["value"], reverse=True)
        explainability = explainability[:5]
        
        # Absolute baseline fallback if no keywords matched
        if not explainability:
            explainability = [
                {"name": "Base Constant", "value": 10.0, "color": "#9b59b6"}
            ]
            
    # Heuristic override for stray animals
    if any(w in lower_text for w in ["stray", "animal", "dog", "cow", "monkey", "cattle"]):
        pred_dept = "sanitation"
        confidence = 0.85
        if "sanitation" not in all_detected:
            all_detected = ["sanitation"] + all_detected
        explainability = [{"name": "Keyword: 'stray/animal'", "value": 85.0, "color": "#E67E22"}] + explainability
    
    return {
        "department": pred_dept,
        "priority": priority,
        "confidence": round(confidence * 100, 2),
        "keywords_matched": extracted_kws,
        "all_departments_detected": all_detected,
        "explainability": explainability
    }
