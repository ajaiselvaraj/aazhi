"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — AI Microservice v2.0                                ║
║  Production-grade civic complaint intelligence engine         ║
║                                                               ║
║  Features:                                                    ║
║    • Spam detection (LinearSVC + Platt calibration)           ║
║    • Department routing (multi-class classifier)              ║
║    • Duplicate detection (TF-IDF cosine similarity)           ║
║    • Angry citizen protection (rule + ML hybrid)              ║
║    • Model integrity verification (SHA-256)                   ║
║    • Graceful degradation (rule-based fallback)               ║
║    • Request validation & rate limiting                       ║
║                                                               ║
║  Zero external API keys — runs fully offline                  ║
╚═══════════════════════════════════════════════════════════════╝
"""

import os
import re
import json
import time
import hashlib
import logging
import joblib
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ─── Configuration ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
SPAM_MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(MODEL_DIR, "custom_spam_classifier.pkl"))
DEPT_MODEL_PATH = os.getenv("DEPT_MODEL_PATH", os.path.join(MODEL_DIR, "department_router.pkl"))
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

SPAM_THRESHOLD = float(os.getenv("SPAM_THRESHOLD", "0.75"))
DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.35"))
PORT = int(os.getenv("PORT", "5005"))

# Rate limiting
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))   # seconds
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "100"))        # requests per window

# CORS — lock down in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# Force offline mode — no internet calls at runtime
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("aazhi-ai")

# ─── Global State ──────────────────────────────────────────
spam_classifier = None
dept_router = None
model_metadata = None
tfidf_vectorizer = None  # For duplicate detection
rate_limit_store: dict[str, list[float]] = defaultdict(list)


# ═══════════════════════════════════════════════════════════
# CIVIC INTELLIGENCE — Rule-based augmentation layer
# ═══════════════════════════════════════════════════════════

# Comprehensive civic keyword bank (English + Tamil + Hindi transliterations)
CIVIC_KEYWORDS = [
    # Infrastructure
    "road", "pothole", "bridge", "flyover", "footpath", "sidewalk", "pavement",
    "underpass", "overpass", "highway", "lane", "street", "junction", "crossing",
    "speed breaker", "divider", "barricade", "construction",
    # Water
    "water", "pipeline", "pipe", "borewell", "tank", "tap", "supply",
    "drinking water", "overhead tank", "sump", "water atm", "ro plant",
    "leaking", "contaminated", "yellow water", "no water",
    # Electricity
    "electricity", "power", "current", "transformer", "streetlight",
    "electric pole", "wire", "cable", "voltage", "meter", "billing",
    "power cut", "load shedding", "led light", "solar light", "ev charging",
    # Sanitation
    "garbage", "waste", "dustbin", "sweeping", "cleaning", "sanitation",
    "dump", "debris", "smell", "stink", "dirty", "filthy", "rubbish",
    "garbage truck", "solid waste", "bio mining",
    # Drainage
    "drainage", "drain", "sewer", "sewage", "manhole", "flooding",
    "waterlogging", "overflow", "blocked drain", "stormwater", "canal",
    "nala", "naala",
    # Health
    "hospital", "clinic", "doctor", "medicine", "ambulance", "dengue",
    "malaria", "mosquito", "fogging", "health center", "phc",
    "anganwadi", "vaccination",
    # Environment
    "pollution", "noise", "smoke", "chemical", "factory", "emission",
    "dust", "air quality", "dumping", "river", "lake", "pond",
    # Governance
    "complaint", "problem", "issue", "broken", "damaged", "repair",
    "fix", "maintenance", "department", "officer", "government",
    "municipal", "corporation", "panchayat", "council", "authority",
    "collector", "commissioner", "ward", "councillor", "mla", "mp",
    # Urgency / Frustration (legitimate signals)
    "nobody", "nothing", "months", "weeks", "years", "long time",
    "please", "help", "urgent", "emergency", "immediately", "action",
    "ignored", "pending", "delayed", "no response", "useless",
    # Locations
    "area", "colony", "nagar", "village", "town", "street", "cross",
    "main road", "bus stand", "bus stop", "railway", "metro", "market",
    "temple", "mosque", "church", "school", "college", "park",
    # Animals
    "dog", "cattle", "cow", "stray", "animal", "snake", "monkey",
    # Documents / Admin
    "certificate", "patta", "pension", "ration", "voter id", "aadhar",
    "birth certificate", "death certificate", "tax", "property tax",
    # Tamil transliterations
    "saalai", "kudiNeer", "varala", "pannunga", "current", "sampam",
    "palli kuzhi", "naatram", "aabathu",
    # Hindi transliterations
    "paani", "sadak", "bijli", "kachra", "gaddha", "naala",
    "gaadi", "gandagi", "theek karo",
]

SPAM_SIGNALS = [
    r"https?://\S+",                         # URLs
    r"www\.\S+",                             # www links
    r"click\s+(here|now|link|this)",         # CTA spam
    r"buy\s+(now|one|cheap)",                # Promotion
    r"free\s+(trial|offer|gift|money|iphone|netflix|premium|account|download)", # Free stuff
    r"congratulations",                      # Lottery/phishing
    r"you\s+(won|have\s+been\s+selected)",   # Lottery
    r"earn\s+[\$₹]?\d+",                    # Scam earnings
    r"act\s+now",                            # Urgency spam
    r"limited\s+(time|offer|period|stock|spots)", # Urgency spam
    r"viagra|cialis|pharmacy|pills",         # Pharma spam
    r"casino|lottery|prize|winner|jackpot",  # Gambling spam
    r"subscribe|unsubscribe",                # Newsletter spam
    r"(work|earn|money).{0,20}(home|daily|monthly|fast)", # Work from home scam
    r"(loan|credit).{0,15}(approved|instant|no\s+documents)", # Loan scam
    r"(double|triple).{0,10}(money|investment)", # Investment scam
    r"(.)(\1){5,}",                          # Repeated chars: "aaaaaaa"
    r"[!]{4,}",                              # Excessive exclamation (<=3 OK for angry citizens)
    r"(?:[A-Z0-9]{20,})",                    # Random alphanumeric strings
    r"mod\s+apk|cracked|hack|keygen",        # Piracy spam
    r"(followers|likes|subscribers).{0,20}\d+", # Social media spam
    r"call\s+(now|today|us).{0,15}(free|toll)", # Telemarketing
    r"prince.{0,20}(nigeria|million|dollars)", # Nigerian prince scam
    r"(kbc|jio|airtel).{0,20}(prize|winner|lakh|crore)", # Indian lottery scam
    r"bank\s+(details|account).{0,20}(verify|confirm|send)", # Phishing
]


def has_civic_context(text: str) -> tuple[bool, int]:
    """
    Check if text contains civic/government complaint keywords.
    Returns (is_civic, match_count).
    """
    text_lower = text.lower()
    matches = sum(1 for kw in CIVIC_KEYWORDS if kw in text_lower)
    return matches >= 2, matches


def count_spam_signals(text: str) -> int:
    """Count the number of spam pattern matches in the text."""
    return sum(1 for pattern in SPAM_SIGNALS if re.search(pattern, text, re.IGNORECASE))


def detect_language_mix(text: str) -> str:
    """Detect if text contains Tamil/Hindi transliterations."""
    tamil_markers = ["pannu", "vaala", "varala", "illa", "aachuu", "romba", "inga", "anga"]
    hindi_markers = ["nahi", "karo", "koi", "bahut", "raha", "wala", "kuch", "abhi"]

    text_lower = text.lower()
    tamil_count = sum(1 for m in tamil_markers if m in text_lower)
    hindi_count = sum(1 for m in hindi_markers if m in text_lower)

    if tamil_count >= 2:
        return "tamil_transliteration"
    elif hindi_count >= 2:
        return "hindi_transliteration"
    return "english"


def smart_classify(text: str, model_label: str, model_score: float) -> dict:
    """
    Hybrid classification combining ML model output with rule-based heuristics.

    Priority chain:
    1. Strong civic context + no spam signals → NOT spam (override model)
    2. Multiple spam signals + model agrees → SPAM
    3. Model confidence high + no civic context → trust model
    4. Edge cases → lean toward NOT spam (citizen protection)
    """
    is_civic, civic_count = has_civic_context(text)
    spam_signal_count = count_spam_signals(text)
    is_all_caps = text.upper() == text and len(text) > 20
    lang = detect_language_mix(text)
    word_count = len(text.split())

    # Very short text with no civic context is suspicious but not necessarily spam
    is_short = word_count < 5

    # ─── RULE 1: Strong civic context overrides ML ───
    if model_label == "spam":
        if is_civic and spam_signal_count == 0:
            return {
                "is_spam": False,
                "confidence": round(max(0.6, 1.0 - model_score), 4),
                "reason": f"Detected as citizen complaint ({civic_count} civic keywords, no spam signals). "
                          f"{'ALL CAPS indicates frustration, not spam. ' if is_all_caps else ''}"
                          f"{'Regional language detected. ' if lang != 'english' else ''}",
                "classification": "angry_citizen" if is_all_caps else "legitimate",
            }

        # Civic context PLUS some spam signals → needs judgment
        if is_civic and spam_signal_count <= 1 and model_score < 0.90:
            return {
                "is_spam": False,
                "confidence": round(1.0 - model_score, 4),
                "reason": f"Civic context ({civic_count} keywords) outweighs weak spam signals ({spam_signal_count}). Allowing through.",
                "classification": "uncertain_legit",
            }

    # ─── RULE 2: Strong spam signals + model agreement ───
    if model_label == "spam" and spam_signal_count >= 2 and model_score >= SPAM_THRESHOLD:
        return {
            "is_spam": True,
            "confidence": round(min(model_score + 0.05, 1.0), 4),
            "reason": f"Spam confirmed: {spam_signal_count} spam patterns detected, model confidence {model_score:.1%}.",
            "classification": "spam",
        }

    # ─── RULE 3: Model says spam but low confidence ───
    if model_label == "spam" and model_score < SPAM_THRESHOLD:
        return {
            "is_spam": False,
            "confidence": round(1.0 - model_score, 4),
            "reason": f"Model flagged as potential spam but confidence ({model_score:.1%}) below threshold ({SPAM_THRESHOLD:.0%}). Allowing through.",
            "classification": "uncertain_legit",
        }

    # ─── RULE 4: High confidence spam, no civic context ───
    if model_label == "spam" and not is_civic and model_score >= SPAM_THRESHOLD:
        return {
            "is_spam": True,
            "confidence": round(model_score, 4),
            "reason": f"No civic context found, model confidence {model_score:.1%}.",
            "classification": "spam",
        }

    # ─── RULE 5: Model says ham — trust it unless overridden ───
    if model_label == "ham":
        # Ham but loaded with spam signals and no civic context
        if spam_signal_count >= 3 and not is_civic:
            return {
                "is_spam": True,
                "confidence": 0.72,
                "reason": f"Multiple spam signals ({spam_signal_count}) detected despite model classifying as legitimate. Overriding.",
                "classification": "suspicious_spam",
            }

        # Build enriched reason
        reason_parts = ["Classified as legitimate complaint."]
        if is_all_caps:
            reason_parts.append("ALL CAPS detected — frustrated citizen, not spam.")
        if lang != "english":
            reason_parts.append(f"Regional language ({lang}) detected.")
        if civic_count > 3:
            reason_parts.append(f"Strong civic context ({civic_count} keywords).")

        return {
            "is_spam": False,
            "confidence": round(model_score, 4),
            "reason": " ".join(reason_parts),
            "classification": "legitimate",
        }

    # ─── FALLBACK — should never reach here ───
    return {
        "is_spam": False,
        "confidence": 0.5,
        "reason": "Unable to classify with certainty. Allowing through by default (citizen protection).",
        "classification": "unknown",
    }


def rule_based_classify(text: str) -> dict:
    """
    Pure rule-based fallback when ML model is unavailable.
    Used for graceful degradation.
    """
    is_civic, civic_count = has_civic_context(text)
    spam_signal_count = count_spam_signals(text)

    if spam_signal_count >= 3 and not is_civic:
        return {
            "is_spam": True,
            "confidence": min(0.5 + spam_signal_count * 0.1, 0.85),
            "reason": f"[FALLBACK] Rule-based: {spam_signal_count} spam signals, no civic keywords.",
            "classification": "spam",
        }
    elif is_civic and spam_signal_count == 0:
        return {
            "is_spam": False,
            "confidence": min(0.5 + civic_count * 0.05, 0.90),
            "reason": f"[FALLBACK] Rule-based: {civic_count} civic keywords detected.",
            "classification": "legitimate",
        }
    else:
        return {
            "is_spam": False,
            "confidence": 0.5,
            "reason": "[FALLBACK] Rule-based: Inconclusive, allowing through (citizen protection).",
            "classification": "uncertain_legit",
        }


# ═══════════════════════════════════════════════════════════
# MODEL MANAGEMENT
# ═══════════════════════════════════════════════════════════

def verify_model_integrity(model_path: str, expected_hash: str | None) -> bool:
    """Verify model file integrity via SHA-256 hash."""
    if not expected_hash:
        return True  # No hash to check against

    sha256 = hashlib.sha256()
    with open(model_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    actual_hash = sha256.hexdigest()

    if actual_hash != expected_hash:
        logger.error(f"❌ Model integrity check FAILED for {model_path}")
        logger.error(f"   Expected: {expected_hash}")
        logger.error(f"   Actual:   {actual_hash}")
        return False
    return True


def load_models():
    """Load all ML models with integrity verification."""
    global spam_classifier, dept_router, model_metadata, tfidf_vectorizer

    # Load metadata if available
    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, 'r', encoding='utf-8') as f:
            model_metadata = json.load(f)
        logger.info(f"📋 Model metadata loaded (trained: {model_metadata.get('trained_at', 'unknown')})")

    # Load spam classifier
    if os.path.exists(SPAM_MODEL_PATH):
        expected_hash = None
        if model_metadata and "spam_classifier" in model_metadata:
            expected_hash = model_metadata["spam_classifier"].get("model_hash")

        if verify_model_integrity(SPAM_MODEL_PATH, expected_hash):
            spam_classifier = joblib.load(SPAM_MODEL_PATH)
            logger.info(f"✅ Spam classifier loaded from {SPAM_MODEL_PATH}")
        else:
            logger.warning("⚠️ Spam classifier integrity check failed. Using rule-based fallback.")
    else:
        logger.warning(f"⚠️ Spam classifier not found at {SPAM_MODEL_PATH}. Using rule-based fallback.")

    # Load department router
    if os.path.exists(DEPT_MODEL_PATH):
        expected_hash = None
        if model_metadata and "department_router" in model_metadata:
            expected_hash = model_metadata["department_router"].get("model_hash")

        if verify_model_integrity(DEPT_MODEL_PATH, expected_hash):
            dept_router = joblib.load(DEPT_MODEL_PATH)
            logger.info(f"✅ Department router loaded from {DEPT_MODEL_PATH}")
        else:
            logger.warning("⚠️ Department router integrity check failed. Routing disabled.")
    else:
        logger.info("ℹ️ Department router not found. Department routing disabled.")

    # Initialize TF-IDF vectorizer for duplicate detection
    tfidf_vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        stop_words='english',
        ngram_range=(1, 2),
        max_features=5000,
        strip_accents='unicode',
    )
    logger.info("✅ TF-IDF vectorizer initialized for duplicate detection.")


# ─── Lifespan ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting AAZHI AI Service v2.0")
    load_models()

    if spam_classifier is None:
        logger.warning("═══════════════════════════════════════════════")
        logger.warning("  ⚠️  RUNNING IN DEGRADED MODE (rule-based only)")
        logger.warning("  Run: python train_model.py  to train the ML models")
        logger.warning("═══════════════════════════════════════════════")

    yield
    logger.info("🔌 AI service shutting down.")


# ═══════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════

app = FastAPI(
    title="AAZHI AI Service",
    description="Production-grade ML intelligence engine for civic complaint validation, department routing, and duplicate detection.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ─── Rate Limiting Middleware ───────────────────────────────
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Simple in-memory rate limiter per client IP."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old entries
    rate_limit_store[client_ip] = [
        t for t in rate_limit_store[client_ip]
        if now - t < RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again later."},
        )

    rate_limit_store[client_ip].append(now)
    response = await call_next(request)
    return response


# ═══════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════

class ComplaintValidationRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000, description="Complaint text to validate")


class ExistingComplaint(BaseModel):
    id: int
    ticket_number: str
    subject: str
    description: str


class DuplicateCheckRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000, description="New complaint text")
    existing_complaints: list[ExistingComplaint] = Field(default=[], description="Recent complaints from same citizen")


class DepartmentRoutingRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000, description="Complaint text to route")


class ValidationResult(BaseModel):
    is_spam: bool
    confidence: float
    reason: str
    classification: str


class DepartmentResult(BaseModel):
    department: str
    confidence: float
    all_scores: dict[str, float] = Field(default={}, description="Confidence scores for all departments")
    reason: str


class DuplicateResult(BaseModel):
    is_duplicate: bool
    similarity: float
    matched_ticket: str | None = None
    matched_id: int | None = None
    reason: str


class FullAnalysisResult(BaseModel):
    validation: ValidationResult
    department: DepartmentResult | None = None
    duplicate: DuplicateResult | None = None


class APIResponse(BaseModel):
    success: bool
    message: str
    data: ValidationResult | DuplicateResult | DepartmentResult | FullAnalysisResult | None = None
    model_version: str = "2.0.0"
    degraded_mode: bool = False


# ═══════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    """Comprehensive health check with model status."""
    return {
        "status": "healthy",
        "service": "aazhi-ai-service",
        "version": "2.0.0",
        "models": {
            "spam_classifier": {
                "loaded": spam_classifier is not None,
                "path": SPAM_MODEL_PATH,
            },
            "department_router": {
                "loaded": dept_router is not None,
                "path": DEPT_MODEL_PATH,
            },
            "tfidf_duplicate_detector": {
                "loaded": tfidf_vectorizer is not None,
            },
        },
        "degraded_mode": spam_classifier is None,
        "metadata": {
            "trained_at": model_metadata.get("trained_at") if model_metadata else None,
            "total_samples": model_metadata.get("total_samples") if model_metadata else None,
            "pipeline_version": model_metadata.get("pipeline_version") if model_metadata else None,
        },
    }


@app.post("/api/ai/validate-complaint", response_model=APIResponse)
async def validate_complaint(request: ComplaintValidationRequest):
    """
    Validate a complaint text for spam detection.
    Uses ML model when available, falls back to rule-based classification.
    """
    text = request.text.strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="Complaint text too short")

    degraded = spam_classifier is None

    if spam_classifier is not None:
        # Run ML model
        pred_class = spam_classifier.predict([text])[0]
        probs = spam_classifier.predict_proba([text])[0]

        # Find spam probability
        classes = list(spam_classifier.classes_)
        spam_idx = classes.index("spam") if "spam" in classes else 1
        model_score = float(probs[spam_idx])
        model_label = "spam" if pred_class == "spam" else "ham"

        logger.info(f"ML → label={model_label}, score={model_score:.4f}, preview={text[:80]!r}")

        # Hybrid classification
        classification = smart_classify(text, model_label, model_score)
    else:
        # Graceful degradation — rule-based only
        logger.warning(f"DEGRADED → rule-based classification for: {text[:80]!r}")
        classification = rule_based_classify(text)

    logger.info(f"Result → spam={classification['is_spam']}, class={classification['classification']}")

    return APIResponse(
        success=True,
        message="Complaint validated",
        data=ValidationResult(**classification),
        degraded_mode=degraded,
    )


@app.post("/api/ai/route-department", response_model=APIResponse)
async def route_department(request: DepartmentRoutingRequest):
    """
    Route a complaint to the appropriate department.
    Returns the predicted department with confidence scores.
    """
    text = request.text.strip()

    if dept_router is None:
        # Fallback: keyword-based routing
        dept = keyword_based_routing(text)
        return APIResponse(
            success=True,
            message="Department routed (keyword-based fallback)",
            data=DepartmentResult(
                department=dept,
                confidence=0.6,
                all_scores={dept: 0.6},
                reason=f"[FALLBACK] Keyword-based routing to '{dept}'. ML router not available.",
            ),
            degraded_mode=True,
        )

    # ML-based routing
    pred_dept = dept_router.predict([text])[0]

    # Get probability scores if available
    all_scores = {}
    if hasattr(dept_router, 'predict_proba'):
        probs = dept_router.predict_proba([text])[0]
        classes = list(dept_router.classes_)
        all_scores = {cls: round(float(prob), 4) for cls, prob in zip(classes, probs)}
        confidence = float(max(probs))
    else:
        # LinearSVC decision function
        decision = dept_router.decision_function([text])[0]
        if isinstance(decision, np.ndarray):
            classes = list(dept_router.classes_)
            # Normalize to 0-1 range
            exp_scores = np.exp(decision - np.max(decision))
            softmax = exp_scores / exp_scores.sum()
            all_scores = {cls: round(float(s), 4) for cls, s in zip(classes, softmax)}
            confidence = float(max(softmax))
        else:
            confidence = 0.7

    # Sort scores descending
    all_scores = dict(sorted(all_scores.items(), key=lambda x: -x[1]))
    top_3 = list(all_scores.items())[:3]
    top_3_str = ", ".join(f"{dept}: {score:.0%}" for dept, score in top_3)

    return APIResponse(
        success=True,
        message="Department routed",
        data=DepartmentResult(
            department=pred_dept,
            confidence=round(confidence, 4),
            all_scores=all_scores,
            reason=f"Routed to '{pred_dept}' (confidence: {confidence:.0%}). Top candidates: {top_3_str}",
        ),
    )


def keyword_based_routing(text: str) -> str:
    """Simple keyword-based department routing fallback."""
    text_lower = text.lower()

    routing_rules = {
        "water": ["water", "pipeline", "pipe", "borewell", "tap", "supply", "paani", "kudiNeer"],
        "electricity": ["electricity", "power", "current", "transformer", "streetlight", "wire", "voltage", "meter", "bijli"],
        "sanitation": ["garbage", "waste", "dustbin", "cleaning", "smell", "dirty", "sanitation", "kachra", "sampam"],
        "drainage": ["drainage", "drain", "sewer", "sewage", "manhole", "flooding", "overflow", "naala"],
        "roads": ["road", "pothole", "bridge", "footpath", "highway", "flyover", "sadak", "saalai", "gaddha"],
        "health": ["hospital", "doctor", "medicine", "ambulance", "dengue", "mosquito", "health"],
        "environment": ["pollution", "noise", "chemical", "factory", "river", "lake", "dumping"],
        "traffic": ["traffic", "signal", "parking", "speed", "bus", "crossing", "accident"],
        "parks": ["park", "playground", "garden", "tree", "green"],
        "building": ["construction", "building", "unauthorized", "illegal construction"],
        "animal_control": ["dog", "cattle", "cow", "stray", "animal", "snake"],
        "enforcement": ["encroachment", "illegal", "vendor", "cctv", "hookah"],
        "administrative": ["certificate", "pension", "ration", "voter", "aadhar", "application", "pending"],
        "revenue": ["tax", "property tax", "patta", "land", "encroachment"],
        "gas": ["gas", "lpg", "cylinder", "png", "pipeline leak"],
        "fire": ["fire", "fire hydrant", "fire truck", "fire safety"],
        "education": ["school", "teacher", "anganwadi", "college"],
        "welfare": ["pension", "ration", "old age", "widow", "disabled"],
    }

    best_dept = "general"
    best_score = 0

    for dept, keywords in routing_rules.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_dept = dept

    return best_dept


# ─── Duplicate Detection (TF-IDF Cosine) ──────────────────

def normalize_text(text: str) -> str:
    """Lowercase, strip extra whitespace, remove punctuation for comparison."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)   # remove punctuation
    text = re.sub(r"\s+", " ", text)       # collapse whitespace
    return text


def compute_tfidf_similarity(new_text: str, existing_texts: list[str]) -> list[float]:
    """
    Compute TF-IDF cosine similarity between new text and existing texts.
    Much more semantically aware than SequenceMatcher.
    Creates a local vectorizer if the global one isn't initialized.
    """
    all_texts = [normalize_text(new_text)] + [normalize_text(t) for t in existing_texts]

    # Use global vectorizer if available, otherwise create a local one
    vectorizer = tfidf_vectorizer
    if vectorizer is None:
        vectorizer = TfidfVectorizer(
            sublinear_tf=True,
            stop_words='english',
            ngram_range=(1, 2),
            max_features=5000,
            strip_accents='unicode',
        )

    try:
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        return similarities.tolist()
    except ValueError:
        # Fallback if TF-IDF fails (e.g., all stop words)
        return [0.0] * len(existing_texts)


@app.post("/api/ai/check-duplicate", response_model=APIResponse)
async def check_duplicate(request: DuplicateCheckRequest):
    """
    Check if a new complaint is a duplicate of any recent existing complaint.
    Uses TF-IDF cosine similarity for semantic matching.
    """
    new_text = request.text.strip()

    if not request.existing_complaints:
        return APIResponse(
            success=True,
            message="No existing complaints to compare",
            data=DuplicateResult(
                is_duplicate=False,
                similarity=0.0,
                reason="No previous complaints found for this citizen.",
            ),
        )

    # Build existing complaint texts
    existing_texts = [
        f"{c.subject} {c.description}" for c in request.existing_complaints
    ]

    # Compute TF-IDF similarities
    similarities = compute_tfidf_similarity(new_text, existing_texts)

    # Find best match
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])
    best_match = request.existing_complaints[best_idx]

    is_dup = best_score >= DUPLICATE_THRESHOLD

    logger.info(
        f"Duplicate check: best_score={best_score:.4f}, "
        f"threshold={DUPLICATE_THRESHOLD}, is_dup={is_dup}, "
        f"method=tfidf_cosine"
    )

    return APIResponse(
        success=True,
        message="Duplicate check completed",
        data=DuplicateResult(
            is_duplicate=is_dup,
            similarity=round(best_score, 4),
            matched_ticket=best_match.ticket_number if is_dup else None,
            matched_id=best_match.id if is_dup else None,
            reason=(
                f"This complaint is {best_score:.0%} similar to ticket {best_match.ticket_number} "
                f"(TF-IDF cosine similarity). Please check your existing complaint."
                if is_dup
                else f"No duplicate found. Closest match: {best_score:.0%} similarity (below {DUPLICATE_THRESHOLD:.0%} threshold)."
            ),
        ),
    )


# ─── Full Analysis Endpoint ────────────────────────────────

@app.post("/api/ai/analyze", response_model=APIResponse)
async def full_analysis(request: DuplicateCheckRequest):
    """
    Complete analysis: spam check + department routing + duplicate detection.
    Single call for the full intelligence pipeline.
    """
    text = request.text.strip()

    # 1. Spam validation
    if spam_classifier is not None:
        pred_class = spam_classifier.predict([text])[0]
        probs = spam_classifier.predict_proba([text])[0]
        classes = list(spam_classifier.classes_)
        spam_idx = classes.index("spam") if "spam" in classes else 1
        model_score = float(probs[spam_idx])
        model_label = "spam" if pred_class == "spam" else "ham"
        validation = smart_classify(text, model_label, model_score)
    else:
        validation = rule_based_classify(text)

    # 2. Department routing (only if not spam)
    department = None
    if not validation["is_spam"]:
        if dept_router is not None:
            pred_dept = dept_router.predict([text])[0]
            if hasattr(dept_router, 'predict_proba'):
                probs = dept_router.predict_proba([text])[0]
                confidence = float(max(probs))
                all_scores = {cls: round(float(p), 4) for cls, p in zip(dept_router.classes_, probs)}
            else:
                confidence = 0.7
                all_scores = {}
            department = DepartmentResult(
                department=pred_dept,
                confidence=round(confidence, 4),
                all_scores=dict(sorted(all_scores.items(), key=lambda x: -x[1])),
                reason=f"Routed to '{pred_dept}' with {confidence:.0%} confidence.",
            )
        else:
            dept = keyword_based_routing(text)
            department = DepartmentResult(
                department=dept,
                confidence=0.6,
                all_scores={dept: 0.6},
                reason=f"[FALLBACK] Keyword-based routing to '{dept}'.",
            )

    # 3. Duplicate check
    duplicate = None
    if not validation["is_spam"] and request.existing_complaints:
        existing_texts = [f"{c.subject} {c.description}" for c in request.existing_complaints]
        similarities = compute_tfidf_similarity(text, existing_texts)
        best_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])
        best_match = request.existing_complaints[best_idx]
        is_dup = best_score >= DUPLICATE_THRESHOLD

        duplicate = DuplicateResult(
            is_duplicate=is_dup,
            similarity=round(best_score, 4),
            matched_ticket=best_match.ticket_number if is_dup else None,
            matched_id=best_match.id if is_dup else None,
            reason=(
                f"{best_score:.0%} similar to ticket {best_match.ticket_number}."
                if is_dup
                else f"No duplicate (best match: {best_score:.0%})."
            ),
        )

    return APIResponse(
        success=True,
        message="Full analysis completed",
        data=FullAnalysisResult(
            validation=ValidationResult(**validation),
            department=department,
            duplicate=duplicate,
        ),
        degraded_mode=spam_classifier is None,
    )


# ═══════════════════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
