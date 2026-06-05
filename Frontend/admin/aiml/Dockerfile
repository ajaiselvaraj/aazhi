# 🐳 AAZHI AI/ML Standalone Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system compiler tools for packages like xgboost
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy directories
COPY api/ ./api/
COPY configs/ ./configs/
COPY inference/ ./inference/
COPY models/ ./models/
COPY utils/ ./utils/

# Expose port (Render sets $PORT env var, but FastAPI uvicorn maps it)
EXPOSE 5005

# Run application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "5005"]
