# 🐳 AAZHI AI Service v2.0 Dockerfile
# Lightweight ML service — no PyTorch, no GPU needed
# Image size: ~200MB (down from ~1.5GB)

FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies (no system deps needed for sklearn)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy trained model weights
COPY models/ ./models/

# Copy application code
COPY main.py .

# Force offline mode — no network calls at runtime
ENV TRANSFORMERS_OFFLINE=1
ENV HF_HUB_OFFLINE=1
ENV PORT=5005

# Production settings
ENV ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5000"
ENV RATE_LIMIT_MAX=100
ENV RATE_LIMIT_WINDOW=60

EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5005/health')" || exit 1

CMD ["python", "main.py"]
