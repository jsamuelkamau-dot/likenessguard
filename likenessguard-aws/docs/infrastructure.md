# LikenessGuard Infrastructure Documentation

## Overview

The LikenessGuard AWS Prototype uses a serverless architecture built on AWS services, optimized for the AWS Free Tier. The infrastructure is defined using AWS SAM (Serverless Application Model) and deployed via CloudFormation.

## Architecture Components

### 1. Amazon S3 - Photo Storage

**Bucket Name**: `likenessguard-photos-{AccountId}`

**Configuration**:
- **Encryption**: AES-256 server-side encryption enabled
- **Public Access**: Completely blocked (all public access settings disabled)
- **Versioning**: Enabled for data protection
- **Lifecycle Policy**: Automatic deletion after 24 hours (photos deleted after fingerprint generation)

**Purpose**: Temporary storage for uploaded photos during registration. Photos are automatically deleted after processing to minimize storage costs and enhance privacy.

**IAM Permissions**: Lambda execution role has GetObject, PutObject, DeleteObject, and ListBucket permissions.

### 2. Amazon DynamoDB - Data Storage

#### ConsentRegistry Table

**Table Name**: `LikenessGuard-ConsentRegistry`

**Schema**:
- **Partition Key**: `LikenessID` (String) - Unique identifier for each registered likeness
- **Attributes**:
  - `FingerprintHash` (String) - SHA-256 hash of face embedding
  - `ConsentPolicy` (Map) - Machine-readable consent rules
  - `UserMetadata` (Map) - User information
  - `CreatedAt` (Number) - Unix timestamp
  - `ModifiedAt` (Number) - Unix timestamp

**Configuration**:
- **Billing Mode**: PAY_PER_REQUEST (on-demand) for Free Tier optimization
- **Encryption**: KMS encryption at rest enabled
- **Point-in-Time Recovery**: Enabled for data protection

**Purpose**: Stores likeness fingerprints and associated consent policies for consent checking.

#### AuditLog Table

**Table Name**: `LikenessGuard-AuditLog`

**Schema**:
- **Partition Key**: `QueryID` (String) - Unique identifier for each consent check
- **Sort Key**: `Timestamp` (Number) - Unix timestamp for chronological ordering
- **Attributes**:
  - `LikenessID` (String) - Matched likeness (if found)
  - `Decision` (String) - ALLOW, DENY, or UNKNOWN
  - `SimilarityScore` (Number) - Similarity score for match
  - `ReasonCode` (String) - Explanation for decision
  - `RequesterId` (String) - ID of requesting AI platform
  - `UsageType` (String) - Type of usage requested
  - `TTL` (Number) - Time-to-live for automatic deletion

**Configuration**:
- **Billing Mode**: PAY_PER_REQUEST (on-demand)
- **Encryption**: KMS encryption at rest enabled
- **TTL**: Enabled with 180-day retention (automatic deletion after 180 days)

**Purpose**: Comprehensive audit trail of all consent checks for accountability and evidence recording.

### 3. AWS Lambda Functions

All Lambda functions share common configuration:
- **Runtime**: Python 3.11
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Execution Role**: `LikenessGuard-LambdaExecutionRole` (least privilege)

#### Registration Function

**Function Name**: `LikenessGuard-Registration`

**Trigger**: API Gateway POST `/register`

**Purpose**: Process user registration, generate likeness fingerprints, store consent policies.

**Environment Variables**:
- `CONSENT_REGISTRY_TABLE`: ConsentRegistry table name
- `AUDIT_LOG_TABLE`: AuditLog table name
- `PHOTO_BUCKET`: S3 bucket name
- `SIMILARITY_THRESHOLD`: 0.85
- `LOG_LEVEL`: INFO

#### Consent Check Function

**Function Name**: `LikenessGuard-ConsentCheck`

**Trigger**: API Gateway POST `/consent/check`

**Purpose**: Evaluate consent for generation requests, perform similarity matching, return decisions.

#### Consent Update Function

**Function Name**: `LikenessGuard-ConsentUpdate`

**Trigger**: API Gateway PUT `/consent/update`

**Purpose**: Handle consent policy modifications.

#### Consent Revoke Function

**Function Name**: `LikenessGuard-ConsentRevoke`

**Trigger**: API Gateway DELETE `/consent/revoke`

**Purpose**: Handle consent revocation (set policy to deny-all).

### 4. Amazon API Gateway

**API Name**: `LikenessGuard-API`

**Stage**: `v1`

**Endpoints**:
- `POST /register` - Register new likeness
- `POST /consent/check` - Check consent for generation request
- `PUT /consent/update` - Update consent policy
- `DELETE /consent/revoke` - Revoke consent

**Security**:
- **API Key Required**: All endpoints require valid API key
- **Usage Plan**: 10,000 requests/month quota
- **Throttling**: 100 requests/second rate limit, 200 burst limit
- **CORS**: Enabled for web interface integration

**Error Responses**:
- `401 Unauthorized`: Missing or invalid API key
- `429 Too Many Requests`: Rate limit exceeded

### 5. IAM Roles and Policies

#### Lambda Execution Role

**Role Name**: `LikenessGuard-LambdaExecutionRole`

**Managed Policies**:
- `AWSLambdaBasicExecutionRole` - CloudWatch Logs access

**Inline Policy** (`LikenessGuardLambdaPolicy`):

**S3 Permissions**:
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on photo bucket objects
- `s3:ListBucket` on photo bucket

**DynamoDB Permissions**:
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:Query`, `dynamodb:Scan` on ConsentRegistry and AuditLog tables

**Rekognition Permissions**:
- `rekognition:DetectFaces`, `rekognition:CompareFaces` on all resources

**CloudWatch Logs Permissions**:
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` on all resources

**Principle**: Least privilege - only permissions necessary for function operation.

### 6. Amazon CloudWatch

#### Log Groups

**Log Retention**: 90 days for all Lambda functions

**Log Groups**:
- `/aws/lambda/LikenessGuard-Registration`
- `/aws/lambda/LikenessGuard-ConsentCheck`
- `/aws/lambda/LikenessGuard-ConsentUpdate`
- `/aws/lambda/LikenessGuard-ConsentRevoke`

#### Alarms

**HighErrorRateAlarm**:
- **Metric**: Lambda Errors
- **Threshold**: > 5 errors in 5 minutes
- **Purpose**: Alert on elevated error rates

**LambdaThrottleAlarm**:
- **Metric**: Lambda Throttles
- **Threshold**: > 10 throttles in 1 minute
- **Purpose**: Alert on function throttling (capacity issues)

### 7. Amazon Rekognition

**Service**: Managed face detection and comparison

**APIs Used**:
- `DetectFaces`: Detect faces in uploaded photos and reference images
- `CompareFaces`: Compare face similarity for consent matching

**Free Tier**: 5,000 images/month for face detection and comparison

**Note**: Rekognition is a managed service with no infrastructure to configure.

## Security Architecture

### Encryption

**At Rest**:
- S3: AES-256 server-side encryption
- DynamoDB: KMS encryption enabled
- CloudWatch Logs: Encrypted by default

**In Transit**:
- API Gateway: HTTPS/TLS 1.2+ enforced
- All AWS service communications: TLS encrypted

### Access Control

**Public Access**: Completely blocked for S3 bucket and DynamoDB tables

**API Access**: Requires valid API key

**Lambda Access**: IAM role with least privilege permissions

**Audit Trail**: All operations logged to CloudWatch

### Privacy Safeguards

**Non-Reversible Fingerprints**: SHA-256 hashing prevents reconstruction of biometric data

**Temporary Storage**: Photos automatically deleted after 24 hours

**Data Minimization**: Only fingerprints stored, not original embeddings or photos

**Audit Logging**: Comprehensive logging for accountability

## Free Tier Optimization

### Service Limits

**Lambda**:
- Free Tier: 1M requests/month, 400K GB-seconds compute
- Expected Usage: ~10K requests/month for prototype

**DynamoDB**:
- Free Tier: 25 GB storage, 25 read/write capacity units
- Expected Usage: < 1 GB storage for prototype

**S3**:
- Free Tier: 5 GB storage, 20K GET requests, 2K PUT requests
- Expected Usage: < 100 MB (photos deleted after 24 hours)

**Rekognition**:
- Free Tier: 5,000 images/month
- Expected Usage: ~1,000 images/month for prototype

**API Gateway**:
- Free Tier: 1M API calls/month
- Expected Usage: ~10K calls/month for prototype

**CloudWatch**:
- Free Tier: 5 GB logs, 10 custom metrics
- Expected Usage: < 1 GB logs, 5 custom metrics

### Cost Monitoring

**Throttling**: API Gateway rate limiting prevents runaway costs

**Lifecycle Policies**: S3 automatic deletion reduces storage costs

**On-Demand Billing**: DynamoDB pay-per-request optimizes for low traffic

**Alarms**: CloudWatch alarms alert on unusual activity

## Deployment

### Prerequisites

1. AWS CLI installed and configured
2. AWS SAM CLI installed
3. Python 3.11+ installed
4. Valid AWS account with appropriate permissions

### Deployment Steps

1. **Build**:
   ```bash
   cd infrastructure
   sam build
   ```

2. **Deploy** (first time):
   ```bash
   sam deploy --guided
   ```

3. **Deploy** (subsequent):
   ```bash
   sam deploy
   ```

### Stack Outputs

After deployment, retrieve stack outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name likenessguard-prototype \
  --query 'Stacks[0].Outputs'
```

**Outputs**:
- `ApiEndpoint`: API Gateway endpoint URL
- `PhotoBucketName`: S3 bucket name
- `ConsentRegistryTableName`: DynamoDB ConsentRegistry table name
- `AuditLogTableName`: DynamoDB AuditLog table name

## Monitoring and Operations

### CloudWatch Dashboards

Create custom dashboard to monitor:
- Lambda invocation counts and errors
- API Gateway request counts and latency
- DynamoDB read/write capacity usage
- Rekognition API call counts

### Logs Analysis

**Query Examples**:

Find all DENY decisions:
```
fields @timestamp, decision, reasonCode, likenessId
| filter decision = "DENY"
| sort @timestamp desc
```

Find high-latency requests:
```
fields @timestamp, @duration
| filter @duration > 3000
| sort @duration desc
```

### Troubleshooting

**High Error Rate**:
1. Check CloudWatch Logs for error details
2. Verify IAM permissions
3. Check service quotas (Rekognition, Lambda)

**Throttling**:
1. Check API Gateway usage plan limits
2. Verify Lambda concurrency limits
3. Check DynamoDB capacity mode

**High Costs**:
1. Review CloudWatch metrics for unusual activity
2. Check S3 lifecycle policies are working
3. Verify API Gateway throttling is enabled

## Responsible AI Considerations

### Bias Mitigation

**Face Detection**: Amazon Rekognition has been tested for fairness across demographics. Monitor detection rates and document any observed biases.

**Default-Deny**: Unknown likenesses are denied by default, protecting individuals who haven't registered.

### Privacy Protection

**Non-Reversible Fingerprints**: SHA-256 hashing ensures biometric data cannot be reconstructed.

**Data Minimization**: Only necessary data stored (fingerprints, not photos or embeddings).

**Audit Trail**: Complete logging for accountability and transparency.

### Ethical Design

**User Control**: Users can update or revoke consent at any time.

**Transparency**: Clear reason codes explain all decisions.

**Evidence Recording**: DENY decisions recorded for potential legal use.

## Future Enhancements

### Production Readiness

1. **Multi-Region Deployment**: DynamoDB Global Tables for low-latency access
2. **Advanced Matching**: Locality-Sensitive Hashing for scalable similarity search
3. **Enhanced Security**: AWS WAF for API protection, AWS Secrets Manager for credentials
4. **Monitoring**: X-Ray tracing, custom CloudWatch dashboards
5. **CI/CD**: Automated testing and deployment pipeline

### Feature Additions

1. **Batch Processing**: Process multiple consent checks in parallel
2. **Webhook Notifications**: Real-time alerts for policy violations
3. **User Portal**: Web interface for consent management
4. **Analytics**: Aggregate statistics on consent decisions
5. **Cross-Platform Integration**: SDKs for major AI platforms

## References

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Amazon Rekognition Documentation](https://docs.aws.amazon.com/rekognition/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
