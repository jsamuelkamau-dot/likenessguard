# Interpose Agent Deployment Guide

This guide covers all deployment methods for the Interpose monitoring agent: Docker, Python library, and AWS Lambda layer.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Python Library Usage](#python-library-usage)
- [AWS Lambda Layer](#aws-lambda-layer)
- [Troubleshooting](#troubleshooting)

## Environment Variables

The Interpose agent requires the following environment variables:

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `INTERPOSE_API_KEY` | Yes | Your Interpose API key for authentication | None |
| `INTERPOSE_BACKEND_URL` | No | Backend API endpoint | `https://api.interpose.io` |

### Getting Your API Key

1. Log in to your Interpose dashboard at https://dashboard.interpose.io
2. Navigate to Settings → API Keys
3. Copy your API key or generate a new one

## Docker Deployment

### Prerequisites

- Docker installed (version 20.10 or higher)
- Your Interpose API key

### Quick Start

1. **Pull the Docker image** (when available on Docker Hub):
   ```bash
   docker pull interpose/agent:latest
   ```

   Or **build from source**:
   ```bash
   docker build -t interpose/agent:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name interpose-agent \
     -e INTERPOSE_API_KEY="your_api_key_here" \
     -e INTERPOSE_BACKEND_URL="https://api.interpose.io" \
     --network host \
     interpose/agent:latest
   ```

### Docker Compose Example

Create a `docker-compose.yml` file:

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

Create a `.env` file:

```env
INTERPOSE_API_KEY=your_api_key_here
```

Run with Docker Compose:

```bash
docker-compose up -d
```

### Sidecar Pattern

Deploy the agent as a sidecar container alongside your application:

```yaml
version: '3.8'

services:
  your-app:
    image: your-app:latest
    container_name: your-app
    ports:
      - "8080:8080"
    networks:
      - app-network

  interpose-agent:
    image: interpose/agent:latest
    container_name: interpose-agent
    environment:
      - INTERPOSE_API_KEY=${INTERPOSE_API_KEY}
      - INTERPOSE_BACKEND_URL=https://api.interpose.io
    network_mode: "service:your-app"
    restart: unless-stopped
```

### Kubernetes Deployment

Deploy as a sidecar in Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: your-app
  template:
    metadata:
      labels:
        app: your-app
    spec:
      containers:
      - name: your-app
        image: your-app:latest
        ports:
        - containerPort: 8080
      
      - name: interpose-agent
        image: interpose/agent:latest
        env:
        - name: INTERPOSE_API_KEY
          valueFrom:
            secretKeyRef:
              name: interpose-secret
              key: api-key
        - name: INTERPOSE_BACKEND_URL
          value: "https://api.interpose.io"
```

Create the secret:

```bash
kubectl create secret generic interpose-secret \
  --from-literal=api-key=your_api_key_here
```

## Python Library Usage

### Installation

Install via pip:

```bash
pip install interpose
```

Or install from source:

```bash
git clone https://github.com/interpose/interpose.git
cd interpose
pip install -e .
```

### Basic Usage

Import and initialize the agent in your Python application:

```python
import interpose
from interpose.agent.agent import InterposeAgent

# Initialize the agent
agent = InterposeAgent(
    api_key="your_api_key_here",
    backend_url="https://api.interpose.io"  # Optional
)

# The agent will now automatically intercept all HTTP requests
# to AI services (OpenAI, Anthropic, AWS Bedrock, etc.)

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

### Using Environment Variables

```python
import os
from interpose.agent.agent import InterposeAgent

# Read from environment variables
api_key = os.environ.get("INTERPOSE_API_KEY")
backend_url = os.environ.get("INTERPOSE_BACKEND_URL", "https://api.interpose.io")

agent = InterposeAgent(api_key=api_key, backend_url=backend_url)
```

### Command-Line Interface

Run the agent as a standalone process:

```bash
# Using environment variables
export INTERPOSE_API_KEY="your_api_key_here"
interpose

# Or using command-line arguments
interpose --api-key your_api_key_here --backend-url https://api.interpose.io
```

### Integration Examples

#### Flask Application

```python
from flask import Flask
from interpose.agent.agent import InterposeAgent
import os

app = Flask(__name__)

# Initialize Interpose agent
agent = InterposeAgent(
    api_key=os.environ.get("INTERPOSE_API_KEY"),
    backend_url=os.environ.get("INTERPOSE_BACKEND_URL", "https://api.interpose.io")
)

@app.route("/chat")
def chat():
    # Your AI API calls are automatically monitored
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

#### Django Application

Add to your `settings.py`:

```python
# settings.py
import os
from interpose.agent.agent import InterposeAgent

# Initialize Interpose agent
INTERPOSE_AGENT = InterposeAgent(
    api_key=os.environ.get("INTERPOSE_API_KEY"),
    backend_url=os.environ.get("INTERPOSE_BACKEND_URL", "https://api.interpose.io")
)
```

## AWS Lambda Layer

### Building the Lambda Layer

Use the provided build script to create a Lambda layer ZIP file:

**Linux/Mac:**
```bash
cd deployment
chmod +x build-lambda-layer.sh
./build-lambda-layer.sh
```

**Windows (PowerShell):**
```powershell
cd deployment
.\build-lambda-layer.ps1
```

This creates `interpose-lambda-layer.zip` containing the agent and its dependencies.

### Publishing the Layer

1. **Upload to AWS Lambda**:
   ```bash
   aws lambda publish-layer-version \
     --layer-name interpose-agent \
     --description "Interpose AI monitoring agent" \
     --zip-file fileb://interpose-lambda-layer.zip \
     --compatible-runtimes python3.11 python3.12
   ```

2. **Note the Layer ARN** from the output:
   ```
   arn:aws:lambda:us-east-1:123456789012:layer:interpose-agent:1
   ```

### Attaching to Lambda Functions

#### Using AWS CLI

```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:interpose-agent:1
```

#### Using AWS Console

1. Open the Lambda function in AWS Console
2. Scroll to "Layers" section
3. Click "Add a layer"
4. Select "Custom layers"
5. Choose "interpose-agent" and the version
6. Click "Add"

#### Using CloudFormation

```yaml
Resources:
  YourLambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: your-function-name
      Runtime: python3.11
      Handler: index.lambda_handler
      Code:
        S3Bucket: your-code-bucket
        S3Key: your-code.zip
      Layers:
        - !Sub "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:layer:interpose-agent:1"
      Environment:
        Variables:
          INTERPOSE_API_KEY: !Ref InterposeApiKey
          INTERPOSE_BACKEND_URL: "https://api.interpose.io"
```

#### Using Terraform

```hcl
resource "aws_lambda_function" "your_function" {
  function_name = "your-function-name"
  runtime       = "python3.11"
  handler       = "index.lambda_handler"
  
  layers = [
    "arn:aws:lambda:us-east-1:123456789012:layer:interpose-agent:1"
  ]
  
  environment {
    variables = {
      INTERPOSE_API_KEY     = var.interpose_api_key
      INTERPOSE_BACKEND_URL = "https://api.interpose.io"
    }
  }
}
```

### Lambda Function Code

Your Lambda function code remains unchanged:

```python
import json
import boto3

# Interpose agent is automatically loaded from the layer
# and will intercept all AI API calls

def lambda_handler(event, context):
    # Your existing code - AI calls are automatically monitored
    bedrock = boto3.client('bedrock-runtime')
    
    response = bedrock.invoke_model(
        modelId='anthropic.claude-v2',
        body=json.dumps({
            "prompt": "Hello, Claude!",
            "max_tokens_to_sample": 100
        })
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps(response)
    }
```

### Setting Environment Variables

Set the required environment variables in your Lambda function:

**AWS CLI:**
```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --environment Variables="{INTERPOSE_API_KEY=your_api_key_here,INTERPOSE_BACKEND_URL=https://api.interpose.io}"
```

**AWS Console:**
1. Open the Lambda function
2. Go to "Configuration" → "Environment variables"
3. Add:
   - Key: `INTERPOSE_API_KEY`, Value: `your_api_key_here`
   - Key: `INTERPOSE_BACKEND_URL`, Value: `https://api.interpose.io`

**Using AWS Secrets Manager (Recommended):**

```python
import json
import boto3
import os

secrets_client = boto3.client('secretsmanager')

def get_secret(secret_name):
    response = secrets_client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

def lambda_handler(event, context):
    # Get API key from Secrets Manager
    secrets = get_secret('interpose/api-key')
    
    # Initialize Interpose with secret
    from interpose.agent.agent import InterposeAgent
    agent = InterposeAgent(
        api_key=secrets['api_key'],
        backend_url=os.environ.get('INTERPOSE_BACKEND_URL', 'https://api.interpose.io')
    )
    
    # Your code here
    pass
```

## Troubleshooting

### Agent Not Intercepting Requests

**Problem**: AI API calls are not being logged in the dashboard.

**Solutions**:
1. Verify the API key is correct:
   ```bash
   echo $INTERPOSE_API_KEY
   ```

2. Check network connectivity to backend:
   ```bash
   curl -I https://api.interpose.io
   ```

3. Enable debug logging:
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

4. Verify the agent is initialized before making AI API calls

### Docker Container Exits Immediately

**Problem**: Container stops right after starting.

**Solutions**:
1. Check container logs:
   ```bash
   docker logs interpose-agent
   ```

2. Verify environment variables are set:
   ```bash
   docker inspect interpose-agent | grep -A 10 Env
   ```

3. Ensure API key is not empty:
   ```bash
   docker run -e INTERPOSE_API_KEY="your_key" interpose/agent:latest
   ```

### Lambda Layer Not Working

**Problem**: Lambda function fails with import errors.

**Solutions**:
1. Verify layer is attached:
   ```bash
   aws lambda get-function-configuration --function-name your-function-name
   ```

2. Check Python runtime compatibility (must be 3.11 or 3.12)

3. Verify layer structure:
   ```bash
   unzip -l interpose-lambda-layer.zip | head -20
   ```
   Should show `python/interpose/...` structure

4. Check Lambda function logs in CloudWatch

### High Memory Usage

**Problem**: Agent consuming too much memory.

**Solutions**:
1. Reduce log retention in memory (agent stores recent logs)
2. Increase container/Lambda memory allocation
3. Monitor with:
   ```bash
   docker stats interpose-agent
   ```

### Connection Timeouts

**Problem**: Agent fails to send logs to backend.

**Solutions**:
1. Check firewall rules allow HTTPS outbound to api.interpose.io
2. Verify DNS resolution:
   ```bash
   nslookup api.interpose.io
   ```
3. Check proxy settings if behind corporate proxy
4. Increase timeout in agent configuration

### Permission Errors

**Problem**: Agent cannot write to log directory.

**Solutions**:
1. Ensure `/var/log/interpose` directory exists and is writable
2. For Docker, mount volume with correct permissions:
   ```bash
   docker run -v $(pwd)/logs:/var/log/interpose:rw interpose/agent:latest
   ```
3. For Lambda, logs go to CloudWatch automatically

## Support

For additional help:
- Documentation: https://docs.interpose.io
- Support: support@interpose.io
- GitHub Issues: https://github.com/interpose/interpose/issues
