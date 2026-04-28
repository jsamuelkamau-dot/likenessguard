# LikenessGuard AWS - Complete Cost Analysis

## 💰 Executive Summary

**For Demo/Testing (Competition)**: **$0.00/month** (100% Free Tier)

**For Light Production Use**: **$5-15/month**

**For Medium Production Use**: **$50-150/month**

**For Heavy Production Use**: **$500-2,000/month**

---

# AWS FREE TIER ANALYSIS

## What is AWS Free Tier?

AWS offers free usage limits for 12 months after you create your account, plus some services that are always free.

### Free Tier Duration
- **12 months**: Most services (Lambda, API Gateway, S3, DynamoDB)
- **Always Free**: Some services have permanent free tiers
- **First Year Only**: Rekognition (face detection)

---

## Free Tier Limits (Your Application)

### 1. AWS Lambda (Serverless Compute)
**Free Tier**:
- 1,000,000 requests per month (FREE)
- 400,000 GB-seconds of compute time per month (FREE)

**Your Usage (Demo/Testing)**:
- Estimated: 10,000 requests/month
- Compute time: ~50,000 GB-seconds/month
- **Cost: $0.00** ✅ (Well within Free Tier)

**Your Usage (Light Production - 100K requests/month)**:
- 100,000 requests/month
- Compute time: ~500,000 GB-seconds/month
- **Cost: $0.00** ✅ (Still within Free Tier)

---

### 2. Amazon API Gateway (REST API)
**Free Tier**:
- 1,000,000 API calls per month (FREE for 12 months)

**Your Usage (Demo/Testing)**:
- Estimated: 10,000 calls/month
- **Cost: $0.00** ✅ (Well within Free Tier)

**Your Usage (Light Production)**:
- 100,000 calls/month
- **Cost: $0.00** ✅ (Still within Free Tier)

---

### 3. Amazon DynamoDB (Database)
**Free Tier**:
- 25 GB of storage (FREE)
- 25 Write Capacity Units (WCU) (FREE)
- 25 Read Capacity Units (RCU) (FREE)
- On-demand pricing: First 2.5 million reads/month FREE

**Your Usage (Demo/Testing)**:
- Storage: <100 MB
- Reads: ~5,000/month
- Writes: ~2,000/month
- **Cost: $0.00** ✅ (Well within Free Tier)

**Your Usage (Light Production)**:
- Storage: <1 GB
- Reads: ~50,000/month
- Writes: ~20,000/month
- **Cost: $0.00** ✅ (Still within Free Tier)

---

### 4. Amazon S3 (File Storage)
**Free Tier**:
- 5 GB of standard storage (FREE)
- 20,000 GET requests (FREE)
- 2,000 PUT requests (FREE)

**Your Usage (Demo/Testing)**:
- Storage: <100 MB (photos deleted after 24 hours)
- GET requests: ~5,000/month
- PUT requests: ~1,000/month
- **Cost: $0.00** ✅ (Well within Free Tier)

**Your Usage (Light Production)**:
- Storage: <500 MB
- GET requests: ~20,000/month
- PUT requests: ~5,000/month
- **Cost: $0.00** ✅ (Still within Free Tier)

---

### 5. Amazon Rekognition (Face Detection)
**Free Tier** (First 12 months only):
- 5,000 images per month (FREE for first year)

**After First Year**:
- $1.00 per 1,000 images

**Your Usage (Demo/Testing)**:
- Estimated: 100 images/month
- **Cost Year 1: $0.00** ✅ (Within Free Tier)
- **Cost Year 2+: $0.10/month** (100 images × $1/1000)

**Your Usage (Light Production)**:
- 1,000 images/month
- **Cost Year 1: $0.00** ✅ (Within Free Tier)
- **Cost Year 2+: $1.00/month**

---

### 6. Amazon CloudWatch (Monitoring)
**Free Tier**:
- 10 custom metrics (FREE)
- 10 alarms (FREE)
- 5 GB of log ingestion (FREE)
- 5 GB of log storage (FREE)

**Your Usage (Demo/Testing)**:
- Metrics: 5 custom metrics
- Alarms: 7 alarms
- Logs: <500 MB/month
- **Cost: $0.00** ✅ (Well within Free Tier)

---

## Total Cost Summary - Free Tier Period

### Demo/Testing Usage (Competition)
| Service | Monthly Usage | Free Tier Limit | Cost |
|---------|---------------|-----------------|------|
| Lambda | 10K requests | 1M requests | **$0.00** |
| API Gateway | 10K calls | 1M calls | **$0.00** |
| DynamoDB | <100 MB | 25 GB | **$0.00** |
| S3 | <100 MB | 5 GB | **$0.00** |
| Rekognition | 100 images | 5K images | **$0.00** |
| CloudWatch | 5 metrics | 10 metrics | **$0.00** |
| **TOTAL** | | | **$0.00/month** ✅ |

### Light Production Usage (100K requests/month)
| Service | Monthly Usage | Free Tier Limit | Cost |
|---------|---------------|-----------------|------|
| Lambda | 100K requests | 1M requests | **$0.00** |
| API Gateway | 100K calls | 1M calls | **$0.00** |
| DynamoDB | <1 GB | 25 GB | **$0.00** |
| S3 | <500 MB | 5 GB | **$0.00** |
| Rekognition | 1K images | 5K images | **$0.00** |
| CloudWatch | 5 metrics | 10 metrics | **$0.00** |
| **TOTAL** | | | **$0.00/month** ✅ |

---

# AFTER FREE TIER (Year 2+)

## Pricing After 12 Months

### Scenario 1: Demo/Testing (Minimal Usage)
**10,000 requests/month, 100 images/month**

| Service | Usage | Unit Price | Monthly Cost |
|---------|-------|------------|--------------|
| Lambda | 10K requests | $0.20 per 1M | $0.002 |
| Lambda Compute | 50K GB-sec | $0.0000166667 per GB-sec | $0.83 |
| API Gateway | 10K calls | $3.50 per 1M | $0.035 |
| DynamoDB | 100 MB storage | $0.25 per GB | $0.025 |
| DynamoDB | 5K reads | $0.25 per 1M | $0.001 |
| DynamoDB | 2K writes | $1.25 per 1M | $0.003 |
| S3 | 100 MB storage | $0.023 per GB | $0.002 |
| S3 | 5K GET | $0.0004 per 1K | $0.002 |
| S3 | 1K PUT | $0.005 per 1K | $0.005 |
| Rekognition | 100 images | $1.00 per 1K | $0.10 |
| CloudWatch | 5 metrics | $0.30 per metric | $1.50 |
| CloudWatch Logs | 500 MB | $0.50 per GB | $0.25 |
| **TOTAL** | | | **~$2.75/month** |

---

### Scenario 2: Light Production (100K requests/month)
**100,000 requests/month, 1,000 images/month**

| Service | Usage | Unit Price | Monthly Cost |
|---------|-------|------------|--------------|
| Lambda | 100K requests | $0.20 per 1M | $0.02 |
| Lambda Compute | 500K GB-sec | $0.0000166667 per GB-sec | $8.33 |
| API Gateway | 100K calls | $3.50 per 1M | $0.35 |
| DynamoDB | 1 GB storage | $0.25 per GB | $0.25 |
| DynamoDB | 50K reads | $0.25 per 1M | $0.013 |
| DynamoDB | 20K writes | $1.25 per 1M | $0.025 |
| S3 | 500 MB storage | $0.023 per GB | $0.012 |
| S3 | 20K GET | $0.0004 per 1K | $0.008 |
| S3 | 5K PUT | $0.005 per 1K | $0.025 |
| Rekognition | 1K images | $1.00 per 1K | $1.00 |
| CloudWatch | 5 metrics | $0.30 per metric | $1.50 |
| CloudWatch Logs | 2 GB | $0.50 per GB | $1.00 |
| **TOTAL** | | | **~$12.50/month** |

---

### Scenario 3: Medium Production (500K requests/month)
**500,000 requests/month, 5,000 images/month**

| Service | Usage | Unit Price | Monthly Cost |
|---------|-------|------------|--------------|
| Lambda | 500K requests | $0.20 per 1M | $0.10 |
| Lambda Compute | 2.5M GB-sec | $0.0000166667 per GB-sec | $41.67 |
| API Gateway | 500K calls | $3.50 per 1M | $1.75 |
| DynamoDB | 5 GB storage | $0.25 per GB | $1.25 |
| DynamoDB | 250K reads | $0.25 per 1M | $0.063 |
| DynamoDB | 100K writes | $1.25 per 1M | $0.125 |
| S3 | 2 GB storage | $0.023 per GB | $0.046 |
| S3 | 100K GET | $0.0004 per 1K | $0.04 |
| S3 | 25K PUT | $0.005 per 1K | $0.125 |
| Rekognition | 5K images | $1.00 per 1K | $5.00 |
| CloudWatch | 5 metrics | $0.30 per metric | $1.50 |
| CloudWatch Logs | 10 GB | $0.50 per GB | $5.00 |
| **TOTAL** | | | **~$56.50/month** |

---

### Scenario 4: Heavy Production (2M requests/month)
**2,000,000 requests/month, 20,000 images/month**

| Service | Usage | Unit Price | Monthly Cost |
|---------|-------|------------|--------------|
| Lambda | 2M requests | $0.20 per 1M | $0.40 |
| Lambda Compute | 10M GB-sec | $0.0000166667 per GB-sec | $166.67 |
| API Gateway | 2M calls | $3.50 per 1M | $7.00 |
| DynamoDB | 20 GB storage | $0.25 per GB | $5.00 |
| DynamoDB | 1M reads | $0.25 per 1M | $0.25 |
| DynamoDB | 400K writes | $1.25 per 1M | $0.50 |
| S3 | 8 GB storage | $0.023 per GB | $0.18 |
| S3 | 400K GET | $0.0004 per 1K | $0.16 |
| S3 | 100K PUT | $0.005 per 1K | $0.50 |
| Rekognition | 20K images | $1.00 per 1K | $20.00 |
| CloudWatch | 5 metrics | $0.30 per metric | $1.50 |
| CloudWatch Logs | 40 GB | $0.50 per GB | $20.00 |
| **TOTAL** | | | **~$222/month** |

---

# COST OPTIMIZATION TIPS

## 1. Stay Within Free Tier (First Year)
- Monitor usage in AWS Billing Dashboard
- Set up billing alerts at 50%, 75%, 90% of Free Tier limits
- Delete old CloudWatch logs regularly
- Use S3 lifecycle policies (already configured - 24-hour deletion)

## 2. Optimize Lambda Functions
- Reduce memory allocation if possible (currently 512 MB)
- Optimize code for faster execution
- Use Lambda layers for shared dependencies
- Consider reserved concurrency for predictable workloads

## 3. Optimize DynamoDB
- Use on-demand pricing for unpredictable workloads (already configured)
- Switch to provisioned capacity for predictable workloads (cheaper)
- Enable auto-scaling for provisioned capacity
- Use DynamoDB TTL for automatic data expiration (already configured)

## 4. Optimize S3
- Use lifecycle policies to delete old files (already configured)
- Use S3 Intelligent-Tiering for infrequently accessed data
- Compress files before upload
- Use CloudFront CDN for frequently accessed files

## 5. Optimize Rekognition
- Batch process images when possible
- Cache face detection results
- Use quality thresholds to avoid processing poor images
- Consider alternative face detection libraries for high volume

## 6. Optimize CloudWatch
- Reduce log retention period (currently 90 days)
- Filter logs to reduce ingestion
- Use log sampling for high-volume applications
- Delete unused custom metrics

---

# BILLING ALERTS SETUP

## Set Up Billing Alerts (Recommended)

### Step 1: Enable Billing Alerts
1. Log in to AWS Console
2. Click your account name (top-right)
3. Click "Billing and Cost Management"
4. Click "Billing preferences" (left sidebar)
5. Check "Receive Billing Alerts"
6. Click "Save preferences"

### Step 2: Create CloudWatch Alarm
1. Go to CloudWatch service
2. Click "Alarms" → "Billing"
3. Click "Create alarm"
4. Set threshold: $5 (or your preferred amount)
5. Add your email for notifications
6. Click "Create alarm"

### Recommended Alerts
- **$1 alert**: Early warning
- **$5 alert**: Moderate usage
- **$10 alert**: High usage
- **$25 alert**: Very high usage

---

# COST COMPARISON

## LikenessGuard vs Alternatives

### Option 1: LikenessGuard on AWS
- **Year 1**: $0/month (Free Tier)
- **Year 2+**: $2.75-$12.50/month (light usage)
- **Pros**: Scalable, serverless, no maintenance
- **Cons**: Rekognition costs after year 1

### Option 2: Self-Hosted (VPS)
- **Cost**: $5-20/month (DigitalOcean, Linode)
- **Pros**: Predictable pricing
- **Cons**: Requires server maintenance, less scalable

### Option 3: Heroku/Platform-as-a-Service
- **Cost**: $7-25/month
- **Pros**: Easy deployment
- **Cons**: Less flexible, higher cost at scale

### Option 4: Google Cloud / Azure
- **Cost**: Similar to AWS
- **Pros**: Alternative cloud provider
- **Cons**: Similar pricing structure

**Winner for Demo/Competition**: LikenessGuard on AWS (FREE for first year)

---

# REAL-WORLD COST EXAMPLES

## Example 1: Competition Demo (1 month)
- **Usage**: 1,000 requests, 50 images
- **Cost**: $0.00 (Free Tier)
- **Verdict**: Perfect for competition ✅

## Example 2: Small Startup (6 months)
- **Usage**: 50K requests/month, 500 images/month
- **Cost**: $0.00 (Free Tier for first year)
- **Verdict**: Great for MVP ✅

## Example 3: Growing Startup (Year 2)
- **Usage**: 200K requests/month, 2K images/month
- **Cost**: ~$25/month
- **Verdict**: Affordable for growing business ✅

## Example 4: Established Company
- **Usage**: 1M requests/month, 10K images/month
- **Cost**: ~$150/month
- **Verdict**: Reasonable for established business ✅

---

# COST MONITORING COMMANDS

## Check Current Costs

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=SERVICE

# Get Free Tier usage
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UsageQuantity" \
  --filter file://free-tier-filter.json
```

## Monitor Specific Services

```bash
# Lambda costs
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["AWS Lambda"]}}'

# Rekognition costs
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Rekognition"]}}'
```

---

# FREQUENTLY ASKED QUESTIONS

## Q: Will I be charged during the competition?
**A**: No, if you stay within Free Tier limits (which you will for demo usage).

## Q: What happens after 12 months?
**A**: You'll start paying for usage above Free Tier limits. For light usage, this is $2-15/month.

## Q: Can I avoid Rekognition costs?
**A**: Yes, you could replace Rekognition with open-source face detection libraries (like OpenCV), but this requires more development work.

## Q: How do I prevent unexpected charges?
**A**: Set up billing alerts, monitor Free Tier usage, and delete the stack when not in use.

## Q: What if I exceed Free Tier limits?
**A**: You'll be charged for usage above limits. Set up billing alerts to avoid surprises.

## Q: Can I pause the application to save costs?
**A**: Yes, delete the CloudFormation stack when not in use. Redeploy when needed (takes 10 minutes).

---

# COST SUMMARY TABLE

| Usage Level | Requests/Month | Images/Month | Year 1 Cost | Year 2+ Cost |
|-------------|----------------|--------------|-------------|--------------|
| **Demo** | 10K | 100 | **$0.00** | **$2.75** |
| **Light** | 100K | 1K | **$0.00** | **$12.50** |
| **Medium** | 500K | 5K | **$0.00** | **$56.50** |
| **Heavy** | 2M | 20K | **$0.00** | **$222** |

---

# FINAL RECOMMENDATION

## For Competition/Demo
**Cost**: **$0.00/month** ✅

**Action**: Deploy and use freely. You're well within Free Tier limits.

## For Production (After Competition)
**Year 1**: **$0.00/month** (Free Tier)

**Year 2+**: **$2.75-$12.50/month** (light usage)

**Action**: Monitor usage, set up billing alerts, optimize as needed.

---

**Date**: February 13, 2026
**Pricing Source**: AWS Pricing Calculator (February 2026)
**Disclaimer**: Prices may vary by region and are subject to change. Always check current AWS pricing.
