# Contributing to LikenessGuard

Thank you for your interest in contributing! LikenessGuard is an open-source project and we welcome contributions of all kinds.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Do I Need an AWS Account?](#do-i-need-an-aws-account)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Local Mock Mode](#local-mock-mode)
- [What Can I Work On?](#what-can-i-work-on)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Contribution Licensing (DCO)](#contribution-licensing-dco)
- [Getting Help](#getting-help)

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Do I Need an AWS Account?

**No — most contributions don't require AWS access.**

| Contribution area | AWS needed? | Notes |
|-------------------|-------------|-------|
| Dashboard (React) | No | Runs locally with mock API responses |
| MCP Server | No | Runs locally on port 8080 |
| Python SDK | No | Pure Python, no AWS calls |
| Node.js SDK | No | Pure TypeScript, no AWS calls |
| Property-based tests | No | All AWS services are mocked |
| Documentation | No | Markdown files |
| Lambda business logic | No | Use `make dev-mock` — all AWS calls are mocked |
| Edge component | No | SQLite-based, runs locally |
| CloudFormation templates | **Yes** | Requires AWS account for deployment testing |
| End-to-end tests | **Yes** | Requires deployed stack |

**If you're unsure, start with `make dev-mock`** — it runs the full test suite against mocked AWS services with zero AWS costs.

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
5. **Run tests in mock mode** (no AWS needed):
   ```bash
   make dev-mock
   ```

---

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Make (comes with most systems; on Windows use Git Bash or WSL)

**Optional** (only for AWS deployment):
- AWS CLI v2 configured with appropriate permissions
- AWS SAM CLI

### Backend (Lambda functions)

```bash
cd likenessguard-aws

# Install Python dependencies
pip install -r requirements-dev.txt

# Run property-based tests (all AWS calls mocked)
python -m pytest src/tests/ -v

# Run the crosscheck script
python scripts/crosscheck.py
```

### Dashboard (React)

```bash
cd likenessguard-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
# Dashboard runs at http://localhost:5173

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

---

## Local Mock Mode

LikenessGuard includes a full mock mode that simulates all AWS services locally. This is the recommended way to develop and test.

```bash
# Run all tests with mocked AWS services
make dev-mock
```

What gets mocked:
- **Bedrock** (Titan, Claude, Nova) — returns deterministic fixture responses
- **Rekognition** — returns fixture face detection results
- **KMS** — returns fixture signatures, verifies against them
- **DynamoDB** — uses in-memory tables via moto
- **OpenSearch** — uses local cosine similarity computation
- **S3** — uses in-memory storage via moto

The mock fixtures are in `likenessguard-aws/src/tests/` and the conftest at `likenessguard-aws/conftest.py` sets up the mock environment automatically.

**To add a new mock fixture:** Add your fixture data to the relevant test file and use `unittest.mock.patch` or `moto` decorators. See existing tests in `test_v2_properties.py` for patterns.

---

## What Can I Work On?

Check the [issue tracker](https://github.com/jsamuelkamau-dot/likenessguard/issues) for open issues. Look for these labels:

| Label | Meaning |
|-------|---------|
| `good first issue` | Small, well-scoped tasks for new contributors |
| `help wanted` | We'd appreciate community help on these |
| `enhancement` | New features or improvements |
| `bug` | Something isn't working correctly |
| `documentation` | Docs improvements |
| `security` | Security-related work |

For larger work, check the [ROADMAP.md](ROADMAP.md) to see where the project is heading. If you want to tackle something not on the roadmap, open a [Discussion](https://github.com/jsamuelkamau-dot/likenessguard/discussions) first to coordinate.

**Before starting work on an issue**, comment on it to let others know you're working on it. This prevents duplicate effort.

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
feat(supervisor): add cross-embedding fallback for DynamoDB matching

Signed-off-by: Jane Doe <jane@example.com>
```

```
fix(anomaly-agent): handle empty requester_id gracefully

Signed-off-by: John Smith <john@example.com>
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

5. **Review timeline:** We aim to provide initial review feedback within 7 days. Complex PRs may take longer. If you haven't heard back in 7 days, feel free to ping in the PR.

6. Address all review comments

7. A maintainer will merge once approved and CI passes

### Who Has Merge Rights?

Currently, [@jsamuelkamau-dot](https://github.com/jsamuelkamau-dot) (Samuel Jesse) is the sole maintainer with merge rights.

**Path to becoming a committer:** Contributors who have had 3+ substantial PRs merged and demonstrate understanding of the project's security invariants may be invited to become committers. If you're interested, mention it in a Discussion thread.

---

## Testing

### Property-Based Tests (Python) — No AWS Needed

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

### Full Mock Test Suite

```bash
make dev-mock
```

### End-to-End Tests (Requires AWS)

```bash
cd likenessguard-aws
python scripts/test_e2e_v2.py
```

### Dashboard Tests

```bash
cd likenessguard-dashboard
npm test
```

### Test Expectations for PRs

- All existing tests must pass
- New features should include property-based tests where applicable
- Bug fixes should include a regression test
- Security-related changes must include tests that verify the security invariant

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

These are not style preferences — they are security invariants. PRs that violate these will be rejected.

- Never hardcode credentials, API keys, or account IDs
- Load all secrets from AWS Secrets Manager or SSM at runtime
- All error paths must return DENY
- KMS signing failure must flip ALLOW to DENY
- No raw biometric data stored — vectors only

---

## Contribution Licensing (DCO)

LikenessGuard uses the [Developer Certificate of Origin (DCO)](https://developercertificate.org/) to ensure that all contributions are properly licensed.

By submitting a pull request, you certify that:

1. The contribution was created in whole or in part by you, and you have the right to submit it under the Apache 2.0 license; or
2. The contribution is based on previous work that, to the best of your knowledge, is covered under an appropriate open-source license and you have the right to submit that work with modifications under the Apache 2.0 license; or
3. The contribution was provided to you by someone who certified (1) or (2) and you have not modified it.

**To sign off your commits**, add the `-s` flag:

```bash
git commit -s -m "feat(sdk): add batch consent check method"
```

This adds a `Signed-off-by` line to your commit message, which certifies your DCO agreement.

All contributions are accepted under the [Apache License 2.0](LICENSE), including the Apache 2.0 patent grant. By contributing, you agree that your contributions are licensed under the same terms.

---

## Getting Help

- **Questions about contributing:** Open a [Discussion](https://github.com/jsamuelkamau-dot/likenessguard/discussions)
- **Bug reports:** Use the [bug report template](https://github.com/jsamuelkamau-dot/likenessguard/issues/new?template=bug_report.md)
- **Feature ideas:** Use the [feature request template](https://github.com/jsamuelkamau-dot/likenessguard/issues/new?template=feature_request.md)
- **Security issues:** See [SECURITY.md](SECURITY.md) — do not open public issues for security vulnerabilities

