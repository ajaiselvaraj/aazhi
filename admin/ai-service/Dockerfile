# 🐳 AAZHI AI Service Dockerfile
# Local ML spam filter — runs fully offline

FROM python:3.11-slim

WORKDIR /app

# Install system deps (for torch CPU)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy model weights (pre-downloaded via setup_model.py)
COPY models/ ./models/

# Copy application code
COPY main.py .

# Force offline mode — no network calls at runtime
ENV TRANSFORMERS_OFFLINE=1
ENV HF_HUB_OFFLINE=1
ENV PORT=5005

EXPOSE 5005

CMD ["python", "main.py"]
