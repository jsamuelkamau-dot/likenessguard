# Deployment Error Fix Guide

## Error You're Seeing

```
The Try statement is missing its Catch or Finally block.
Missing closing '}' in statement block or type definition.
```

## What Happened

Both PowerShell scripts (`deploy.ps1` and `deploy-simple.ps1`) have syntax issues that PowerShell doesn't like.

---

## ✅ RECOMMENDED SOLUTION: Use SAM CLI Directly

Skip the PowerShell scripts entirely and use SAM CLI commands directly. This is the most reliable approach:

### Step 1: Navigate to Project Folder

Open PowerShell and navigate to the project:

```powershell
cd C:\Users\cc\OneDrive\Desktop\KIRO\likenessguard-aws
```

### Step 2: Add Python to PATH (One-Time Setup)

Since SAM can't find Python, add it to your PATH for this session:

```powershell
$env:PATH = "C:\Users\cc\AppData\Local\Programs\Python\Python314;C:\Users\cc\AppData\Local\Programs\Python\Python314\Scripts;$env:PATH"
```

Verify Python is now found:

```powershell
python --version
```

You should see: `Python 3.14.3`

### Step 3: Build the Application

Now run the build command:

```powershell
sam build --template-file infrastructure/template.yaml
```

This will take 1-2 minutes. You should see "Build Succeeded" at the end.

### Step 4: Deploy the Application

Run this command:

```powershell
sam deploy --guided
```

When prompted, answer these questions:

1. **Stack Name [sam-app]**: Type `likenessguard-prototype` and press Enter
2. **AWS Region [us-east-1]**: Press Enter (use default us-east-1)
3. **Parameter Environment [prototype]**: Press Enter (use default)
4. **Confirm changes before deploy [y/N]**: Type `N` and press Enter
5. **Allow SAM CLI IAM role creation [Y/n]**: Type `Y` and press Enter
6. **Disable rollback [y/N]**: Type `N` and press Enter
7. **Save arguments to configuration file [Y/n]**: Type `Y` and press Enter
8. **SAM configuration file [samconfig.toml]**: Press Enter (use default)
9. **SAM configuration environment [default]**: Press Enter (use default)

The deployment will now start and take 5-10 minutes.

---

## Why Not Use the PowerShell Scripts?

Both `deploy.ps1` and `deploy-simple.ps1` have PowerShell syntax issues that are difficult to fix. Using SAM CLI commands directly is:
- ✅ More reliable
- ✅ Easier to troubleshoot
- ✅ Better documented by AWS
- ✅ Same functionality

---

## Quick Commands Reference

```powershell
# Navigate to project folder
cd C:\Users\cc\OneDrive\Desktop\KIRO\likenessguard-aws

# Add Python to PATH (required each time you open new PowerShell)
$env:PATH = "C:\Users\cc\AppData\Local\Programs\Python\Python314;C:\Users\cc\AppData\Local\Programs\Python\Python314\Scripts;$env:PATH"

# Verify Python is found
python --version

# Build the application
sam build --template-file infrastructure/template.yaml

# Deploy the application (first time)
sam deploy --guided

# Deploy again (after first time)
sam deploy
```

---

## Troubleshooting

### Problem: "Binary validation failed for python" or "Running AWS SAM projects locally requires a container runtime. Do you have Docker installed and running?"

This means SAM CLI can't find Python in your PATH.

**Solution**:

Add Python to your PATH for the current PowerShell session:

```powershell
$env:PATH = "C:\Users\cc\AppData\Local\Programs\Python\Python314;C:\Users\cc\AppData\Local\Programs\Python\Python314\Scripts;$env:PATH"
python --version
sam build --template-file infrastructure/template.yaml
```

**Note**: You'll need to run the PATH command each time you open a new PowerShell window.

### Problem: "sam is not recognized"

**Solution**:
1. Close PowerShell
2. Open NEW PowerShell as Administrator
3. Try again

### Problem: "AWS credentials not configured"

**Solution**:
```powershell
aws configure
```
Then enter your Access Key ID and Secret Access Key.

### Problem: "Stack already exists"

**Solution**:
```powershell
aws cloudformation delete-stack --stack-name likenessguard-prototype
```
Wait 5 minutes, then try deployment again.

---

## Expected Output

### During Build (sam build)

You should see:

```
Starting Build use cache
Cache is invalid, running build and copying resources for following functions
(RegistrationFunction, ConsentCheckFunction, ConsentUpdateFunction, ...)

Building codeuri: /path/to/src/lambdas/registration runtime: python3.9 ...
Running PythonPipBuilder:CleanUp
Running PythonPipBuilder:ResolveDependencies
Running PythonPipBuilder:CopySource

Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

### During Deploy (sam deploy --guided)

You'll see prompts, then:

```
Deploying with following values
===============================
Stack name                   : likenessguard-prototype
Region                       : us-east-1
Confirm changeset           : False
Disable rollback            : False
Deployment s3 bucket        : aws-sam-cli-managed-default-samclisourcebucket-xxxxx
Capabilities                : ["CAPABILITY_NAMED_IAM"]
Parameter overrides         : {"Environment": "prototype"}

Initiating deployment
=====================

Uploading to likenessguard-prototype/xxxxx  123456 / 123456  (100.00%)

Waiting for changeset to be created..

CloudFormation stack changeset
-------------------------------------------------------------------------------------------------
Operation                LogicalResourceId        ResourceType             Replacement
-------------------------------------------------------------------------------------------------
+ Add                    RegistrationFunction     AWS::Lambda::Function    N/A
+ Add                    ConsentCheckFunction     AWS::Lambda::Function    N/A
...
-------------------------------------------------------------------------------------------------

Changeset created successfully. arn:aws:cloudformation:...

2026-02-14 10:30:00 - Waiting for stack create/update to complete

CloudFormation events from stack operations
-------------------------------------------------------------------------------------------------
ResourceStatus           ResourceType             LogicalResourceId        ResourceStatusReason
-------------------------------------------------------------------------------------------------
CREATE_IN_PROGRESS       AWS::CloudFormation::... likenessguard-prototype  User Initiated
CREATE_IN_PROGRESS       AWS::S3::Bucket          PhotoStorageBucket       -
CREATE_COMPLETE          AWS::S3::Bucket          PhotoStorageBucket       -
...
CREATE_COMPLETE          AWS::CloudFormation::... likenessguard-prototype  -
-------------------------------------------------------------------------------------------------

Successfully created/updated stack - likenessguard-prototype in us-east-1
```

---

## Next Steps After Successful Deployment

1. ✅ Copy your API endpoint URL from the output
2. ✅ Test it in your browser: `[API-URL]/evidence`
3. ✅ Check CloudFormation in AWS Console
4. ✅ Verify all Lambda functions are created
5. ✅ Monitor Free Tier usage

---

## Summary

**Don't use the PowerShell scripts** - they have syntax errors.

**Instead, run these two commands:**

```powershell
sam build --template-file infrastructure/template.yaml
sam deploy --guided
```

That's it! Much simpler and more reliable.

---

**Date**: February 14, 2026
**Status**: Solution Provided - Use SAM CLI Directly ✅
