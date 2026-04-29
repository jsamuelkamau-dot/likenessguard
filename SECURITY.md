# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v2.x    | ✅ Active |
| v1.x    | ❌ End of life |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in LikenessGuard, please report it responsibly:

### Preferred: GitHub Private Security Advisory

Use [GitHub Private Security Advisories](https://github.com/jsamuelkamau-dot/likenessguard/security/advisories/new) — this is the fastest way to reach us.

### Alternative: Email

Send details to `security@likenessguard.io`.

If you need to encrypt your report, our PGP key fingerprint is:

```
(PGP key will be published at https://likenessguard.io/.well-known/security.txt)
```

> **Note:** We are in the process of setting up a dedicated PGP key for security reports. Until then, please use GitHub Private Security Advisories.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)
- Whether you'd like to be credited in the advisory

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix for critical issues | Within 7 days |
| Fix for high-severity issues | Within 14 days |
| Fix for medium/low issues | Within 30 days |
| Public disclosure | 90 days after report, or when fix is released (whichever is sooner) |

### Coordinated Disclosure

We follow a **90-day coordinated disclosure** policy:

1. You report the vulnerability privately
2. We acknowledge and assess within the timelines above
3. We develop and test a fix
4. We release the fix and publish a security advisory
5. You may publish your findings 90 days after the initial report, or after the fix is released — whichever comes first

We will credit you in the security advisory and release notes unless you prefer to remain anonymous.

### Recognition

We maintain a [Security Hall of Fame](#security-hall-of-fame) for researchers who responsibly disclose valid vulnerabilities. While we don't currently offer monetary bounties, we provide:

- Credit in the security advisory and CHANGELOG
- A "Security Contributor" badge on your GitHub profile (via the advisory)
- Our sincere gratitude for helping protect people's biometric privacy

## Scope

### In Scope

- AWS Lambda functions (all handlers)
- API Gateway endpoints and authentication
- KMS signing and verification logic
- DynamoDB data access and authorization
- OpenSearch query construction (injection risks)
- S3 presigned URL generation
- MCP server authentication and authorization
- Edge component (Greengrass v2) security
- Federation JWT validation
- SDK input validation
- Dashboard authentication and XSS/CSRF

### Out of Scope

- Third-party AWS service vulnerabilities (report to [AWS Security](https://aws.amazon.com/security/vulnerability-reporting/))
- Social engineering attacks
- Physical security of edge devices
- Denial of service via legitimate API usage (rate limiting is in place)
- Vulnerabilities in dependencies (report to the upstream project, but let us know so we can update)

## Security Design Principles

LikenessGuard is built with these security defaults:

- **Default-deny**: All error paths return DENY — never an unsafe ALLOW
- **KMS mandatory**: ALLOW decisions require a valid KMS ECDSA signature
- **Secrets at runtime**: All credentials loaded from AWS Secrets Manager or SSM — never hardcoded
- **Least privilege IAM**: Each Lambda has only the permissions it needs
- **Immutable audit log**: DynamoDB audit entries include tamper-detection hashes
- **No raw biometric storage**: Only 512-dim vectors stored, never raw photos (deleted after 24h)
- **Edge default-deny**: Offline edge nodes with no cache match always return DENY

For the full threat model, see [docs/threat-model.md](docs/threat-model.md).

## Security Hall of Fame

*No reports yet. Be the first to help us improve!*

