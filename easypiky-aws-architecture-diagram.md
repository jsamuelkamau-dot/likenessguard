# 🏗️ EasyPiky Browser Extension - AWS Architecture Diagram

## 📊 **Professional AWS Architecture Overview**

```
                                    EasyPiky Anti-Phishing Extension
                                         AWS Serverless Backend
                                                                                                    
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          🌐 USERS & WEB BROWSERS                                                   │
│                                                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                        │
│  │      👤         │    │      👤         │    │      👤         │    │      👤         │                        │
│  │   Chrome        │    │     Edge        │    │   Firefox       │    │   Browser       │                        │
│  │   Extension     │    │   Extension     │    │   Extension     │    │   Extension     │                        │
│  │                 │    │                 │    │                 │    │                 │                        │
│  │ • Link Analysis │    │ • Link Analysis │    │ • Link Analysis │    │ • Link Analysis │                        │
│  │ • Local Storage │    │ • Local Storage │    │ • Local Storage │    │ • Local Storage │                        │
│  │ • Privacy-First │    │ • Privacy-First │    │ • Privacy-First │    │ • Privacy-First │                        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                        │
│           │                       │                       │                       │                               │
│           │                       │                       │                       │                               │
│           └───────────────────────┼───────────────────────┼───────────────────────┘                               │
│                                   │                       │                                                       │
│                                   │    HTTPS/TLS 1.3     │                                                       │
│                                   │  (Trial Validation)   │                                                       │
│                                   │                       │                                                       │
└───────────────────────────────────┼───────────────────────┼───────────────────────────────────────────────────────┘
                                    │                       │
                                    │         ①             │
                                    │   POST /validate      │
                                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           ☁️ AWS CLOUD                                                             │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                    Serverless Backend                                                          │ │
│  │                                                                                                                 │ │
│  │                                                                                                                 │ │
│  │    ①                                    ②                                    ③                                │ │
│  │  ┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐                    │ │
│  │  │                 │                │                 │                │                 │                    │ │
│  │  │   Amazon API    │   ──────────►  │   AWS Lambda    │   ──────────►  │   Amazon        │                    │ │
│  │  │   Gateway       │                │   Function      │                │   DynamoDB      │                    │ │
│  │  │                 │                │                 │                │                 │                    │ │
│  │  │ REST Endpoint   │                │ Trial Token     │                │ Token Storage   │                    │ │
│  │  │ Rate Limiting   │                │ Validator       │                │ Anonymous Data  │                    │ │
│  │  │ CORS Enabled    │                │ Node.js 18.x    │                │ 14-day TTL      │                    │ │
│  │  │ HTTPS Only      │                │ 128MB Memory    │                │ Pay-per-request │                    │ │
│  │  └─────────────────┘                └─────────────────┘                └─────────────────┘                    │ │
│  │                                                                                                                 │ │
│  │  api.easypiky.com                   easypiky-validator                  easypiky-tokens                        │ │
│  │                                                                                                                 │ │
│  │                                                                                                                 │ │
│  │                                              ④                                                                 │ │
│  │  ┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐                    │ │
│  │  │                 │                │                 │                │                 │                    │ │
│  │  │   Amazon        │   ──────────►  │   Amazon        │   ──────────►  │   Amazon SNS    │                    │ │
│  │  │   CloudWatch    │                │   CloudTrail    │                │   Notifications │                    │ │
│  │  │                 │                │                 │                │                 │                    │ │
│  │  │ Metrics & Logs  │                │ Audit Logging   │                │ Alert Teams     │                    │ │
│  │  │ Performance     │                │ Security Events │                │ Status Updates  │                    │ │
│  │  │ Error Tracking  │                │ Compliance      │                │ Incident Mgmt   │                    │ │
│  │  │ Cost Monitoring │                │ API Calls       │                │ Maintenance     │                    │ │
│  │  └─────────────────┘                └─────────────────┘                └─────────────────┘                    │ │
│  │                                                                                                                 │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                      🔒 Security Layer                                                         │ │
│  │                                                                                                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                    │ │
│  │  │                 │    │                 │    │                 │    │                 │                    │ │
│  │  │   AWS WAF       │    │   IAM Roles     │    │   AWS KMS       │    │   VPC           │                    │ │
│  │  │                 │    │   & Policies    │    │   Encryption    │    │   (Optional)    │                    │ │
│  │  │                 │    │                 │    │                 │    │                 │                    │ │
│  │  │ DDoS Protection │    │ Least Privilege │    │ Data at Rest    │    │ Network Isolation│                   │ │
│  │  │ Rate Limiting   │    │ Cross-Service   │    │ Data in Transit │    │ Private Subnets │                    │ │
│  │  │ Geo Blocking    │    │ Audit Trail     │    │ Key Rotation    │    │ Security Groups │                    │ │
│  │  │ Bot Detection   │    │ Role-Based      │    │ Compliance      │    │ Network ACLs    │                    │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                      ▲
                                                      │
                                                      │ Response
                                                      │ { "valid": true }
                                                      │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        🔄 WORKFLOW PROCESS                                                         │
│                                                                                                                     │
│  ① Browser Extension → API Gateway                                                                                 │
│     • Anonymous trial token sent via HTTPS                                                                         │
│     • Rate limited to prevent abuse                                                                                │
│     • CORS headers for browser compatibility                                                                       │
│                                                                                                                     │
│  ② API Gateway → Lambda Function                                                                                   │
│     • Token validation request forwarded                                                                           │
│     • Input sanitization and validation                                                                            │
│     • Error handling and logging                                                                                   │
│                                                                                                                     │
│  ③ Lambda Function → DynamoDB                                                                                      │
│     • Query token existence and expiration                                                                         │
│     • Update last validation timestamp                                                                             │
│     • Return validation result                                                                                     │
│                                                                                                                     │
│  ④ Monitoring & Security                                                                                           │
│     • CloudWatch metrics and alarms                                                                                │
│     • CloudTrail audit logging                                                                                     │
│     • SNS notifications for incidents                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         💰 COST STRUCTURE                                                          │
│                                                                                                                     │
│  📊 Monthly Costs (Within AWS Free Tier):                                                                          │
│                                                                                                                     │
│  • API Gateway: $0.00/month (1M requests free)                                                                     │
│  • Lambda: $0.00/month (1M requests + 400K GB-seconds free)                                                        │
│  • DynamoDB: $0.00/month (25GB storage + 25 RCU/WCU free)                                                          │
│  • CloudWatch: $0.00/month (basic metrics included)                                                                │
│  • CloudTrail: $0.00/month (90-day free tier)                                                                      │
│                                                                                                                     │
│  🎯 Total: $0.00/month for up to 10,000 users                                                                      │
│                                                                                                                     │
│  📈 Scaling Costs:                                                                                                  │
│  • 100K users: ~$25/month                                                                                          │
│  • 1M users: ~$150/month                                                                                           │
│  • 10M users: ~$800/month                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      🎯 KEY BENEFITS                                                               │
│                                                                                                                     │
│  ✅ Privacy-First Architecture                                                                                     │
│     • 100% client-side URL analysis                                                                                │
│     • No personal data in AWS                                                                                      │
│     • Anonymous trial tokens only                                                                                  │
│                                                                                                                     │
│  ✅ Ultra-Low Operating Costs                                                                                      │
│     • Serverless pay-per-use model                                                                                 │
│     • AWS Free Tier eligible                                                                                       │
│     • No fixed infrastructure costs                                                                                │
│                                                                                                                     │
│  ✅ Enterprise-Grade Security                                                                                      │
│     • End-to-end encryption                                                                                        │
│     • Multi-layer security controls                                                                                │
│     • Comprehensive audit logging                                                                                  │
│                                                                                                                     │
│  ✅ High Availability & Scalability                                                                                │
│     • Multi-AZ deployment                                                                                          │
│     • Auto-scaling capabilities                                                                                    │
│     • 99.99% uptime SLA                                                                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          🌐 INTERNET / PUBLIC WEB                                                  │
│                                                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                        │
│  │   🏢 Gmail      │    │   🏢 Outlook    │    │   🏢 Yahoo      │    │   🌐 Websites   │                        │
│  │   Web Client    │    │   Web Client    │    │   Web Client    │    │   & Social      │                        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                        │
│           │                       │                       │                       │                               │
└───────────┼───────────────────────┼───────────────────────┼───────────────────────┼───────────────────────────────┘
            │                       │                       │                       │
            ▼                       ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      🖥️ USER'S BROWSER (Chrome/Edge)                                              │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                  📦 EASYPIKY BROWSER EXTENSION                                                 │ │
│  │                                                                                                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                    │ │
│  │  │  📄 Content     │    │  ⚙️ Background   │    │  🎨 Popup UI    │    │  ⚙️ Options     │                    │ │
│  │  │  Script         │    │  Service Worker │    │  Interface      │    │  Page           │                    │ │
│  │  │                 │    │                 │    │                 │    │                 │                    │ │
│  │  │ • Link Click    │    │ • URL Analysis │    │ • Trial Status  │    │ • Settings      │                    │ │
│  │  │   Interception  │    │ • Risk Scoring  │    │ • Statistics    │    │ • Domain Mgmt   │                    │ │
│  │  │ • Modal Display │    │ • Trial Mgmt    │    │ • Quick Actions │    │ • Preferences   │                    │ │
│  │  │ • User Actions  │    │ • Storage Mgmt  │    │                 │    │                 │                    │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                    │ │
│  │           │                       │                       │                       │                           │ │
│  │           │              ┌────────┼───────────────────────┼───────────────────────┼────────┐                  │ │
│  │           │              │        │                       │                       │        │                  │ │
│  │           │              │        ▼                       ▼                       ▼        │                  │ │
│  │           │              │  ┌─────────────────────────────────────────────────────────────┐ │                  │ │
│  │           │              │  │              💾 LOCAL BROWSER STORAGE                       │ │                  │ │
│  │           │              │  │                                                             │ │                  │ │
│  │           │              │  │  🔒 Encrypted Storage (chrome.storage.local):              │ │                  │ │
│  │           │              │  │  • User Preferences & Settings                             │ │                  │ │
│  │           │              │  │  • Trusted Domains List                                    │ │                  │ │
│  │           │              │  │  • Blocked Domains List                                    │ │                  │ │
│  │           │              │  │  • Email Hash Database (Privacy-Safe)                     │ │                  │ │
│  │           │              │  │  • Analysis Cache (5-minute TTL)                          │ │                  │ │
│  │           │              │  │  • Trial Token & Status                                   │ │                  │ │
│  │           │              │  │                                                             │ │                  │ │
│  │           │              │  │  🧠 Analysis Engines (100% Client-Side):                  │ │                  │ │
│  │           │              │  │  • URL Structure Analyzer                                  │ │                  │ │
│  │           │              │  │  • Brand Protection Database (1000+ brands)               │ │                  │ │
│  │           │              │  │  • Domain Entropy Calculator                               │ │                  │ │
│  │           │              │  │  • Certificate Validator                                   │ │                  │ │
│  │           │              │  │  • Homograph Detection Engine                              │ │                  │ │
│  │           │              │  │  • Behavioral Pattern Analyzer                             │ │                  │ │
│  │           │              │  └─────────────────────────────────────────────────────────────┘ │                  │ │
│  │           │              └────────────────────────────────────────────────────────────────────┘                  │ │
│  │           │                                                                                                       │ │
│  │           └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│  │                                                                                                                     │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  │                                    🔐 PRIVACY-FIRST DESIGN                                                    │ │
│  │  │                                                                                                                 │ │
│  │  │  ✅ 100% Client-Side URL Analysis    ❌ No Email Content Reading                                              │ │
│  │  │  ✅ Local Storage Only               ❌ No Browsing History Tracking                                          │ │
│  │  │  ✅ Anonymous Trial Tokens           ❌ No Personal Data Collection                                           │ │
│  │  │  ✅ Offline Functionality            ❌ No User Identification                                                │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│                                                      │                                                               │
│                                                      │ HTTPS Only                                                    │
│                                                      │ (Trial Token Validation Only)                                │
│                                                      ▼                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                      🔒 TLS 1.3 Encrypted Connection
                                                      📡 api.easypiky.com
                                                             │
                                                             ▼

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           ☁️ AWS CLOUD INFRASTRUCTURE                                              │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                        🌐 AWS REGIONS                                                          │ │
│  │                                    (Multi-AZ Deployment)                                                       │ │
│  │                                                                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                                   🚪 API GATEWAY                                                           │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  📍 Endpoint: https://api.easypiky.com                                                                     │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🔧 Configuration:                          📊 Features:                                                   │ │ │
│  │  │  • REST API                                 • Rate Limiting (1000 req/min)                                │ │ │
│  │  │  • HTTPS Only (TLS 1.3)                    • Request/Response Logging                                     │ │ │
│  │  │  • CORS Enabled                            • API Key Management                                            │ │ │
│  │  │  • Edge Optimized                          • Throttling Protection                                         │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  📋 API Routes:                                                                                             │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │ │
│  │  │  │  POST /trial/validate                                                                                  │ │ │ │
│  │  │  │  ├── Request: { "token": "trial_ABC123..." }                                                          │ │ │ │
│  │  │  │  ├── Response: { "valid": true, "expiresAt": 1234567890 }                                             │ │ │ │
│  │  │  │  └── Purpose: Validate anonymous trial tokens                                                          │ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  GET /health                                                                                            │ │ │ │
│  │  │  │  ├── Response: { "status": "healthy", "timestamp": 1234567890 }                                       │ │ │ │
│  │  │  │  └── Purpose: Health check endpoint                                                                    │ │ │ │
│  │  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                      │                                                         │ │
│  │                                                      │ Invoke                                                  │ │
│  │                                                      ▼                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                                    ⚡ AWS LAMBDA                                                           │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🏷️ Function: easypiky-trial-validator                                                                     │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🔧 Configuration:                          📊 Performance:                                                │ │ │
│  │  │  • Runtime: Node.js 18.x                   • Memory: 128 MB                                               │ │ │
│  │  │  • Timeout: 30 seconds                     • Cold Start: <500ms                                           │ │ │
│  │  │  • Concurrent Executions: 100              • Warm Execution: <50ms                                        │ │ │
│  │  │  • Environment: Production                 • Error Rate: <0.1%                                            │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🧠 Function Logic:                                                                                         │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │ │
│  │  │  │  1. 📥 Receive trial token from API Gateway                                                            │ │ │ │
│  │  │  │  2. 🔍 Validate token format (trial_[32-char-string])                                                  │ │ │ │
│  │  │  │  3. 🗃️ Query DynamoDB for token existence                                                               │ │ │ │
│  │  │  │  4. ⏰ Check token expiration timestamp                                                                 │ │ │ │
│  │  │  │  5. 📊 Update last validation timestamp                                                                │ │ │ │
│  │  │  │  6. 📤 Return validation result                                                                        │ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  🔒 Security Features:                                                                                  │ │ │ │
│  │  │  │  • Input validation & sanitization                                                                     │ │ │ │
│  │  │  │  • Rate limiting per token                                                                             │ │ │ │
│  │  │  │  • Error handling & logging                                                                            │ │ │ │
│  │  │  │  • No personal data processing                                                                         │ │ │ │
│  │  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                      │                                                         │ │
│  │                                                      │ Read/Write                                              │ │
│  │                                                      ▼                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                                   🗃️ AMAZON DYNAMODB                                                       │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🏷️ Table: easypiky-trial-tokens                                                                           │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  🔧 Configuration:                          📊 Performance:                                                │ │ │
│  │  │  • Billing Mode: Pay-per-request           • Read Capacity: Auto-scaling                                  │ │ │
│  │  │  • Encryption: At rest + in transit        • Write Capacity: Auto-scaling                                 │ │ │
│  │  │  • Backup: Point-in-time recovery          • Latency: <10ms (single-digit)                               │ │ │
│  │  │  • Multi-AZ: Enabled                       • Availability: 99.99%                                         │ │ │
│  │  │                                                                                                             │ │ │
│  │  │  📋 Table Schema:                                                                                           │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  🔑 Primary Key: token (String)                                                                        │ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  📊 Attributes:                                                                                         │ │ │ │
│  │  │  │  ├── token: "trial_ABC123DEF456..."     (Partition Key)                                                │ │ │ │
│  │  │  │  ├── expiresAt: 1234567890              (Unix timestamp)                                               │ │ │ │
│  │  │  │  ├── createdAt: 1234567890              (Unix timestamp)                                               │ │ │ │
│  │  │  │  ├── lastValidation: 1234567890         (Unix timestamp)                                               │ │ │ │
│  │  │  │  ├── isActive: true                     (Boolean)                                                      │ │ │ │
│  │  │  │  └── validationCount: 42                (Number)                                                       │ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  🗂️ Indexes:                                                                                            │ │ │ │
│  │  │  │  └── GSI: expiresAt-index (for cleanup jobs)                                                           │ │ │ │
│  │  │  │                                                                                                         │ │ │ │
│  │  │  │  🔒 Privacy Features:                                                                                   │ │ │ │
│  │  │  │  • No personal identifiers                                                                             │ │ │ │
│  │  │  │  • Anonymous tokens only                                                                               │ │ │ │
│  │  │  │  • Automatic expiration (14 days)                                                                      │ │ │ │
│  │  │  │  • No user tracking or correlation                                                                     │ │ │ │
│  │  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                    📊 MONITORING & LOGGING                                                     │ │
│  │                                                                                                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                    │ │
│  │  │  📈 CloudWatch  │    │  🔍 CloudTrail  │    │  ⚠️ CloudWatch   │    │  📧 SNS         │                    │ │
│  │  │  Metrics        │    │  Audit Logs    │    │  Alarms         │    │  Notifications  │                    │ │
│  │  │                 │    │                 │    │                 │    │                 │                    │ │
│  │  │ • API Requests  │    │ • API Calls     │    │ • Error Rate    │    │ • Alert Teams   │                    │ │
│  │  │ • Lambda Exec   │    │ • Data Access   │    │ • Latency       │    │ • Status Updates│                    │ │
│  │  │ • DDB Metrics   │    │ • Config Chg    │    │ • Availability  │    │ • Maintenance   │                    │ │
│  │  │ • Error Rates   │    │ • Security      │    │ • Cost Alerts   │    │ • Incidents     │                    │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                      🔒 SECURITY & COMPLIANCE                                                  │ │
│  │                                                                                                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                    │ │
│  │  │  🛡️ WAF         │    │  🔐 IAM Roles   │    │  🔑 KMS         │    │  🏛️ VPC         │                    │ │
│  │  │  Protection     │    │  & Policies     │    │  Encryption     │    │  (Optional)     │                    │ │
│  │  │                 │    │                 │    │                 │    │                 │                    │ │
│  │  │ • Rate Limiting │    │ • Least Priv    │    │ • Data at Rest  │    │ • Network Iso   │                    │ │
│  │  │ • DDoS Protect  │    │ • Role-based    │    │ • Data Transit  │    │ • Private Subs  │                    │ │
│  │  │ • Geo Blocking  │    │ • Cross-service │    │ • Key Rotation  │    │ • Security Grps │                    │ │
│  │  │ • Bot Detection │    │ • Audit Trail   │    │ • Compliance    │    │ • NACLs         │                    │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        🔄 WORKFLOW SEQUENCE                                                        │
│                                                                                                                     │
│  1️⃣ User installs EasyPiky extension                                                                              │
│  2️⃣ Extension generates anonymous trial token                                                                     │
│  3️⃣ Token stored locally in browser (encrypted)                                                                   │
│  4️⃣ Extension validates token with AWS (once per 24h)                                                             │
│  5️⃣ User clicks suspicious link on webpage                                                                        │
│  6️⃣ Content script intercepts click event                                                                         │
│  7️⃣ Background worker analyzes URL (100% client-side)                                                             │
│  8️⃣ Risk assessment completed locally                                                                             │
│  9️⃣ Modal displayed with security warning                                                                         │
│  🔟 User makes informed decision (Trust/Block/Proceed)                                                             │
│                                                                                                                     │
│  🔄 Trial validation happens independently:                                                                        │
│  • Every 24 hours (automatic background check)                                                                     │
│  • Only sends anonymous token to AWS                                                                               │
│  • No URL analysis data sent to cloud                                                                              │
│  • Extension works offline for cached decisions                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         💰 COST OPTIMIZATION                                                       │
│                                                                                                                     │
│  📊 Monthly Cost Breakdown (Estimated):                                                                            │
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                                                 │ │
│  │  🌐 API Gateway:                                                                                               │ │
│  │  ├── Free Tier: 1M requests/month                                                                              │ │
│  │  ├── Expected: <10K requests/month                                                                             │ │
│  │  └── Cost: $0.00/month ✅                                                                                      │ │
│  │                                                                                                                 │ │
│  │  ⚡ Lambda:                                                                                                     │ │
│  │  ├── Free Tier: 1M requests + 400K GB-seconds/month                                                           │ │
│  │  ├── Expected: <10K invocations/month                                                                          │ │
│  │  └── Cost: $0.00/month ✅                                                                                      │ │
│  │                                                                                                                 │ │
│  │  🗃️ DynamoDB:                                                                                                  │ │
│  │  ├── Free Tier: 25GB storage + 25 RCU/WCU                                                                     │ │
│  │  ├── Expected: <1GB storage, minimal R/W                                                                      │ │
│  │  └── Cost: $0.00/month ✅                                                                                      │ │
│  │                                                                                                                 │ │
│  │  📊 Monitoring:                                                                                                │ │
│  │  ├── CloudWatch: Basic metrics included                                                                       │ │
│  │  ├── CloudTrail: 90-day free tier                                                                             │ │
│  │  └── Cost: $0.00/month ✅                                                                                      │ │
│  │                                                                                                                 │ │
│  │  🎯 Total Monthly Cost: $0.00 (within AWS Free Tier)                                                          │ │
│  │                                                                                                                 │ │
│  │  📈 Scaling Projections:                                                                                       │ │
│  │  ├── 10K Users: ~$5/month                                                                                     │ │
│  │  ├── 100K Users: ~$25/month                                                                                   │ │
│  │  └── 1M Users: ~$150/month                                                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      🎯 KEY ARCHITECTURAL BENEFITS                                                 │
│                                                                                                                     │
│  ✅ Privacy-First Design:                                                                                          │
│     • 100% client-side URL analysis                                                                                │
│     • No personal data in AWS                                                                                      │
│     • Anonymous trial tokens only                                                                                  │
│                                                                                                                     │
│  ✅ Ultra-Low Operating Costs:                                                                                     │
│     • Serverless architecture                                                                                      │
│     • Pay-per-use pricing model                                                                                    │
│     • AWS Free Tier eligible                                                                                       │
│                                                                                                                     │
│  ✅ High Availability & Scalability:                                                                               │
│     • Multi-AZ deployment                                                                                          │
│     • Auto-scaling capabilities                                                                                    │
│     • 99.99% uptime SLA                                                                                            │
│                                                                                                                     │
│  ✅ Security & Compliance:                                                                                         │
│     • End-to-end encryption                                                                                        │
│     • IAM role-based access                                                                                        │
│     • Comprehensive audit logging                                                                                  │
│                                                                                                                     │
│  ✅ Operational Excellence:                                                                                        │
│     • Comprehensive monitoring                                                                                     │
│     • Automated alerting                                                                                           │
│     • Infrastructure as Code ready                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 **Architecture Summary**

This professional AWS architecture diagram illustrates the EasyPiky browser extension's minimal, privacy-first cloud infrastructure. The design emphasizes:

### **🔒 Privacy-First Approach**
- **100% client-side analysis** - No URL data sent to AWS
- **Anonymous trial tokens** - No personal identification
- **Local storage only** - All user data stays in browser

### **☁️ Minimal AWS Footprint**
- **API Gateway** - Single endpoint for trial validation
- **Lambda** - Stateless token validation logic
- **DynamoDB** - Anonymous token storage only

### **💰 Cost-Effective Design**
- **$0/month** within AWS Free Tier limits
- **Serverless architecture** - Pay only for usage
- **Scales efficiently** - From 1 to 1M+ users

### **🛡️ Enterprise-Grade Security**
- **Multi-AZ deployment** for high availability
- **End-to-end encryption** for all communications
- **Comprehensive monitoring** and audit logging

This architecture perfectly balances privacy, performance, and cost-effectiveness while maintaining enterprise-level security and scalability.