# CloudTrail Logging Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDTRAIL LOGGING ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

ALL AWS REGIONS
═══════════════

┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│   Sydney   │  │   Tokyo    │  │  Virginia  │  │   London   │
│ ap-south-2 │  │ ap-north-1 │  │  us-east-1 │  │ eu-west-2  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
       │               │                │               │
       │ API Calls     │ API Calls      │ API Calls     │ API Calls
       │               │                │               │
       └───────────────┴────────────────┴───────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │  CloudTrail     │
                    │  Multi-Region   │
                    │     Trail       │
                    └─────────────────┘
                                │
                                │ Logs written every 5 mins
                                ▼
                    ┌─────────────────┐
                    │   S3 Bucket     │
                    │ cloudtrail-logs │
                    │   [Encrypted]   │
                    │   [Versioned]   │
                    └─────────────────┘
                                │
                                │ Read by
                                ▼
                    ┌─────────────────┐
                    │   GuardDuty     │
                    │  (Threat Intel) │
                    └─────────────────┘
```

## CloudTrail Logging Details

**WHO**: All users, roles, services  
**WHAT**: Every API call (CreateUser, TerminateInstance, etc.)  
**WHEN**: Timestamp with millisecond precision  
**WHERE**: Source IP address and region  
**WHY**: Audit, compliance, security investigation

## Architecture Components

### Multi-Region Coverage
- **Sydney (ap-south-2)**: Asia Pacific region coverage
- **Tokyo (ap-north-1)**: Additional Asia Pacific coverage  
- **Virginia (us-east-1)**: Primary US East region
- **London (eu-west-2)**: European region coverage

### CloudTrail Trail
- Centralized logging across all regions
- Captures management and data events
- Real-time API call monitoring
- 5-minute log delivery intervals

### S3 Storage
- **Encryption**: Server-side encryption enabled
- **Versioning**: Object versioning for data protection
- **Retention**: Configurable log retention policies
- **Access Control**: Restricted bucket permissions

### GuardDuty Integration
- Automated threat detection
- Machine learning-based analysis
- Real-time security alerts
- Threat intelligence correlation