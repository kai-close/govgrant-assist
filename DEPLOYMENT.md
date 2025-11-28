# 🚀 Deployment Guide - GovGrant Assist

Complete deployment instructions for various platforms.

---

## 📋 Pre-Deployment Checklist

- [ ] All code tested locally
- [ ] `.env` file configured with valid API keys
- [ ] Dependencies in `requirements.txt` are up-to-date
- [ ] Security review completed
- [ ] Documentation updated

---

## 🌐 Option 1: Streamlit Community Cloud (Recommended)

**Best for:** Quick deployment, free hosting, built-in CI/CD

### Step 1: Prepare Repository

1. **Create GitHub Repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: GovGrant Assist"
   git branch -M main
   git remote add origin https://github.com/[YOUR-USERNAME]/GovGrant-Assist.git
   git push -u origin main
   ```

2. **Verify `.gitignore`:**
   Ensure `.env` is ignored (should already be in `.gitignore`)

### Step 2: Configure Streamlit Cloud

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Click "New app"
3. Select your repository: `[YOUR-USERNAME]/GovGrant-Assist`
4. Set main file path: `app.py`
5. Click "Advanced settings"

### Step 3: Add Secrets

In Streamlit Cloud secrets (TOML format):

```toml
# .streamlit/secrets.toml format

# Application
APP_PASSWORD = "your_secure_password_here"

# OpenAI Configuration (if using OpenAI)
LLM_PROVIDER = "openai"
OPENAI_API_KEY = "sk-your-openai-key-here"
OPENAI_MODEL = "gpt-4o-mini"

# Google Configuration (if using Google)
# LLM_PROVIDER = "google"
# GOOGLE_API_KEY = "your-google-key-here"
# GOOGLE_MODEL = "gemini-1.5-flash"

# RAG Configuration (optional)
MAX_FILE_SIZE_MB = "10"
CHUNK_SIZE = "1000"
CHUNK_OVERLAP = "100"
TOP_K_RESULTS = "3"
```

### Step 4: Deploy

1. Click "Deploy!"
2. Wait for deployment (typically 2-5 minutes)
3. Access your app at: `https://[app-name].streamlit.app`

### Step 5: Monitor

- View logs in Streamlit Cloud dashboard
- Check resource usage
- Monitor user activity

---

## 🐳 Option 2: Docker Deployment

**Best for:** Self-hosting, full control, production environments

### Step 1: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Streamlit port
EXPOSE 8501

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Run Streamlit
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  govgrant-assist:
    build: .
    ports:
      - "8501:8501"
    environment:
      - APP_PASSWORD=${APP_PASSWORD}
      - LLM_PROVIDER=${LLM_PROVIDER}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GOOGLE_MODEL=${GOOGLE_MODEL}
      - MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB}
      - CHUNK_SIZE=${CHUNK_SIZE}
      - CHUNK_OVERLAP=${CHUNK_OVERLAP}
      - TOP_K_RESULTS=${TOP_K_RESULTS}
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

### Step 3: Build and Run

```bash
# Build image
docker build -t govgrant-assist:latest .

# Run with docker-compose
docker-compose up -d

# Or run directly
docker run -d \
  --name govgrant-assist \
  -p 8501:8501 \
  --env-file .env \
  govgrant-assist:latest
```

### Step 4: Access Application

```bash
# Check if running
docker ps

# View logs
docker logs -f govgrant-assist

# Access at
http://localhost:8501
```

---

## ☁️ Option 3: AWS Deployment

**Best for:** Enterprise deployments, high availability, scalability

### Architecture

```
Internet → ELB → ECS (Fargate) → Application
                      ↓
                 AWS Secrets Manager
```

### Step 1: Push to ECR

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name govgrant-assist

# Tag and push
docker tag govgrant-assist:latest [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/govgrant-assist:latest
docker push [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/govgrant-assist:latest
```

### Step 2: Store Secrets

```bash
# Store API key in Secrets Manager
aws secretsmanager create-secret \
  --name govgrant-assist/openai-key \
  --secret-string "sk-your-key-here"
```

### Step 3: Create ECS Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "govgrant-assist",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "govgrant-assist",
      "image": "[ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/govgrant-assist:latest",
      "portMappings": [
        {
          "containerPort": 8501,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:[ACCOUNT]:secret:govgrant-assist/openai-key"
        }
      ],
      "environment": [
        {
          "name": "LLM_PROVIDER",
          "value": "openai"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/govgrant-assist",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4: Deploy to ECS

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster production \
  --service-name govgrant-assist \
  --task-definition govgrant-assist \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

## 🔧 Option 4: Google Cloud Run

**Best for:** Serverless deployment, auto-scaling, pay-per-use

### Step 1: Build and Push to GCR

```bash
# Set project
gcloud config set project [PROJECT-ID]

# Build
gcloud builds submit --tag gcr.io/[PROJECT-ID]/govgrant-assist

# Or use Docker
docker tag govgrant-assist:latest gcr.io/[PROJECT-ID]/govgrant-assist
docker push gcr.io/[PROJECT-ID]/govgrant-assist
```

### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy govgrant-assist \
  --image gcr.io/[PROJECT-ID]/govgrant-assist \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="LLM_PROVIDER=openai,OPENAI_MODEL=gpt-4o-mini" \
  --set-secrets="OPENAI_API_KEY=govgrant-openai-key:latest,APP_PASSWORD=govgrant-app-password:latest" \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10
```

---

## 🔐 Security Configuration

### 1. Environment Variables

**Never commit sensitive data!**

Production checklist:
- [ ] API keys stored in secrets manager
- [ ] Strong APP_PASSWORD set
- [ ] `.env` in `.gitignore`
- [ ] No hardcoded credentials

### 2. HTTPS Configuration

**Streamlit Cloud:** Automatic HTTPS

**Docker/Self-hosted:** Use reverse proxy

nginx example:

```nginx
server {
    listen 443 ssl;
    server_name govgrant.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:8501;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 3. Rate Limiting

Implement rate limiting to prevent abuse:

```python
# Add to app.py if needed
from streamlit_extras.app_rate_limiter import rate_limiter

@rate_limiter(max_calls=10, period=60)  # 10 calls per minute
def rate_limited_function():
    pass
```

---

## 📊 Monitoring & Logging

### Application Logs

**Streamlit Cloud:** View in dashboard

**Docker:**
```bash
docker logs -f govgrant-assist --tail 100
```

**Production:** Use logging service (CloudWatch, Stackdriver, etc.)

### Health Checks

Add to `app.py`:

```python
# Health check endpoint (if deploying to containers)
import streamlit as st

if st.query_params.get("health") == "check":
    st.write("OK")
    st.stop()
```

### Metrics to Monitor

- API latency
- Document processing time
- Error rates
- User sessions
- API quota usage

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Streamlit Cloud

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run tests
        run: |
          # Add test commands here
          python -m pytest tests/

      # Streamlit Cloud auto-deploys on git push
      # No additional step needed
```

---

## 🐛 Troubleshooting Deployment

### Common Issues

#### 1. Module Import Errors

**Problem:** `ModuleNotFoundError` in production

**Solution:**
```bash
# Regenerate requirements.txt
pip freeze > requirements.txt
```

#### 2. Memory Issues

**Problem:** App crashes with OOM errors

**Solution:**
- Increase container memory
- Reduce `CHUNK_SIZE`
- Implement document size limits

#### 3. FAISS Compatibility

**Problem:** FAISS doesn't work on ARM architecture

**Solution:**
```dockerfile
# Use x86_64 architecture
FROM --platform=linux/amd64 python:3.9-slim
```

#### 4. Slow Cold Starts

**Problem:** First request takes too long

**Solution:**
- Use Cloud Run min instances: `--min-instances=1`
- Implement lazy loading
- Reduce dependencies

---

## 📞 Support

For deployment issues:
1. Check logs first
2. Review configuration
3. Consult platform documentation
4. Open GitHub issue

---

**Last Updated:** 2025-11-28
