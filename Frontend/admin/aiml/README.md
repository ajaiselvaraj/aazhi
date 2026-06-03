# AI/ML Civic Intelligence Engine (aiml)

This directory houses the standalone, production-style local machine learning service for AAZHI. It serves smart routing, spam and anomaly detection, sentiment diagnostics, duplicate ticket clustering, and workload forecasting.

---

## Directory Structure

```
aiml/
├── configs/            # Configuration files (paths, default parameters)
├── training/           # Model training and dataset pipelines
│    ├── datasets/      # Data generation & CSV exports
│    └── training_scripts/ # Model fit/eval execution scripts
├── inference/          # Python files handling loaded models & rule fallbacks
│    ├── routing/
│    ├── sentiment/
│    ├── duplicate_detection/
│    ├── forecasting/
│    └── anomaly_detection/
├── api/                # FastAPI routing schemas and endpoints
├── models/             # Serialized model pickles (.pkl)
├── requirements.txt    # Python library requirements
└── README.md           # Setup and orchestration guide
```

---

## Quick Start Setup

### 1. Install Dependencies
Create a virtual environment and install the required dependencies:

```bash
# Navigate to the aiml folder
cd Frontend/admin/aiml

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install libraries
pip install -r requirements.txt
```

### 2. Generate Dataset & Train Models
To build the synthetic complaints datasets and fit all the machine learning estimators:

```bash
# Run training script (it automatically generates the CSV if missing)
python training/training_scripts/train_all.py
```

This will output detailed metrics (Accuracy, F1-scores, Mean Absolute Error) and write the `.pkl` files directly into `models/`.

### 3. Run FastAPI Inference Server
Start the local FastAPI instance on port `5005` (matches gateway and backend expectations):

```bash
# Run using uvicorn
uvicorn api.main:app --port 5005 --reload
```

---

## Core API Endpoints

### Monolith Integrations
* `GET /health` - Checks model loading status.
* `POST /api/ai/analyze` - Intake pipeline checking spam, routing departments, identifying duplicates, and scoring sentiment.
* `POST /api/ai/summarize-clusters` - Groups duplicate reports and produces extractive summaries.
* `POST /api/ai/forecast` - Autoregressive daily complaint volume forecaster.
* `POST /api/ai/sentiment-pulse` - Computes aggregate emotion distribution graphs.
* `POST /api/ai/diagnostics` - Diagnostics memory telemetry logs.

### Direct Inference Paths
* `POST /predict/route`
* `POST /predict/priority`
* `POST /predict/sentiment`
* `POST /predict/duplicate`
* `POST /predict/hotspot`
* `POST /predict/sla`
* `POST /predict/resolution-time`
* `POST /generate/summary`
