# LikenessGuard AWS - Quick Deploy Guide

## 🚀 5-Minute Quick Start (If You Already Have Everything Installed)

### Prerequisites Check
```powershell
# Check AWS CLI
aws --version

# Check SAM CLI
sam --version

# Check Python
python --version

# Check AWS credentials
aws sts get-caller-identity
```

If all commands work, you're ready to deploy!

---

## Deploy in 3 Steps

### Step 1: Open PowerShell as Administrator
- Press Windows key
- Type `powershell`
- Right-click "Windows PowerShell"
- Click "Run as administrator"

### Step 2: Navigate to Project
```powershell
cd C:\Users\YourName\Desktop\KIRO\likenessguard-aws
```
(Replace with your actual path)

### Step 3: Deploy
```powershell
.\deploy.ps1
```

Wait 5-10 minutes. Done! ✅

---

## 📖 Full Guide for First-Time Users

**If you've never done this before**, use the complete guide:

👉 **Open file**: `BEGINNER_DEPLOYMENT_GUIDE.md`

This guide includes:
- Creating AWS account
- Installing all required software
- Getting AWS credentials
- Step-by-step deployment
- Troubleshooting
- Testing your deployment

**Estimated time**: 45 minutes (first time)

---

## 📋 Checklist for Tracking Progress

**Want to track your progress?**

👉 **Open file**: `DEPLOYMENT_CHECKLIST.md`

Print it out and check off items as you complete them!

---

## 🎯 What You'll Get After Deployment

### Your Live AWS Resources
- ✅ 5 Lambda Functions (serverless compute)
- ✅ 2 DynamoDB Tables (database)
- ✅ 1 S3 Bucket (file storage)
- ✅ 1 API Gateway (REST API)
- ✅ CloudWatch Logs (monitoring)
- ✅ CloudWatch Alarms (alerts)

### Your API Endpoint
After deployment, you'll get a URL like:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/v1
```

This is your live API that you can call from anywhere!

---

## 💰 Cost

**FREE** if you stay within AWS Free Tier limits:
- Lambda: 1M requests/month
- API Gateway: 1M calls/month
- DynamoDB: 25GB storage
- S3: 5GB storage
- Rekognition: 5,000 images/month (first year)

Your demo usage will be well within these limits.

---

## 🔍 Quick Verification

After deployment, check these:

### 1. CloudFormation Stack
```
AWS Console → CloudFormation → likenessguard-prototype
Status should be: CREATE_COMPLETE ✅
```

### 2. Lambda Functions
```
AWS Console → Lambda
You should see 5 functions starting with "LikenessGuard-" ✅
```

### 3. API Gateway
```
AWS Console → API Gateway → LikenessGuard-API
Should show your API with endpoints ✅
```

### 4. Test API
```
Open browser → Paste your API URL + /evidence
Should return JSON response ✅
```

---

## 🆘 Quick Troubleshooting

### Problem: "aws is not recognized"
**Fix**: Close and reopen Command Prompt/PowerShell

### Problem: "sam is not recognized"
**Fix**: Close and reopen PowerShell, or reinstall SAM CLI

### Problem: "Access Denied"
**Fix**: Run `aws configure` and enter your credentials again

### Problem: "Stack already exists"
**Fix**: 
1. Go to CloudFormation in AWS Console
2. Delete the existing stack
3. Wait for deletion to complete
4. Try deployment again

### Problem: Deployment takes too long
**Normal**: 5-10 minutes is normal
**Too long**: If >15 minutes, check CloudFormation Events tab for errors

---

## 📚 Documentation Files

All in `likenessguard-aws/` folder:

| File | Purpose | When to Use |
|------|---------|-------------|
| `QUICK_DEPLOY.md` | This file - quick reference | Quick lookup |
| `BEGINNER_DEPLOYMENT_GUIDE.md` | Complete step-by-step guide | First-time deployment |
| `DEPLOYMENT_CHECKLIST.md` | Printable checklist | Track progress |
| `DEPLOYMENT.md` | Technical deployment guide | Advanced users |
| `README.md` | Project overview | Understanding project |
| `docs/ARCHITECTURE.md` | System architecture | Understanding design |
| `docs/API.md` | API documentation | Using the API |

---

## 🎬 Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Prerequisites                                            │
│    ✓ AWS Account                                            │
│    ✓ AWS CLI installed                                      │
│    ✓ SAM CLI installed                                      │
│    ✓ Python 3.11+ installed                                 │
│    ✓ AWS credentials configured                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Open PowerShell as Administrator                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Navigate to Project Folder                               │
│    cd C:\...\likenessguard-aws                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Run Deployment Script                                    │
│    .\deploy.ps1                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Wait for Deployment (5-10 minutes)                       │
│    ✓ Check AWS credentials                                  │
│    ✓ Create/check S3 bucket                                 │
│    ✓ Install dependencies                                   │
│    ✓ Build SAM application                                  │
│    ✓ Package application                                    │
│    ✓ Deploy to CloudFormation                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Deployment Complete! 🎉                                  │
│    ✓ API Endpoint URL displayed                             │
│    ✓ All resources created                                  │
│    ✓ Application is live                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Verify Deployment                                        │
│    ✓ Check CloudFormation stack                             │
│    ✓ Test API endpoint                                      │
│    ✓ View CloudWatch logs                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Update/Redeploy

Made code changes? Redeploy in 2 steps:

```powershell
# 1. Navigate to project
cd C:\Users\YourName\Desktop\KIRO\likenessguard-aws

# 2. Deploy
.\deploy.ps1
```

That's it! Your changes are now live.

---

## 🗑️ Delete Everything

When you're done and want to clean up:

```powershell
aws cloudformation delete-stack --stack-name likenessguard-prototype
```

Or use AWS Console:
1. Go to CloudFormation
2. Select `likenessguard-prototype`
3. Click "Delete"
4. Confirm

Wait 5-10 minutes for deletion to complete.

---

## 📞 Need Help?

1. **First time deploying?**
   → Read `BEGINNER_DEPLOYMENT_GUIDE.md`

2. **Want to track progress?**
   → Use `DEPLOYMENT_CHECKLIST.md`

3. **Having issues?**
   → Check Troubleshooting section in `BEGINNER_DEPLOYMENT_GUIDE.md`

4. **Want technical details?**
   → Read `DEPLOYMENT.md`

5. **Understanding the architecture?**
   → Read `docs/ARCHITECTURE.md`

---

## ✅ Success Checklist

Your deployment is successful when you can check all these:

- [ ] CloudFormation stack shows `CREATE_COMPLETE`
- [ ] 5 Lambda functions visible in AWS Console
- [ ] 2 DynamoDB tables exist
- [ ] S3 bucket created
- [ ] API Gateway accessible
- [ ] API endpoint returns response
- [ ] CloudWatch logs showing activity
- [ ] No errors in CloudFormation Events

---

## 🎯 Next Steps After Deployment

1. Test API endpoints
2. Upload sample face photos
3. Run consent checks
4. Monitor CloudWatch logs
5. Check Free Tier usage
6. Prepare demo for competition
7. Document test results

---

**Ready to deploy? Let's go! 🚀**

**Commands to remember**:
```powershell
# Deploy
.\deploy.ps1

# Check status
aws cloudformation describe-stacks --stack-name likenessguard-prototype

# Delete
aws cloudformation delete-stack --stack-name likenessguard-prototype
```

---

**Date**: February 13, 2026
**Status**: Ready to Deploy ✅
**Difficulty**: Easy with this guide 😊
