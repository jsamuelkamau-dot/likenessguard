"""
Risk calculator for computing risk scores based on detected patterns
"""

from typing import List


class RiskCalculator:
    """
    Calculates risk score based on detected patterns.
    
    Risk score is an integer from 0 to 100 based on:
    - Sensitive data types detected
    - Number of data sources accessed
    - Whether the AI service is unknown
    """
    
    def calculate(
        self,
        sensitive_data: List[str],
        data_sources: List[str],
        service: str,
        is_unknown_service: bool = False
    ) -> int:
        """
        Calculate risk score for a request.
        
        Args:
            sensitive_data: List of detected sensitive data types
            data_sources: List of detected data sources
            service: AI service name
            is_unknown_service: Whether the service is unknown
            
        Returns:
            Risk score from 0 to 100
        """
        score = 0
        
        # Base score for sensitive data (10 points per type, max 50)
        score += min(len(sensitive_data) * 10, 50)
        
        # Data source complexity (5 points per source, max 25)
        score += min(len(data_sources) * 5, 25)
        
        # Unknown service penalty (15 points)
        if is_unknown_service:
            score += 15
        
        # High-value sensitive data bonus
        if 'ssn' in sensitive_data or 'credit_card' in sensitive_data:
            score += 10
        
        return min(score, 100)
