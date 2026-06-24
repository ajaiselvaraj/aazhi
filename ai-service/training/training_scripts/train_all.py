import os
import sys
import json
import time
from datetime import datetime
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report, mean_absolute_error, r2_score,
    precision_recall_fscore_support, confusion_matrix, accuracy_score
)

# Add base path to import settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import MODEL_PATHS, DATASETS_DIR, METRICS_PATH, CONFUSION_MATRIX_PATH
from training.datasets.generator import generate_dataset
from utils.helpers import clean_text

def load_data():
    csv_path = os.path.join(DATASETS_DIR, "historical_complaints.csv")
    if not os.path.exists(csv_path):
        print("[INFO] historical_complaints.csv not found. Running generator...")
        generate_dataset(csv_path, num_records=1000)
    return pd.read_csv(csv_path)

def train_spam_classifier(df):
    print("\n--- [SPAM] Training Spam/Legitimate Classifier ---")
    df['clean_desc'] = df['description'].fillna('').apply(clean_text)
    
    X = df['clean_desc']
    y = df['is_spam']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=1000, ngram_range=(1, 2))),
        ('clf', LogisticRegression(class_weight='balanced'))
    ])
    
    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    
    print(classification_report(y_test, preds, target_names=["legitimate", "spam"]))
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average='binary')
    acc = accuracy_score(y_test, preds)
    
    joblib.dump(pipeline, MODEL_PATHS["spam"])
    print(f"Saved Spam Classifier Pipeline to {MODEL_PATHS['spam']}")
    
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1)
    }

def train_department_router(df):
    print("\n--- [ROUTE] Training Department Router ---")
    real_df = df[df['is_spam'] == 0].copy()
    real_df['clean_text'] = (real_df['subject'].fillna('') + ' ' + real_df['description'].fillna('')).apply(clean_text)
    
    X = real_df['clean_text']
    y = real_df['department']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=1500, ngram_range=(1, 2))),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])
    
    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    
    print(classification_report(y_test, preds))
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average='macro')
    acc = accuracy_score(y_test, preds)
    
    # Generate Confusion Matrix
    unique_labels = sorted(list(set(y.tolist())))
    cm = confusion_matrix(y_test, preds, labels=unique_labels)
    cm_data = {
        "labels": unique_labels,
        "values": cm.tolist()
    }
    
    with open(CONFUSION_MATRIX_PATH, "w") as f:
        json.dump(cm_data, f, indent=4)
    print(f"Saved Confusion Matrix to {CONFUSION_MATRIX_PATH}")
    
    joblib.dump(pipeline, MODEL_PATHS["router"])
    print(f"Saved Department Router Pipeline to {MODEL_PATHS['router']}")
    
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1)
    }

def train_sentiment_analyzer(df):
    print("\n--- [SENTIMENT] Training Sentiment Analyzer ---")
    real_df = df[df['is_spam'] == 0].copy()
    
    sentiment_map = {
        'resolved': 'satisfied',
        'rejected': 'angry',
        'in_progress': 'frustrated',
        'pending': 'concerned'
    }
    real_df['sentiment'] = real_df['status'].map(sentiment_map).fillna('neutral')
    real_df['clean_text'] = (real_df['subject'].fillna('') + ' ' + real_df['description'].fillna('')).apply(clean_text)
    
    X = real_df['clean_text']
    y = real_df['sentiment']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=1000)),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])
    
    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    
    print(classification_report(y_test, preds))
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average='macro')
    acc = accuracy_score(y_test, preds)
    
    joblib.dump(pipeline, MODEL_PATHS["sentiment"])
    print(f"Saved Sentiment Analyzer to {MODEL_PATHS['sentiment']}")
    
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1)
    }

def train_sla_and_resolution_time(df):
    print("\n--- [SLA] Training SLA & Resolution Time Predictors ---")
    real_df = df[df['is_spam'] == 0].copy()
    real_df['text_length'] = real_df['description'].fillna('').apply(len)
    
    features = ['department', 'priority', 'ward', 'text_length']
    X = real_df[features]
    y_sla = real_df['sla_breached']
    y_time = real_df['resolution_hours']
    
    categorical_features = ['department', 'priority', 'ward']
    numerical_features = ['text_length']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    # 1. SLA Breach Classifier
    X_train, X_test, y_train_sla, y_test_sla = train_test_split(X, y_sla, test_size=0.2, random_state=42)
    
    sla_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    sla_pipeline.fit(X_train, y_train_sla)
    preds_sla = sla_pipeline.predict(X_test)
    print("SLA Breach Classification Report:")
    print(classification_report(y_test_sla, preds_sla))
    
    precision_sla, recall_sla, f1_sla, _ = precision_recall_fscore_support(y_test_sla, preds_sla, average='binary')
    acc_sla = accuracy_score(y_test_sla, preds_sla)
    
    joblib.dump(sla_pipeline, MODEL_PATHS["sla"])
    print(f"Saved SLA Breach Predictor to {MODEL_PATHS['sla']}")
    
    # 2. Resolution Time Regressor
    X_train, X_test, y_train_time, y_test_time = train_test_split(X, y_time, test_size=0.2, random_state=42)
    
    time_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('reg', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    time_pipeline.fit(X_train, y_train_time)
    preds_time = time_pipeline.predict(X_test)
    
    mae_time = mean_absolute_error(y_test_time, preds_time)
    r2_time = r2_score(y_test_time, preds_time)
    print(f"Resolution Time Regression MAE: {mae_time:.2f} hours")
    print(f"Resolution Time Regression R2: {r2_time:.2f}")
    
    joblib.dump(time_pipeline, MODEL_PATHS["resolution_time"])
    print(f"Saved Resolution Time Regressor to {MODEL_PATHS['resolution_time']}")
    
    return {
        "sla": {
            "accuracy": float(acc_sla),
            "precision": float(precision_sla),
            "recall": float(recall_sla),
            "f1": float(f1_sla)
        },
        "resolution_time": {
            "mae": float(mae_time),
            "r2": float(r2_time)
        }
    }

def train_fraud_detector(df):
    print("\n--- [FRAUD] Training Fraud & Anomaly Detector ---")
    df['text_length'] = df['description'].fillna('').apply(len)
    
    features = ['submit_count', 'text_length', 'is_spam']
    X = df[features]
    
    clf = IsolationForest(contamination=0.08, random_state=42)
    clf.fit(X)
    
    preds = clf.predict(X)
    anomaly_pct = (preds == -1).sum() / len(preds)
    print(f"Isolation Forest trained. Flagged anomalies rate: {anomaly_pct:.2%}")
    
    joblib.dump(clf, MODEL_PATHS["fraud"])
    print(f"Saved Fraud Detector to {MODEL_PATHS['fraud']}")
    
    return {
        "anomaly_rate": float(anomaly_pct)
    }

def train_volume_forecaster(df):
    print("\n--- [FORECAST] Training Volume Forecaster ---")
    df['created_at_dt'] = pd.to_datetime(df['created_at'])
    df['date'] = df['created_at_dt'].dt.date
    
    daily_vol = df.groupby('date').size().reset_index(name='count')
    daily_vol = daily_vol.sort_values('date')
    
    daily_vol['lag_1'] = daily_vol['count'].shift(1)
    daily_vol['lag_2'] = daily_vol['count'].shift(2)
    daily_vol['lag_3'] = daily_vol['count'].shift(3)
    daily_vol['day_of_week'] = pd.to_datetime(daily_vol['date']).dt.dayofweek
    
    train_data = daily_vol.dropna()
    
    X = train_data[['lag_1', 'lag_2', 'lag_3', 'day_of_week']]
    y = train_data['count']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    reg = RandomForestRegressor(n_estimators=100, random_state=42)
    reg.fit(X_train, y_train)
    preds = reg.predict(X_test)
    
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Volume Forecaster MAE: {mae:.2f}, R2: {r2:.2f}")
    
    # Fit full model
    reg.fit(X, y)
    
    joblib.dump(reg, MODEL_PATHS["volume_forecaster"])
    print(f"Saved Volume Forecaster to {MODEL_PATHS['volume_forecaster']}")
    
    return {
        "mae": float(mae),
        "r2": float(r2)
    }

def run_latency_benchmark(df):
    """Measure actual inference response times over 100 sample prediction iterations."""
    print("\n--- [BENCHMARK] Running Inference Latency Telemetry Benchmark ---")
    df_clean = df[df['is_spam'] == 0].copy()
    descriptions = df_clean['description'].fillna('').tolist()
    if len(descriptions) < 100:
        descriptions = descriptions * (100 // len(descriptions) + 1)
    samples = descriptions[:100]
    
    # Load models
    spam_clf = joblib.load(MODEL_PATHS["spam"])
    router_clf = joblib.load(MODEL_PATHS["router"])
    sentiment_clf = joblib.load(MODEL_PATHS["sentiment"])
    sla_clf = joblib.load(MODEL_PATHS["sla"])
    time_reg = joblib.load(MODEL_PATHS["resolution_time"])
    
    latencies = []
    for text in samples:
        t_start = time.perf_counter()
        
        # Pipeline simulation
        cleaned = clean_text(text)
        _ = spam_clf.predict([cleaned])[0]
        _ = router_clf.predict([cleaned])[0]
        _ = sentiment_clf.predict([cleaned])[0]
        
        feat = pd.DataFrame([{
            'department': 'water',
            'priority': 'medium',
            'ward': 'Ward 1',
            'text_length': len(text)
        }])
        _ = sla_clf.predict(feat)[0]
        _ = time_reg.predict(feat)[0]
        
        t_elapsed = (time.perf_counter() - t_start) * 1000 # ms
        latencies.append(t_elapsed)
        
    avg_lat = np.mean(latencies)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    
    print(f"Benchmark finished: Avg={avg_lat:.2f}ms, Min={min_lat:.2f}ms, Max={max_lat:.2f}ms")
    return {
        "average_ms": float(avg_lat),
        "minimum_ms": float(min_lat),
        "maximum_ms": float(max_lat)
    }

def main():
    df = load_data()
    
    # Train and save each model, collecting validation metrics
    spam_m = train_spam_classifier(df)
    router_m = train_department_router(df)
    sentiment_m = train_sentiment_analyzer(df)
    sla_time_m = train_sla_and_resolution_time(df)
    fraud_m = train_fraud_detector(df)
    forecast_m = train_volume_forecaster(df)
    
    # Run performance latency benchmark
    latency_m = run_latency_benchmark(df)
    
    metrics_data = {
        "timestamp": datetime.now().isoformat(),
        "models": {
            "spam_classifier": spam_m,
            "department_router": router_m,
            "sentiment_analyzer": sentiment_m,
            "sla_predictor": sla_time_m["sla"],
            "resolution_time_regressor": sla_time_m["resolution_time"],
            "fraud_detector": fraud_m,
            "volume_forecaster": forecast_m
        },
        "latency_telemetry": latency_m
    }
    
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=4)
        
    print(f"\n[SUCCESS] ALL AI/ML MODELS TRAINED! Telemetry saved to {METRICS_PATH}")

if __name__ == "__main__":
    main()
