# LikenessGuard AWS Architecture

## Executive Summary

LikenessGuard is a privacy-first, cloud-native consent enforcement system that enables individuals to control how their likeness can be used by generative AI platforms. The system implements a default-deny approach using privacy-preserving fingerprints and machine-readable consent policies, deployed entirely on AWS serverless infrastructure.

This document explains the architectural decisions, responsible AI considerations, and technical implementation of the LikenessGuard prototype developed for the AWS Global 10,000 AIdeas Competition.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Privacy-Preserving Design](#privacy-preserving-design)
6. [Responsible AI Considerations](#responsible-ai-considerations)
7. [Security Architecture](#security-architecture)
8. [Scalability and Performance](#scalability-and-performance)
9. [AWS Free Tier Optimization](#aws-free-tier-optimization)
10. [Limitations and Constraints](#limitations-and-constraints)
11. [Future Vision](#future-vision)

## System Overview

### Problem Statement

Generative AI systems can create unauthorized content using people's likenesses without consent. Current approaches rely on reactive moderation after harm occurs. LikenessGuard shifts protection to preventive enforcement by design.

### Solution Approach

LikenessGuard provides:
- **Privacy-preserving likeness fingerprinting**: Non-reversible embeddings that cannot reconstruct original photos
- **Machine-readable consent policies**: Structured rules defining permitted usage
- **Default-deny philosophy**: Unknown likenesses return UNKNOWN status, protecting unregistered individuals
- **Comprehensive audit logging**: Evidence recording for consent violations
- **Real-time consent checking**: Sub-3-second API responses for generation pipelines

### Key Principles

1. **Privacy First**: No storage of raw biometric data or reversible embeddings
2. **User Control**: Users define and update consent policies at any time
3. **Default Deny**: Protect everyone, not just registered users
4. **Transparency**: Comprehensive audit logs for all consent checks
5. **Scalability**: Serverless architecture for automatic scaling

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User / AI Platform                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS (TLS 1.2+)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway (REST)                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│  │ /register    │ /consent/    │ /consent/    │ /consent/    │    │
│  │              │  check       │  update      │  revoke      │    │
│  └──────────────┴──────────────┴──────────────┴──────────────┘    │
│         API Key Authentication │ Rate Limiting │ Request Validation│
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ Invoke
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS Lambda Functions                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│  │ Registration │ Consent      │ Consent      │ Consent      │    │
│  │ Handler      │ Check        │ Update       │ Revoke       │    │
│  │              │ Handler      │ Handler      │ Handler      │    │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘    │
│         │              │              │              │             │
└─────────┼──────────────┼──────────────┼──────────────┼─────────────┘
          │              │              │              │
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────────────────────────────┐
│  Amazon         │ │         DynamoDB Tables                 │
│  Rekognition    │ │  ┌──────────────┬──────────────────┐   │
│                 │ │  │ Consent      │ Audit Log        │   │
│ • Face Detection│ │  │ Registry     │ Table            │   │
│ • Feature       │ │  │              │                  │   │
│   Extraction    │ │  │ • Likeness_ID│ • Query_ID       │   │
│                 │ │  │ • Fingerprint│ • Timestamp      │   │
└─────────────────┘ │  │ • Policy     │ • Decision       │   │
                    │  │ • Metadata   │ • Evidence       │   │
                    │  └──────────────┴──────────────────┘   │
                    │  Encryption at Rest │ Point-in-Time    │
                    │                     │ Recovery          │
                    └─────────────────────────────────────────┘
                                 │
                                 │ Logs & Metrics
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Amazon CloudWatch                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│  │ Structured   │ Custom       │ Alarms       │ Dashboards   │    │
│  │ Logs         │ Metrics      │              │              │    │
│  └──────────────┴──────────────┴──────────────┴──────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Amazon S3 (Temporary)                          │
│  • Encrypted photo upload staging                                   │
│  • Automatic deletion after processing                              │
│  • Server-side encryption (SSE-S3)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Gateway

**Purpose**: Expose REST API endpoints for all system operations

**Configuration**:
- REST API with resource-based endpoints
- API key authentication for prototype (Cognito recommended for production)
- Request/response validation
- Rate limiting: 100 requests/second
- CORS configuration for web clients
- CloudWatch logging enabled

**Endpoints**:
- `POST /register`: User registration with photos
- `POST /consent/check`: Consent verification for generation requests
- `PUT /consent/update`: Policy updates
- `DELETE /consent/revoke`: Consent revocation
- `GET /evidence`: Evidence retrieval (authenticated)

### 2. Lambda Functions

**Registration Handler** (`registration/handler.py`):
- Validates photo count (5-10 images)
- Downloads photos from S3
- Calls Rekognition for face detection
- Generates privacy-preserving fingerprints
- Stores consent record in DynamoDB
- Deletes temporary photos
- Returns Likeness_ID

**Consent Check Handler** (`consent_check/handler.py`):
- Validates request parameters
- Processes reference image
- Generates query fingerprint
- Performs similarity matching
- Evaluates consent policy
- Records audit log and evidence
- Returns decision (ALLOW/DENY/UNKNOWN)

**Consent Update Handler** (`consent_update/handler.py`):
- Validates policy structure
- Updates policy in DynamoDB
- Updates modification timestamp
- Logs policy change

**Consent Revoke Handler** (`consent_revoke/handler.py`):
- Creates deny-all policy
- Updates policy in DynamoDB
- Logs revocation event

**Evidence Retrieval Handler** (`evidence_retrieval/handler.py`):
- Authenticates user
- Retrieves evidence records
- Returns paginated results

**Runtime**: Python 3.9
**Memory**: 512MB (registration), 256MB (others)
**Timeout**: 30 seconds (registration), 10 seconds (others)
**Concurrency**: Auto-scaling with reserved concurrency limits

### 3. Amazon Rekognition

**Purpose**: Face detection and feature extraction

**Operations**:
- `DetectFaces`: Identifies faces in uploaded photos
- `CompareFaces`: Extracts facial feature embeddings (4096-dimensional vectors)

**Configuration**:
- Quality threshold: 80%
- Confidence threshold: 90%
- Error handling with retries
- Circuit breaker for service unavailability

**Privacy Note**: Raw embeddings are never stored; only non-reversible fingerprints are persisted.

### 4. DynamoDB Tables

**Consent Registry Table**:
```
Primary Key: Likeness_ID (String)
Attributes:
  - Likeness_ID: UUID
  - Likeness_Fingerprint: SHA-256 hash (non-reversible)
  - Consent_Policy: JSON object
  - User_Metadata: User information
  - Created_At: Timestamp
  - Modified_At: Timestamp
  - TTL: Optional expiration

Encryption: At rest with AWS-managed keys
Capacity: On-demand (auto-scaling)
Backup: Point-in-time recovery enabled
```

**Audit Log Table**:
```
Primary Key: Query_ID (String)
Sort Key: Timestamp (Number)
Attributes:
  - Query_ID: UUID
  - Timestamp: Unix timestamp
  - Likeness_ID: Reference (if matched)
  - Decision: ALLOW/DENY/UNKNOWN
  - Reason_Code: Explanation
  - Usage_Type: Requested usage
  - Requester_ID: Requesting entity
  - Similarity_Score: Match confidence
  - Evidence: Metadata for violations
  - TTL: 180 days (evidence retention)

Encryption: At rest with AWS-managed keys
Capacity: On-demand (auto-scaling)
```

### 5. Amazon S3

**Purpose**: Temporary storage for photo uploads

**Configuration**:
- Server-side encryption (SSE-S3)
- Private bucket (no public access)
- Lifecycle policy: Delete after 1 day
- Versioning disabled
- Access logging enabled

**Usage Pattern**:
1. User uploads photos to S3
2. Lambda downloads and processes
3. Lambda deletes photos after fingerprint generation
4. No long-term storage of raw photos

### 6. CloudWatch

**Logging**:
- Structured JSON logs from all Lambda functions
- Log retention: 90 days
- Log groups per Lambda function
- Searchable with CloudWatch Insights

**Metrics**:
- Custom metrics: Decision counts (ALLOW/DENY/UNKNOWN)
- Error rates by type
- Circuit breaker state changes
- API latency percentiles

**Alarms**:
- Error rate > 5% for 5 minutes
- Circuit breaker open > 1 minute
- DynamoDB throttling events
- Lambda errors > 10/minute

## Data Flow

### Registration Flow

```
1. User → API Gateway: POST /register
   {
     "user_id": "alice@example.com",
     "photo_keys": ["s3://bucket/photo1.jpg", ...],
     "consent_policy": {...}
   }

2. API Gateway → Lambda (Registration)

3. Lambda → S3: Download photos

4. Lambda → Rekognition: DetectFaces for each photo
   ← Rekognition: Face embeddings (4096-dim vectors)

5. Lambda: Generate fingerprints
   - L2 normalize embeddings
   - SHA-256 hash → non-reversible fingerprint

6. Lambda → DynamoDB: Store consent record
   {
     "Likeness_ID": "uuid",
     "Likeness_Fingerprint": "sha256_hash",
     "Consent_Policy": {...},
     "Created_At": timestamp
   }

7. Lambda → S3: Delete temporary photos

8. Lambda → CloudWatch: Log registration event

9. Lambda → API Gateway → User: Return Likeness_ID
```

### Consent Check Flow

```
1. AI Platform → API Gateway: POST /consent/check
   {
     "reference_image": "base64_encoded_image",
     "usage_type": "THIRD_PARTY_EDIT",
     "requester_id": "platform@example.com"
   }

2. API Gateway → Lambda (Consent Check)

3. Lambda → Rekognition: DetectFaces on reference image
   ← Rekognition: Face embedding

4. Lambda: Generate query fingerprint
   - L2 normalize embedding
   - SHA-256 hash

5. Lambda → DynamoDB: Query all fingerprints

6. Lambda: Calculate similarity scores
   - Cosine similarity for each fingerprint
   - Threshold: 0.85

7. IF match found:
     Lambda → DynamoDB: Retrieve consent policy
     Lambda: Evaluate policy against usage_type
     Decision: ALLOW or DENY
   ELSE:
     Decision: UNKNOWN (default-deny)

8. Lambda → DynamoDB: Store audit record
   {
     "Query_ID": "uuid",
     "Timestamp": timestamp,
     "Decision": "DENY",
     "Reason_Code": "DENY_THIRD_PARTY",
     "Evidence": {...}
   }

9. Lambda → CloudWatch: Log consent check

10. Lambda → API Gateway → AI Platform: Return decision
    {
      "decision": "DENY",
      "reason_code": "DENY_THIRD_PARTY",
      "likeness_id": "uuid",
      "similarity_score": 0.92
    }
```

## Privacy-Preserving Design

### Non-Reversible Fingerprints

**Problem**: Storing raw facial embeddings creates privacy risks

**Solution**: One-way transformation using SHA-256 hashing

**Process**:
1. Rekognition extracts 4096-dimensional embedding
2. L2 normalization: `embedding / ||embedding||`
3. SHA-256 hash: `fingerprint = SHA256(normalized_embedding)`
4. Store only the hash (256-bit string)

**Properties**:
- **Non-reversible**: Cannot reconstruct original photo or embedding from hash
- **Deterministic**: Same face produces same fingerprint
- **Collision-resistant**: Different faces produce different fingerprints
- **Comparable**: Similarity matching still possible via re-hashing query embeddings

**Privacy Guarantee**: Even if the database is compromised, attackers cannot reconstruct faces or identify individuals.

### Data Minimization

**Principle**: Store only data necessary for consent enforcement

**Implementation**:
- No storage of original photos (deleted after processing)
- No storage of raw Rekognition embeddings
- No storage of personally identifiable information beyond user-provided metadata
- Audit logs use TTL (180 days) for automatic deletion

### Default-Deny Philosophy

**Principle**: Protect everyone, not just registered users

**Implementation**:
- Unknown likenesses return UNKNOWN status
- AI platforms must handle UNKNOWN as deny
- No false positives (unregistered people protected)
- Opt-in system (users choose to register)

## Responsible AI Considerations

### Bias Mitigation

**Challenge**: Face detection systems can exhibit bias across demographics

**Mitigation Strategies**:
1. **Diverse Training Data**: Amazon Rekognition trained on diverse datasets
2. **Quality Thresholds**: Reject low-quality detections (80% quality, 90% confidence)
3. **Multiple Photos**: Require 5-10 photos to reduce single-image bias
4. **Similarity Threshold**: Conservative 0.85 threshold reduces false positives
5. **User Control**: Users can update policies if system behavior is unsatisfactory

**Monitoring**:
- Track decision distributions by demographic (if data available)
- Monitor false positive/negative rates
- User feedback mechanisms for incorrect decisions

### Fairness and Equity

**Design Decisions**:
- **Free Access**: No cost to register or check consent (within Free Tier)
- **Universal Protection**: Default-deny protects unregistered individuals
- **Transparent Decisions**: Reason codes explain all decisions
- **User Empowerment**: Users control their own policies

**Limitations**:
- Requires internet access and AWS account for registration
- Assumes AI platforms integrate the API (adoption challenge)
- May not work well for individuals with changing appearances

### Transparency and Explainability

**Audit Logging**:
- Every consent check logged with full context
- Evidence recorded for DENY decisions
- Users can retrieve their evidence records
- Timestamps enable temporal analysis

**Reason Codes**:
- `ALLOW_SELF_EDIT`: User editing their own content
- `ALLOW_POLICY_PERMITS`: Policy explicitly allows usage
- `DENY_THIRD_PARTY`: Policy denies third-party edits
- `DENY_FACE_SWAP`: Policy denies face swaps
- `DENY_POLICY_VIOLATION`: General policy violation
- `UNKNOWN_NO_MATCH`: No matching likeness found

### Accountability

**System Design**:
- Immutable audit logs (append-only)
- Evidence retention (180 days minimum)
- User access to their own evidence
- CloudWatch logs for system debugging

**Governance**:
- Clear terms of service for users
- API usage agreements for AI platforms
- Incident response procedures
- Regular security audits

## Security Architecture

### Authentication and Authorization

**API Gateway**:
- API key authentication (prototype)
- Rate limiting per API key
- Request validation

**Production Recommendations**:
- AWS Cognito for user authentication
- IAM roles for service-to-service auth
- OAuth 2.0 for third-party integrations

### Encryption

**Data at Rest**:
- DynamoDB: AWS-managed encryption keys
- S3: Server-side encryption (SSE-S3)
- CloudWatch Logs: Encrypted by default

**Data in Transit**:
- TLS 1.2+ for all API communications
- HTTPS-only API Gateway endpoints
- VPC endpoints for internal AWS service communication (production)

### IAM Least Privilege

**Lambda Execution Roles**:
- Registration: S3 read/write, Rekognition read, DynamoDB write
- Consent Check: Rekognition read, DynamoDB read/write
- Consent Update: DynamoDB write
- Consent Revoke: DynamoDB write

**Principle**: Each function has only the permissions it needs.

### Network Security

**Prototype**:
- Public API Gateway endpoints
- Lambda functions in AWS-managed VPC

**Production Recommendations**:
- Private API Gateway with VPC endpoints
- Lambda functions in private subnets
- NAT Gateway for outbound internet access
- Security groups and NACLs

## Scalability and Performance

### Serverless Architecture

**Benefits**:
- Automatic scaling based on demand
- No server management
- Pay-per-use pricing
- High availability by default

**Lambda Concurrency**:
- Auto-scaling up to account limits
- Reserved concurrency for critical functions
- Provisioned concurrency for low-latency (optional)

### Performance Targets

**Consent Check Latency**:
- Target: < 3 seconds at 95th percentile
- Breakdown:
  - API Gateway: < 50ms
  - Rekognition: < 1s
  - DynamoDB query: < 100ms
  - Similarity matching: < 500ms
  - Policy evaluation: < 50ms
  - Audit logging: < 100ms (async)

**Throughput**:
- Target: 100 concurrent requests
- API Gateway throttling: 100 req/sec
- Lambda concurrency: 100 (configurable)

### Optimization Strategies

**DynamoDB**:
- On-demand capacity for variable workloads
- Global secondary indexes for query patterns
- Batch operations for bulk processing

**Lambda**:
- Connection pooling for DynamoDB
- Caching for frequently accessed policies
- Async logging to reduce latency

**Rekognition**:
- Circuit breaker for service unavailability
- Retry with exponential backoff
- Fallback to UNKNOWN on errors

## AWS Free Tier Optimization

### Service Limits

**Lambda**:
- Free Tier: 1M requests/month, 400K GB-seconds
- Prototype Usage: ~10K requests/month (demo)
- Optimization: 256MB memory for most functions

**API Gateway**:
- Free Tier: 1M API calls/month
- Prototype Usage: ~10K calls/month (demo)
- Optimization: Caching disabled (not needed for prototype)

**DynamoDB**:
- Free Tier: 25GB storage, 25 RCU/WCU
- Prototype Usage: < 1GB storage, < 10 RCU/WCU
- Optimization: On-demand capacity

**S3**:
- Free Tier: 5GB storage, 20K GET, 2K PUT
- Prototype Usage: < 100MB (temporary), < 1K operations
- Optimization: Lifecycle policy for automatic deletion

**Rekognition**:
- Free Tier: 5,000 images/month (first year)
- Prototype Usage: < 100 images/month (demo)
- Optimization: Batch processing where possible

**CloudWatch**:
- Free Tier: 10 custom metrics, 5GB logs
- Prototype Usage: 5 custom metrics, < 1GB logs
- Optimization: 90-day log retention

### Cost Monitoring

**CloudWatch Billing Alarms**:
- Alert when approaching Free Tier limits
- Daily cost reports
- Service-level cost tracking

**Optimization Tips**:
- Use demo script sparingly
- Delete stack when not in use
- Monitor Free Tier dashboard

## Limitations and Constraints

### Technical Limitations

1. **Face Detection Accuracy**:
   - Requires clear, frontal faces
   - May struggle with occlusions, extreme angles, or poor lighting
   - Accuracy varies across demographics

2. **Similarity Matching**:
   - Fixed threshold (0.85) may not suit all use cases
   - Cannot detect faces with significant appearance changes
   - No support for age progression

3. **Scalability**:
   - Rekognition API rate limits
   - DynamoDB scan operations for similarity matching (inefficient at scale)
   - Lambda cold starts impact latency

4. **Storage**:
   - No support for updating fingerprints (requires re-registration)
   - No versioning of consent policies
   - Limited audit log retention (180 days)

### Prototype Constraints

1. **Authentication**: Simple API keys (not production-ready)
2. **No User Interface**: API-only (no web dashboard)
3. **Single Region**: Deployed to one AWS region
4. **No CDN**: No CloudFront for global distribution
5. **Limited Testing**: Prototype-level testing only

### Adoption Challenges

1. **AI Platform Integration**: Requires AI platforms to adopt the API
2. **User Onboarding**: Users must register and upload photos
3. **Policy Complexity**: Users may not understand policy options
4. **False Positives/Negatives**: System may make incorrect decisions
5. **Maintenance**: Requires ongoing monitoring and updates

## Future Vision

### Cross-Platform Adoption

**Goal**: Establish LikenessGuard as an industry standard for consent enforcement

**Roadmap**:
1. **Open Standard**: Publish consent policy schema as open standard
2. **Multi-Platform Support**: Integrate with major AI platforms (OpenAI, Midjourney, Stable Diffusion)
3. **Federated Architecture**: Distributed consent registries for resilience
4. **Interoperability**: Cross-platform consent verification

### Enhanced Features

**User Experience**:
- Web dashboard for policy management
- Mobile app for on-the-go updates
- Notification system for consent violations
- Analytics dashboard for usage patterns

**Technical Improvements**:
- Advanced similarity matching (deep learning models)
- Age progression support
- Multi-modal consent (voice, video, text)
- Real-time policy updates via WebSocket

**Governance**:
- Decentralized governance model
- Community-driven policy templates
- Dispute resolution mechanisms
- Legal framework integration

### Responsible AI Evolution

**Bias Mitigation**:
- Continuous monitoring and auditing
- Demographic parity analysis
- Fairness-aware similarity matching
- User feedback loops

**Privacy Enhancements**:
- Zero-knowledge proofs for consent verification
- Homomorphic encryption for policy evaluation
- Differential privacy for aggregate statistics
- User-controlled data deletion

**Transparency**:
- Public audit reports
- Open-source core components
- Third-party security audits
- Academic research partnerships

### Regulatory Compliance

**Alignment**:
- GDPR compliance (EU)
- CCPA compliance (California)
- AI Act compliance (EU)
- Biometric privacy laws (Illinois BIPA, etc.)

**Features**:
- Right to be forgotten
- Data portability
- Consent withdrawal
- Breach notification

## Conclusion

LikenessGuard demonstrates a privacy-first, responsible AI approach to likeness consent enforcement. The serverless AWS architecture provides scalability, security, and cost-effectiveness while maintaining user control and transparency.

The prototype validates the technical feasibility of preventive consent enforcement and establishes a foundation for cross-platform adoption. By shifting from reactive moderation to proactive protection, LikenessGuard empowers individuals to control their digital identity in the age of generative AI.

## References

- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- Amazon Rekognition Documentation: https://docs.aws.amazon.com/rekognition/
- AWS Serverless Application Model: https://aws.amazon.com/serverless/sam/
- NIST Privacy Framework: https://www.nist.gov/privacy-framework
- EU AI Act: https://artificialintelligenceact.eu/
