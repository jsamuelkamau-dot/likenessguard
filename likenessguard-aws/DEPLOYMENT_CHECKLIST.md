# LikenessGuard AWS - Deployment Checklist

Use this checklist to track your deployment progress. Check off each item as you complete it.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### AWS Account Setup
- [ ] Created AWS account at https://aws.amazon.com
- [ ] Verified email address
- [ ] Added credit card (for verification)
- [ ] Can log in to AWS Console at https://console.aws.amazon.com

### Software Installation
- [ ] Installed AWS CLI
  - [ ] Downloaded from https://awscli.amazonaws.com/AWSCLIV2.msi
  - [ ] Ran installer
  - [ ] Verified with `aws --version` command
- [ ] Installed AWS SAM CLI
  - [ ] Downloaded SAM CLI installer
  - [ ] Ran installer
  - [ ] Verified with `sam --version` command
- [ ] Installed Python 3.11+
  - [ ] Verified with `python --version` command

### AWS Configuration
- [ ] Created IAM access keys
  - [ ] Logged into AWS Console
  - [ ] Went to IAM service
  - [ ] Created access key
  - [ ] Downloaded CSV file with keys
  - [ ] Saved keys in secure location
- [ ] Configured AWS CLI
  - [ ] Ran `aws configure` command
  - [ ] Entered Access Key ID
  - [ ] Entered Secret Access Key
  - [ ] Set region to `us-east-1`
  - [ ] Set output format to `json`
  - [ ] Verified with `aws sts get-caller-identity`

### Project Setup
- [ ] Located project folder
- [ ] Opened Command Prompt/PowerShell
- [ ] Navigated to `likenessguard-aws` folder
- [ ] Verified folder contents with `dir` command
- [ ] Installed Python dependencies
  - [ ] Ran `pip install -r requirements.txt`
  - [ ] Ran `pip install -r requirements-dev.txt`

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Opened PowerShell as Administrator
- [ ] Navigated to project folder
- [ ] Confirmed AWS credentials are configured
- [ ] Checked internet connection

### Deployment Execution
- [ ] Ran deployment script: `.\deploy.ps1`
- [ ] Watched for errors during:
  - [ ] AWS credentials check
  - [ ] Deployment bucket creation/check
  - [ ] Python dependencies installation
  - [ ] SAM build
  - [ ] SAM package
  - [ ] SAM deploy
- [ ] Deployment completed successfully
- [ ] Noted API endpoint URL
- [ ] Noted resource names (buckets, tables)

### Post-Deployment Verification
- [ ] Checked CloudFormation stack
  - [ ] Logged into AWS Console
  - [ ] Went to CloudFormation service
  - [ ] Found `likenessguard-prototype` stack
  - [ ] Status shows `CREATE_COMPLETE`
- [ ] Verified Lambda functions exist
  - [ ] LikenessGuard-Registration
  - [ ] LikenessGuard-ConsentCheck
  - [ ] LikenessGuard-ConsentUpdate
  - [ ] LikenessGuard-ConsentRevoke
  - [ ] LikenessGuard-EvidenceRetrieval
- [ ] Verified DynamoDB tables exist
  - [ ] LikenessGuard-ConsentRegistry
  - [ ] LikenessGuard-AuditLog
- [ ] Verified S3 bucket exists
  - [ ] likenessguard-photos-[account-id]
- [ ] Verified API Gateway exists
  - [ ] LikenessGuard-API

---

## 🧪 TESTING CHECKLIST

### Basic API Test
- [ ] Copied API endpoint URL from deployment output
- [ ] Tested in browser: `[API-URL]/evidence`
- [ ] Received JSON response (even if empty)

### CloudWatch Monitoring
- [ ] Accessed CloudWatch in AWS Console
- [ ] Found log groups for Lambda functions
- [ ] Viewed sample logs
- [ ] Checked metrics dashboard

### Free Tier Monitoring
- [ ] Accessed Billing Dashboard
- [ ] Checked Free Tier usage
- [ ] Set up billing alerts (optional but recommended)
- [ ] Confirmed usage is within Free Tier limits

---

## 📊 RESOURCE INVENTORY

After deployment, record your resource details:

### API Gateway
- **API Name**: LikenessGuard-API
- **API Endpoint**: _______________________________________________
- **Stage**: v1

### Lambda Functions
- **Registration**: LikenessGuard-Registration
- **Consent Check**: LikenessGuard-ConsentCheck
- **Consent Update**: LikenessGuard-ConsentUpdate
- **Consent Revoke**: LikenessGuard-ConsentRevoke
- **Evidence Retrieval**: LikenessGuard-EvidenceRetrieval

### DynamoDB Tables
- **Consent Registry**: LikenessGuard-ConsentRegistry
- **Audit Log**: LikenessGuard-AuditLog

### S3 Buckets
- **Photo Bucket**: likenessguard-photos-_______________
- **Deployment Bucket**: likenessguard-deployment-_______________

### CloudFormation
- **Stack Name**: likenessguard-prototype
- **Region**: us-east-1
- **Status**: _______________

---

## 🔧 TROUBLESHOOTING CHECKLIST

If deployment fails, check:

- [ ] AWS credentials are valid
  - [ ] Run `aws sts get-caller-identity`
  - [ ] Verify output shows your account
- [ ] AWS CLI is installed correctly
  - [ ] Run `aws --version`
  - [ ] Should show version 2.x.x
- [ ] SAM CLI is installed correctly
  - [ ] Run `sam --version`
  - [ ] Should show version 1.x.x
- [ ] Python is installed correctly
  - [ ] Run `python --version`
  - [ ] Should show version 3.11+
- [ ] Internet connection is working
- [ ] No existing stack with same name
  - [ ] Check CloudFormation console
  - [ ] Delete old stack if exists
- [ ] IAM permissions are sufficient
  - [ ] User has AdministratorAccess or equivalent
- [ ] Region is set correctly
  - [ ] Run `aws configure get region`
  - [ ] Should show `us-east-1`

---

## 🎯 SUCCESS CRITERIA

Your deployment is successful when:

- ✅ CloudFormation stack status is `CREATE_COMPLETE`
- ✅ All 5 Lambda functions are visible in AWS Console
- ✅ Both DynamoDB tables exist
- ✅ S3 buckets are created
- ✅ API Gateway is accessible
- ✅ API endpoint returns valid response
- ✅ CloudWatch logs are being generated
- ✅ No errors in CloudFormation Events tab
- ✅ Free Tier usage is within limits

---

## 📝 NOTES SECTION

Use this space to record important information:

### Deployment Date
- **Date**: _______________
- **Time**: _______________

### Issues Encountered
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Solutions Applied
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### API Endpoint
```
_______________________________________________
```

### Important Observations
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🔄 RE-DEPLOYMENT CHECKLIST

For subsequent deployments (after making code changes):

- [ ] Made code changes in `src/` folder
- [ ] Saved all files
- [ ] Opened PowerShell as Administrator
- [ ] Navigated to project folder
- [ ] Ran `.\deploy.ps1`
- [ ] Waited for deployment to complete
- [ ] Verified changes in AWS Console
- [ ] Tested updated functionality

---

## 🗑️ CLEANUP CHECKLIST

When you want to delete everything:

- [ ] Backed up any important data
- [ ] Logged into AWS Console
- [ ] Went to CloudFormation
- [ ] Selected `likenessguard-prototype` stack
- [ ] Clicked "Delete"
- [ ] Confirmed deletion
- [ ] Waited for deletion to complete (5-10 minutes)
- [ ] Verified all resources are deleted:
  - [ ] Lambda functions gone
  - [ ] DynamoDB tables gone
  - [ ] S3 buckets gone (may need manual deletion)
  - [ ] API Gateway gone
  - [ ] CloudWatch log groups gone (optional cleanup)

---

## 📞 SUPPORT RESOURCES

If you need help:

1. **Documentation**
   - [ ] Read `BEGINNER_DEPLOYMENT_GUIDE.md`
   - [ ] Check `DEPLOYMENT.md`
   - [ ] Review `docs/ARCHITECTURE.md`
   - [ ] See `READY_FOR_DEPLOYMENT.md`

2. **AWS Resources**
   - [ ] Check CloudWatch logs
   - [ ] Review CloudFormation Events
   - [ ] Check IAM permissions
   - [ ] Verify Free Tier limits

3. **Common Issues**
   - [ ] Reviewed Troubleshooting section
   - [ ] Checked AWS service status
   - [ ] Verified credentials
   - [ ] Confirmed region settings

---

**Print this checklist and check off items as you complete them!**

**Date**: February 13, 2026
**Version**: 1.0
**Status**: Ready to Use ✅
