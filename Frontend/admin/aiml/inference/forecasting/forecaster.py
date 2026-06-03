import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import MODEL_PATHS

_FORECASTER_MODEL = None

def get_forecaster_model():
    global _FORECASTER_MODEL
    if _FORECASTER_MODEL is None:
        path = MODEL_PATHS["volume_forecaster"]
        if os.path.exists(path):
            try:
                _FORECASTER_MODEL = joblib.load(path)
                print(f"Loaded Volume Forecaster model from {path}")
            except Exception as e:
                print(f"[WARN] Failed to load Volume Forecaster model: {e}")
        else:
            print(f"[WARN] Volume Forecaster model not found at {path}. Using fallback forecast.")
    return _FORECASTER_MODEL

def forecast_volume(daily_counts: list, forecast_days: int = 7) -> list:
    """Forecast future daily complaint volumes for the next forecast_days."""
    if not daily_counts or len(daily_counts) < 3:
        # Deterministic fallback if not enough history: 12 on weekdays, 5 on weekends
        base_date = datetime.now()
        predictions = []
        for i in range(forecast_days):
            dt = base_date + timedelta(days=i+1)
            day_of_week = dt.weekday()
            pred_count = 12 if day_of_week < 5 else 5
            predictions.append({
                "date": dt.strftime("%Y-%m-%d"),
                "predicted_count": pred_count
            })
        return predictions
        
    model = get_forecaster_model()
    
    # Format inputs
    df = pd.DataFrame(daily_counts)
    if 'count' not in df.columns and 'total' in df.columns:
        df['count'] = df['total']
    
    counts = df['count'].tolist()
    
    # Autoregressive simulation for prediction days
    predictions = []
    last_counts = counts[-3:] # need last 3 lag values
    
    base_date = datetime.now()
    if 'date' in df.columns:
        try:
            base_date = pd.to_datetime(df['date'].iloc[-1])
        except:
            pass
            
    for i in range(forecast_days):
        day_of_week = (base_date + timedelta(days=i+1)).weekday()
        
        # Feature preparation: lag_1, lag_2, lag_3, day_of_week
        features = np.array([[last_counts[-1], last_counts[-2], last_counts[-3], day_of_week]])
        
        if model is not None:
            try:
                pred = float(model.predict(features)[0])
            except Exception as e:
                # Fallback to moving average if model inference fails
                pred = float(np.mean(last_counts) * (1.05 if day_of_week < 5 else 0.85))
        else:
            # Fallback moving average
            pred = float(np.mean(last_counts) * (1.05 if day_of_week < 5 else 0.85))
            
        pred = max(0.0, pred)
        pred_rounded = int(round(pred))
        
        target_date = (base_date + timedelta(days=i+1)).strftime("%Y-%m-%d")
        predictions.append({
            "date": target_date,
            "predicted_count": pred_rounded
        })
        
        # Feed predictions back as lag features
        last_counts.append(pred)
        last_counts = last_counts[1:]
        
    return predictions

from sklearn.cluster import DBSCAN

def predict_hotspots(complaints: list) -> list:
    """Predict risk level and future hotspots based on geographical DBSCAN clustering and trend analysis."""
    if not complaints:
        return []
        
    coords = []
    valid_complaints = []
    
    ward_coords = {
        'Ward 1': [26.182, 91.745],
        'Ward 2': [26.195, 91.758],
        'Ward 3': [26.171, 91.762],
        'Ward 4': [26.208, 91.731],
        'Ward 5': [26.164, 91.776],
        'Ward 6': [26.212, 91.724],
        'Ward 7': [26.155, 91.749],
        'Ward 8': [26.226, 91.768],
        'Ward 9': [26.141, 91.735],
        'Ward 10': [26.234, 91.752],
    }
    
    for c in complaints:
        lat = c.get('latitude')
        lng = c.get('longitude')
        ward = c.get('ward')
        
        if lat is not None and lng is not None:
            try:
                coords.append([float(lat), float(lng)])
                valid_complaints.append(c)
                continue
            except ValueError:
                pass
                
        if ward in ward_coords:
            coords.append(ward_coords[ward])
            valid_complaints.append(c)
            
    if not coords:
        return []
        
    coords_arr = np.array(coords)
    
    # Run DBSCAN
    db = DBSCAN(eps=0.015, min_samples=2).fit(coords_arr)
    labels = db.labels_
    
    ward_counts = {}
    ward_clustered_counts = {}
    for i, c in enumerate(valid_complaints):
        ward = c.get('ward', 'Unknown')
        ward_counts[ward] = ward_counts.get(ward, 0) + 1
        if labels[i] >= 0:
            ward_clustered_counts[ward] = ward_clustered_counts.get(ward, 0) + 1
            
    total_complaints = len(valid_complaints) or 1
    hotspots = []
    
    all_wards = list(ward_coords.keys())
    
    for w in all_wards:
        count = ward_counts.get(w, 0)
        clustered = ward_clustered_counts.get(w, 0)
        
        volume_factor = (count / total_complaints) * 50
        cluster_factor = (clustered / (count or 1)) * 50
        
        risk_score = int(np.clip(volume_factor + cluster_factor, 5, 98))
        
        if risk_score > 75:
            level = "Critical Risk"
        elif risk_score > 50:
            level = "High Risk"
        elif risk_score > 25:
            level = "Medium Risk"
        else:
            level = "Low Risk"
            
        # Calculate real trend growth based on complaint ages
        now_dt = datetime.now()
        recent_count = 0
        previous_count = 0
        for c in valid_complaints:
            if c.get('ward') == w:
                created_at_raw = c.get('created_at') or c.get('createdAt')
                if created_at_raw:
                    try:
                        if isinstance(created_at_raw, str):
                            created_at = pd.to_datetime(created_at_raw).to_pydatetime()
                        else:
                            created_at = created_at_raw
                            
                        # If naive datetime, make it tz-naive or tz-aware matching now_dt
                        if created_at.tzinfo is not None:
                            created_at = created_at.replace(tzinfo=None)
                            
                        age_days = (now_dt - created_at).days
                        if age_days <= 7:
                            recent_count += 1
                        elif age_days <= 14:
                            previous_count += 1
                    except Exception:
                        pass
                        
        if previous_count > 0:
            growth = round(((recent_count - previous_count) / previous_count) * 100, 1)
        else:
            growth = 5.0 if recent_count > 0 else 0.0
            
        hotspots.append({
            "ward": w,
            "complaint_frequency": count,
            "risk_score": risk_score,
            "risk_level": level,
            "predicted_growth_pct": float(np.clip(growth, -50.0, 150.0))
        })
        
    hotspots.sort(key=lambda x: x["risk_score"], reverse=True)
    return hotspots

# Removed random_prediction function to maintain strict authenticity

def predict_sla_breach(complaint_data: dict) -> dict:
    """Predict whether a complaint will exceed the SLA threshold."""
    path = MODEL_PATHS["sla"]
    if os.path.exists(path):
        try:
            model = joblib.load(path)
            # Map input fields
            features = pd.DataFrame([{
                'department': complaint_data.get('department', 'general'),
                'priority': complaint_data.get('priority', 'medium'),
                'ward': complaint_data.get('ward', 'Ward 1'),
                'text_length': len(complaint_data.get('description', ''))
            }])
            proba = model.predict_proba(features)[0][1]
            breach = bool(proba >= 0.5)
            return {
                "will_breach": breach,
                "breach_probability": round(float(proba) * 100, 2),
                "confidence_score": round(float(max(proba, 1-proba)) * 100, 2)
            }
        except Exception as e:
            print(f"SLA Predictor model failed: {e}")
            
    # Heuristic fallback
    priority = complaint_data.get('priority', 'medium').lower()
    prob = 0.15
    if priority == 'critical':
        prob = 0.45
    elif priority == 'high':
        prob = 0.35
    elif priority == 'low':
        prob = 0.05
        
    return {
        "will_breach": False,
        "breach_probability": round(prob * 100, 2),
        "confidence_score": 85.0
    }

def predict_resolution_time(complaint_data: dict) -> dict:
    """Predict the estimated resolution time in hours."""
    path = MODEL_PATHS["resolution_time"]
    if os.path.exists(path):
        try:
            model = joblib.load(path)
            features = pd.DataFrame([{
                'department': complaint_data.get('department', 'general'),
                'priority': complaint_data.get('priority', 'medium'),
                'ward': complaint_data.get('ward', 'Ward 1'),
                'text_length': len(complaint_data.get('description', ''))
            }])
            pred_hours = float(model.predict(features)[0])
            return {
                "estimated_hours": round(pred_hours, 1),
                "lower_bound_hours": round(max(1.0, pred_hours * 0.7), 1),
                "upper_bound_hours": round(pred_hours * 1.3, 1)
            }
        except Exception as e:
            print(f"Resolution Time Regressor failed: {e}")
            
    # Heuristic fallback
    base_hours = {
        "electricity": 8.0,
        "water": 16.0,
        "billing": 24.0,
        "property_tax": 48.0,
        "sanitation": 36.0,
        "roads": 72.0,
        "general": 48.0
    }.get(complaint_data.get('department', 'general'), 48.0)
    
    priority = complaint_data.get('priority', 'medium').lower()
    factor = {"critical": 0.25, "high": 0.5, "medium": 1.0, "low": 1.5}.get(priority, 1.0)
    pred = base_hours * factor
    
    return {
        "estimated_hours": round(pred, 1),
        "lower_bound_hours": round(max(1.0, pred * 0.7), 1),
        "upper_bound_hours": round(pred * 1.3, 1)
    }
