# COMPREHENSIVE AI & ML AUDIT REPORT
**Project:** SUVIDHA (AAZHI) Smart Urban Digital Helpdesk
**Auditor Role:** Senior AI/ML Architect & Hackathon Judge

---

## 1. AI/ML MODEL INVENTORY

### 1. Spam & Fraud Detection Engine
* **Model Type:** Machine Learning (Text Classification & Anomaly Detection)
* **Framework:** Scikit-learn (LinearSVC / Isolation Forest), pandas
* **Purpose:** Screens incoming complaints for promotional spam and anomalous submission frequencies.
* **Input:** Complaint text, submission count, text length
* **Output:** Spam boolean, spam confidence, anomaly score
* **Training Method:** Custom trained locally (`custom_spam_classifier.pkl`)
* **Inference Process:** Uses `predict_proba` for text classification and `decision_function` for isolation distance.
* **Deployment Method:** FastAPI Python Microservice (`/api/ai/analyze`)

### 2. Smart Department Router
* **Model Type:** Machine Learning (Multi-class Classification)
* **Framework:** Scikit-learn
* **Purpose:** Automatically routes a citizen's grievance to the correct municipal department (Water, Electricity, Roads, etc.) and determines threat priority.
* **Input:** Cleaned text description, extracted keywords
* **Output:** Department name, Priority level, Confidence score, Word-level explainability attributions
* **Training Method:** Custom trained locally (`department_router.pkl`)
* **Inference Process:** Uses `predict_proba` to output a probability distribution across departments. Features a deterministic keyword fallback.
* **Deployment Method:** FastAPI Python Microservice

### 3. Duplicate Ticket Detector
* **Model Type:** NLP (Information Retrieval / Similarity)
* **Framework:** Scikit-learn (`TfidfVectorizer`, `cosine_similarity`)
* **Purpose:** Prevents duplicate tickets for the same issue in the same ward.
* **Input:** Target complaint text, array of historical complaint texts
* **Output:** Is_duplicate boolean, cosine similarity percentage, matched ticket ID
* **Training Method:** Non-parametric (Fitted dynamically at runtime)
* **Inference Process:** Matrix vectorization followed by cosine similarity dot product against recent tickets.
* **Deployment Method:** FastAPI Python Microservice

### 4. Sentiment & Urgency Pulse Analyzer
* **Model Type:** Machine Learning & Rule-Based Lexicon
* **Framework:** Scikit-learn, Custom Lexicons
* **Purpose:** Evaluates citizen sentiment (Angry, Frustrated, Neutral) and maps operational urgency (1-5 scale) based on tone and keywords.
* **Input:** Complaint text
* **Output:** Sentiment label, urgency score, caps-lock ratio, tone indicators
* **Training Method:** Custom trained (`sentiment_model.pkl`) with heavy lexical fallbacks.
* **Inference Process:** Model prediction combined with keyword spotting (e.g., "spark", "fire" -> Urgency 5).
* **Deployment Method:** FastAPI Python Microservice

### 5. Volume Forecaster
* **Model Type:** Machine Learning (Time Series Regression)
* **Framework:** Scikit-learn (RandomForest Regressor)
* **Purpose:** Forecasts future daily complaint volumes for workforce planning.
* **Input:** Historical daily ticket counts, day of the week
* **Output:** Predicted daily counts for the next 7 days, trend indicators
* **Training Method:** Custom trained (`volume_forecaster.pkl`)
* **Inference Process:** Autoregressive rolling window simulation.
* **Deployment Method:** FastAPI Python Microservice

### 6. Geographic Hotspot Predictor
* **Model Type:** Spatial Clustering (Unsupervised ML)
* **Framework:** Scikit-learn (DBSCAN)
* **Purpose:** Identifies emerging crisis zones by clustering complaint coordinates.
* **Input:** Latitude/Longitude coordinates of complaints
* **Output:** Clustered hotspots, risk scores, predicted growth percentage
* **Training Method:** Fit at runtime
* **Inference Process:** Density-based spatial clustering of applications with noise (DBSCAN).
* **Deployment Method:** FastAPI Python Microservice

### 7. SLA Breach & Resolution Time Predictor
* **Model Type:** Machine Learning (Binary Classification & Regression)
* **Framework:** Scikit-learn
* **Purpose:** Estimates how many hours a ticket will take to resolve and flags if it will breach SLA limits.
* **Input:** Department, priority, ward, text_length
* **Output:** Estimated hours, lower/upper bounds, breach probability
* **Training Method:** Custom trained (`sla_model.pkl`, `resolution_time.pkl`)
* **Inference Process:** Feature mapping to probabilities and regression outputs.
* **Deployment Method:** FastAPI Python Microservice

### 8. Extractive Text Summarizer
* **Model Type:** NLP (Extractive Summarization)
* **Framework:** Scikit-learn (`TfidfVectorizer`)
* **Purpose:** Condenses large clusters of duplicate complaints into a concise 3-sentence summary for admin review.
* **Input:** Array of text descriptions
* **Output:** Short summarized paragraph
* **Training Method:** Non-parametric / Unsupervised ranking
* **Inference Process:** Splits texts into sentences, calculates TF-IDF token weights, ranks sentences, and extracts the top N.
* **Deployment Method:** FastAPI Python Microservice

### 9. Voice Command Engine & Frontend Intent Router
* **Model Type:** Speech AI & Rule-Based NLP
* **Framework:** `webkitSpeechRecognition`, Browser TTS APIs
* **Purpose:** Enables multilingual voice navigation and form-filling for accessibility.
* **Input:** User audio stream
* **Output:** Normalized text, triggered UI actions
* **Training Method:** Pretrained Foundation Models (OS/Browser Level)
* **Inference Process:** Speech-to-text -> Length-sorted Phrase Matching -> Regex Intent Detection.
* **Deployment Method:** Client-Side (React App)

### 10. Generative AI Query Assistant (Queries Mode)
* **Model Type:** Generative AI (LLM)
* **Framework:** Google Gemini (`gemini-2.5-flash`)
* **Purpose:** Dynamically answers complex citizen queries about municipal processes.
* **Input:** User query string
* **Output:** LLM generated conversational response
* **Training Method:** Pretrained Foundation Model
* **Inference Process:** API proxy call (`/api/ai/gemini`) to cloud LLM.
* **Deployment Method:** Cloud API integration

---

## 2. COMPLETE AI PIPELINE

Citizen speaks into the Kiosk
↓
**Speech-to-Text** (Browser Native API)
↓
**NLP Intent Detection** (Frontend Regex/Lexicon heuristics)
↓
_If general query:_
  ↳ **Generative AI LLM** (Gemini answers the query)
_If grievance submission:_
  ↳ Backend API Gateway
  ↓
  **Spam & Fraud Detection** (ML Classification & Isolation Forest)
  ↓
  **Duplicate Detection** (TF-IDF Cosine Similarity)
  ↓
  **Smart Department Routing & Priority** (ML Classifier)
  ↓
  **Sentiment & Urgency Scoring** (ML + Lexical Analysis)
  ↓
  **SLA Estimation** (ML Regressor)
  ↓
  Database Storage
  ↓
  **DBSCAN Clustering** (Groups geographic hotspots)
  ↓
  **Extractive Summarization** (Summarizes clustered duplicate tickets)
  ↓
  **Volume Forecasting** (Predicts next 7 days workload)
  ↓
  Admin Dashboard Visualization

---

## 3. MODEL CLASSIFICATION

| Component | Classification Category |
| :--- | :--- |
| **Voice Command Router** | Rule-Based / Speech AI |
| **Spam / Route / Sentiment** | Machine Learning (Supervised) |
| **Duplicate / Summarizer** | NLP (Unsupervised/Statistical) |
| **Hotspot Predictor** | Machine Learning (Spatial Clustering) |
| **Volume Forecaster** | Machine Learning (Time-Series Regression) |
| **Gemini Assistant** | Generative AI / LLM |

---

## 4. MODEL IMPLEMENTATION CHECK

* **Are these real ML models?** Yes. The FastAPI service utilizes actual Scikit-learn models (`.pkl` files) loaded into memory, performing local inference.
* **Is it API based?** Only the Gemini Assistant relies on an external API. All core municipal intelligence runs 100% locally.
* **Is it pretrained?** The Speech-to-Text and Gemini models are pretrained foundation models.
* **Is it fine-tuned / custom trained?** Yes, the Router, Spam, Sentiment, and Forecasting models are custom trained on municipal data (implied by the `train_all.py` script).
* **Is it merely business logic?** The frontend intent router (`SuvidhaIntelligence`) and the fallback mechanisms in the Python microservice are rule-based business logic, but they act as robust fail-safes for the actual statistical ML models.

---

## 5. ACCURACY ASSESSMENT

* **Spam & Route Models (LinearSVC/RF):**
  * **Expected Accuracy:** 85-90% on standard complaints.
  * **Failure Cases:** Highly ambiguous text (e.g., "Water on the road" - Water or Roads?).
  * **Bias Risks:** May misclassify vernacular English or poorly translated regional dialects as spam or "general".
* **Duplicate Detection (TF-IDF):**
  * **Expected Accuracy:** High for exact keyword overlaps.
  * **Failure Cases:** Cannot detect semantic similarity (e.g., "Pipe burst" vs "Tube leaking") because it relies on exact word frequency, not embeddings.
* **Volume Forecaster (Autoregressive RF):**
  * **Expected Accuracy:** Moderate.
  * **Failure Cases:** Cannot predict "Black Swan" events (e.g., sudden monsoons causing massive infrastructure failure).
* **Generative AI (Gemini):**
  * **Failure Cases:** Risk of hallucinations regarding highly specific, localized municipal laws.

---

## 6. JUDGE QUESTIONS

**Q1: "Why did you choose TF-IDF and Scikit-Learn instead of modern LLMs or Deep Learning for ticket routing?"**
> **Ideal Answer:** "For a public edge kiosk, we prioritized offline capability, absolute zero latency, and an ultra-low compute footprint. Deep Learning models are heavy and costly. Our Scikit-learn models run in milliseconds on minimal RAM, ensuring the kiosk functions even if the internet goes down, while saving immense cloud costs."

**Q2: "How does the duplicate detection handle synonyms? What if one citizen says 'pipe burst' and another says 'tube leaking'?"**
> **Ideal Answer:** "Currently, it uses TF-IDF cosine similarity, which is highly efficient but relies on exact word overlaps. To bridge the gap, we apply aggressive text normalization and keyword extraction before vectorization. As a future enhancement, we plan to swap this with lightweight local sentence embeddings (like MiniLM) for deeper semantic matching."

**Q3: "What happens if the AI models fail to load or predict incorrectly?"**
> **Ideal Answer:** "We built a zero-downtime architecture. Every single ML model in the Python microservice has a deterministic, rule-based lexical fallback. If the Router ML model fails, the system instantly catches the exception and routes based on keyword mapping (e.g., 'wire' -> Electricity). The citizen never sees an error."

**Q4: "How is data privacy and PII maintained if you are using AI?"**
> **Ideal Answer:** "All citizen grievance data, including PII, is processed entirely locally on our self-hosted FastAPI microservice. The only external AI call is the Gemini API, which is strictly sandboxed to the 'Queries Mode' for answering general knowledge questions. No personal data ever leaves our servers."

---

## 7. ARCHITECTURE DIAGRAM

```text
[ Citizen Kiosk (React 19) ]
   ├── Voice STT (Web Speech API)
   ├── Client-Side NLP Intents
   └── Translation Engine
         ↓
         ↓ HTTP POST /api/complaints
         ↓
[ Node.js API Gateway ] ──────→ [ PostgreSQL DB (Audit Chain) ]
         ↓
         ↓ Internal REST Call
         ↓
[ FastAPI Python AI Engine ]
   ├── Spam & Fraud Filter (LinearSVC + Isolation Forest)
   ├── TF-IDF Similarity Matrix (Duplicate Check)
   ├── Department Router (Multi-class ML)
   ├── Sentiment & Urgency (RF + Lexicon)
   ├── Hotspot DBSCAN Clustering
   └── SLA Breach Regressor
```

---

## 8. IMPROVEMENT ANALYSIS

* **Missing ML Opportunities:** The system uses TF-IDF for duplicate detection and summarization. Upgrading to a lightweight, locally hosted embedding model (e.g., `all-MiniLM-L6-v2` via HuggingFace) would drastically improve semantic matching without requiring external APIs.
* **Better Models Available:** For the LLM Query Assistant, replacing Gemini with a locally hosted quantized model (like Llama-3-8B-Instruct via Ollama) would make the entire platform 100% offline and air-gapped secure.
* **Performance Optimization:** Currently, models are loaded globally in memory on startup. Moving to ONNX runtime could speed up inference by 3x and reduce memory overhead.
* **Security Risks:** The documentation mentions the Gemini API key was historically exposed in the frontend. Even if proxied now, relying on external APIs for civic queries opens up prompt injection vulnerabilities.
* **Scalability Concerns:** The FastAPI service runs synchronously for ML inference. Under heavy load (thousands of kiosks), the CPU-bound Scikit-learn predictions could block the event loop. Moving inference to Celery workers or batch processing is recommended.

---

## 9. FINAL VERDICT

### Software Architect Evaluation (8.5/10)
> *"Excellent hybrid architecture. The dual setup (Node.js for I/O, FastAPI for compute) is textbook microservice design. The implementation of robust rule-based fallbacks for every ML model shows extreme maturity and defensive programming."*

### AI Researcher Evaluation (6.5/10)
> *"Pragmatic, but technologically conservative. Relying on TF-IDF and basic Scikit-learn models is very 2015. While it works for edge deployments, the lack of modern semantic embeddings limits the system's ability to understand natural language nuances."*

### Government Project Evaluator (9.5/10)
> *"Outstanding. Government projects require low operating costs, data sovereignty, and high reliability. By running the core intelligence locally without expensive cloud API calls, this project is financially viable and highly secure for deployment in rural/tier-2 cities."*

### Hackathon Judge Evaluation (8.5/10)
> *"A highly polished, end-to-end engineered product. You solve a real problem beautifully. However, to win top prizes in modern AI hackathons, you might need to highlight a more advanced 'Wow' factor—such as Agentic workflows or RAG—rather than traditional classification models."*
