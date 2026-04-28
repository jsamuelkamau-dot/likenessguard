#!/usr/bin/env node

/**
 * LikenessGuard Database Data Checker
 * 
 * This script queries the DynamoDB tables to check for existing data:
 * - ConsentRegistry: Lists all registered likeness IDs
 * - AuditLog: Shows audit records and their associated likeness IDs
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const REGION = 'us-east-1';
const CONSENT_REGISTRY_TABLE = 'LikenessGuard-ConsentRegistry';
const AUDIT_LOG_TABLE = 'LikenessGuard-AuditLog';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Scan a DynamoDB table and return all items
 */
async function scanTable(tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: tableName,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    };

    try {
      const response = await docClient.send(new ScanCommand(params));
      items.push(...(response.Items || []));
      lastEvaluatedKey = response.LastEvaluatedKey;
    } catch (error) {
      console.error(`Error scanning table ${tableName}:`, error.message);
      throw error;
    }
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('LikenessGuard Database Data Check');
  console.log('='.repeat(70));
  console.log(`Region: ${REGION}`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));
  console.log();

  try {
    // Query ConsentRegistry table
    console.log('📋 Checking ConsentRegistry Table...');
    console.log(`Table: ${CONSENT_REGISTRY_TABLE}`);
    console.log('-'.repeat(70));
    
    const consentRecords = await scanTable(CONSENT_REGISTRY_TABLE);
    
    console.log(`✓ Found ${consentRecords.length} registered likeness(es)`);
    console.log();

    if (consentRecords.length > 0) {
      console.log('Registered Likeness IDs:');
      consentRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.likeness_id}`);
        console.log(`     - Name: ${record.name || 'N/A'}`);
        console.log(`     - Email: ${record.email || 'N/A'}`);
        console.log(`     - Registered: ${formatTimestamp(record.created_at)}`);
        console.log(`     - Photos: ${record.photo_s3_keys?.length || 0}`);
        console.log(`     - Policy: ${record.consent_policy?.default_decision || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('  (No registered likenesses found)');
      console.log();
    }

    // Query AuditLog table
    console.log('='.repeat(70));
    console.log('📝 Checking AuditLog Table...');
    console.log(`Table: ${AUDIT_LOG_TABLE}`);
    console.log('-'.repeat(70));
    
    const auditRecords = await scanTable(AUDIT_LOG_TABLE);
    
    console.log(`✓ Found ${auditRecords.length} audit record(s)`);
    console.log();

    if (auditRecords.length > 0) {
      // Group audit records by likeness_id
      const recordsByLikeness = {};
      const recordsWithoutLikeness = [];

      auditRecords.forEach(record => {
        if (record.likeness_id) {
          if (!recordsByLikeness[record.likeness_id]) {
            recordsByLikeness[record.likeness_id] = [];
          }
          recordsByLikeness[record.likeness_id].push(record);
        } else {
          recordsWithoutLikeness.push(record);
        }
      });

      // Display records grouped by likeness_id
      const likenessIds = Object.keys(recordsByLikeness);
      
      if (likenessIds.length > 0) {
        console.log(`Audit records found for ${likenessIds.length} likeness ID(s):`);
        console.log();

        likenessIds.forEach(likenessId => {
          const records = recordsByLikeness[likenessId];
          console.log(`  Likeness ID: ${likenessId}`);
          console.log(`  Number of audit records: ${records.length}`);
          console.log();

          records.forEach((record, index) => {
            console.log(`    ${index + 1}. Event: ${record.event_type || 'N/A'}`);
            console.log(`       - Timestamp: ${formatTimestamp(record.timestamp)}`);
            console.log(`       - Decision: ${record.decision || 'N/A'}`);
            console.log(`       - Request ID: ${record.request_id || 'N/A'}`);
            if (record.context) {
              console.log(`       - Context: ${JSON.stringify(record.context).substring(0, 100)}...`);
            }
            console.log();
          });
        });
      }

      if (recordsWithoutLikeness.length > 0) {
        console.log(`Audit records without likeness_id: ${recordsWithoutLikeness.length}`);
        recordsWithoutLikeness.forEach((record, index) => {
          console.log(`  ${index + 1}. Event: ${record.event_type || 'N/A'}`);
          console.log(`     - Timestamp: ${formatTimestamp(record.timestamp)}`);
          console.log(`     - Request ID: ${record.request_id || 'N/A'}`);
          console.log();
        });
      }
    } else {
      console.log('  (No audit records found)');
      console.log();
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 Summary');
    console.log('='.repeat(70));
    console.log(`Total Registered Likenesses: ${consentRecords.length}`);
    console.log(`Total Audit Records: ${auditRecords.length}`);
    
    if (consentRecords.length > 0) {
      const likenessIds = consentRecords.map(r => r.likeness_id);
      console.log(`Likeness IDs: ${likenessIds.join(', ')}`);
    }
    
    if (auditRecords.length > 0) {
      const uniqueLikenessIds = [...new Set(auditRecords.map(r => r.likeness_id).filter(Boolean))];
      if (uniqueLikenessIds.length > 0) {
        console.log(`Likeness IDs with audit records: ${uniqueLikenessIds.join(', ')}`);
      }
    }
    
    console.log('='.repeat(70));
    console.log('✓ Database check complete!');
    
  } catch (error) {
    console.error();
    console.error('❌ Error checking database:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
