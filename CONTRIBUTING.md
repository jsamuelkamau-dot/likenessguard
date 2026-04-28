# Contributing to LikenessGuard

Thank you for your interest in contributing! LikenessGuard is an open-source project and we welcome contributions of all kinds.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Coding Standards](#coding-standards)

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/jsamuelkamau-dot/likenessguard.git
   cd likenessguard
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/likenessguard.git
   ```

---

## Development Setup

### Prerequisites

- Python 3.13+
- Node.js 20+
- AWS CLI v2 configured with appropriate permissions
- AWS SAM CLI

### Backend (Lambda functions)

```bash
cd likenessguard-aws

# Install Python dependencies
pip install -r requirements-dev.txt

# Copy environment template
cp ../.env.example .env
# Edit .env with your AWS account details

# Run property-based tests
python -m pytest src/tests/ -v

# Run the crosscheck script
python scripts/crosscheck.py
```

### Dashboard (React)

```bash
cd likenessguard-dashboard

# Install dependencies
npm install

# Copy environment template
cp ../.env.example .env.local
# Set VITE_API_BASE_URL in .env.local

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### MCP Server (Claude.ai integration)

```bash
cd likenessguard-mcp

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
# Server runs on http://localhost:8080
```

### AWS Deployment

```bash
cd likenessguard-aws

# Build
sam build --template-file infrastructure/cloudformation-v2.yaml

# Deploy (first time)
sam deploy \
  --template-file infrastructure/cloudformation-v2.yaml \
  --stack-name likenessguard-v2 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    OpenSearchCollectionEndpoint=YOUR_ENDPOINT \
    UseOpenSearch=true

# After deploy: create OpenSearch index
python scripts/deploy_opensearch_index.py \
  --collection-endpoint YOUR_ENDPOINT \
  --region us-east-1

# Publish JWKS public key
python scripts/publish_jwks.py \
  --key-arn YOUR_KMS_KEY_ARN \
  --bucket likenessguard-jwks-YOUR_ACCOUNT_ID
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only. Protected — requires PR + review. |
| `develop` | Next release integration branch. |
| `feature/your-feature` | New features. Branch from `develop`. |
| `bugfix/issue-description` | Bug fixes. Branch from `develop` (or `main` for hotfixes). |
| `hotfix/critical-fix` | Critical production fixes. Branch from `main`. |

```bash
# Start a new feature
git checkout develop
git pull upstream develop
git checkout -b feature/my-new-feature

# Start a bug fix
git checkout develop
git checkout -b bugfix/fix-embedding-error
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, no logic change
- `refactor` — code restructure, no feature/fix
- `test` — adding or updating tests
- `chore` — build process, dependencies
- `security` — security fix

**Examples:**
```
feat(supervisor): add cross-embedding fallback for DynamoDB matching
fix(anomaly-agent): handle empty requester_id gracefully
docs(readme): add Grok integration setup instructions
security(kms): enforce signing failure → DENY invariant
```

---

## Pull Request Process

1. Ensure your branch is up to date with `develop`:
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. Run all tests locally before opening a PR:
   ```bash
   cd likenessguard-aws && python -m pytest src/tests/ -v
   cd likenessguard-dashboard && npm test
   ```

3. Open a PR against `develop` (not `main`)

4. Fill in the PR template completely

5. Request review from at least one maintainer

6. Address all review comments

7. A maintainer will merge once approved and CI passes

---

## Testing

### Property-Based Tests (Python)

```bash
cd likenessguard-aws
python -m pytest src/tests/test_v2_properties.py -v
```

25 tests covering 14 formal correctness properties including:
- Proof-of-Face signature round-trip
- Tamper detection
- Policy determinism
- Edge offline default-deny invariant
- Audit log completeness

### End-to-End Tests

```bash
cd likenessguard-aws
python scripts/test_e2e_v2.py
```

### Dashboard Tests

```bash
cd likenessguard-dashboard
npm test
```

---

## Coding Standards

### Python

- Follow PEP 8
- Type hints on all function signatures
- Docstrings on all public functions
- All Lambda handlers follow: `lambda_handler(event, context) -> dict`
- All errors default to DENY — never return an unsafe ALLOW on error
- Use `logger.error()` for errors, `logger.info()` for decisions

### TypeScript / React

- Strict TypeScript (`"strict": true`)
- Functional components with hooks
- No `any` types
- Accessibility: all interactive elements must have ARIA labels

### Security Rules (Non-Negotiable)

- Never hardcode credentials, API keys, or account IDs
- Load all secrets from AWS Secrets Manager or SSM at runtime
- All error paths must return DENY
- KMS signing failure must flip ALLOW to DENY
- No raw biometric data stored — vectors only

---

## Questions?

Open a [GitHub Discussion](https://github.com/jsamuelkamau-dot/likenessguard/discussions) or join our community channel.
