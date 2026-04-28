# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v2.x    | ✅ Active |
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

### Response timeline

- **Acknowledgement**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Depends on severity — critical issues within 7 days

### Scope

In scope:
- AWS Lambda functions
- API Gateway endpoints
- KMS signing/verification
- Authentication and authorization
- Data exposure in DynamoDB or S3
- MCP server security

Out of scope:
- Third-party AWS services (report to AWS)
- Social engineering attacks
- Physical security

## Security Design Principles

LikenessGuard is built with these security defaults:

- **Default-deny**: All error paths return DENY — never an unsafe ALLOW
- **KMS mandatory**: ALLOW decisions require a valid KMS ECDSA signature
- **Secrets at runtime**: All credentials loaded from AWS Secrets Manager or SSM — never hardcoded
- **Least privilege IAM**: Each Lambda has only the permissions it needs
- **Immutable audit log**: DynamoDB audit entries include tamper-detection hashes
- **No raw biometric storage**: Only 512-dim vectors stored, never raw photos (deleted after 24h)

## Responsible Disclosure

We follow coordinated disclosure. We will credit researchers who report valid vulnerabilities in our release notes unless they prefer to remain anonymous.
