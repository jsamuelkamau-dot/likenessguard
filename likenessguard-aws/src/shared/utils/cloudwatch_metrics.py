"""
CloudWatch Metrics Utility

Emits custom metrics for monitoring and alerting.

Requirements:
- 12.1: Decision count metrics
- Error rate metrics
- Circuit breaker state metrics
"""
import logging
import os
from typing import Optional
from enum import Enum

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger(__name__)


class MetricName(Enum):
    """CloudWatch metric names."""
    DECISION_ALLOW = 'DecisionAllow'
    DECISION_DENY = 'DecisionDeny'
    DECISION_UNKNOWN = 'DecisionUnknown'
    ERROR_RATE = 'ErrorRate'
    REKOGNITION_ERROR = 'RekognitionError'
    DYNAMODB_ERROR = 'DynamoDBError'
    CIRCUIT_BREAKER_OPEN = 'CircuitBreakerOpen'
    CIRCUIT_BREAKER_CLOSED = 'CircuitBreakerClosed'
    PROCESSING_TIME = 'ProcessingTimeMs'


class CloudWatchMetrics:
    """
    CloudWatch metrics emitter for custom application metrics.
    
    Emits metrics to CloudWatch for monitoring:
    - Decision counts (ALLOW/DENY/UNKNOWN)
    - Error rates by type
    - Circuit breaker state changes
    - Processing times
    """
    
    def __init__(self, namespace: str = 'LikenessGuard'):
        """
        Initialize CloudWatch metrics client.
        
        Args:
            namespace: CloudWatch namespace for metrics
        """
        self.namespace = namespace
        self.cloudwatch = boto3.client('cloudwatch')
        self.enabled = os.environ.get('METRICS_ENABLED', 'true').lower() == 'true'
    
    def _put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = 'Count',
        dimensions: Optional[dict] = None
    ) -> None:
        """
        Put a metric to CloudWatch.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Metric unit (Count, Milliseconds, etc.)
            dimensions: Optional metric dimensions
        """
        if not self.enabled:
            logger.debug(f"Metrics disabled, skipping: {metric_name}={value}")
            return
        
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit
            }
            
            if dimensions:
                metric_data['Dimensions'] = [
                    {'Name': k, 'Value': v}
                    for k, v in dimensions.items()
                ]
            
            self.cloudwatch.put_metric_data(
                Namespace=self.namespace,
                MetricData=[metric_data]
            )
            
            logger.debug(f"Emitted metric: {metric_name}={value} {unit}")
            
        except ClientError as e:
            logger.warning(f"Failed to emit metric {metric_name}: {e}")
            # Don't fail the request if metrics fail
        except Exception as e:
            logger.warning(f"Unexpected error emitting metric {metric_name}: {e}")
    
    def record_decision(self, decision: str, usage_type: Optional[str] = None) -> None:
        """
        Record a consent decision metric.
        
        Args:
            decision: Decision value (ALLOW, DENY, UNKNOWN)
            usage_type: Optional usage type dimension
            
        Requirements: 12.1
        """
        metric_map = {
            'ALLOW': MetricName.DECISION_ALLOW,
            'DENY': MetricName.DECISION_DENY,
            'UNKNOWN': MetricName.DECISION_UNKNOWN
        }
        
        metric_name = metric_map.get(decision)
        if not metric_name:
            logger.warning(f"Unknown decision type: {decision}")
            return
        
        dimensions = {}
        if usage_type:
            dimensions['UsageType'] = usage_type
        
        self._put_metric(
            metric_name=metric_name.value,
            value=1.0,
            unit='Count',
            dimensions=dimensions if dimensions else None
        )
    
    def record_error(self, error_type: str, service: Optional[str] = None) -> None:
        """
        Record an error metric.
        
        Args:
            error_type: Type of error (REKOGNITION_ERROR, DYNAMODB_ERROR, etc.)
            service: Optional service name dimension
        """
        dimensions = {'ErrorType': error_type}
        if service:
            dimensions['Service'] = service
        
        # Record specific error type
        if error_type == 'REKOGNITION_ERROR':
            self._put_metric(
                metric_name=MetricName.REKOGNITION_ERROR.value,
                value=1.0,
                unit='Count',
                dimensions=dimensions
            )
        elif error_type == 'DYNAMODB_ERROR':
            self._put_metric(
                metric_name=MetricName.DYNAMODB_ERROR.value,
                value=1.0,
                unit='Count',
                dimensions=dimensions
            )
        
        # Record general error rate
        self._put_metric(
            metric_name=MetricName.ERROR_RATE.value,
            value=1.0,
            unit='Count',
            dimensions=dimensions
        )
    
    def record_circuit_breaker_state(
        self,
        service: str,
        state: str
    ) -> None:
        """
        Record circuit breaker state change.
        
        Args:
            service: Service name (Rekognition, DynamoDB)
            state: Circuit breaker state (OPEN, CLOSED, HALF_OPEN)
        """
        dimensions = {'Service': service, 'State': state}
        
        if state == 'OPEN':
            metric_name = MetricName.CIRCUIT_BREAKER_OPEN.value
        else:
            metric_name = MetricName.CIRCUIT_BREAKER_CLOSED.value
        
        self._put_metric(
            metric_name=metric_name,
            value=1.0,
            unit='Count',
            dimensions=dimensions
        )
    
    def record_processing_time(
        self,
        operation: str,
        time_ms: int
    ) -> None:
        """
        Record processing time metric.
        
        Args:
            operation: Operation name (registration, consent_check, etc.)
            time_ms: Processing time in milliseconds
        """
        dimensions = {'Operation': operation}
        
        self._put_metric(
            metric_name=MetricName.PROCESSING_TIME.value,
            value=float(time_ms),
            unit='Milliseconds',
            dimensions=dimensions
        )
