# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v3.x (in development) | ✅ Active — `v3-reference-implementation` branch |
| v2.x    | ✅ Active — security patches and bug fixes |
| v1.x    | ❌ End of life |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in LikenessGuard, please report it responsibly:

1. **Email**: Send details to `security@likenessguard.io` (or open a private GitHub Security Advisory)
2. **GitHub**: Use [GitHub Private Security Advisories](https://github.com/jsamuelkamau-dot/likenessguard/security/advisories/new)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Disclosure Policy

We follow a **90-day coordinated disclosure** policy:

- You report the vulnerability privately
- We acknowledge, assess, and fix within the timelines below
- After 90 days (or once a fix is released, whichever comes first), you may publicly disclose
- We will coordinate with you on disclosure timing
- We will credit you in the release notes (unless you prefer to remain anonymous)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| **Acknowledgement** | Within 48 hours |
| **Initial assessment** | Within 5 business days |
| **Critical severity fix** | Within 7 days |
| **High severity fix** | Within 14 days |
| **Medium/Low severity fix** | Within 30 days |

### Scope

**In scope:**
- AWS Lambda functions (all 11 handlers)
- API Gateway endpoints and routing
- KMS signing and verification logic
- Authentication and authorization (JWT, API keys)
- Data exposure in DynamoDB, OpenSearch, or S3
- MCP server security
- Edge component (Greengrass v2) security
- Federation protocol security
- SDK security (Python and Node.js)

**Out of scope:**
- Third-party AWS services (report to [AWS Security](https://aws.amazon.com/security/vulnerability-reporting/))
- Social engineering attacks
- Physical security
- Denial of service via rate limiting (this is expected behavior)

## Security Design Principles

LikenessGuard is built with these security defaults:

- **Default-deny**: All error paths return DENY — never an unsafe ALLOW
- **KMS mandatory**: ALLOW decisions require a valid KMS ECDSA signature
- **Secrets at runtime**: All credentials loaded from AWS Secrets Manager or SSM — never hardcoded
- **Least privilege IAM**: Each Lambda has only the permissions it needs
- **Immutable audit log**: DynamoDB audit entries include tamper-detection hashes
- **No raw biometric storage**: Only 512-dim vectors stored, never raw photos (deleted after 24h)

For the full threat model, security invariants, and attack surface analysis, see [docs/threat-model.md](docs/threat-model.md).

## PGP Key

A PGP key for encrypted vulnerability reports will be published here in a future release. In the meantime, use GitHub Private Security Advisories for sensitive reports.

## Security Hall of Fame

We recognize researchers who responsibly disclose valid security vulnerabilities. Thank you for helping keep LikenessGuard secure.

| Researcher | Vulnerability | Date | Severity |
|------------|--------------|------|----------|
| — | *Be the first!* | — | — |
