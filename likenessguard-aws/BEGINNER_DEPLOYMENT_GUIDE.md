# LikenessGuard AWS - Complete Beginner's Deployment Guide

## 🎯 Goal
Deploy your LikenessGuard application to Amazon Web Services (AWS) so it runs in the cloud.

## ⏱️ Estimated Time
- First-time setup: 30-45 minutes
- Actual deployment: 10-15 minutes

---

# PART 1: PREREQUISITES (One-Time Setup)

## Step 1: Create an AWS Account

### 1.1 Open Your Web Browser
- Open Chrome, Firefox, Edge, or Safari

### 1.2 Go to AWS Website
- Type in address bar: `https://aws.amazon.com`
- Press Enter

### 1.3 Click "Create an AWS Account"
- Look for orange button in top-right corner
- Click it

### 1.4 Fill Out Registration Form
You'll need:
- Email address
- Password
- AWS account name (can be anything, like "MyLikenessGuard")
- Contact information
- Credit card (for verification - Free Tier is free, but AWS requires a card)

### 1.5 Choose Support Plan
- Select "Basic Support - Free"
- Click "Complete sign up"

### 1.6 Wait for Confirmation
- Check your email
- Click verification link
- Your account is now active!

**⏸️ CHECKPOINT**: You should now be able to log in to AWS Console at https://console.aws.amazon.com

---

## Step 2: Install AWS CLI (Command Line Interface)

### 2.1 Download AWS CLI for Windows

**Option A: Using MSI Installer (Recommended)**

1. Open your web browser
2. Go to: `https://awscli.amazonaws.com/AWSCLIV2.msi`
3. The download will start automatically
4. Wait for download to complete (file is about 30MB)

### 2.2 Install AWS CLI

1. **Find the downloaded file**
   - Open File Explorer (Windows key + E)
   - Go to Downloads folder
   - Look for file named `AWSCLIV2.msi`

2. **Run the installer**
   - Double-click `AWSCLIV2.msi`
   - If Windows asks "Do you want to allow this app to make changes?" → Click "Yes"

3. **Follow installation wizard**
   - Click "Next"
   - Accept license agreement → Click "Next"
   - Keep default installation location → Click "Next"
   - Click "Install"
   - Wait for installation (takes 1-2 minutes)
   - Click "Finish"

### 2.3 Verify AWS CLI Installation

1. **Open Command Prompt**
   - Press Windows key
   - Type `cmd`
   - Press Enter
   - A black window will open

2. **Check AWS CLI version**
   - Type: `aws --version`
   - Press Enter
   - You should see something like: `aws-cli/2.x.x Python/3.x.x Windows/10`

**✅ SUCCESS**: If you see version information, AWS CLI is installed!

**❌ ERROR**: If you see "aws is not recognized"
- Close Command Prompt
- Open a NEW Command Prompt (AWS CLI needs fresh window)
- Try again

---

## Step 3: Install AWS SAM CLI (Serverless Application Model)

### 3.1 Download SAM CLI for Windows

1. Open your web browser
2. Go to: `https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi`
3. Download will start automatically
4. Wait for download (file is about 200MB)

### 3.2 Install SAM CLI

1. **Find the downloaded file**
   - Open File Explorer
   - Go to Downloads folder
   - Look for file named `AWS_SAM_CLI_64_PY3.msi`

2. **Run the installer**
   - Double-click the file
   - Click "Yes" if Windows asks for permission

3. **Follow installation wizard**
   - Click "Next"
   - Accept license → Click "Next"
   - Keep default location → Click "Next"
   - Click "Install"
   - Wait 2-3 minutes
   - Click "Finish"

### 3.3 Verify SAM CLI Installation

1. **Open NEW Command Prompt**
   - Close any open Command Prompt windows
   - Press Windows key
   - Type `cmd`
   - Press Enter

2. **Check SAM version**
   - Type: `sam --version`
   - Press Enter
   - You should see: `SAM CLI, version 1.x.x`

**✅ SUCCESS**: SAM CLI is installed!

---

## Step 4: Get Your AWS Access Keys

### 4.1 Log in to AWS Console

1. Open browser
2. Go to: `https://console.aws.amazon.com`
3. Enter your email and password
4. Click "Sign In"

### 4.2 Navigate to IAM (Identity and Access Management)

1. **Find the search bar**
   - At the very top of the page, there's a search bar
   - It says "Search" with a magnifying glass icon

2. **Search for IAM**
   - Click in the search bar
   - Type: `IAM`
   - Click on "IAM" in the results (it has a key icon)

### 4.3 Create Access Keys

1. **Click "Users" in left sidebar**
   - Look on the left side of the screen
   - Click "Users"

2. **Click your username**
   - You'll see a list of users
   - Click on your username

3. **Go to Security Credentials tab**
   - Look for tabs near the top
   - Click "Security credentials"

4. **Create Access Key**
   - Scroll down to "Access keys" section
   - Click "Create access key" button

5. **Choose Use Case**
   - Select "Command Line Interface (CLI)"
   - Check the box "I understand the above recommendation"
   - Click "Next"

6. **Add Description (Optional)**
   - Type: "LikenessGuard Deployment"
   - Click "Create access key"

7. **IMPORTANT: Save Your Keys**
   - You'll see two values:
     - **Access key ID** (looks like: AKIAIOSFODNN7EXAMPLE)
     - **Secret access key** (looks like: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY)
   
   - **Click "Download .csv file"** - This saves your keys
   - **KEEP THIS FILE SAFE** - You can't see the secret key again!
   - Click "Done"

**⚠️ SECURITY WARNING**: Never share these keys or commit them to GitHub!

---

## Step 5: Configure AWS CLI with Your Keys

### 5.1 Open Command Prompt

1. Press Windows key
2. Type `cmd`
3. Press Enter

### 5.2 Run AWS Configure Command

1. **Type this command**:
   ```
   aws configure
   ```
2. Press Enter

### 5.3 Enter Your Information

You'll be asked 4 questions. Answer each one:

**Question 1: AWS Access Key ID**
- Open the CSV file you downloaded (or copy from AWS console)
- Copy the Access Key ID
- Paste it in Command Prompt
- Press Enter

**Question 2: AWS Secret Access Key**
- Copy the Secret Access Key from CSV file
- Paste it in Command Prompt
- Press Enter

**Question 3: Default region name**
- Type: `us-east-1`
- Press Enter
- (This is the Virginia region - cheapest and most reliable)

**Question 4: Default output format**
- Type: `json`
- Press Enter

### 5.4 Verify Configuration

1. **Test AWS connection**
   - Type: `aws sts get-caller-identity`
   - Press Enter

2. **You should see**:
   ```json
   {
       "UserId": "AIDAI...",
       "Account": "123456789012",
       "Arn": "arn:aws:iam::123456789012:user/yourname"
   }
   ```

**✅ SUCCESS**: AWS CLI is configured and connected!

---

# PART 2: DEPLOYMENT

## Step 6: Navigate to Project Folder

### 6.1 Open Command Prompt

1. Press Windows key
2. Type `cmd`
3. Press Enter

### 6.2 Navigate to Your Project

**Find your project location first**:
- Open File Explorer
- Navigate to where you have the project
- Example: `C:\Users\YourName\Desktop\KIRO\likenessguard-aws`

**In Command Prompt, type**:
```
cd C:\Users\YourName\Desktop\KIRO\likenessguard-aws
```
(Replace with YOUR actual path)

Press Enter

### 6.3 Verify You're in the Right Place

Type: `dir`
Press Enter

You should see files like:
- `deploy.ps1`
- `deploy.sh`
- `README.md`
- `requirements.txt`
- Folders: `src`, `infrastructure`, `demo`, `docs`

**✅ SUCCESS**: You're in the right folder!

---

## Step 7: Install Python Dependencies

### 7.1 Check Python Installation

Type: `python --version`
Press Enter

You should see: `Python 3.11.x` or higher

**❌ If Python is not installed**:
1. Go to: `https://www.python.org/downloads/`
2. Download Python 3.11 or newer
3. Run installer
4. **IMPORTANT**: Check "Add Python to PATH" during installation
5. Restart Command Prompt

### 7.2 Install Project Dependencies

Type: `pip install -r requirements.txt`
Press Enter

Wait 1-2 minutes while packages install.

Type: `pip install -r requirements-dev.txt`
Press Enter

Wait 1-2 minutes.

**✅ SUCCESS**: Dependencies installed!

---

## Step 8: Deploy to AWS (The Big Moment!)

### 8.1 Open PowerShell

**Why PowerShell?** The deployment script is written for PowerShell on Windows.

1. Press Windows key
2. Type `powershell`
3. **Right-click** on "Windows PowerShell"
4. Click "Run as administrator"
5. Click "Yes" when asked for permission

### 8.2 Navigate to Project Folder

In PowerShell, type:
```powershell
cd C:\Users\YourName\Desktop\KIRO\likenessguard-aws
```
(Use YOUR actual path)

Press Enter

### 8.3 Run Deployment Script

Type: `.\deploy.ps1`
Press Enter

**⚠️ If you get an error about execution policy**:

Type: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
Press Enter
Type `Y` and press Enter
Then try `.\deploy.ps1` again

### 8.4 Watch the Deployment

You'll see messages like:
```
==========================================
LikenessGuard AWS Deployment Script
==========================================

Checking AWS credentials...
✓ AWS Account: 123456789012
✓ AWS Region: us-east-1

Checking deployment bucket...
✓ Bucket exists: likenessguard-deployment-123456789012

Installing Python dependencies...
✓ Dependencies installed

Building SAM application...
✓ Build complete

Packaging SAM application...
✓ Package complete

Deploying SAM application...
```

**This will take 5-10 minutes**. Don't close the window!

### 8.5 Deployment Complete!

When finished, you'll see:
```
✓ Deployment complete!

==========================================
Stack Outputs:
==========================================
```

Followed by a table showing:
- **ApiEndpoint**: Your API URL (looks like: https://abc123.execute-api.us-east-1.amazonaws.com/v1)
- **PhotoBucketName**: Your S3 bucket name
- **ConsentRegistryTableName**: Your DynamoDB table name
- **AuditLogTableName**: Your audit log table name

**🎉 CONGRATULATIONS! Your application is now live on AWS!**

---

## Step 9: Verify Deployment

### 9.1 Check AWS Console

1. **Open browser**
2. **Go to**: `https://console.aws.amazon.com`
3. **Log in** with your credentials

4. **Check CloudFormation**
   - In search bar, type: `CloudFormation`
   - Click on CloudFormation service
   - You should see a stack named: `likenessguard-prototype`
   - Status should be: `CREATE_COMPLETE` (green)

5. **Check Lambda Functions**
   - In search bar, type: `Lambda`
   - Click on Lambda service
   - You should see 5 functions:
     - LikenessGuard-Registration
     - LikenessGuard-ConsentCheck
     - LikenessGuard-ConsentUpdate
     - LikenessGuard-ConsentRevoke
     - LikenessGuard-EvidenceRetrieval

6. **Check API Gateway**
   - In search bar, type: `API Gateway`
   - Click on API Gateway service
   - You should see: `LikenessGuard-API`

**✅ SUCCESS**: All resources are deployed!

---

## Step 10: Test Your API

### 10.1 Get Your API Endpoint

From the deployment output, copy your API endpoint URL.
It looks like: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/v1`

### 10.2 Test with Browser (Simple Test)

1. Open browser
2. Paste your API endpoint URL
3. Add `/evidence` to the end
4. Example: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/v1/evidence`
5. Press Enter

You should see a JSON response (might be empty, that's OK!)

### 10.3 Test with Demo Script (Advanced Test)

**Note**: The demo script currently uses mock data. To test with real API:

1. Open file: `likenessguard-aws/demo/demo_flow.py`
2. Find line with `MockLikenessGuardAPI`
3. Replace with real API calls (see API documentation)

---

# PART 3: MONITORING AND MANAGEMENT

## Step 11: Monitor Your Application

### 11.1 View CloudWatch Logs

1. **Go to AWS Console**: `https://console.aws.amazon.com`
2. **Search for**: `CloudWatch`
3. **Click**: CloudWatch service
4. **Click**: "Logs" in left sidebar
5. **Click**: "Log groups"
6. **You'll see log groups for each Lambda**:
   - `/aws/lambda/LikenessGuard-Registration`
   - `/aws/lambda/LikenessGuard-ConsentCheck`
   - etc.
7. **Click any log group** to see logs

### 11.2 Check CloudWatch Metrics

1. In CloudWatch console
2. Click "Metrics" in left sidebar
3. Click "All metrics"
4. You'll see metrics for:
   - Lambda invocations
   - API Gateway requests
   - DynamoDB operations

### 11.3 Monitor Free Tier Usage

1. **Go to AWS Console**
2. **Click your account name** (top-right corner)
3. **Click**: "Billing and Cost Management"
4. **Click**: "Free Tier" in left sidebar
5. **You'll see**:
   - Current usage
   - Percentage of Free Tier used
   - Alerts if approaching limits

**⚠️ IMPORTANT**: Check this regularly to avoid unexpected charges!

---

## Step 12: Update Your Application

### 12.1 Make Code Changes

1. Edit your Python files in `src/` folder
2. Save changes

### 12.2 Redeploy

1. Open PowerShell as administrator
2. Navigate to project folder
3. Run: `.\deploy.ps1`
4. Wait for deployment to complete

**That's it!** Your changes are now live.

---

## Step 13: Delete/Cleanup (When Done)

### 13.1 Delete CloudFormation Stack

**⚠️ WARNING**: This will delete ALL resources and data!

1. **Open AWS Console**
2. **Go to CloudFormation**
3. **Select**: `likenessguard-prototype` stack
4. **Click**: "Delete"
5. **Confirm**: Click "Delete stack"
6. **Wait**: 5-10 minutes for deletion

### 13.2 Verify Deletion

Check that these are gone:
- Lambda functions
- DynamoDB tables
- S3 buckets
- API Gateway

---

# TROUBLESHOOTING

## Problem: "aws is not recognized"

**Solution**:
1. Close Command Prompt
2. Open NEW Command Prompt
3. Try again

If still not working:
1. Reinstall AWS CLI
2. Restart computer
3. Try again

---

## Problem: "sam is not recognized"

**Solution**:
1. Close PowerShell
2. Open NEW PowerShell
3. Try again

If still not working:
1. Reinstall SAM CLI
2. Restart computer
3. Try again

---

## Problem: "Access Denied" during deployment

**Solution**:
1. Check your AWS credentials: `aws configure list`
2. Verify you have correct permissions
3. Try creating a new access key
4. Run `aws configure` again with new keys

---

## Problem: "Stack already exists"

**Solution**:
1. Go to CloudFormation in AWS Console
2. Delete existing stack
3. Wait for deletion to complete
4. Try deployment again

---

## Problem: Deployment takes too long

**Normal**: First deployment takes 5-10 minutes
**Too long**: If more than 15 minutes:
1. Check CloudFormation console for errors
2. Look at "Events" tab in stack details
3. Check if any resources failed to create

---

## Problem: "Insufficient permissions"

**Solution**:
Your IAM user needs these permissions:
- CloudFormation (full access)
- Lambda (full access)
- DynamoDB (full access)
- S3 (full access)
- API Gateway (full access)
- IAM (create roles)
- CloudWatch (full access)

To fix:
1. Go to IAM in AWS Console
2. Click your username
3. Click "Add permissions"
4. Attach policy: "AdministratorAccess" (for testing)

---

# QUICK REFERENCE

## Essential Commands

```powershell
# Navigate to project
cd C:\Users\YourName\Desktop\KIRO\likenessguard-aws

# Deploy
.\deploy.ps1

# Check AWS connection
aws sts get-caller-identity

# View CloudFormation stacks
aws cloudformation list-stacks

# Delete stack
aws cloudformation delete-stack --stack-name likenessguard-prototype
```

## Important URLs

- AWS Console: https://console.aws.amazon.com
- AWS CLI Download: https://awscli.amazonaws.com/AWSCLIV2.msi
- SAM CLI Download: https://github.com/aws/aws-sam-cli/releases/latest
- Python Download: https://www.python.org/downloads/

## File Locations

- Project folder: `C:\Users\YourName\Desktop\KIRO\likenessguard-aws`
- Deployment script: `deploy.ps1`
- SAM template: `infrastructure/template.yaml`
- Lambda code: `src/lambdas/`
- Documentation: `docs/`

---

# NEXT STEPS

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Upload sample face photos
3. ✅ Run consent checks
4. ✅ Monitor CloudWatch logs
5. ✅ Check Free Tier usage
6. ✅ Prepare competition demo
7. ✅ Document test results

---

# SUPPORT

If you get stuck:

1. Check this guide's Troubleshooting section
2. Review `likenessguard-aws/DEPLOYMENT.md`
3. Check `likenessguard-aws/docs/ARCHITECTURE.md`
4. Look at CloudWatch logs for errors
5. Check AWS CloudFormation Events tab

---

**🎉 CONGRATULATIONS!**

You've successfully deployed a production-ready serverless application to AWS!

**Date**: February 13, 2026
**Status**: Deployment Guide Complete
**Difficulty**: Beginner-Friendly ✅
