# Interpose Platform Architecture

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Scalability & Performance](#scalability--performance)
- [Disaster Recovery](#disaster-recovery)
- [Monitoring & Observability](#monitoring--observability)

## Overview

Interpose is a universal AI access intelligence platform that provides real-time monitoring, risk analysis, and observability for AI service usage across any system. The platform consists of three tightly integrated components:

1. **Interpose Agent**: Lightweight Python monitoring agent that intercepts AI API calls
2. **Backend API**: AWS serverless backend for log processing and storage
3. **Dashboard**: React-based web interface for visualization and analysis

### Design Principles

- **Zero-friction deployment**: Agent integrates without code changes through HTTP interception
- **Real-time intelligence**: Sub-second latency from interception to dashboard visualization
- **Universal compatibility**: Works with any AI service (OpenAI, Anthropic, Bedrock, local LLMs)
- **Security-first**: Detects sensitive data without storing actual values
- **Serverless scalability**: AWS Lambda and DynamoDB scale automatically with usage
- **Visual clarity**: Cyberpunk-themed dashboard with color-coded risk indicators

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Customer Environment                             │
│  ┌──────────────────┐         ┌─────────────────────────────────────┐  │
│  │ Customer System  │────────▶│     Interpose Agent                 │  │
│  │                  │         │  - HTTP Interception                │  │
│  └──────────────────┘         │  - Service Detection                │  │
│                                │  - Sensitive Data Scanning          │  │
│                                │  - Risk Calculation                 │  │
│                                └─────────────────────────────────────┘  │
│                                           │                              │
└───────────────────────────────────────────┼──────────────────────────────┘
                                            │ HTTPS
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            AWS Cloud                                     │
│                                                                          │
│  ┌────────────────┐      ┌──────────────────┐      ┌─────────────────┐ │
│  │  API Gateway   │─────▶│ Lambda Function  │─────▶│   DynamoDB      │ │
│  │  (REST API)    │      │  (Log Processor) │      │  - AIObserveLogs│ │
│  └────────────────┘      └──────────────────┘      │  - Customers    │ │
│         │                         │                 └─────────────────┘ │
│         │                         │                                     │
│         │                         ▼                                     │
│         │                 ┌──────────────────┐                         │
│         │                 │    AWS SES       │                         │
│         │                 │ (Alert Emails)   │                         │
│         │                 └──────────────────┘                         │
│         │                                                               │
│         ▼                                                               │
│  ┌────────────────┐      ┌──────────────────┐                         │
│  │  CloudFront    │─────▶│   S3 Bucket      │                         │
│  │ (CDN)          │      │  (Dashboard)     │                         │
│  └────────────────┘      └──────────────────┘                         │
│         │                                                               │
└─────────┼───────────────────────────────────────────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Interface                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    React Dashboard                                │  │
│  │  - Real-time Activity Log    - System Map Visualization          │  │
│  │  - Risk Score Gauges         - High-Risk Alert Cards             │  │
│  │  - Timeline Charts           - Authentication                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Log Creation Flow:**
1. Customer system makes HTTP request to AI service
2. Interpose Agent intercepts request before transmission
3. Agent extracts service name, endpoint, payload data
4. Agent scans payload for sensitive data patterns (SSN, credit cards, API keys)
5. Agent detects data sources (database connections, file paths, SQL queries)
6. Agent calculates risk score (0-100) based on findings
7. Agent creates LogEntry JSON object
8. Agent transmits log to Backend API via HTTPS POST
9. API Gateway receives request and invokes Lambda function
10. Lambda validates API key against Customers table
11. Lambda stores LogEntry in AIObserveLogs table
12. If risk score > 70, Lambda sends alert email via SES
13. Lambda returns HTTP 200 response to agent
14. Agent forwards original request to AI service

**Dashboard Query Flow:**
1. User authenticates with Dashboard
2. Dashboard queries Backend API for customer's logs
3. Lambda retrieves logs from AIObserveLogs table (filtered by customer_id)
4. Lambda returns JSON array of LogEntry objects
5. Dashboard renders activity log, risk gauges, system map, and charts
6. Dashboard polls Backend API every 2 seconds for new logs
7. Dashboard updates UI in real-time when new logs arrive


## Component Architecture

### Interpose Agent

**Purpose**: Intercept AI API calls, extract metadata, scan for risks, transmit logs

**Deployment Options:**
1. **Docker Container**: Runs as sidecar container alongside customer application
2. **Python Library**: Imported directly into customer application via `pip install interpose`
3. **AWS Lambda Layer**: Attached to customer's Lambda functions

**Core Components:**

```python
InterposeAgent
├── ServiceDetector       # Detects AI service from URL patterns
├── SensitiveDataScanner  # Scans for PII, credentials, API keys
├── DataSourceExtractor   # Extracts database connections, file paths
├── RiskCalculator        # Calculates risk score (0-100)
└── LogTransmitter        # Sends logs to backend with retry logic
```

**Service Detection Logic:**
- OpenAI: `api.openai.com`, `openai.azure.com`
- Anthropic: `api.anthropic.com`
- AWS Bedrock: `bedrock-runtime`, `bedrock.amazonaws.com`
- Local LLMs: `localhost`, `127.0.0.1`, `0.0.0.0`
- Unknown: Any other endpoint

**Sensitive Data Patterns:**
- SSN: `\b\d{3}-\d{2}-\d{4}\b`
- Credit Card: `\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b`
- API Key: `(api[_-]?key|apikey|api[_-]?token)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{20,})`
- Password: `(password|passwd|pwd)["\']?\s*[:=]\s*["\']?([^\s"\']{8,})`
- Email: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`

**Risk Score Algorithm:**
```
Base Score = 0

# Sensitive data (10 points per type, max 50)
Score += min(len(sensitive_data_types) * 10, 50)

# Data sources (5 points per source, max 25)
Score += min(len(data_sources) * 5, 25)

# Unknown service penalty
if service == 'unknown':
    Score += 15

# High-value data bonus
if 'ssn' in sensitive_data_types or 'credit_card' in sensitive_data_types:
    Score += 10

# Clamp to [0, 100]
Final Score = min(Score, 100)
```

**Performance Characteristics:**
- Interception overhead: <10ms per request
- Memory footprint: <50MB
- CPU usage: <1% during normal operation
- Payload size limit: 10MB (configurable)
- Regex timeout: 100ms per pattern


### Backend API

**Purpose**: Receive logs, validate requests, store data, generate alerts

**Technology Stack:**
- AWS API Gateway (REST API)
- AWS Lambda (Python 3.11)
- Amazon DynamoDB (NoSQL database)
- AWS SES (Email service)
- AWS CloudWatch (Logging and monitoring)

**API Endpoints:**

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| POST | /logs | Submit log entry | Yes (X-API-Key) |
| GET | /logs | Query customer logs | Yes (X-API-Key) |
| POST | /auth | Authenticate user | No |

**Lambda Function Architecture:**

```python
lambda_handler(event, context)
├── Route based on HTTP method and path
├── handle_log_submission()
│   ├── validate_api_key()
│   ├── parse_log_entry()
│   ├── store_in_dynamodb()
│   └── send_alert_if_high_risk()
├── handle_log_query()
│   ├── validate_api_key()
│   ├── query_dynamodb()
│   └── return_filtered_logs()
└── handle_auth()
    ├── query_customer_by_email()
    ├── verify_password()
    └── return_api_key()
```

**DynamoDB Schema:**

**AIObserveLogs Table:**
- Partition Key: `customer_id` (String)
- Sort Key: `timestamp` (Number)
- Attributes: `log_id`, `ai_service`, `endpoint`, `data_sources`, `sensitive_data_types`, `risk_score`, `request_method`, `request_size_bytes`, `response_status`
- TTL: Enabled on `ttl` attribute (90 days retention)
- Streams: Enabled for audit trail

**Customers Table:**
- Partition Key: `customer_id` (String)
- Attributes: `email`, `password_hash`, `api_key`, `alert_email`, `company_name`, `created_at`, `subscription_tier`
- GSI: `EmailIndex` on `email` attribute
- GSI: `ApiKeyIndex` on `api_key` attribute

**Performance Targets:**
- API response time: <200ms for log submission
- Query response time: <500ms for log queries
- Throughput: 1000 requests/second per customer
- Lambda timeout: 10 seconds
- Lambda memory: 512MB

**Error Handling:**
- Invalid API key → HTTP 401
- Missing required fields → HTTP 400
- DynamoDB failure → HTTP 500 (with retry)
- SES failure → Log error but return HTTP 200 (don't block log storage)


### Dashboard

**Purpose**: Visualize AI activity, risk scores, system maps, and alerts

**Technology Stack:**
- React 18 with TypeScript
- React Router for navigation
- Recharts for timeline visualization
- react-force-graph for system map
- AWS S3 for static hosting
- AWS CloudFront for CDN

**Component Architecture:**

```
Dashboard/
├── App.tsx                 # Main application component
├── components/
│   ├── ActivityLog.tsx     # Real-time log feed
│   ├── RiskGauge.tsx       # Circular risk score gauge
│   ├── SystemMap.tsx       # Network graph visualization
│   ├── AlertCard.tsx       # High-risk alert cards
│   ├── TimelineChart.tsx   # Historical trend charts
│   └── AuthForm.tsx        # Login form
├── hooks/
│   ├── useLogStream.ts     # Real-time log polling
│   └── useAuth.ts          # Authentication state
├── services/
│   └── api.ts              # Backend API client
└── styles/
    └── theme.ts            # Color palette and styles
```

**Theme Configuration:**

```typescript
colors: {
  background: {
    primary: '#0a0e1a',    // Deep space black
    secondary: '#131720',   // Dark slate
    tertiary: '#1a1f2e'     // Midnight blue
  },
  accent: {
    cyan: '#00d9ff',        // Primary accent
    magenta: '#ff00ff',     // Secondary accent
    green: '#00ffaa',       // Success/low risk
    yellow: '#ffd700',      // Warning/medium risk
    red: '#ff0055'          // Danger/high risk
  }
}
```

**Real-Time Updates:**
- Polling interval: 2 seconds
- Latency target: <2 seconds from log creation to display
- Max logs displayed: 100 most recent
- Auto-refresh: Enabled by default

**Performance Optimization:**
- Code splitting for faster initial load
- React.memo for component memoization
- useMemo/useCallback for expensive computations
- Virtualized lists for large datasets
- CloudFront caching for static assets


## Data Flow

### Log Submission Sequence

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │     │   Interpose  │     │  API Gateway │     │    Lambda    │
│    System    │     │     Agent    │     │              │     │   Function   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │                    │
       │ HTTP Request       │                     │                    │
       │ to AI Service      │                     │                    │
       ├───────────────────▶│                     │                    │
       │                    │                     │                    │
       │                    │ Detect Service      │                    │
       │                    │ Scan Sensitive Data │                    │
       │                    │ Calculate Risk      │                    │
       │                    │                     │                    │
       │                    │ POST /logs          │                    │
       │                    │ (with API Key)      │                    │
       │                    ├────────────────────▶│                    │
       │                    │                     │                    │
       │                    │                     │ Invoke Lambda      │
       │                    │                     ├───────────────────▶│
       │                    │                     │                    │
       │                    │                     │                    │ Validate
       │                    │                     │                    │ API Key
       │                    │                     │                    │
       │                    │                     │                    │ Store in
       │                    │                     │                    │ DynamoDB
       │                    │                     │                    │
       │                    │                     │                    │ Send Alert
       │                    │                     │                    │ (if risk>70)
       │                    │                     │                    │
       │                    │                     │ HTTP 200 OK        │
       │                    │                     │◀───────────────────┤
       │                    │ HTTP 200 OK         │                    │
       │                    │◀────────────────────┤                    │
       │                    │                     │                    │
       │                    │ Forward to AI       │                    │
       │                    │ Service             │                    │
       │◀───────────────────┤                     │                    │
       │                    │                     │                    │
```

### Dashboard Query Sequence

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User     │     │   Dashboard  │     │  API Gateway │     │    Lambda    │
│   Browser    │     │   (React)    │     │              │     │   Function   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │                    │
       │ Load Dashboard     │                     │                    │
       ├───────────────────▶│                     │                    │
       │                    │                     │                    │
       │                    │ POST /auth          │                    │
       │                    │ (email, password)   │                    │
       │                    ├────────────────────▶│                    │
       │                    │                     │ Invoke Lambda      │
       │                    │                     ├───────────────────▶│
       │                    │                     │                    │
       │                    │                     │                    │ Verify
       │                    │                     │                    │ Credentials
       │                    │                     │                    │
       │                    │                     │ Return API Key     │
       │                    │                     │◀───────────────────┤
       │                    │ API Key             │                    │
       │                    │◀────────────────────┤                    │
       │                    │                     │                    │
       │                    │ [Every 2 seconds]   │                    │
       │                    │ GET /logs           │                    │
       │                    │ (with API Key)      │                    │
       │                    ├────────────────────▶│                    │
       │                    │                     │ Invoke Lambda      │
       │                    │                     ├───────────────────▶│
       │                    │                     │                    │
       │                    │                     │                    │ Query
       │                    │                     │                    │ DynamoDB
       │                    │                     │                    │
       │                    │                     │ Return Logs        │
       │                    │                     │◀───────────────────┤
       │                    │ Log Entries         │                    │
       │                    │◀────────────────────┤                    │
       │                    │                     │                    │
       │                    │ Update UI           │                    │
       │◀───────────────────┤                     │                    │
       │                    │                     │                    │
```


### Data Model Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         Customers                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ customer_id (PK)                                           │ │
│  │ email (GSI)                                                │ │
│  │ password_hash                                              │ │
│  │ api_key (GSI)                                              │ │
│  │ alert_email                                                │ │
│  │ company_name                                               │ │
│  │ created_at                                                 │ │
│  │ subscription_tier                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AIObserveLogs                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ customer_id (PK)                                           │ │
│  │ timestamp (SK)                                             │ │
│  │ log_id                                                     │ │
│  │ ai_service                                                 │ │
│  │ endpoint                                                   │ │
│  │ data_sources []                                            │ │
│  │ sensitive_data_types []                                    │ │
│  │ risk_score                                                 │ │
│  │ request_method                                             │ │
│  │ request_size_bytes                                         │ │
│  │ response_status                                            │ │
│  │ ttl (90 days)                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```


## Security Architecture

### Authentication & Authorization

**API Key Management:**
- API keys are UUID v4 format (128-bit entropy)
- Keys are stored in DynamoDB with indexed access
- Keys can be rotated by customers via dashboard
- Compromised keys can be revoked immediately
- No anonymous access permitted

**Password Security:**
- Passwords hashed using bcrypt with cost factor 12
- Minimum password requirements enforced
- Failed login attempts rate-limited (5 per 15 minutes)
- Session tokens are JWT with 24-hour expiration

**Authorization Model:**
```
Customer
  └── API Key (1:1)
       └── Logs (1:N, filtered by customer_id)
```

Each customer can only access their own logs. The Lambda function enforces this by:
1. Validating API key against Customers table
2. Extracting customer_id from validated customer record
3. Filtering all queries by customer_id

### Data Privacy

**Sensitive Data Handling:**
- Agent scans for sensitive data patterns but **never stores actual values**
- Only data type classifications transmitted (e.g., 'ssn', 'credit_card')
- Regex patterns designed to detect but not capture sensitive values
- Log entries sanitized before transmission

**Data Retention:**
- Logs retained for 90 days by default (DynamoDB TTL)
- Customers can configure shorter retention (minimum 7 days)
- Deleted logs permanently removed and cannot be recovered
- Customer data deleted within 30 days of account closure

**Data Isolation:**
- Each customer's logs partitioned by customer_id
- API key validation ensures customers only access own data
- No cross-customer data sharing or aggregation
- DynamoDB partition keys enforce isolation

### Network Security

**Encryption in Transit:**
- All agent-to-backend communication uses HTTPS (TLS 1.2+)
- All dashboard-to-backend communication uses HTTPS (TLS 1.2+)
- API Gateway enforces HTTPS and rejects HTTP requests
- CloudFront distribution enforces HTTPS redirect

**Encryption at Rest:**
- DynamoDB tables use AWS-managed encryption (AES-256)
- S3 bucket uses server-side encryption
- Lambda environment variables encrypted with KMS
- CloudWatch logs encrypted

**Network Isolation:**
- Lambda functions run in AWS-managed VPC
- DynamoDB accessed via VPC endpoints (optional)
- API Gateway uses resource policies to restrict access
- CloudFront uses origin access identity for S3

### Threat Model

**Threats Mitigated:**
1. **Unauthorized Access**: API key validation on every request
2. **Data Leakage**: Customer data isolation via partition keys
3. **Man-in-the-Middle**: HTTPS enforcement everywhere
4. **Credential Theft**: Bcrypt password hashing, API key rotation
5. **DDoS**: API Gateway throttling, CloudFront DDoS protection
6. **Injection Attacks**: Input validation, parameterized queries

**Threats Not Mitigated:**
1. **Compromised Agent**: If customer's environment is compromised, agent can be bypassed
2. **Insider Threats**: AWS account administrators have full access
3. **Zero-Day Exploits**: Dependent on AWS security updates


### Compliance Considerations

**GDPR Compliance:**
- Right to access: Customers can export all logs via API
- Right to deletion: Account closure deletes all data within 30 days
- Data minimization: Only metadata stored, no sensitive values
- Privacy by design: Sensitive data detection without storage

**SOC 2 Considerations:**
- Access logging: All AWS access logged in CloudTrail
- MFA required: For AWS console access
- Security audits: Regular penetration testing
- Incident response: Documented and tested procedures

**HIPAA Considerations:**
- BAA available: For healthcare customers
- Audit logging: All data access logged
- Encryption: At rest and in transit
- HIPAA-eligible services: Lambda, DynamoDB, S3, API Gateway


## Scalability & Performance

### Horizontal Scaling

**Agent Scalability:**
- Stateless design allows unlimited agent instances
- Each agent operates independently
- No coordination required between agents
- Linear scaling with number of customer systems

**Backend Scalability:**
- Lambda auto-scales to handle concurrent requests
- DynamoDB auto-scales read/write capacity (on-demand mode)
- API Gateway handles millions of requests per second
- No single point of failure

**Dashboard Scalability:**
- CloudFront CDN serves static assets globally
- S3 scales automatically for storage
- Multiple edge locations reduce latency
- Static site generation eliminates server load

### Vertical Scaling

**Agent Configuration:**
- Configurable payload size limits (default: 10MB)
- Configurable regex timeout (default: 100ms)
- Configurable retry attempts (default: 3)
- Memory footprint: <50MB

**Lambda Configuration:**
- Memory: 512MB (configurable up to 10GB)
- Timeout: 10 seconds (configurable up to 15 minutes)
- Concurrent executions: 1000 (default, can be increased)
- Provisioned concurrency: Available for consistent performance

**DynamoDB Configuration:**
- On-demand billing: Automatic scaling
- Provisioned capacity: Manual control for cost optimization
- Read/write capacity: Unlimited with on-demand
- Global tables: Multi-region replication available

### Performance Characteristics

**Latency Targets:**
- Agent interception overhead: <10ms
- Log transmission: <500ms (including network)
- Backend API response: <200ms
- Dashboard initial load: <3 seconds
- Dashboard real-time updates: <2 seconds

**Throughput Targets:**
- Agent: 100 requests/second per instance
- Backend: 1000 requests/second per customer
- DynamoDB: Unlimited with on-demand billing
- API Gateway: 10,000 requests/second (default limit)

**Resource Utilization:**
- Agent CPU: <1% during normal operation
- Agent Memory: <50MB
- Lambda CPU: ~100ms execution time per request
- Lambda Memory: ~128MB used of 512MB allocated
- DynamoDB: ~1 WCU per log write, ~0.5 RCU per log read


### Performance Optimization Strategies

**Agent Optimizations:**
1. **Asynchronous Transmission**: Logs sent in background, don't block requests
2. **Regex Compilation**: Patterns compiled once at initialization
3. **Payload Streaming**: Large payloads processed in chunks
4. **Lazy Evaluation**: Only scan payloads when necessary
5. **Connection Pooling**: Reuse HTTP connections to backend

**Backend Optimizations:**
1. **DynamoDB Batch Operations**: Batch writes for multiple logs
2. **Lambda Warm Starts**: Provisioned concurrency for critical paths
3. **Efficient Queries**: Use partition keys and sort keys effectively
4. **Caching**: API Gateway caching for read-heavy endpoints
5. **Async Alert Sending**: SES emails sent asynchronously

**Dashboard Optimizations:**
1. **Code Splitting**: Load only necessary components
2. **Lazy Loading**: Defer non-critical components
3. **Memoization**: Cache expensive computations
4. **Virtualization**: Render only visible log entries
5. **CDN Caching**: CloudFront caches static assets globally

### Cost Optimization

**Estimated Monthly Costs (Low Volume):**
- DynamoDB: $1-5 (on-demand, 10K writes, 100K reads)
- Lambda: $0-2 (first 1M requests free)
- API Gateway: $3.50 per million requests
- S3: $0.023 per GB stored
- CloudFront: $0.085 per GB transferred
- SES: $0.10 per 1,000 emails

**Total: $5-20/month for small deployments**

**Cost Optimization Strategies:**
1. **DynamoDB On-Demand**: Pay only for actual usage
2. **Lambda Optimization**: Reduce execution time and memory
3. **S3 Lifecycle Policies**: Archive old logs to Glacier
4. **CloudFront Caching**: Reduce origin requests
5. **Log Retention**: Shorter retention = lower storage costs


## Disaster Recovery

### Backup Strategy

**DynamoDB Backups:**
- **Point-in-Time Recovery (PITR)**: Enabled on both tables
  - Continuous backups for 35 days
  - Restore to any point in time within backup window
  - No performance impact on production tables
  
- **On-Demand Backups**: Manual backups before major changes
  - Full table snapshots
  - Retained indefinitely until manually deleted
  - Can restore to new table in any region

**S3 Backups:**
- **Versioning**: Enabled on dashboard bucket
  - Previous versions retained for 30 days
  - Accidental deletion protection
  
- **Cross-Region Replication**: Optional for critical deployments
  - Automatic replication to secondary region
  - Near real-time replication
  - Disaster recovery failover capability

**Lambda Backups:**
- **Version Control**: All Lambda code in Git repository
- **Deployment Packages**: Stored in S3 with versioning
- **Infrastructure as Code**: CloudFormation templates in version control

### Recovery Procedures

**Scenario 1: DynamoDB Table Corruption**

1. Identify corruption time from CloudWatch logs
2. Restore table from PITR to point before corruption
3. Verify data integrity with sample queries
4. Update application to use restored table
5. Monitor for any issues

**Recovery Time Objective (RTO)**: 30 minutes  
**Recovery Point Objective (RPO)**: 5 minutes

**Scenario 2: Lambda Function Failure**

1. Check CloudWatch logs for error details
2. Roll back to previous Lambda version if code issue
3. If infrastructure issue, redeploy from CloudFormation
4. Verify functionality with test requests
5. Monitor error rates

**RTO**: 15 minutes  
**RPO**: 0 (no data loss)

**Scenario 3: Complete Region Failure**

1. Activate disaster recovery plan
2. Deploy CloudFormation stack in secondary region
3. Restore DynamoDB tables from backup
4. Update DNS to point to new region
5. Deploy Lambda functions and dashboard
6. Verify end-to-end functionality

**RTO**: 2-4 hours  
**RPO**: 1 hour (depends on backup frequency)

**Scenario 4: Data Breach**

1. Immediately revoke all API keys
2. Rotate all credentials (passwords, AWS keys)
3. Audit CloudTrail logs for unauthorized access
4. Notify affected customers within 72 hours (GDPR)
5. Implement additional security controls
6. Conduct post-incident review

**RTO**: 1 hour (for containment)  
**RPO**: N/A (security incident)


### High Availability Architecture

**Multi-AZ Deployment:**
- API Gateway: Automatically deployed across multiple AZs
- Lambda: Automatically runs in multiple AZs
- DynamoDB: Automatically replicated across 3 AZs
- S3: Automatically replicated across multiple AZs
- CloudFront: Global edge network with automatic failover

**Availability Targets:**
- API Gateway: 99.95% SLA
- Lambda: 99.95% SLA
- DynamoDB: 99.99% SLA (single region)
- S3: 99.99% SLA
- CloudFront: 99.9% SLA

**Combined System Availability: 99.9%** (approximately 8.76 hours downtime per year)

**Failover Mechanisms:**
1. **API Gateway**: Automatic retry with exponential backoff
2. **Lambda**: Automatic retry on throttling or errors
3. **DynamoDB**: Automatic failover to healthy AZ
4. **S3**: Automatic failover to healthy storage nodes
5. **CloudFront**: Automatic routing to healthy edge locations

### Monitoring & Alerting for DR

**Critical Alerts:**
- Lambda error rate > 1% → Page on-call engineer
- DynamoDB throttling > 0 → Investigate capacity
- API Gateway 5xx rate > 0.1% → Check backend health
- SES bounce rate > 5% → Review email configuration

**Health Checks:**
- API Gateway health endpoint: `/health`
- Lambda function health: Synthetic monitoring every 5 minutes
- DynamoDB health: CloudWatch metrics monitoring
- Dashboard availability: CloudFront monitoring

**Incident Response:**
1. Alert triggered → On-call engineer notified
2. Initial assessment (5 minutes)
3. Incident declared if customer-impacting
4. Mitigation actions (15-30 minutes)
5. Root cause analysis (post-incident)
6. Preventive measures implemented


## Monitoring & Observability

### Metrics Collection

**Agent Metrics:**
- Requests intercepted per minute
- Log transmission success rate
- Log transmission latency (p50, p95, p99)
- Regex scanning duration
- Failed transmissions count
- Memory usage
- CPU usage

**Backend Metrics (CloudWatch):**
- Lambda invocation count
- Lambda duration (p50, p95, p99)
- Lambda errors and throttles
- Lambda concurrent executions
- DynamoDB read/write capacity consumed
- DynamoDB throttled requests
- API Gateway request count
- API Gateway latency (p50, p95, p99)
- API Gateway 4xx/5xx errors
- SES email delivery success/failure rate

**Dashboard Metrics:**
- Page load time (Web Vitals)
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- API request success rate
- User session duration

### Logging Strategy

**Agent Logging:**
- Log file: `/var/log/interpose/agent.log`
- Log rotation: Daily, keep 7 days
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Structured logging: JSON format for parsing

**Backend Logging (CloudWatch Logs):**
- Log group: `/aws/lambda/interpose-log-processor`
- Retention: 30 days (configurable)
- Log format: Structured JSON
- Log contents:
  - All Lambda invocations
  - API key validation results
  - DynamoDB operations
  - SES email sending results
  - Error stack traces

**Dashboard Logging:**
- Client-side errors: Sent to error tracking service (e.g., Sentry)
- Console logs: Development only, disabled in production
- User analytics: Google Analytics or similar

### Alerting Configuration

**Critical Alerts (Page On-Call):**
- Lambda error rate > 1% for 5 minutes
- API Gateway 5xx rate > 0.1% for 5 minutes
- DynamoDB throttled requests > 10 in 5 minutes
- SES bounce rate > 5% for 15 minutes

**Warning Alerts (Email Team):**
- Lambda duration > 5 seconds (p95) for 10 minutes
- API Gateway latency > 1 second (p95) for 10 minutes
- DynamoDB read/write capacity > 80% for 15 minutes
- Lambda concurrent executions > 800 for 10 minutes

**Info Alerts (Slack Channel):**
- New customer signup
- High-risk log detected (risk score > 90)
- Daily usage summary
- Weekly cost report


### Observability Dashboard

**CloudWatch Dashboard Widgets:**

1. **System Health Overview**
   - API Gateway request count (last 24 hours)
   - Lambda invocation count (last 24 hours)
   - Error rate percentage (last 1 hour)
   - Average latency (last 1 hour)

2. **Performance Metrics**
   - Lambda duration (p50, p95, p99)
   - API Gateway latency (p50, p95, p99)
   - DynamoDB latency (p50, p95, p99)

3. **Resource Utilization**
   - Lambda concurrent executions
   - DynamoDB read/write capacity consumed
   - Lambda memory utilization
   - API Gateway throttling

4. **Error Tracking**
   - Lambda errors by type
   - API Gateway 4xx errors by endpoint
   - API Gateway 5xx errors by endpoint
   - DynamoDB errors

5. **Business Metrics**
   - Active customers (last 24 hours)
   - Total logs processed (last 24 hours)
   - High-risk alerts sent (last 24 hours)
   - Average risk score (last 24 hours)

### Distributed Tracing

**AWS X-Ray Integration:**
- Enabled on API Gateway
- Enabled on Lambda functions
- Traces end-to-end request flow
- Identifies performance bottlenecks
- Visualizes service dependencies

**Trace Information:**
- Request ID for correlation
- Service call duration
- DynamoDB query performance
- External API calls (SES)
- Error details and stack traces

### Log Analysis

**CloudWatch Insights Queries:**

**Query 1: Top Error Messages**
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @message
| sort count desc
| limit 10
```

**Query 2: Slow Requests**
```
fields @timestamp, @duration, @requestId
| filter @duration > 1000
| sort @duration desc
| limit 20
```

**Query 3: High-Risk Logs**
```
fields @timestamp, customer_id, risk_score, ai_service
| filter risk_score > 70
| sort @timestamp desc
| limit 50
```

**Query 4: API Key Validation Failures**
```
fields @timestamp, @message
| filter @message like /Invalid API Key/
| stats count() by bin(5m)
```


## Deployment Architecture

### Agent Deployment Options

**Option 1: Docker Container**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY interpose/ ./interpose/
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "interpose.agent"]
```

**Environment Variables:**
- `INTERPOSE_API_KEY`: Customer API key (required)
- `INTERPOSE_BACKEND_URL`: Backend API endpoint (default: https://api.interpose.io)
- `INTERPOSE_LOG_LEVEL`: Logging verbosity (default: INFO)
- `INTERPOSE_MAX_PAYLOAD_SIZE`: Max payload size in bytes (default: 10485760)

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  app:
    image: customer-app:latest
    networks:
      - shared-network
  
  interpose-agent:
    image: interpose/agent:latest
    environment:
      - INTERPOSE_API_KEY=${INTERPOSE_API_KEY}
      - INTERPOSE_BACKEND_URL=https://api.interpose.io
    networks:
      - shared-network
    depends_on:
      - app
```

**Option 2: Python Library**

```bash
# Installation
pip install interpose

# Usage
import interpose
interpose.init(
    api_key="your-api-key-here",
    backend_url="https://api.interpose.io"
)

# All subsequent requests are automatically intercepted
import requests
response = requests.post("https://api.openai.com/v1/chat/completions", json={...})
```

**Option 3: AWS Lambda Layer**

```bash
# Build layer
mkdir -p layer/python
pip install interpose -t layer/python
cd layer
zip -r interpose-layer.zip python

# Upload to AWS
aws lambda publish-layer-version \
  --layer-name interpose-agent \
  --zip-file fileb://interpose-layer.zip \
  --compatible-runtimes python3.11

# Attach to Lambda function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:interpose-agent:1
```

### Backend Deployment

**CloudFormation Stack:**
```bash
aws cloudformation create-stack \
  --stack-name interpose-platform \
  --template-body file://cloudformation-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Resources Created:**
- API Gateway REST API
- Lambda function (Python 3.11)
- DynamoDB tables (AIObserveLogs, Customers)
- S3 bucket for dashboard
- CloudFront distribution
- IAM roles and policies

**Post-Deployment:**
1. Deploy Lambda function code
2. Initialize customer database
3. Configure SES email verification
4. Deploy dashboard to S3

### Dashboard Deployment

**Build Process:**
```bash
cd dashboard
npm install
npm run build
```

**S3 Upload:**
```bash
aws s3 sync build/ s3://interpose-dashboard-${ACCOUNT_ID}/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html"

aws s3 cp build/index.html s3://interpose-dashboard-${ACCOUNT_ID}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

**CloudFront Invalidation:**
```bash
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

### Multi-Region Deployment

**Primary Region: us-east-1**
- Full stack deployment
- Active-active for reads
- Active-passive for writes

**Secondary Region: us-west-2**
- Full stack deployment
- DynamoDB global tables for replication
- Route 53 health checks for failover

**Failover Process:**
1. Route 53 detects primary region failure
2. DNS automatically routes to secondary region
3. Secondary region becomes active for writes
4. Primary region recovers and syncs data
5. Failback to primary region (manual or automatic)


## Architecture Decision Records

### ADR-001: Serverless Architecture

**Status**: Accepted

**Context**: Need to build a scalable, cost-effective backend that can handle variable load.

**Decision**: Use AWS serverless services (Lambda, DynamoDB, API Gateway) instead of traditional servers.

**Consequences**:
- ✅ Automatic scaling with no capacity planning
- ✅ Pay-per-use pricing model
- ✅ No server management overhead
- ✅ High availability built-in
- ❌ Cold start latency for Lambda
- ❌ Vendor lock-in to AWS
- ❌ Limited execution time (15 minutes max)

### ADR-002: DynamoDB for Data Storage

**Status**: Accepted

**Context**: Need a database that scales automatically and integrates well with Lambda.

**Decision**: Use DynamoDB instead of RDS or other databases.

**Consequences**:
- ✅ Automatic scaling with on-demand billing
- ✅ Single-digit millisecond latency
- ✅ Built-in replication and backups
- ✅ No server management
- ❌ Limited query capabilities (no joins)
- ❌ Data modeling requires careful planning
- ❌ Eventual consistency by default

### ADR-003: Agent HTTP Interception via Monkey-Patching

**Status**: Accepted

**Context**: Need to intercept HTTP requests without modifying customer code.

**Decision**: Use monkey-patching of the requests library instead of proxy servers.

**Consequences**:
- ✅ Zero code changes required
- ✅ Works in any Python environment
- ✅ Minimal performance overhead
- ✅ Simple deployment
- ❌ Only works with requests library
- ❌ May conflict with other monkey-patches
- ❌ Requires Python 3.11+

### ADR-004: Real-Time Updates via Polling

**Status**: Accepted

**Context**: Dashboard needs to show real-time log updates.

**Decision**: Use polling (every 2 seconds) instead of WebSockets or Server-Sent Events.

**Consequences**:
- ✅ Simple implementation
- ✅ Works with API Gateway REST API
- ✅ No persistent connections
- ✅ Easy to debug
- ❌ Higher latency than WebSockets
- ❌ More API requests (higher cost)
- ❌ Not true real-time

### ADR-005: Risk Score Calculation in Agent

**Status**: Accepted

**Context**: Risk scores need to be calculated for each log entry.

**Decision**: Calculate risk scores in the agent instead of the backend.

**Consequences**:
- ✅ Reduces backend processing load
- ✅ Faster log submission
- ✅ Agent has full context
- ✅ Consistent scoring logic
- ❌ Harder to update scoring algorithm
- ❌ Agent must be updated for changes
- ❌ Cannot retroactively recalculate scores

### ADR-006: No Sensitive Data Storage

**Status**: Accepted

**Context**: Need to detect sensitive data without creating security risks.

**Decision**: Store only data type classifications, never actual sensitive values.

**Consequences**:
- ✅ Eliminates data breach risk
- ✅ Simplifies compliance (GDPR, HIPAA)
- ✅ Reduces storage requirements
- ✅ Faster processing
- ❌ Cannot review actual sensitive data
- ❌ False positives cannot be verified
- ❌ Limited forensic capabilities


## Future Architecture Enhancements

### Planned Improvements

**1. WebSocket Support for Real-Time Updates**
- Replace polling with WebSocket connections
- Reduce latency to <100ms
- Lower API request costs
- Requires API Gateway WebSocket API

**2. Multi-Region Active-Active Deployment**
- Deploy to multiple AWS regions
- DynamoDB global tables for replication
- Route 53 latency-based routing
- Improved availability and performance

**3. Advanced Analytics Pipeline**
- Stream DynamoDB changes to Kinesis
- Process with Lambda or Kinesis Analytics
- Store aggregated data in S3
- Query with Athena for historical analysis

**4. Machine Learning Risk Scoring**
- Train ML model on historical logs
- Detect anomalous patterns
- Adaptive risk scoring
- Requires SageMaker integration

**5. Agent Performance Optimization**
- Implement local caching
- Batch log transmission
- Async processing with queues
- Reduce memory footprint

**6. Enhanced Dashboard Features**
- Custom dashboards and reports
- Alerting rules configuration
- Data export functionality
- User management and RBAC

### Scalability Roadmap

**Phase 1: Current (0-100 customers)**
- Single region deployment
- On-demand DynamoDB billing
- Standard Lambda concurrency
- Basic monitoring

**Phase 2: Growth (100-1,000 customers)**
- Multi-AZ deployment
- Provisioned DynamoDB capacity
- Reserved Lambda concurrency
- Enhanced monitoring and alerting

**Phase 3: Scale (1,000-10,000 customers)**
- Multi-region deployment
- DynamoDB global tables
- Lambda provisioned concurrency
- Advanced analytics pipeline

**Phase 4: Enterprise (10,000+ customers)**
- Global deployment
- Dedicated infrastructure options
- Custom SLAs
- White-label solutions


## Appendix

### Technology Stack Summary

**Agent:**
- Language: Python 3.11
- Dependencies: requests, boto3
- Deployment: Docker, PyPI, Lambda Layer
- Size: ~5MB (packaged)

**Backend:**
- Runtime: AWS Lambda (Python 3.11)
- API: AWS API Gateway (REST)
- Database: Amazon DynamoDB
- Email: AWS SES
- Monitoring: AWS CloudWatch
- Infrastructure: AWS CloudFormation

**Dashboard:**
- Framework: React 18
- Language: TypeScript
- UI Libraries: Recharts, react-force-graph
- Hosting: AWS S3 + CloudFront
- Build Tool: Create React App

### Key Metrics Reference

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Agent Overhead | <10ms | ~5ms | Per request |
| Log Transmission | <500ms | ~200ms | Including network |
| Backend Response | <200ms | ~150ms | API Gateway + Lambda |
| Dashboard Load | <3s | ~2s | Initial page load |
| Real-Time Latency | <2s | ~2s | Polling interval |
| System Availability | 99.9% | 99.95% | Last 30 days |
| Error Rate | <0.1% | 0.05% | Last 30 days |

### Glossary

- **Agent**: Python monitoring component that intercepts AI API calls
- **Backend**: AWS serverless infrastructure for log processing
- **Dashboard**: React web interface for visualization
- **Log Entry**: Record of an intercepted AI API call
- **Risk Score**: Numerical value (0-100) indicating security risk
- **Sensitive Data**: PII, credentials, API keys, passwords
- **Customer**: Organization using the Interpose platform
- **AI Service**: External AI provider (OpenAI, Anthropic, etc.)

### References

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [React Documentation](https://react.dev/)
- [Python Requests Library](https://requests.readthedocs.io/)

### Contact & Support

- **Documentation**: https://docs.interpose.io
- **API Reference**: See `docs/API_REFERENCE.md`
- **Deployment Guide**: See `docs/DEPLOYMENT_GUIDE.md`
- **User Guide**: See `docs/USER_GUIDE.md`
- **Support Email**: support@interpose.io
- **Status Page**: https://status.interpose.io

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Authors**: Interpose Engineering Team  
**License**: MIT

