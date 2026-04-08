# SCALES AI OCR Service - Deployment Guide

Production deployment instructions for the SCALES AI OCR Service.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL/TLS certificates ready
- [ ] Monitoring dashboards set up
- [ ] Backup strategies defined
- [ ] Load testing completed

## Deployment Options

### Option 1: Docker Container (Recommended)

#### Prerequisites
- Docker & Docker Compose installed
- AWS/Azure/GCP account (for container registry)
- Environment configuration file

#### Steps

1. **Build & Push Image**

```bash
# Build image
docker build -t scales-ocr:1.0.0 .

# Tag for registry
docker tag scales-ocr:1.0.0 your-registry.azurecr.io/scales-ocr:1.0.0

# Push to registry
docker push your-registry.azurecr.io/scales-ocr:1.0.0
```

2. **Deploy to Kubernetes**

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scales-ocr
  labels:
    app: scales-ocr
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scales-ocr
  template:
    metadata:
      labels:
        app: scales-ocr
    spec:
      containers:
      - name: scales-ocr
        image: your-registry.azurecr.io/scales-ocr:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: APP_NAME
          value: "SCALES AI OCR Service"
        - name: OCR_ENGINE
          value: "paddleocr"
        - name: LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 20
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: scales-ocr-service
spec:
  selector:
    app: scales-ocr
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: scales-ocr-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: scales-ocr
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Deploy:

```bash
kubectl apply -f k8s-deployment.yaml
kubectl get deployments
kubectl rollout status deployment/scales-ocr
```

### Option 2: Cloud Platforms

#### Azure Container Instances (ACI)

```bash
az container create \
  --resource-group scales-rg \
  --name scales-ocr \
  --image your-registry.azurecr.io/scales-ocr:1.0.0 \
  --ports 8000 \
  --environment-variables \
    APP_NAME="SCALES AI OCR Service" \
    OCR_ENGINE="paddleocr" \
    LOG_LEVEL="INFO" \
  --registry-login-server your-registry.azurecr.io \
  --registry-username <username> \
  --registry-password <password>
```

#### AWS ECS

Create `ecs-task-definition.json`:

```json
{
  "family": "scales-ocr",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "scales-ocr",
      "image": "your-registry.dkr.ecr.region.amazonaws.com/scales-ocr:1.0.0",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "APP_NAME",
          "value": "SCALES AI OCR Service"
        },
        {
          "name": "OCR_ENGINE",
          "value": "paddleocr"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/scales-ocr",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register and run:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs run-task --task-definition scales-ocr
```

### Option 3: Traditional Server (Ubuntu/Debian)

1. **System Setup**

```bash
# SSH to server
ssh ubuntu@your-server.com

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
  python3.11 \
  python3-pip \
  python3-venv \
  nginx \
  supervisor \
  libsm6 \
  libxext6 \
  libxrender-dev

# Create app user
sudo useradd -m -s /bin/bash scales
```

2. **Application Setup**

```bash
# Clone repository
cd /home/scales
git clone https://github.com/your-org/scales-wms.git
cd scales-wms/python_ai_ocr

# Create virtual env
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

3. **Supervisor Configuration**

Create `/etc/supervisor/conf.d/scales-ocr.conf`:

```ini
[program:scales-ocr]
directory=/home/scales/scales-wms/python_ai_ocr
command=/home/scales/scales-wms/python_ai_ocr/venv/bin/gunicorn \
  -w 4 \
  -b 0.0.0.0:8000 \
  --timeout 120 \
  main:app
user=scales
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/scales-ocr.log
```

Start service:

```bash
sudo systemctl restart supervisor
sudo systemctl status supervisor
```

4. **Nginx Configuration**

Create `/etc/nginx/sites-available/scales-ocr`:

```nginx
upstream scales_ocr {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name ocr.scales-wms.com;

    ssl_certificate /etc/letsencrypt/live/scales-wms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scales-wms.com/privkey.pem;

    client_max_body_size 10M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://scales_ocr;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json;
    gzip_min_length 1000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ocr.scales-wms.com;
    return 301 https://$server_name$request_uri;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/scales-ocr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Configuration

Production `.env` file:

```env
# App Configuration
APP_NAME=SCALES AI OCR Service
APP_VERSION=1.0.0
DEBUG=False
LOG_LEVEL=WARNING

# Server
HOST=0.0.0.0
PORT=8000

# OCR Configuration
OCR_ENGINE=paddleocr
OCR_CONFIDENCE_THRESHOLD=0.55
OCR_MAX_RESPONSE_TIME_MS=300

# Image Processing
MAX_IMAGE_SIZE_MB=10
IMAGE_RESIZE_WIDTH=1280
IMAGE_RESIZE_HEIGHT=720

# Security
ENABLE_COMPANY_VALIDATION=True
ALLOWED_ORIGINS=https://scales-wms.com,https://app.scales-wms.com
```

## SSL/TLS Setup

Using Let's Encrypt with Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx

sudo certbot certonly \
  --nginx \
  -d ocr.scales-wms.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Monitoring & Logging

### 1. Application Logs

```bash
# View logs
tail -f /var/log/scales-ocr.log

# Rotate logs
sudo logrotate -f /etc/logrotate.d/scales-ocr
```

Create `/etc/logrotate.d/scales-ocr`:

```
/var/log/scales-ocr.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 scales scales
    sharedscripts
}
```

### 2. Prometheus Metrics

Add monitoring endpoint to `main.py`:

```python
from prometheus_client import Counter, Histogram, generate_latest

ocr_requests_total = Counter(
    'ocr_requests_total',
    'Total OCR requests',
    ['ocr_type', 'status']
)

ocr_processing_seconds = Histogram(
    'ocr_processing_seconds',
    'OCR processing time',
    ['ocr_type']
)

@app.get("/metrics")
async def metrics():
    return generate_latest()
```

### 3. Health Monitoring

```bash
# Test health endpoint
curl -f https://ocr.scales-wms.com/health || \
  (echo "OCR Service Down" | mail -s "ALERT: OCR Service" admin@scales-wms.com)
```

## Performance Tuning

### 1. Python Optimization

```python
# Use process pool for OCR
from concurrent.futures import ProcessPoolExecutor

executor = ProcessPoolExecutor(max_workers=4)

@app.on_event("startup")
async def startup():
    app.executor = executor

@app.on_event("shutdown")
async def shutdown():
    app.executor.shutdown()
```

### 2. GPU Acceleration

For PaddleOCR with GPU:

```bash
# Install GPU support
pip install paddlepaddle-gpu

# Configure in config.py
GPU_ENABLED: bool = True
GPU_DEVICE_ID: int = 0
```

### 3. Redis Caching

Add Redis caching for repeated labels:

```python
import redis
from functools import lru_cache

redis_client = redis.Redis(host='localhost', port=6379)

def get_cached_result(image_hash: str):
    return redis_client.get(f"ocr:{image_hash}")

def cache_result(image_hash: str, result: dict):
    redis_client.setex(f"ocr:{image_hash}", 86400, json.dumps(result))
```

## Backup & Disaster Recovery

### Database Backups

```bash
# Daily Supabase backups (automatic)
# Configure in Supabase dashboard

# Manual export
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-key

# Export database
pg_dump \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres \
  > backup.sql
```

### Log Backups

```bash
# Backup logs to S3
aws s3 sync /var/log/scales-ocr s3://scales-backups/logs/
```

## Rollback Procedure

If issues occur:

```bash
# Kubernetes rollback
kubectl rollout undo deployment/scales-ocr

# Docker rollback
docker run -p 8000:8000 scales-ocr:previous-version

# Traditional server
sudo systemctl restart scales-ocr
sudo supervisorctl restart scales-ocr
```

## Post-Deployment Verification

1. **Health Check**
```bash
curl https://ocr.scales-wms.com/health
```

2. **Load Testing**
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://ocr.scales-wms.com/health
```

3. **Integration Testing**
```bash
python test_client.py
```

4. **Monitor Metrics**
- Response time
- Error rate
- CPU/Memory usage
- Concurrent connections

## Maintenance

### Weekly
- Review logs for errors
- Check performance metrics
- Verify backups

### Monthly
- Update dependencies
- Analyze OCR accuracy trends
- Performance tuning

### Quarterly
- Full disaster recovery test
- Security audit
- Capacity planning

## Support Contacts

- Platform Team: platform@scales-wms.com
- On-Call Engineer: +1-xxx-xxx-xxxx
- Incident Channel: #scales-incidents (Slack)
