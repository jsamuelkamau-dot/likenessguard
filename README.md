# Interpose - AI Access Intelligence Platform

Universal AI access monitoring agent and SaaS dashboard for tracking AI service usage and data access patterns.

📘 Start here: [Project Overview](docs/00-project-overview.md)

## Overview

Interpose is a lightweight monitoring agent that intercepts AI API calls and provides real-time observability through a modern dashboard. Track what AI services your systems use, what data they access, and identify security risks automatically.

### Key Features

- 🔍 **AI Service Detection** - Monitors OpenAI, Anthropic, AWS Bedrock, and local LLMs
- 🛡️ **Sensitive Data Scanning** - Detects PII, credentials, API keys in real-time
- 📊 **Risk Scoring** - Automated 0-100 risk assessment
- 🎨 **Modern Dashboard** - Real-time observability with dark theme
- ☁️ **AWS Serverless** - Scalable backend with Lambda + DynamoDB

## Architecture

```
Customer Infrastructure          Interpose Cloud
┌─────────────────┐             ┌──────────────────┐
│  Your App/Bot   │             │   API Gateway    │
│       ↓         │   HTTPS     │        ↓         │
│ Interpose Agent │────────────→│     Lambda       │
│  (Docker/Lib)   │             │        ↓         │
└─────────────────┘             │    DynamoDB      │
                                │        ↓         │
                                │  React Dashboard │
                                └──────────────────┘
```

## Quick Start

### Install Agent

**Python Library:**
```bash
pip install interpose
```

**Docker:**
```bash
docker run -e INTERPOSE_API_KEY=your_key interpose/agent
```

### Usage

```python
from interpose import InterposeAgent

agent = InterposeAgent(api_key='your_key')

# Intercept AI calls
response = agent.intercept(
    destination_url='https://api.openai.com/v1/chat/completions',
    payload={'model': 'gpt-4', 'messages': [...]}
)
```

## Project Structure

Follow the modules in order:

- [00 - Project Overview](docs/00-project-overview.md)
- [01 - Agent Architecture](docs/01-agent-architecture.md)
- [02 - Dashboard Design](docs/02-dashboard-design.md)
- [03 - AWS Backend](docs/03-aws-backend.md)
- [04 - Deployment Guide](docs/04-deployment-guide.md)
- [05 - Security Best Practices](docs/05-security-best-practices.md)

## Technology Stack

- **Agent:** Python 3.11+, requests, boto3
- **Dashboard:** React, Tailwind CSS, Recharts
- **Backend:** AWS Lambda, API Gateway, DynamoDB, SES
- **Infrastructure:** Docker, CloudFormation, S3, CloudFront

## Documentation

- [Requirements Specification](.kiro/specs/interpose-saas-platform/requirements.md)
- [API Documentation](docs/api-reference.md)
- [Configuration Guide](docs/configuration.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
