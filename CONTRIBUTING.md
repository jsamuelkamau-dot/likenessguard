# Contributing to LikenessGuard

Thank you for your interest in contributing! LikenessGuard is an open-source project and we welcome contributions of all kinds.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Do I Need an AWS Account?](#do-i-need-an-aws-account)
- [Local Mock Mode](#local-mock-mode)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Developer Certificate of Origin (DCO)](#developer-certificate-of-origin-dco)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Security Invariants (Non-Negotiable)](#security-invariants-non-negotiable)
- [Path to Committer](#path-to-committer)

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Do I Need an AWS Account?

Most contributions do **not** require an AWS account. Here's a breakdown:

| Contribution Area | AWS Account Needed? | Notes |
|-------------------|--------------------|----|
| Property-based tests | No | `make test-properties` — all tests use mocked AWS services |
| Unit tests | No | `make dev-mock` — runs full test suite with mocks |
| Dashboard (React) | No | `npm run dev` in `likenessguard-dashboard/` |
| Documentation | No | Markdown files, RFCs, threat model |
| Python SDK | No | Pure Python, no AWS calls in SDK code |
| Node.js SDK | No | Pure TypeScript, no AWS calls in SDK code |
| MCP server | No | Local server, uses mock responses in dev mode |
| Bug fixes in Lambda logic | No | Write fix + property-based test, CI validates |
| CloudFormation templates | Yes | Need to deploy to validate infrastructure changes |
| End-to-end tests | Yes | Requires deployed stack |
| OpenSearch index changes | Yes | Requires OpenSearch Serverless collection |
| Edge component (Greengrass) | Yes | Requires IoT Greengrass v2 setup |

**Bottom line**: if you're fixing bugs, writing tests, improving docs, or working on the dashboard/SDKs, you don't need AWS.

---

## Local Mock Mode

Run the full test suite without an AWS account:

```bash
make dev-mock
```

This runs:
- All property-based tests (25 properties covering correctness invariants)
- Unit tests with mocked AWS services (Bedrock, DynamoDB, KMS, OpenSearch, Rekognition)

No credentials, no deployed infrastructure, no cost.

For property-based tests only:

```bash
make test-properties
```

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/likenessguard.git
   cd likenessguard
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/jsamuelkamau-dot/likenessguard.git
   ```
4. **Install dependencies**:
   ```bash
   make install
   ```
5. **Run tests** to verify your setup:
   ```bash
   make dev-mock
   ```

---

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- AWS CLI v2 (only if deploying to AWS)
- AWS SAM CLI (only if deploying to AWS)

### Backend (Lambda functions)

```bash
cd likenessguard-aws
pip install -r requirements-dev.txt

# Run property-based tests (no AWS needed)
python -m pytest src/tests/test_v2_properties.py -v

# Run the crosscheck script
python scripts/crosscheck.py
```

### Dashboard (React)

```bash
cd likenessguard-dashboard
npm install
npm run dev     # Start dev server at http://localhost:5173
npm test        # Run tests
npm run build   # Production build
```

### MCP Server (Claude.ai integration)

```bash
cd likenessguard-mcp
pip install -r requirements.txt
python server.py   # Runs on http://localhost:8080
```

### AWS Deployment (only if needed)

```bash
make deploy       # Build + deploy full stack
make post-deploy  # Create OpenSearch index + publish JWKS
```

---

## Developer Certificate of Origin (DCO)

LikenessGuard is licensed under Apache 2.0. We use the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) to ensure that all contributions are properly licensed.

By making a contribution, you certify that you have the right to submit it under the Apache 2.0 license. You indicate this by adding a `Signed-off-by` line to your commit messages:

```
feat(supervisor): add cross-embedding fallback

Signed-off-by: Your Name <your.email@example.com>
```

You can do this automatically with `git commit -s`.

All commits in a PR must be signed off. The CI pipeline checks for this.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only. Protected — requires PR + review. |
| `v3-reference-implementation` | Active v3 development. All v3 work happens here until the conformance suite passes. |
| `develop` | Next v2.x release integration branch. |
| `feature/your-feature` | New features. Branch from `develop` (v2.x) or `v3-reference-implementation` (v3). |
| `bugfix/issue-description` | Bug fixes. Branch from `develop` (or `main` for hotfixes). |
| `hotfix/critical-fix` | Critical production fixes. Branch from `main`. |

```bash
# Start a new v2.x feature
git checkout develop
git pull upstream develop
git checkout -b feature/my-new-feature

# Start a v3 contribution
git checkout v3-reference-implementation
git pull upstream v3-reference-implementation
git checkout -b feature/v3-my-contribution
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

Signed-off-by: Your Name <your.email@example.com>
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
feat(supervisor): add structured MatchUnavailable result for failed identity resolution
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
   make dev-mock
   ```

3. Open a PR against `develop` (not `main`)

4. Fill in the PR template completely

5. **We aim to respond to PRs within 7 days.** Complex PRs may take longer — we'll comment to let you know.

6. Address all review comments

7. A maintainer will merge once approved and CI passes

### Test Expectations for PRs

- **Bug fixes**: must include a test that fails without the fix and passes with it
- **New features**: must include property-based tests or unit tests covering the new behavior
- **All PRs**: must pass `make dev-mock` (property-based tests + unit tests)
- **Security-related PRs**: must include tests verifying the relevant security invariants

---

## Testing

### Property-Based Tests (no AWS needed)

```bash
make test-properties
# or
cd likenessguard-aws && python -m pytest src/tests/test_v2_properties.py -v
```

25 tests covering 14 formal correctness properties including:
- Proof-of-Face signature round-trip
- Tamper detection
- Policy determinism
- Edge offline default-deny invariant
- Audit log completeness

### Full Mock Test Suite (no AWS needed)

```bash
make dev-mock
```

### End-to-End Tests (requires AWS)

```bash
cd likenessguard-aws && python scripts/test_e2e_v2.py
```

### Dashboard Tests

```bash
cd likenessguard-dashboard && npm test
```

---

## Coding Standards

### Python

- Follow PEP 8
- Type hints on all function signatures
- Docstrings on all public functions
- All Lambda handlers follow: `lambda_handler(event, context) -> dict`
- Use `logger.error()` for errors, `logger.info()` for decisions

### TypeScript / React

- Strict TypeScript (`"strict": true`)
- Functional components with hooks
- No `any` types
- Accessibility: all interactive elements must have ARIA labels

---

## Security Invariants (Non-Negotiable)

These rules apply to every PR. Violations will be rejected regardless of other merits.

1. **Default-deny** — all error paths return DENY, never an unsafe ALLOW
2. **Signed ALLOW** — every ALLOW decision must include a valid KMS ECDSA signature
3. **KMS failure = DENY** — if KMS signing fails, ALLOW flips to DENY
4. **No raw biometric storage** — only 512-dim vectors stored; raw photos deleted within 24h
5. **Audit completeness** — every consent decision is written to the audit log
6. **No hardcoded secrets** — credentials, API keys, and account IDs must use placeholders or environment variables
7. **No LLM on the decision path** (v3) — LLMs are permitted only in policy-authoring tools, not on the consent check path
8. **No invalid cross-embedding scores** (v3) — similarity scores must be computed by the configured embedding provider in a consistent embedding space; if matching fails, return a structured `MatchUnavailable` result
9. **Mode must be recorded** (v3) — every manifest and audit entry must record the operating mode (Registered-Subject Mode or Closed-Consent Mode); mode cannot be silently switched

See [docs/threat-model.md](docs/threat-model.md) for the full threat model and security invariant list.

---

## Path to Committer

We value sustained, quality contributions. After **3 or more substantial PRs merged** (bug fixes, features, or significant documentation improvements), we'll invite you to become a committer with write access to the repository.

Substantial means more than typo fixes — think bug fixes with tests, new features, RFCs, or meaningful documentation additions.

---

## Questions?

Open a [GitHub Discussion](https://github.com/jsamuelkamau-dot/likenessguard/discussions) or comment on the relevant issue.
