"""
DynamoDB client wrapper for LikenessGuard AWS Prototype.

This module provides a clean interface for DynamoDB operations including:
- Storing and retrieving consent records
- Updating consent policies
- Querying fingerprints for similarity matching
- Storing audit records

Requirements:
- 6.1: Consent policy updates
- 7.1: Consent registry storage
- 9.1: Similarity matching queries
- 12.1: Audit logging
"""

import os
import time
from typing import Optional, List, Dict, Any
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError, BotoCoreError

from ..models.data_models import (
    ConsentRecord,
    ConsentPolicy,
    AuditRecord,
    UserMetadata
)


class DynamoDBClient:
    """
    Wrapper for DynamoDB operations with error handling and retries.
    
    This client handles all DynamoDB interactions for the LikenessGuard system,
    including consent records and audit logs.
    """
    
    def __init__(
        self,
        consent_table_name: Optional[str] = None,
        audit_table_name: Optional[str] = None,
        region_name: Optional[str] = None
    ):
        """
        Initialize DynamoDB client.
        
        Args:
            consent_table_name: Name of ConsentRegistry table (defaults to env var)
            audit_table_name: Name of AuditLog table (defaults to env var)
            region_name: AWS region (defaults to env var or us-east-1)
        """
        self.consent_table_name = consent_table_name or os.environ.get(
            'CONSENT_REGISTRY_TABLE', 'LikenessGuard-ConsentRegistry'
        )
        self.audit_table_name = audit_table_name or os.environ.get(
            'AUDIT_LOG_TABLE', 'LikenessGuard-AuditLog'
        )
        
        region = region_name or os.environ.get('AWS_REGION', 'us-east-1')
        
        # Initialize DynamoDB resource
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.consent_table = self.dynamodb.Table(self.consent_table_name)
        self.audit_table = self.dynamodb.Table(self.audit_table_name)
        
        # Retry configuration
        self.max_retries = 3
        self.base_delay = 0.1  # 100ms
    
    def _convert_floats_to_decimal(self, obj: Any) -> Any:
        """
        Convert float values to Decimal for DynamoDB compatibility.
        
        DynamoDB requires Decimal type for numeric values.
        
        Args:
            obj: Object to convert (dict, list, or primitive)
            
        Returns:
            Object with floats converted to Decimal
        """
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._convert_floats_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_floats_to_decimal(item) for item in obj]
        return obj
    
    def _convert_decimals_to_float(self, obj: Any) -> Any:
        """
        Convert Decimal values to float for Python compatibility.
        
        Args:
            obj: Object to convert (dict, list, or primitive)
            
        Returns:
            Object with Decimals converted to float
        """
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_decimals_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimals_to_float(item) for item in obj]
        return obj
    
    def _retry_with_backoff(self, operation, *args, **kwargs):
        """
        Execute operation with exponential backoff retry logic.
        
        Retries transient errors (throttling, service unavailable) with
        exponential backoff and jitter.
        
        Args:
            operation: Function to execute
            *args: Positional arguments for operation
            **kwargs: Keyword arguments for operation
            
        Returns:
            Result of operation
            
        Raises:
            ClientError: If operation fails after all retries
        """
        for attempt in range(self.max_retries):
            try:
                return operation(*args, **kwargs)
            except ClientError as e:
                error_code = e.response['Error']['Code']
                
                # Retry on throttling or service errors
                if error_code in ['ProvisionedThroughputExceededException', 
                                 'ThrottlingException',
                                 'ServiceUnavailable',
                                 'InternalServerError']:
                    if attempt < self.max_retries - 1:
                        # Exponential backoff with jitter
                        delay = self.base_delay * (2 ** attempt)
                        jitter = delay * 0.1  # 10% jitter
                        time.sleep(delay + jitter)
                        continue
                
                # Don't retry other errors
                raise
            except BotoCoreError as e:
                # Retry on network/connection errors
                if attempt < self.max_retries - 1:
                    delay = self.base_delay * (2 ** attempt)
                    time.sleep(delay)
                    continue
                raise
        
        # Should not reach here, but raise last exception if we do
        raise ClientError(
            {'Error': {'Code': 'MaxRetriesExceeded', 'Message': 'Max retries exceeded'}},
            'DynamoDB'
        )
    
    def store_consent_record(self, record: ConsentRecord) -> None:
        """
        Store a consent record in the ConsentRegistry table.
        
        Requirements: 7.1
        
        Args:
            record: ConsentRecord to store
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        item = record.to_dynamodb_item()
        item = self._convert_floats_to_decimal(item)
        
        def put_item():
            self.consent_table.put_item(Item=item)
        
        self._retry_with_backoff(put_item)
    
    def get_consent_record(self, likeness_id: str) -> Optional[ConsentRecord]:
        """
        Retrieve a consent record by likeness ID.
        
        Requirements: 7.1
        
        Args:
            likeness_id: Unique identifier for the likeness
            
        Returns:
            ConsentRecord if found, None otherwise
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        def get_item():
            response = self.consent_table.get_item(
                Key={'LikenessID': likeness_id}
            )
            return response.get('Item')
        
        item = self._retry_with_backoff(get_item)
        
        if item is None:
            return None
        
        # Convert Decimals back to floats
        item = self._convert_decimals_to_float(item)
        
        return ConsentRecord.from_dynamodb_item(item)
    
    def update_consent_policy(
        self,
        likeness_id: str,
        policy: ConsentPolicy
    ) -> None:
        """
        Update the consent policy for a likeness.
        
        Also updates the modification timestamp.
        
        Requirements: 6.1
        
        Args:
            likeness_id: Unique identifier for the likeness
            policy: New consent policy
            
        Raises:
            ClientError: If DynamoDB operation fails
            ValueError: If likeness_id does not exist
        """
        policy_dict = self._convert_floats_to_decimal(policy.to_dict())
        modified_at = int(time.time())
        
        def update_item():
            response = self.consent_table.update_item(
                Key={'LikenessID': likeness_id},
                UpdateExpression='SET ConsentPolicy = :policy, ModifiedAt = :modified',
                ExpressionAttributeValues={
                    ':policy': policy_dict,
                    ':modified': modified_at
                },
                ConditionExpression='attribute_exists(LikenessID)',
                ReturnValues='UPDATED_NEW'
            )
            return response
        
        try:
            self._retry_with_backoff(update_item)
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                raise ValueError(f"Likeness ID {likeness_id} does not exist")
            raise
    
    def query_all_fingerprints(self) -> List[Dict[str, Any]]:
        """
        Query all fingerprints from the ConsentRegistry for similarity matching.
        
        Returns list of items containing LikenessID, FingerprintHash, FingerprintEmbedding, and ConsentPolicy.
        This is used during consent checks to find matching likenesses.
        
        Requirements: 9.1
        
        Returns:
            List of dictionaries with likeness_id, fingerprint_hash, fingerprint_embedding, and consent_policy
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        def scan_table():
            items = []
            scan_kwargs = {
                'ProjectionExpression': 'LikenessID, FingerprintHash, FingerprintEmbedding, ConsentPolicy'
            }
            
            # Handle pagination
            while True:
                response = self.consent_table.scan(**scan_kwargs)
                items.extend(response.get('Items', []))
                
                # Check if there are more items to scan
                last_key = response.get('LastEvaluatedKey')
                if not last_key:
                    break
                
                scan_kwargs['ExclusiveStartKey'] = last_key
            
            return items
        
        items = self._retry_with_backoff(scan_table)
        
        # Convert Decimals to floats and format for easier use
        result = []
        for item in items:
            item = self._convert_decimals_to_float(item)
            result.append({
                'likeness_id': item['LikenessID'],
                'fingerprint_hash': item['FingerprintHash'],
                'fingerprint_embedding': item['FingerprintEmbedding'],
                'consent_policy': ConsentPolicy.from_dict(item['ConsentPolicy'])
            })
        
        return result
    
    def store_audit_record(self, record: AuditRecord) -> None:
        """
        Store an audit record in the AuditLog table.
        
        Requirements: 12.1
        
        Args:
            record: AuditRecord to store
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        item = record.to_dynamodb_item()
        item = self._convert_floats_to_decimal(item)
        
        def put_item():
            self.audit_table.put_item(Item=item)
        
        self._retry_with_backoff(put_item)
    
    def get_audit_records_by_likeness(
        self,
        likeness_id: str,
        limit: int = 100
    ) -> List[AuditRecord]:
        """
        Retrieve audit records for a specific likeness.
        
        Used for evidence retrieval and audit trail review.
        Uses the LikenessIDIndex GSI for efficient querying.
        
        Requirements: 13.3
        
        Args:
            likeness_id: Unique identifier for the likeness
            limit: Maximum number of records to return
            
        Returns:
            List of AuditRecord instances, sorted by timestamp (newest first)
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        def query_table():
            items = []
            query_kwargs = {
                'IndexName': 'LikenessIDIndex',
                'KeyConditionExpression': 'LikenessID = :likeness_id',
                'ExpressionAttributeValues': {':likeness_id': likeness_id},
                'Limit': limit,
                'ScanIndexForward': False  # Sort descending (newest first)
            }
            
            # Handle pagination
            while True:
                response = self.audit_table.query(**query_kwargs)
                items.extend(response.get('Items', []))
                
                # Check if we've hit the limit or there are no more items
                if len(items) >= limit or 'LastEvaluatedKey' not in response:
                    break
                
                query_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
            
            return items[:limit]  # Ensure we don't exceed limit
        
        items = self._retry_with_backoff(query_table)
        
        # Convert to AuditRecord objects
        records = []
        for item in items:
            item = self._convert_decimals_to_float(item)
            records.append(AuditRecord.from_dynamodb_item(item))
        
        return records

    def get_all_audit_records(
        self,
        limit: int = 100
    ) -> List[AuditRecord]:
        """
        Retrieve all audit records from the AuditLog table.
        
        Performs a table scan to retrieve all records regardless of likeness_id value.
        This is used when displaying all activity logs without filtering by specific likeness.
        
        Requirements: Activity Logs Show All Records Fix
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of AuditRecord instances, sorted by timestamp (newest first)
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        def scan_table():
            items = []
            scan_kwargs = {
                'Limit': limit
            }
            
            # Handle pagination
            while True:
                response = self.audit_table.scan(**scan_kwargs)
                items.extend(response.get('Items', []))
                
                # Check if we've hit the limit or there are no more items
                if len(items) >= limit or 'LastEvaluatedKey' not in response:
                    break
                
                scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
            
            return items[:limit]  # Ensure we don't exceed limit
        
        items = self._retry_with_backoff(scan_table)
        
        # Convert to AuditRecord objects
        records = []
        for item in items:
            item = self._convert_decimals_to_float(item)
            records.append(AuditRecord.from_dynamodb_item(item))
        
        # Sort by timestamp in descending order (newest first)
        records.sort(key=lambda r: r.timestamp, reverse=True)
        
        return records
