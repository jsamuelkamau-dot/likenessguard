# LikenessGuard AWS Prototype

Privacy-first AI system for likeness consent enforcement using AWS serverless architecture.

## Project Structure

```
likenessguard-aws/
├── src/
│   ├── lambdas/
│   │   ├── registration/
│   │   ├── consent_check/
│   │   ├── consent_update/
│   │   └── consent_revoke/
│   ├── shared/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── infrastructure/
│   ├── template.yaml (SAM template)
│   └── parameters/
├── scripts/
│   └── demo/
└── docs/

```

## Setup

1. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. Configure AWS credentials:
   ```bash
   aws configure
   ```

4. Deploy infrastructure:
   ```bash
   sam build
   sam deploy --guided
   ```

## Development

Run tests:
```bash
pytest
```

Run property-based tests:
```bash
pytest -m property
```

## AWS Services Used

- **AWS Lambda**: Serverless compute for business logic
- **Amazon DynamoDB**: NoSQL database for consent registry and audit logs
- **Amazon S3**: Encrypted storage for uploaded photos
- **Amazon Rekognition**: Face detection and feature extraction
- **API Gateway**: REST API endpoints
- **CloudWatch**: Logging and monitoring
- **IAM**: Access control and security

## Architecture

See `docs/architecture.md` for detailed architecture documentation.
