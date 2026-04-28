# Interpose User Guide

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Agent Installation](#agent-installation)
- [Configuration](#configuration)
- [Dashboard Usage](#dashboard-usage)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Introduction

Interpose is a universal AI access intelligence platform that monitors AI service usage and data access patterns across any system. It provides real-time observability, automated risk scoring, and security alerts for AI API calls.

### Key Features

- **Universal AI Monitoring**: Supports OpenAI, Anthropic, AWS Bedrock, and local LLMs
- **Sensitive Data Detection**: Automatically scans for PII, credentials, and API keys
- **Risk Scoring**: Automated 0-100 risk assessment for every AI interaction
- **Real-Time Dashboard**: Live visualization of AI activity and security risks
- **High-Risk Alerts**: Email notifications for critical security events
- **Zero Code Changes**: Transparent proxy layer requires no application modifications

### How It Works

1. **Interpose Agent** intercepts HTTP requests to AI services
2. **Metadata Extraction** captures service names, endpoints, and payload data
3. **Security Scanning** detects sensitive data and data source references
4. **Risk Calculation** assigns a 0-100 risk score based on findings
5. **Log Transmission** sends encrypted logs to the Interpose backend
6. **Dashboard Visualization** displays real-time activity and alerts

## Getting Started

### Prerequisites

- Python 3.11 or higher (for Python library installation)
- Docker 20.10 or higher (for Docker deployment)
- AWS account (for Lambda layer deployment)
- Interpose account and API key

### Quick Start

1. **Sign up** for an Interpose account at https://dashboard.interpose.io
2. **Get your API key** from Settings → API Keys
3. **Choose deployment method**: Docker, Python library, or Lambda layer
4. **Install and configure** the agent (see [Agent Installation](#agent-installation))
5. **Access the dashboard** to view AI activity

## Agent Installation

The Interpose agent can be deployed in three ways:

### Method 1: Docker Container

Best for: Containerized applications, microservices, Kubernetes

**Quick Start:**
```bash
docker run -d \
  --name interpose-agent \
  -e INTERPOSE_API_KEY="your_api_key_here" \
  --network host \
  interpose/agent:latest
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  interpose-agent:
    image: interpose/agent:latest
    container_name: interpose-agent
    environment:
      - INTERPOSE_API_KEY=${INTERPOSE_API_KEY}
      - INTERPOSE_BACKEND_URL=https://api.interpose.io
    network_mode: host
    restart: unless-stopped
    volumes:
      - ./logs:/var/log/interpose
```

Create `.env` file:
```env
INTERPOSE_API_KEY=your_api_key_here
```

Run:
```bash
docker-compose up -d
```

**Kubernetes Sidecar:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
      - name: your-app
        image: your-app:latest
      
      - name: interpose-agent
        image: interpose/agent:latest
        env:
        - name: INTERPOSE_API_KEY
          valueFrom:
            secretKeyRef:
              name: interpose-secret
              key: api-key
```

### Method 2: Python Library

Best for: Python applications, Flask/Django apps, scripts

**Installation:**
```bash
pip install interpose
```

**Usage:**
```python
from interpose.agent.agent import InterposeAgent
import os

# Initialize the agent
agent = InterposeAgent(
    api_key=os.environ.get("INTERPOSE_API_KEY"),
    backend_url="https://api.interpose.io"
)

# Your existing code continues to work unchanged
import requests

response = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={"Authorization": "Bearer YOUR_OPENAI_KEY"},
    json={
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)
```

**Flask Example:**
```python
from flask import Flask
from interpose.agent.agent import InterposeAgent
import os

app = Flask(__name__)

# Initialize Interpose at startup
agent = InterposeAgent(api_key=os.environ.get("INTERPOSE_API_KEY"))

@app.route("/chat")
def chat():
    # AI calls are automatically monitored
    import requests
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY')}"},
        json={"model": "gpt-4", "messages": [{"role": "user", "content": "Hello!"}]}
    )
    return response.json()

if __name__ == "__main__":
    app.run()
```

### Method 3: AWS Lambda Layer

Best for: AWS Lambda functions, serverless applications

**Build the Layer:**
```bash
cd deployment
./build-lambda-layer.sh
```

**Publish to AWS:**
```bash
aws lambda publish-layer-version \
  --layer-name interpose-agent \
  --description "Interpose AI monitoring agent" \
  --zip-file fileb://interpose-lambda-layer.zip \
  --compatible-runtimes python3.11 python3.12
```

**Attach to Lambda Function:**
```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:interpose-agent:1
```

**Set Environment Variables:**
```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --environment Variables="{INTERPOSE_API_KEY=your_api_key,INTERPOSE_BACKEND_URL=https://api.interpose.io}"
```

**Lambda Function Code:**
```python
import json
import boto3

# Agent is automatically loaded from the layer

def lambda_handler(event, context):
    # AI calls are automatically monitored
    bedrock = boto3.client('bedrock-runtime')
    
    response = bedrock.invoke_model(
        modelId='anthropic.claude-v2',
        body=json.dumps({
            "prompt": "Hello!",
            "max_tokens_to_sample": 100
        })
    )
    
    return {'statusCode': 200, 'body': json.dumps(response)}
```

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `INTERPOSE_API_KEY` | Yes | Your Interpose API key | None |
| `INTERPOSE_BACKEND_URL` | No | Backend API endpoint | `https://api.interpose.io` |

### Configuration File (Optional)

Create `interpose.yaml` in your project root:

```yaml
api_key: ${INTERPOSE_API_KEY}
backend_url: https://api.interpose.io
log_level: INFO
retry_attempts: 3
timeout_seconds: 5
```

Load configuration:
```python
from interpose.agent.agent import InterposeAgent
import yaml

with open('interpose.yaml') as f:
    config = yaml.safe_load(f)

agent = InterposeAgent(**config)
```

### Advanced Configuration

**Custom Logging:**
```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/interpose/agent.log'),
        logging.StreamHandler()
    ]
)

agent = InterposeAgent(api_key="your_key")
```

**Proxy Configuration:**
```python
agent = InterposeAgent(
    api_key="your_key",
    backend_url="https://api.interpose.io",
    proxy={
        'http': 'http://proxy.example.com:8080',
        'https': 'https://proxy.example.com:8080'
    }
)
```

## Dashboard Usage

### Accessing the Dashboard

1. Navigate to https://dashboard.interpose.io
2. Log in with your email and password
3. View real-time AI activity and security insights

### Dashboard Components

#### 1. Activity Log

Displays recent AI API calls with:
- **Timestamp**: When the call was made
- **AI Service**: OpenAI, Anthropic, Bedrock, or Local LLM
- **Risk Score**: 0-100 security risk assessment
- **Data Sources**: Detected database connections, file paths, APIs
- **Sensitive Data**: Types of sensitive data detected (not actual values)

**Features:**
- Real-time updates (2-second polling)
- Chronological ordering (newest first)
- Displays last 100 entries
- Color-coded risk indicators

#### 2. Risk Gauges

Circular gauges showing risk scores:
- **Green (0-30)**: Low risk - normal operation
- **Yellow (31-70)**: Medium risk - review recommended
- **Red (>70)**: High risk - immediate attention required

High-risk gauges pulse with a glowing animation.

#### 3. System Map

Interactive network graph showing:
- **System Nodes** (cyan): Your application/system
- **AI Service Nodes** (magenta): OpenAI, Anthropic, Bedrock, etc.
- **Data Source Nodes** (green): Databases, files, APIs

**Features:**
- Real-time updates as new connections are detected
- Interactive zoom and pan
- Click nodes for details
- Visualizes data flow patterns

#### 4. Alert Cards

Prominent cards for high-risk events (score > 70):
- **Risk Score**: Numerical value and color indicator
- **AI Service**: Which AI service was accessed
- **Timestamp**: When the event occurred
- **Sensitive Data**: Types of sensitive data detected
- **Dismiss Button**: Remove card from view

**Features:**
- Pulsing animation for visibility
- Displayed at top of dashboard
- Persistent until dismissed

#### 5. Timeline Charts

Historical trend visualization:
- **Log Count by Hour**: Volume of AI API calls
- **Average Risk Score by Hour**: Risk trends over time
- **24-Hour Window**: Past day of activity

**Features:**
- Auto-updates every 60 seconds
- Hover for detailed values
- Identifies usage patterns and anomalies

### Dashboard Actions

**Filter Logs:**
- Click on AI service names to filter by service
- Click on risk score ranges to filter by risk level
- Use date picker to view historical data

**Export Data:**
- Click "Export" button to download logs as CSV
- Includes all log fields and metadata
- Useful for compliance reporting

**Manage Alerts:**
- Configure alert thresholds in Settings
- Add email recipients for high-risk alerts
- Set alert frequency (immediate, hourly, daily)

**API Keys:**
- Generate new API keys in Settings → API Keys
- Revoke compromised keys
- View key usage statistics

## Troubleshooting

### Agent Not Sending Logs

**Symptoms:**
- No logs appearing in dashboard
- Agent running but no activity

**Solutions:**

1. **Verify API Key:**
   ```bash
   echo $INTERPOSE_API_KEY
   ```
   Ensure it matches the key in your dashboard.

2. **Check Network Connectivity:**
   ```bash
   curl -I https://api.interpose.io
   ```
   Should return HTTP 200.

3. **Enable Debug Logging:**
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```
   Check logs for error messages.

4. **Verify Agent Initialization:**
   Ensure agent is initialized before AI API calls are made.

5. **Check Firewall Rules:**
   Allow HTTPS outbound to api.interpose.io (port 443).

### Docker Container Issues

**Container Exits Immediately:**

1. Check logs:
   ```bash
   docker logs interpose-agent
   ```

2. Verify environment variables:
   ```bash
   docker inspect interpose-agent | grep -A 10 Env
   ```

3. Ensure API key is set:
   ```bash
   docker run -e INTERPOSE_API_KEY="your_key" interpose/agent:latest
   ```

**Network Issues:**

1. Use host network mode:
   ```bash
   docker run --network host interpose/agent:latest
   ```

2. Or create shared network:
   ```bash
   docker network create app-network
   docker run --network app-network interpose/agent:latest
   ```

### Lambda Layer Issues

**Import Errors:**

1. Verify layer is attached:
   ```bash
   aws lambda get-function-configuration --function-name your-function
   ```

2. Check Python runtime (must be 3.11 or 3.12):
   ```bash
   aws lambda get-function-configuration --function-name your-function | grep Runtime
   ```

3. Verify layer structure:
   ```bash
   unzip -l interpose-lambda-layer.zip | head -20
   ```
   Should show `python/interpose/...`

4. Check CloudWatch Logs for detailed errors.

**Environment Variables Not Set:**

1. Verify in AWS Console: Lambda → Configuration → Environment variables

2. Or via CLI:
   ```bash
   aws lambda get-function-configuration --function-name your-function | grep INTERPOSE
   ```

### Dashboard Issues

**Not Seeing Logs:**

1. Verify you're logged in with correct account
2. Check that agent is sending logs (see above)
3. Refresh the page (Ctrl+R or Cmd+R)
4. Clear browser cache and cookies
5. Try a different browser

**Slow Dashboard Performance:**

1. Reduce polling frequency in Settings
2. Clear old logs (Settings → Data Management)
3. Use Chrome or Firefox for best performance
4. Ensure stable internet connection

**Authentication Errors:**

1. Reset password via "Forgot Password" link
2. Clear browser cookies
3. Ensure email is verified
4. Contact support if issue persists

### High Memory Usage

**Agent Consuming Too Much Memory:**

1. Reduce log retention:
   ```python
   agent = InterposeAgent(
       api_key="your_key",
       max_log_buffer=100  # Reduce from default 1000
   )
   ```

2. Increase container memory:
   ```bash
   docker run -m 512m interpose/agent:latest
   ```

3. Monitor with:
   ```bash
   docker stats interpose-agent
   ```

### Connection Timeouts

**Agent Fails to Send Logs:**

1. Check DNS resolution:
   ```bash
   nslookup api.interpose.io
   ```

2. Verify proxy settings if behind corporate proxy

3. Increase timeout:
   ```python
   agent = InterposeAgent(
       api_key="your_key",
       timeout_seconds=10  # Increase from default 5
   )
   ```

4. Check for rate limiting (429 errors in logs)

## Best Practices

### Security

1. **Protect API Keys:**
   - Never commit API keys to version control
   - Use environment variables or secrets management
   - Rotate keys regularly (every 90 days)
   - Revoke compromised keys immediately

2. **Use Secrets Management:**
   ```python
   import boto3
   import json
   
   def get_api_key():
       secrets = boto3.client('secretsmanager')
       response = secrets.get_secret_value(SecretId='interpose/api-key')
       return json.loads(response['SecretString'])['api_key']
   
   agent = InterposeAgent(api_key=get_api_key())
   ```

3. **Limit Network Access:**
   - Restrict outbound traffic to api.interpose.io
   - Use VPC endpoints for AWS deployments
   - Enable TLS 1.2 or higher

4. **Monitor Alert Emails:**
   - Configure multiple recipients for high-risk alerts
   - Set up email filtering rules
   - Review alerts daily

### Performance

1. **Optimize Agent Placement:**
   - Deploy as sidecar container for minimal latency
   - Use same region as your application
   - Avoid cross-region network hops

2. **Batch Log Transmission:**
   ```python
   agent = InterposeAgent(
       api_key="your_key",
       batch_size=10,  # Send logs in batches
       batch_interval=5  # Send every 5 seconds
   )
   ```

3. **Monitor Resource Usage:**
   - Set memory limits (512MB recommended)
   - Monitor CPU usage (<1% typical)
   - Check network bandwidth (<1 Mbps typical)

### Compliance

1. **Data Retention:**
   - Configure retention period in Settings (default 90 days)
   - Export logs regularly for archival
   - Comply with GDPR, CCPA, HIPAA requirements

2. **Audit Logging:**
   - Enable audit logs in Settings
   - Track who accessed the dashboard
   - Monitor API key usage

3. **Regular Reviews:**
   - Review high-risk alerts weekly
   - Audit data access patterns monthly
   - Update security policies quarterly

### Operational

1. **Health Checks:**
   ```bash
   # Docker health check
   docker inspect --format='{{.State.Health.Status}}' interpose-agent
   ```

2. **Monitoring:**
   - Set up CloudWatch alarms for Lambda errors
   - Monitor Docker container restarts
   - Track dashboard uptime

3. **Backup and Recovery:**
   - Export logs regularly
   - Document API keys securely
   - Test disaster recovery procedures

4. **Updates:**
   - Update agent to latest version monthly
   - Review release notes for breaking changes
   - Test updates in staging environment first

### Cost Optimization

1. **Reduce Log Volume:**
   - Filter out low-risk events
   - Sample high-frequency calls
   - Adjust retention period

2. **Optimize Polling:**
   - Increase dashboard polling interval
   - Use webhooks instead of polling (if available)

3. **Monitor AWS Costs:**
   - Review DynamoDB usage
   - Check Lambda invocation counts
   - Monitor S3 storage costs

## Getting Help

### Documentation

- **Main Documentation**: https://docs.interpose.io
- **API Reference**: [API_REFERENCE.md](API_REFERENCE.md)
- **Deployment Guide**: [deployment/README.md](../deployment/README.md)
- **Architecture Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)

### Support Channels

- **Email**: support@interpose.io
- **GitHub Issues**: https://github.com/interpose/interpose/issues
- **Community Forum**: https://community.interpose.io
- **Status Page**: https://status.interpose.io

### Reporting Issues

When reporting issues, include:
1. Agent version (`interpose --version`)
2. Deployment method (Docker, Python, Lambda)
3. Error messages from logs
4. Steps to reproduce
5. Expected vs actual behavior

### Feature Requests

Submit feature requests via:
- GitHub Issues with "enhancement" label
- Community forum voting
- Email to product@interpose.io

## Appendix

### Supported AI Services

| Service | Detection | Notes |
|---------|-----------|-------|
| OpenAI | ✅ | api.openai.com, Azure OpenAI |
| Anthropic | ✅ | api.anthropic.com |
| AWS Bedrock | ✅ | bedrock-runtime.amazonaws.com |
| Local LLMs | ✅ | localhost, 127.0.0.1 |
| Google Vertex AI | 🔄 | Coming soon |
| Cohere | 🔄 | Coming soon |

### Sensitive Data Patterns

| Type | Pattern | Example |
|------|---------|---------|
| SSN | XXX-XX-XXXX | 123-45-6789 |
| Credit Card | 16 digits | 4111-1111-1111-1111 |
| API Key | api_key=... | api_key=sk_test_123... |
| Password | password=... | password=MyPass123! |
| Email | user@domain.com | john@example.com |

### Data Source Patterns

| Type | Pattern | Example |
|------|---------|---------|
| PostgreSQL | postgres://... | postgres://db.example.com:5432/users |
| MySQL | mysql://... | mysql://localhost:3306/app |
| MongoDB | mongodb://... | mongodb://cluster.mongodb.net/db |
| File Path | /path/to/file | /var/data/customers.csv |
| SQL Query | SELECT ... FROM | SELECT * FROM users WHERE id=1 |

### Risk Score Calculation

```
Base Score = 0

Sensitive Data:
  + 10 points per type (max 50)
  + 10 bonus for SSN or credit card

Data Sources:
  + 5 points per source (max 25)

Unknown Service:
  + 15 points

Total = min(Base Score, 100)
```

### Version History

- **v1.0.0** (2024-01): Initial release
- **v1.1.0** (2024-02): Added Lambda layer support
- **v1.2.0** (2024-03): Dashboard improvements
- **v1.3.0** (2024-04): Performance optimizations

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**License**: MIT
