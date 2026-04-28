"""
Unit tests for RiskCalculator

These tests verify specific examples and edge cases for risk score calculation,
complementing the property-based tests with concrete scenarios.
"""

import pytest
from interpose.agent.risk_calculator import RiskCalculator


class TestRiskCalculator:
    """Unit tests for RiskCalculator class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.calculator = RiskCalculator()
    
    # Test: Zero data (minimum risk)
    def test_zero_data_minimum_risk(self):
        """
        Test that a request with no sensitive data, no data sources, and a known 
        service results in a risk score of 0 (minimum risk).
        """
        score = self.calculator.calculate(
            sensitive_data=[],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        assert score == 0, f"Expected risk score 0 for zero data, got {score}"
    
    # Test: Maximum sensitive data (capped at 50 points)
    def test_max_sensitive_data_cap(self):
        """
        Test that sensitive data scoring is capped at 50 points (5 types × 10 points).
        Adding more than 5 types should not increase the score beyond the cap.
        """
        # 5 types = 50 points (at cap)
        score_5_types = self.calculator.calculate(
            sensitive_data=['ssn', 'credit_card', 'api_key', 'password', 'email'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # 6 types should still be capped at 50 points for sensitive data component
        # But note: ssn and credit_card add +10 bonus, so total could be 60
        score_6_types = self.calculator.calculate(
            sensitive_data=['ssn', 'credit_card', 'api_key', 'password', 'email', 'phone'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # Both should have the same score since sensitive data is capped at 50
        # and both have ssn/credit_card bonus
        assert score_5_types == score_6_types, \
            f"Expected same score for 5 and 6 sensitive data types (capped), " \
            f"got {score_5_types} and {score_6_types}"
    
    # Test: Maximum data sources (capped at 25 points)
    def test_max_data_sources_cap(self):
        """
        Test that data source scoring is capped at 25 points (5 sources × 5 points).
        Adding more than 5 sources should not increase the score beyond the cap.
        """
        # 5 sources = 25 points (at cap)
        score_5_sources = self.calculator.calculate(
            sensitive_data=[],
            data_sources=['source1', 'source2', 'source3', 'source4', 'source5'],
            service='openai',
            is_unknown_service=False
        )
        
        # 10 sources should still be capped at 25 points
        score_10_sources = self.calculator.calculate(
            sensitive_data=[],
            data_sources=['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'],
            service='openai',
            is_unknown_service=False
        )
        
        assert score_5_sources == score_10_sources == 25, \
            f"Expected score 25 for both (capped), got {score_5_sources} and {score_10_sources}"
    
    # Test: Unknown service penalty (15 points)
    def test_unknown_service_penalty(self):
        """
        Test that an unknown service adds exactly 15 points to the risk score.
        """
        # Known service
        score_known = self.calculator.calculate(
            sensitive_data=[],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # Unknown service
        score_unknown = self.calculator.calculate(
            sensitive_data=[],
            data_sources=[],
            service='unknown',
            is_unknown_service=True
        )
        
        assert score_unknown - score_known == 15, \
            f"Expected unknown service penalty of 15 points, got {score_unknown - score_known}"
    
    # Test: High-value sensitive data bonus (SSN)
    def test_high_value_ssn_bonus(self):
        """
        Test that detecting SSN adds a 10-point bonus on top of the base score.
        """
        # Without SSN
        score_without_ssn = self.calculator.calculate(
            sensitive_data=['email'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # With SSN
        score_with_ssn = self.calculator.calculate(
            sensitive_data=['email', 'ssn'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # Difference should be 10 (base) + 10 (bonus) = 20
        assert score_with_ssn - score_without_ssn == 20, \
            f"Expected SSN to add 20 points (10 base + 10 bonus), " \
            f"got {score_with_ssn - score_without_ssn}"
    
    # Test: High-value sensitive data bonus (credit card)
    def test_high_value_credit_card_bonus(self):
        """
        Test that detecting credit card adds a 10-point bonus on top of the base score.
        """
        # Without credit card
        score_without_card = self.calculator.calculate(
            sensitive_data=['email'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # With credit card
        score_with_card = self.calculator.calculate(
            sensitive_data=['email', 'credit_card'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # Difference should be 10 (base) + 10 (bonus) = 20
        assert score_with_card - score_without_card == 20, \
            f"Expected credit card to add 20 points (10 base + 10 bonus), " \
            f"got {score_with_card - score_without_card}"
    
    # Test: High-value bonus applied only once for both SSN and credit card
    def test_high_value_bonus_not_stacked(self):
        """
        Test that the high-value bonus is applied only once even when both 
        SSN and credit card are present.
        """
        # With SSN only
        score_ssn = self.calculator.calculate(
            sensitive_data=['ssn'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # With both SSN and credit card
        score_both = self.calculator.calculate(
            sensitive_data=['ssn', 'credit_card'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # Difference should be 10 (base for credit card), not 20
        # because bonus is only applied once
        assert score_both - score_ssn == 10, \
            f"Expected credit card to add only 10 points when SSN already present, " \
            f"got {score_both - score_ssn}"
    
    # Test: Maximum possible score (100)
    def test_maximum_score_capped_at_100(self):
        """
        Test that the risk score is capped at 100 even when the sum of all 
        components exceeds 100.
        
        Maximum theoretical score:
        - Sensitive data: 50 (capped)
        - Data sources: 25 (capped)
        - Unknown service: 15
        - High-value bonus: 10
        Total: 100
        """
        score = self.calculator.calculate(
            sensitive_data=['ssn', 'credit_card', 'api_key', 'password', 'email'],
            data_sources=['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'],
            service='unknown',
            is_unknown_service=True
        )
        
        assert score == 100, f"Expected maximum score of 100, got {score}"
    
    # Test: Typical low-risk scenario
    def test_typical_low_risk_scenario(self):
        """
        Test a typical low-risk scenario: known service, one email, one data source.
        Expected: 10 (email) + 5 (one source) = 15
        """
        score = self.calculator.calculate(
            sensitive_data=['email'],
            data_sources=['https://api.example.com/data'],
            service='openai',
            is_unknown_service=False
        )
        
        assert score == 15, f"Expected score 15 for low-risk scenario, got {score}"
    
    # Test: Typical medium-risk scenario
    def test_typical_medium_risk_scenario(self):
        """
        Test a typical medium-risk scenario: known service, 2 sensitive types, 3 sources.
        Expected: 20 (2 types) + 15 (3 sources) = 35
        """
        score = self.calculator.calculate(
            sensitive_data=['email', 'api_key'],
            data_sources=['postgres://db.example.com/users', 'https://api.example.com', '/var/data/file.csv'],
            service='anthropic',
            is_unknown_service=False
        )
        
        assert score == 35, f"Expected score 35 for medium-risk scenario, got {score}"
    
    # Test: Typical high-risk scenario
    def test_typical_high_risk_scenario(self):
        """
        Test a typical high-risk scenario: unknown service, SSN + credit card, 5 sources.
        Expected: 20 (2 types) + 25 (5 sources) + 15 (unknown) + 10 (bonus) = 70
        """
        score = self.calculator.calculate(
            sensitive_data=['ssn', 'credit_card'],
            data_sources=['db1', 'db2', 'db3', 'db4', 'db5'],
            service='unknown',
            is_unknown_service=True
        )
        
        assert score == 70, f"Expected score 70 for high-risk scenario, got {score}"
    
    # Test: Edge case - only unknown service penalty
    def test_only_unknown_service_penalty(self):
        """
        Test that unknown service alone (no sensitive data, no sources) gives 15 points.
        """
        score = self.calculator.calculate(
            sensitive_data=[],
            data_sources=[],
            service='unknown',
            is_unknown_service=True
        )
        
        assert score == 15, f"Expected score 15 for unknown service only, got {score}"
    
    # Test: Edge case - only high-value bonus
    def test_only_high_value_bonus(self):
        """
        Test that SSN alone gives 10 (base) + 10 (bonus) = 20 points.
        """
        score = self.calculator.calculate(
            sensitive_data=['ssn'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        assert score == 20, f"Expected score 20 for SSN only, got {score}"
    
    # Test: Incremental sensitive data scoring
    def test_incremental_sensitive_data_scoring(self):
        """
        Test that each additional sensitive data type adds exactly 10 points 
        (up to the cap).
        """
        # 1 type
        score_1 = self.calculator.calculate(
            sensitive_data=['email'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # 2 types
        score_2 = self.calculator.calculate(
            sensitive_data=['email', 'password'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        # 3 types
        score_3 = self.calculator.calculate(
            sensitive_data=['email', 'password', 'api_key'],
            data_sources=[],
            service='openai',
            is_unknown_service=False
        )
        
        assert score_2 - score_1 == 10, f"Expected 10-point increase, got {score_2 - score_1}"
        assert score_3 - score_2 == 10, f"Expected 10-point increase, got {score_3 - score_2}"
    
    # Test: Incremental data source scoring
    def test_incremental_data_source_scoring(self):
        """
        Test that each additional data source adds exactly 5 points (up to the cap).
        """
        # 1 source
        score_1 = self.calculator.calculate(
            sensitive_data=[],
            data_sources=['source1'],
            service='openai',
            is_unknown_service=False
        )
        
        # 2 sources
        score_2 = self.calculator.calculate(
            sensitive_data=[],
            data_sources=['source1', 'source2'],
            service='openai',
            is_unknown_service=False
        )
        
        # 3 sources
        score_3 = self.calculator.calculate(
            sensitive_data=[],
            data_sources=['source1', 'source2', 'source3'],
            service='openai',
            is_unknown_service=False
        )
        
        assert score_2 - score_1 == 5, f"Expected 5-point increase, got {score_2 - score_1}"
        assert score_3 - score_2 == 5, f"Expected 5-point increase, got {score_3 - score_2}"
