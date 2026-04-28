# LikenessGuard Database Data Checker

This script checks the LikenessGuard DynamoDB tables for existing data and provides a comprehensive report.

## Prerequisites

1. AWS credentials configured (via AWS CLI or environment variables)
2. Node.js installed (v14 or higher)
3. Required npm packages installed

## Installation

```bash
cd likenessguard-aws
npm install
```

This will install the required AWS SDK dependencies:
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`

## Usage

### Option 1: Using npm script (recommended)

```bash
npm run check-db
```

### Option 2: Direct execution

```bash
node check-database-data.js
```

### Option 3: Make executable and run directly (Unix/Linux/Mac)

```bash
chmod +x check-database-data.js
./check-database-data.js
```

## What It Checks

The script queries two DynamoDB tables:

### 1. ConsentRegistry Table (`LikenessGuard-ConsentRegistry`)
- Lists all registered likeness IDs
- Shows registration details (name, email, timestamp)
- Displays number of photos registered
- Shows consent policy settings

### 2. AuditLog Table (`LikenessGuard-AuditLog`)
- Lists all audit records
- Groups records by likeness ID
- Shows event types and decisions
- Displays timestamps and context

## Output Format

The script provides:

1. **ConsentRegistry Summary**
   - Total number of registered likenesses
   - Detailed information for each likeness ID
   - Registration timestamps and metadata

2. **AuditLog Summary**
   - Total number of audit records
   - Records grouped by likeness ID
   - Event types and decisions
   - Associated context information

3. **Overall Summary**
   - Total counts
   - List of all likeness IDs
   - Which likeness IDs have audit records

## Example Output

```
======================================================================
LikenessGuard Database Data Check
======================================================================
Region: us-east-1
Timestamp: 1/15/2024, 10:30:00 AM
======================================================================

📋 Checking ConsentRegistry Table...
Table: LikenessGuard-ConsentRegistry
----------------------------------------------------------------------
✓ Found 2 registered likeness(es)

Registered Likeness IDs:
  1. lik_abc123xyz
     - Name: John Doe
     - Email: john@example.com
     - Registered: 1/15/2024, 9:00:00 AM
     - Photos: 3
     - Policy: DENY

  2. lik_def456uvw
     - Name: Jane Smith
     - Email: jane@example.com
     - Registered: 1/15/2024, 9:30:00 AM
     - Photos: 2
     - Policy: ALLOW

======================================================================
📝 Checking AuditLog Table...
Table: LikenessGuard-AuditLog
----------------------------------------------------------------------
✓ Found 5 audit record(s)

Audit records found for 2 likeness ID(s):

  Likeness ID: lik_abc123xyz
  Number of audit records: 3

    1. Event: consent_check
       - Timestamp: 1/15/2024, 10:00:00 AM
       - Decision: DENY
       - Request ID: req_123

======================================================================
📊 Summary
======================================================================
Total Registered Likenesses: 2
Total Audit Records: 5
Likeness IDs: lik_abc123xyz, lik_def456uvw
Likeness IDs with audit records: lik_abc123xyz, lik_def456uvw
======================================================================
✓ Database check complete!
```

## Configuration

The script uses the following default configuration:

- **Region**: `us-east-1`
- **ConsentRegistry Table**: `LikenessGuard-ConsentRegistry`
- **AuditLog Table**: `LikenessGuard-AuditLog`

To modify these values, edit the constants at the top of `check-database-data.js`.

## Troubleshooting

### Error: "Cannot find module '@aws-sdk/client-dynamodb'"

Run `npm install` in the `likenessguard-aws` directory.

### Error: "User is not authorized to perform: dynamodb:Scan"

Ensure your AWS credentials have the necessary DynamoDB permissions:
- `dynamodb:Scan` on both tables
- Or use an IAM role/user with appropriate permissions

### Error: "ResourceNotFoundException"

The tables may not exist yet. Verify:
1. The tables have been created via CloudFormation/SAM
2. The table names match the configuration
3. You're using the correct AWS region

## AWS Permissions Required

The script requires the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/LikenessGuard-ConsentRegistry",
        "arn:aws:dynamodb:us-east-1:*:table/LikenessGuard-AuditLog"
      ]
    }
  ]
}
```

## Notes

- The script uses `Scan` operations which read all items from the tables
- For large tables, this may take some time and consume read capacity
- Consider using pagination or Query operations for production use with large datasets
- The script is read-only and does not modify any data
