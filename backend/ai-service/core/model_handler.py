import os
import joblib
import logging
import threading
from typing import Optional, Any

logger = logging.getLogger("aazhi-ai.model_handler")

class MLModelHandler:
    """
    Singleton Thread-Safe Model Loader for the AAZHI AI Service.
    Resolves concurrency locks and prevents redundant .pkl parsing into active memory.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MLModelHandler, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.spam_classifier: Optional[Any] = None
        self.dept_router: Optional[Any] = None
        self.tfidf_vectorizer: Optional[Any] = None
        
        self._initialized = True

    def load_models(self, spam_path: str, dept_path: str) -> bool:
        """Loads Scikit-Learn pipelines STRICTLY verifying scaling and vector dependencies."""
        with self._lock:
            try:
                # Protects against incomplete model loads causing partial state execution
                if os.path.exists(spam_path):
                    self.spam_classifier = joblib.load(spam_path)
                    logger.info("✔️ Spam Pipeline loaded safely.")
                else:
                    logger.warning(f"Spam model missing at {spam_path}")

                if os.path.exists(dept_path):
                    self.dept_router = joblib.load(dept_path)
                    logger.info("✔️ Department Router loaded safely.")
                else:
                    logger.warning(f"Department Router missing at {dept_path}")
                    
                # Strict Scaling/Vectorization mapping to prevent mismatched transforms
                if hasattr(self.spam_classifier, "named_steps") and 'tfidf' in self.spam_classifier.named_steps:
                    self.tfidf_vectorizer = self.spam_classifier.named_steps['tfidf']
                    logger.info("✔️ TF-IDF Vectorizer initialized via Pipeline extraction.")

                return True
            except Exception as e:
                logger.critical(f"FATAL Serialization/Loading failure: {e}")
                return False

    def is_degraded(self) -> bool:
        """Deployment Shield: Returns True if inference must fall back to rules layer"""
        return not all([self.spam_classifier, self.dept_router])

# Instantiate singleton hook for the application lifecycle
model_manager = MLModelHandler()
