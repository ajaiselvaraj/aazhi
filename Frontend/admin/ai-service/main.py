"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — AI Spam Filter Microservice                         ║
║  Local ML-powered civic complaint validator                  ║
║  Zero external API keys — runs fully offline                 ║
╚═══════════════════════════════════════════════════════════════╝

Model: mrm8488/bert-tiny-finetuned-sms-spam-detection
Labels: LABEL_0 = ham (legitimate), LABEL_1 = spam

The filter distinguishes between:
  - Bot/Spam: gibberish, promotional text, phishing, SEO spam
  - Angry Citizens: ALL CAPS, aggressive language, urgency, profanity
    (these are LEGITIMATE complaints and must NOT be flagged)
"""

import os
import re
from difflib import SequenceMatcher
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline

# ─── Configuration ──────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "spam-filter"))
SPAM_THRESHOLD = float(os.getenv("SPAM_THRESHOLD", "0.85"))
PORT = int(os.getenv("PORT", "5005"))

# Force offline mode — no internet calls at runtime
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("aazhi-ai")

# ─── Global model reference ────────────────────────────────
classifier = None


# ─── Angry Citizen Detection ───────────────────────────────
# Patterns that indicate a frustrated citizen, NOT a spammer
CIVIC_KEYWORDS = [
    "road", "water", "electricity", "garbage", "sewage", "pothole",
    "drainage", "streetlight", "park", "hospital", "school", "bridge",
    "footpath", "complaint", "problem", "issue", "broken", "damaged",
    "repair", "fix", "maintenance", "clean", "dirty", "smell",
    "noise", "pollution", "traffic", "accident", "danger", "unsafe",
    "ward", "area", "colony", "street", "nagar", "village", "town",
    "department", "officer", "government", "municipal", "corporation",
    "panchayat", "council", "authority", "collector", "commissioner",
    "nobody", "nothing", "months", "weeks", "years", "long time",
    "please", "help", "urgent", "emergency", "immediately", "action",
]

SPAM_SIGNALS = [
    r"https?://\S+",                          # URLs
    r"www\.\S+",                              # www links
    r"click\s+here",                          # CTA spam
    r"buy\s+now",                             # Promotion
    r"free\s+(trial|offer|gift|money)",        # Free stuff
    r"congratulations",                       # Lottery/phishing
    r"you\s+(won|have\s+been\s+selected)",    # Lottery
    r"earn\s+\$?\d+",                          # Scam earnings
    r"act\s+now",                              # Urgency spam
    r"limited\s+time",                         # Urgency spam
    r"viagra|cialis|pharmacy|pills",          # Pharma spam
    r"casino|lottery|prize|winner",           # Gambling spam
    r"subscribe|unsubscribe",                 # Newsletter spam
    r"(.)\1{5,}",                              # Repeated chars: "aaaaaaa"
    r"[!]{4,}",                                # Excessive exclamation (but <=3 is OK for angry citizens)
    r"(?:[A-Z0-9]{20,})",                      # Random alphanumeric strings
]


def has_civic_context(text: str) -> bool:
    """Check if text contains civic/government complaint keywords."""
    text_lower = text.lower()
    matches = sum(1 for kw in CIVIC_KEYWORDS if kw in text_lower)
    return matches >= 2  # At least 2 civic keywords = likely real complaint


def count_spam_signals(text: str) -> int:
    """Count the number of spam pattern matches in the text."""
    return sum(1 for pattern in SPAM_SIGNALS if re.search(pattern, text, re.IGNORECASE))


def smart_classify(text: str, model_label: str, model_score: float) -> dict:
    """
    Smart classification that combines ML model output with rule-based
    heuristics to distinguish spam from angry citizens.

    Priority:
    1. If text has strong civic context → NOT spam (even if model says spam)
    2. If text has spam signals (URLs, promotions) → likely spam
    3. If model confidence is high → trust the model
    4. Edge cases → lean toward NOT spam (don't block real citizens)
    """
    civic = has_civic_context(text)
    spam_signal_count = count_spam_signals(text)
    is_all_caps = text.upper() == text and len(text) > 20

    # Model says spam (LABEL_1)
    if model_label == "LABEL_1":
        # But it has civic keywords → angry citizen, NOT spam
        if civic and spam_signal_count == 0:
            return {
                "is_spam": False,
                "confidence": round(1.0 - model_score, 4),
                "reason": "Detected as angry citizen complaint (civic keywords present, no spam signals).",
                "classification": "angry_citizen",
            }

        # Model says spam AND has spam signals → definitely spam
        if spam_signal_count >= 2 and model_score >= SPAM_THRESHOLD:
            return {
                "is_spam": True,
                "confidence": round(model_score, 4),
                "reason": f"Spam detected: {spam_signal_count} spam signals found, model confidence {model_score:.1%}.",
                "classification": "spam",
            }

        # Model says spam but confidence is low → give benefit of doubt
        if model_score < SPAM_THRESHOLD:
            return {
                "is_spam": False,
                "confidence": round(1.0 - model_score, 4),
                "reason": f"Model flagged as potential spam but confidence ({model_score:.1%}) is below threshold ({SPAM_THRESHOLD:.0%}).",
                "classification": "uncertain_legit",
            }

        # High confidence spam with no civic context
        if not civic and model_score >= SPAM_THRESHOLD:
            return {
                "is_spam": True,
                "confidence": round(model_score, 4),
                "reason": f"No civic context found, model confidence {model_score:.1%}.",
                "classification": "spam",
            }

    # Model says ham (LABEL_0) — trust it, unless there are spam signals
    if model_label == "LABEL_0":
        if spam_signal_count >= 3 and not civic:
            return {
                "is_spam": True,
                "confidence": 0.7,
                "reason": f"Multiple spam signals ({spam_signal_count}) detected despite model classifying as legitimate.",
                "classification": "suspicious_spam",
            }

        return {
            "is_spam": False,
            "confidence": round(model_score, 4),
            "reason": "Classified as legitimate complaint.",
            "classification": "legitimate",
        }

    # Fallback — should never reach here
    return {
        "is_spam": False,
        "confidence": 0.5,
        "reason": "Unable to classify. Allowing through by default.",
        "classification": "unknown",
    }


# ─── Department Classification Engine ──────────────────────
DEPARTMENT_KEYWORDS: dict[str, list[str]] = {
    "Electricity Department": [
        "electricity", "power", "current", "voltage", "transformer",
        "wiring", "electric", "streetlight", "street light", "light pole",
        "power cut", "power outage", "blackout", "fuse", "meter", "eb",
        "power failure", "no current", "no power", "bulb", "lamp",
    ],
    "Water Supply Department": [
        "water", "pipeline", "pipe", "tap", "bore", "borewell",
        "water supply", "water tank", "overhead tank", "water pressure",
        "contaminated water", "dirty water", "no water", "water leak",
        "drinking water", "water connection", "sewage", "drainage",
        "drain", "sewer", "flooding", "waterlogging", "overflow",
    ],
    "Gas Distribution": [
        "gas", "gas leak", "gas supply", "gas pipeline", "lpg",
        "gas cylinder", "cooking gas", "gas connection", "gas smell",
        "gas pressure", "natural gas", "gas meter",
    ],
    "Municipal Services": [
        "garbage", "waste", "trash", "rubbish", "dustbin", "bin",
        "sanitation", "sweeping", "cleaning", "pothole", "road",
        "footpath", "sidewalk", "pavement", "park", "playground",
        "garden", "tree", "mosquito", "pest", "stray", "dog", "animal",
        "noise", "encroachment", "illegal", "building", "construction",
        "permit", "license", "death certificate", "birth certificate",
        "property tax", "tax", "school", "hospital",
    ],
}

PRIORITY_KEYWORDS: dict[str, list[str]] = {
    "Critical": [
        "emergency", "danger", "dangerous", "life threatening", "death",
        "fire", "explosion", "collapse", "accident", "electrocution",
        "gas leak", "burst", "flood", "drowning", "casualty", "fatal",
        "children at risk", "school children", "health hazard",
    ],
    "High": [
        "urgent", "immediately", "no supply", "no water", "no electricity",
        "no power", "outage", "broken", "damaged", "3 days", "week",
        "weeks", "blocked", "overflowing", "contaminated", "unsafe",
        "entire block", "entire colony", "entire ward", "many people",
        "residents affected", "families affected",
    ],
    "Medium": [
        "problem", "issue", "complaint", "not working", "repair",
        "maintenance", "slow", "intermittent", "low pressure",
        "discolour", "discolor", "smell", "noisy", "inconvenience",
    ],
}


def classify_complaint(text: str) -> dict:
    """
    Classify complaint into department + priority using keyword matching.
    Returns department, priority, confidence, and matched keywords.
    """
    text_lower = text.lower()

    # ── Department scoring ──
    dept_scores: dict[str, list[str]] = {}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        matched = [kw for kw in keywords if kw in text_lower]
        if matched:
            dept_scores[dept] = matched

    if not dept_scores:
        department = "Municipal Services"  # default fallback
        dept_confidence = 35.0
        dept_matched: list[str] = []
    else:
        # Pick dept with most keyword hits; break ties by keyword specificity (longer = more specific)
        best_dept = max(dept_scores, key=lambda d: (len(dept_scores[d]), sum(len(k) for k in dept_scores[d])))
        dept_matched = dept_scores[best_dept]
        department = best_dept
        # Confidence: more matches = higher confidence, capped at 98
        hit_count = len(dept_matched)
        total_depts_matched = len(dept_scores)
        dept_confidence = min(98.0, 50.0 + hit_count * 12.0 - (total_depts_matched - 1) * 10.0)
        if total_depts_matched > 1 and dept_confidence > 70:
            dept_confidence = max(45.0, dept_confidence - 15.0)  # ambiguity penalty

    # ── Priority scoring ──
    priority = "Low"
    priority_matched: list[str] = []
    for prio_level in ["Critical", "High", "Medium"]:
        matched = [kw for kw in PRIORITY_KEYWORDS[prio_level] if kw in text_lower]
        if matched:
            priority = prio_level
            priority_matched = matched
            break  # take highest priority found

    return {
        "department": department,
        "priority": priority,
        "confidence": round(max(0.0, min(100.0, dept_confidence)), 1),
        "keywords_matched": dept_matched + priority_matched,
        "all_departments_detected": list(dept_scores.keys()),
    }


# ─── Sentiment & Urgency Analysis ──────────────────────────

ANGRY_WORDS = [
    "useless", "pathetic", "worst", "terrible", "horrible", "disgusting",
    "shame", "corrupt", "lazy", "incompetent", "careless", "negligent",
    "fed up", "sick of", "tired of", "enough", "intolerable", "unbearable",
    "outrageous", "ridiculous", "unacceptable", "absurd", "criminal",
]

FRUSTRATED_WORDS = [
    "frustrated", "disappointed", "upset", "annoyed", "irritated",
    "unhappy", "dissatisfied", "bothered", "troubled", "worried",
    "concerned", "helpless", "hopeless", "ignored", "neglected",
    "nobody cares", "no one listens", "no response", "still waiting",
]

POSITIVE_WORDS = [
    "thank", "thanks", "grateful", "appreciate", "good job",
    "well done", "excellent", "great work", "happy", "pleased",
    "satisfied", "resolved", "fixed", "improved",
]

URGENCY_PHRASES: dict[int, list[str]] = {
    5: ["immediately", "right now", "emergency", "life threatening", "asap", "today itself"],
    4: ["urgent", "as soon as possible", "3 days", "4 days", "5 days", "one week", "1 week", "very urgent"],
    3: ["weeks", "few days", "long time", "several days", "many days", "pending"],
    2: ["please fix", "kindly", "request", "soon", "when possible"],
}


def analyze_sentiment(text: str) -> dict:
    """
    Analyze complaint text for sentiment, urgency, and key phrases.
    Returns sentiment label, urgency 1-5, key phrases, and tone indicators.
    """
    text_lower = text.lower()

    # ── Caps analysis ──
    alpha_chars = [c for c in text if c.isalpha()]
    caps_ratio = sum(1 for c in alpha_chars if c.isupper()) / max(len(alpha_chars), 1)
    exclamation_count = text.count("!")
    question_count = text.count("?")

    # ── Tone word counts ──
    angry_hits = [w for w in ANGRY_WORDS if w in text_lower]
    frustrated_hits = [w for w in FRUSTRATED_WORDS if w in text_lower]
    positive_hits = [w for w in POSITIVE_WORDS if w in text_lower]

    # ── Determine sentiment ──
    tone_indicators: list[str] = []

    if caps_ratio > 0.6 and len(alpha_chars) > 15:
        tone_indicators.append("ALL_CAPS")
    if exclamation_count >= 3:
        tone_indicators.append("EXCESSIVE_EXCLAMATION")
    if angry_hits:
        tone_indicators.extend([f"angry:{w}" for w in angry_hits[:3]])
    if frustrated_hits:
        tone_indicators.extend([f"frustrated:{w}" for w in frustrated_hits[:3]])
    if positive_hits:
        tone_indicators.extend([f"positive:{w}" for w in positive_hits[:3]])

    # Scoring: angry > frustrated > positive > neutral
    angry_score = len(angry_hits) * 3 + (3 if "ALL_CAPS" in tone_indicators else 0) + min(exclamation_count, 3)
    frustrated_score = len(frustrated_hits) * 2
    positive_score = len(positive_hits) * 2

    if angry_score >= 3:
        sentiment = "Angry"
    elif frustrated_score >= 2 or (angry_score >= 1 and frustrated_score >= 1):
        sentiment = "Frustrated"
    elif positive_score >= 2:
        sentiment = "Positive"
    else:
        sentiment = "Neutral"

    # ── Urgency scoring (1-5) ──
    urgency = 1
    for level in [5, 4, 3, 2]:
        if any(phrase in text_lower for phrase in URGENCY_PHRASES[level]):
            urgency = level
            break

    # Caps + exclamation boost urgency slightly
    if "ALL_CAPS" in tone_indicators and urgency < 4:
        urgency = min(5, urgency + 1)

    # ── Key phrase extraction (simple noun-phrase heuristic) ──
    # Extract meaningful multi-word fragments
    words = re.findall(r"\b[a-z]{3,}\b", text_lower)
    # Remove very common stop words
    stop_words = {"the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
                  "her", "was", "one", "our", "out", "has", "have", "been", "from", "this",
                  "that", "with", "they", "will", "each", "make", "like", "than", "them",
                  "its", "also", "into", "very", "just", "about", "over", "such", "some",
                  "any", "these", "other", "would", "which", "their", "there", "when",
                  "what", "who", "how", "being", "here", "should", "could", "every",
                  "since", "please", "kindly", "sir", "madam", "dear", "nobody", "nothing"}
    meaningful = [w for w in words if w not in stop_words]
    # Take top keywords by civic relevance
    civic_relevant = [w for w in meaningful if w in " ".join(CIVIC_KEYWORDS)]
    other_relevant = [w for w in meaningful if w not in civic_relevant]
    key_phrases = list(dict.fromkeys(civic_relevant + other_relevant))[:8]  # dedupe, max 8

    return {
        "sentiment": sentiment,
        "urgency": urgency,
        "key_phrases": key_phrases,
        "tone_indicators": tone_indicators,
        "caps_ratio": round(caps_ratio, 2),
    }


# ─── Lifespan (model loading) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global classifier
    logger.info(f"🧠 Loading spam filter model from: {MODEL_PATH}")

    if not os.path.exists(MODEL_PATH):
        logger.error(f"❌ Model not found at {MODEL_PATH}. Run setup_model.py first.")
        raise RuntimeError(f"Model not found at {MODEL_PATH}")

    classifier = pipeline(
        "text-classification",
        model=MODEL_PATH,
        tokenizer=MODEL_PATH,
        device=-1,  # CPU only
    )
    logger.info("✅ Spam filter model loaded successfully.")
    yield
    logger.info("🔌 AI service shutting down.")


# ─── FastAPI App ────────────────────────────────────────────
app = FastAPI(
    title="AAZHI AI Service",
    description="Local ML spam filter + NLP classification for civic complaints",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ──────────────────────────────
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


class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000, description="Complaint text to classify")


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=5000, description="Complaint text for sentiment analysis")


class ValidationResult(BaseModel):
    is_spam: bool
    confidence: float
    reason: str
    classification: str


class DuplicateResult(BaseModel):
    is_duplicate: bool
    similarity: float
    matched_ticket: str | None = None
    matched_id: int | None = None
    reason: str


class ClassifyResult(BaseModel):
    department: str
    priority: str
    confidence: float
    keywords_matched: list[str]
    all_departments_detected: list[str]


class SentimentResult(BaseModel):
    sentiment: str
    urgency: int
    key_phrases: list[str]
    tone_indicators: list[str]
    caps_ratio: float


class APIResponse(BaseModel):
    success: bool
    message: str
    data: ValidationResult | DuplicateResult | ClassifyResult | SentimentResult | None = None


# ─── Endpoints ──────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "aazhi-ai-service",
        "model_loaded": classifier is not None,
    }


@app.post("/api/ai/validate-complaint", response_model=APIResponse)
async def validate_complaint(request: ComplaintValidationRequest):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = request.text.strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="Complaint text too short")

    # Run ML model
    result = classifier(text, truncation=True, max_length=512)
    model_label = result[0]["label"]
    model_score = result[0]["score"]

    logger.info(f"ML result: label={model_label}, score={model_score:.4f}, text_preview={text[:80]!r}")

    # Smart classification
    classification = smart_classify(text, model_label, model_score)

    logger.info(f"Final: is_spam={classification['is_spam']}, class={classification['classification']}")

    return APIResponse(
        success=True,
        message="Complaint validated",
        data=ValidationResult(**classification),
    )


# ─── Similarity Helpers ─────────────────────────────────────
def normalize_text(text: str) -> str:
    """Lowercase, strip extra whitespace, remove punctuation for comparison."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)   # remove punctuation
    text = re.sub(r"\s+", " ", text)       # collapse whitespace
    return text


def compute_similarity(text_a: str, text_b: str) -> float:
    """Compute text similarity using SequenceMatcher (0.0 to 1.0)."""
    a = normalize_text(text_a)
    b = normalize_text(text_b)
    return SequenceMatcher(None, a, b).ratio()


DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.70"))


@app.post("/api/ai/check-duplicate", response_model=APIResponse)
async def check_duplicate(request: DuplicateCheckRequest):
    """Check if a new complaint is a duplicate of any recent existing complaint."""
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

    best_match = None
    best_score = 0.0

    for complaint in request.existing_complaints:
        existing_text = f"{complaint.subject} {complaint.description}"
        score = compute_similarity(new_text, existing_text)
        if score > best_score:
            best_score = score
            best_match = complaint

    is_dup = best_score >= DUPLICATE_THRESHOLD

    logger.info(f"Duplicate check: best_score={best_score:.4f}, threshold={DUPLICATE_THRESHOLD}, is_dup={is_dup}")

    return APIResponse(
        success=True,
        message="Duplicate check completed",
        data=DuplicateResult(
            is_duplicate=is_dup,
            similarity=round(best_score, 4),
            matched_ticket=best_match.ticket_number if is_dup and best_match else None,
            matched_id=best_match.id if is_dup and best_match else None,
            reason=(
                f"This complaint is {best_score:.0%} similar to ticket {best_match.ticket_number}. Please check your existing complaint."
                if is_dup and best_match
                else "No duplicate found."
            ),
        ),
    )


# ─── Complaint Classification Endpoint ──────────────────────
@app.post("/api/ai/classify-complaint", response_model=APIResponse)
async def classify_complaint_endpoint(request: ClassifyRequest):
    """Classify a complaint into department + priority using keyword NLP."""
    text = request.text.strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="Complaint text too short")

    result = classify_complaint(text)

    logger.info(
        f"Classification: dept={result['department']}, "
        f"priority={result['priority']}, "
        f"confidence={result['confidence']}%, "
        f"keywords={result['keywords_matched'][:5]}"
    )

    return APIResponse(
        success=True,
        message="Complaint classified",
        data=ClassifyResult(**result),
    )


# ─── Sentiment Analysis Endpoint ────────────────────────────
@app.post("/api/ai/analyze-sentiment", response_model=APIResponse)
async def analyze_sentiment_endpoint(request: SentimentRequest):
    """Analyze complaint text for sentiment, urgency, and key phrases."""
    text = request.text.strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="Complaint text too short")

    result = analyze_sentiment(text)

    logger.info(
        f"Sentiment: {result['sentiment']}, "
        f"urgency={result['urgency']}/5, "
        f"tone={result['tone_indicators'][:3]}"
    )

    return APIResponse(
        success=True,
        message="Sentiment analyzed",
        data=SentimentResult(**result),
    )


# ─── Run ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
