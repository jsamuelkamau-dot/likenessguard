# Quick Database Check Guide

## Quick Start

```bash
# 1. Navigate to the directory
cd likenessguard-aws

# 2. Install dependencies (first time only)
npm install

# 3. Run the database check
npm run check-db
```

## What You'll See

The script will show you:

✅ **All registered likenesses** in the ConsentRegistry table
- Likeness IDs
- Names and emails
- Registration dates
- Number of photos
- Consent policies

✅ **All audit records** in the AuditLog table
- Event types (consent_check, registration, etc.)
- Decisions (ALLOW/DENY)
- Timestamps
- Associated likeness IDs

✅ **Summary statistics**
- Total counts
- Which likeness IDs have activity

## Common Use Cases

### Check if registration worked
```bash
npm run check-db
# Look for your likeness ID in the ConsentRegistry section
```

### Verify consent checks are being logged
```bash
npm run check-db
# Look for audit records in the AuditLog section
```

### Debug missing data
```bash
npm run check-db
# Check if tables are empty or if specific IDs are missing
```

## Troubleshooting

**No data showing up?**
- Verify tables exist in AWS Console
- Check you're using the correct AWS region (us-east-1)
- Ensure AWS credentials are configured

**Permission errors?**
- Your AWS user/role needs `dynamodb:Scan` permission
- Check IAM policies

**Module not found errors?**
- Run `npm install` first

## Alternative Commands

```bash
# Direct execution
node check-database-data.js

# On Unix/Linux/Mac (if made executable)
./check-database-data.js
```

## Next Steps

After checking the database:
1. If no data exists, run the demo flow to populate tables
2. If data exists, verify it matches your expectations
3. Use the output to debug any issues with registration or consent checks
