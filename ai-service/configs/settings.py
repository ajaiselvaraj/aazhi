import os

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASETS_DIR = os.path.join(BASE_DIR, "training", "datasets")

# Ensure paths exist
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATASETS_DIR, exist_ok=True)

# Model Serialization Paths
MODEL_PATHS = {
    "spam": os.path.join(MODELS_DIR, "spam_model.pkl"),
    "router": os.path.join(MODELS_DIR, "router_model.pkl"),
    "sentiment": os.path.join(MODELS_DIR, "sentiment_model.pkl"),
    "fraud": os.path.join(MODELS_DIR, "fraud_model.pkl"),
    "sla": os.path.join(MODELS_DIR, "sla_model.pkl"),
    "resolution_time": os.path.join(MODELS_DIR, "resolution_time_model.pkl"),
    "volume_forecaster": os.path.join(MODELS_DIR, "volume_forecaster_model.pkl"),
}

METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")
CONFUSION_MATRIX_PATH = os.path.join(MODELS_DIR, "confusion_matrix.json")

# Parameters
DUPLICATE_THRESHOLD = 0.45
DEFAULT_DEPARTMENTS = ["water", "electricity", "roads", "sanitation", "billing", "property_tax", "general"]
DEFAULT_PRIORITIES = ["low", "medium", "high", "critical"]
DEFAULT_SENTIMENTS = ["neutral", "frustrated", "concerned", "angry", "satisfied"]
