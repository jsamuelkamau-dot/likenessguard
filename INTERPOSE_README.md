# Interpose SaaS Platform

Universal AI Access Intelligence Platform for monitoring AI service usage and data access patterns.

## Project Structure

```
interpose-saas-platform/
├── interpose/              # Python agent package
│   └── agent/             # Core agent modules
│       ├── __init__.py
│       ├── agent.py
│       ├── service_detector.py
│       ├── sensitive_data_scanner.py
│       ├── data_source_extractor.py
│       ├── risk_calculator.py
│       └── tests/         # Agent unit and property tests
│
├── backend/               # AWS Lambda backend
│   ├── __init__.py
│   ├── lambda_handler.py
│   └── tests/            # Backend unit and property tests
│
├── dashboard/            # React dashboard
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── vite.config.ts
│
├── setup.py              # Python package setup
├── requirements.txt      # Python dependencies
├── pytest.ini           # Pytest configuration
└── README.md            # This file
```

## Components

### 1. Interpose Agent (`interpose/agent/`)
A lightweight Python monitoring agent that:
- Intercepts AI API calls (OpenAI, Anthropic, AWS Bedrock, local LLMs)
- Extracts metadata and detects data sources
- Scans for sensitive data (SSN, credit cards, API keys, passwords)
- Calculates risk scores (0-100)
- Transmits logs to backend API

**Deployment Options:**
- Docker container
- Python library (`pip install interpose`)
- AWS Lambda layer

### 2. Backend API (`backend/`)
AWS serverless backend built on:
- API Gateway for REST endpoints
- Lambda functions for log processing
- DynamoDB for data storage
- SES for high-risk alerts

**Endpoints:**
- `POST /logs` - Submit log entry from agent
- `GET /logs` - Query customer logs
- `POST /auth` - Authenticate user

### 3. Dashboard (`dashboard/`)
React-based web interface with:
- Real-time activity log display
- Risk score visualization with color-coded gauges
- System map showing AI service connections
- High-risk alert cards
- Timeline charts for historical trends
- Dark cyberpunk theme

## Installation

### Python Agent

```bash
# Install dependencies
pip install -r requirements.txt

# Install package in development mode
pip install -e .

# Run tests
pytest
```

### Dashboard

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Configuration

### Agent Configuration

Set environment variables:
```bash
export INTERPOSE_API_KEY="your-api-key"
export INTERPOSE_BACKEND_URL="https://api.interpose.io"
```

### Usage Example

```python
import interpose

# Initialize agent
interpose.init(
    api_key="your-api-key",
    backend_url="https://api.interpose.io"
)

# All subsequent AI API calls are automatically monitored
import requests
response = requests.post("https://api.openai.com/v1/chat/completions", json={...})
```

## Testing

### Python Tests
```bash
# Run all tests with coverage
pytest

# Run specific test file
pytest interpose/agent/tests/test_service_detector.py

# Run property-based tests only
pytest -m property
```

### TypeScript Tests
```bash
cd dashboard
npm test
```

## Dependencies

### Python (Agent & Backend)
- `requests>=2.31.0` - HTTP client
- `boto3>=1.34.0` - AWS SDK
- `hypothesis>=6.92.0` - Property-based testing
- `pytest>=7.4.0` - Testing framework

### TypeScript (Dashboard)
- `react@18.2.0` - UI framework
- `react-force-graph@1.43.0` - System map visualization
- `recharts@2.10.0` - Timeline charts
- `fast-check@3.15.0` - Property-based testing
- `jest@29.7.0` - Testing framework

## Development

### Running Locally

1. **Start Backend (Mock)**
   ```bash
   # TODO: Add local backend mock server
   ```

2. **Start Dashboard**
   ```bash
   cd dashboard
   npm run dev
   ```

3. **Run Agent**
   ```python
   python -m interpose.agent
   ```

### Code Quality

- Python: Follow PEP 8 style guide
- TypeScript: ESLint configuration included
- Test coverage: Minimum 85% for Python, 80% for TypeScript
- All property tests must run 100 iterations

## Architecture

The platform uses a three-tier architecture:

1. **Agent Layer**: Intercepts requests in customer environment
2. **Backend Layer**: Processes and stores logs in AWS
3. **Dashboard Layer**: Visualizes data in real-time

Data flows from agent → backend → dashboard with sub-second latency.

## Security

- Sensitive data values are never stored, only type classifications
- All communication uses HTTPS/TLS 1.2+
- API key authentication for all endpoints
- Customer data isolation in DynamoDB
- 90-day log retention with automatic deletion

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/interpose/interpose
- Email: support@interpose.io
- Documentation: https://docs.interpose.io
