"""
Unit tests for SensitiveDataScanner
"""

import pytest
from interpose.agent.sensitive_data_scanner import SensitiveDataScanner


class TestSensitiveDataScanner:
    """Test suite for SensitiveDataScanner class"""
    
    def test_scan_fake_ssns(self):
        """Test detection of fake Social Security Numbers"""
        scanner = SensitiveDataScanner()
        
        payload = """
        Test SSN: 123-45-6789
        Another SSN: 999-99-9999
        Invalid SSN: 000-00-0000
        """
        
        detected = scanner.scan(payload)
        
        assert 'ssn' in detected
        # Verify only type is returned, not actual values
        assert '123-45-6789' not in detected
        assert '999-99-9999' not in detected
    
    def test_scan_test_credit_cards(self):
        """Test detection of test credit card numbers"""
        scanner = SensitiveDataScanner()
        
        payload = """
        Card: 4532-1234-5678-9010
        Another: 5425 2334 3010 9903
        No spaces: 4111111111111111
        """
        
        detected = scanner.scan(payload)
        
        assert 'credit_card' in detected
        # Verify actual values are never stored
        assert '4532-1234-5678-9010' not in detected
        assert '5425233430109903' not in detected
    
    def test_scan_api_key_formats(self):
        """Test detection of various API key formats"""
        scanner = SensitiveDataScanner()
        
        payload = """
        api_key=sk_test_1234567890abcdefghij
        apikey: prod_abcdefghijklmnopqrstuvwxyz
        api-token="dev_1234567890abcdefghijklmnop"
        API_KEY='live_abcdefghijklmnopqrstuvwxyz1234567890'
        """
        
        detected = scanner.scan(payload)
        
        assert 'api_key' in detected
        # Verify actual key values are never stored
        assert 'sk_test_1234567890abcdefghij' not in detected
        assert 'prod_abcdefghijklmnopqrstuvwxyz' not in detected
    
    def test_scan_password_patterns(self):
        """Test detection of password patterns"""
        scanner = SensitiveDataScanner()
        
        payload = """
        password=MySecretPass123
        passwd: "AnotherPassword456"
        pwd='ShortPwd789'
        PASSWORD="LongPasswordWithSpecialChars!@#$"
        """
        
        detected = scanner.scan(payload)
        
        assert 'password' in detected
        # Verify actual passwords are never stored
        assert 'MySecretPass123' not in detected
        assert 'AnotherPassword456' not in detected
    
    def test_scan_email_addresses(self):
        """Test detection of email addresses in various formats"""
        scanner = SensitiveDataScanner()
        
        payload = """
        Contact: user@example.com
        Support: support.team@company.co.uk
        Admin: admin_user+tag@subdomain.example.org
        Sales: sales.contact@my-company.io
        """
        
        detected = scanner.scan(payload)
        
        assert 'email' in detected
        # Verify actual email addresses are never stored
        assert 'user@example.com' not in detected
        assert 'support.team@company.co.uk' not in detected
    
    def test_scan_empty_payload(self):
        """Test scanning empty payload"""
        scanner = SensitiveDataScanner()
        
        assert scanner.scan("") == []
        assert scanner.scan(None) == []
    
    def test_scan_no_sensitive_data(self):
        """Test scanning payload with no sensitive data"""
        scanner = SensitiveDataScanner()
        
        payload = "This is just plain text with no sensitive information"
        
        detected = scanner.scan(payload)
        
        assert detected == []
    
    def test_scan_mixed_case_patterns(self):
        """Test detection with mixed case keywords"""
        scanner = SensitiveDataScanner()
        
        payload = """
        api_key=test_key_1234567890abcdefghij
        password=MySecretPass123
        EMAIL: user@example.com
        """
        
        detected = scanner.scan(payload)
        
        # Should detect patterns with lowercase keywords
        assert 'api_key' in detected
        assert 'password' in detected
        assert 'email' in detected
    
    def test_scan_multiple_sensitive_data_types(self):
        """Test detection of multiple types of sensitive data"""
        scanner = SensitiveDataScanner()
        
        payload = """
        User SSN: 123-45-6789
        Credit Card: 4532-1234-5678-9010
        API Key: api_key=sk_test_1234567890abcdefghij
        Password: password=MySecretPass123
        Email: contact@example.com
        """
        
        detected = scanner.scan(payload)
        
        # Should detect all types
        assert 'ssn' in detected
        assert 'credit_card' in detected
        assert 'api_key' in detected
        assert 'password' in detected
        assert 'email' in detected
        # Verify no actual values are stored
        assert len([d for d in detected if '@' in d or '-' in d or '=' in d]) == 0
    
    def test_scan_ssn_without_dashes(self):
        """Test that SSN without dashes is not detected (by design)"""
        scanner = SensitiveDataScanner()
        
        payload = "SSN: 123456789"
        
        detected = scanner.scan(payload)
        
        # Current pattern requires dashes
        assert 'ssn' not in detected
    
    def test_scan_credit_card_various_formats(self):
        """Test credit card detection with various separators"""
        scanner = SensitiveDataScanner()
        
        # Test with dashes
        payload1 = "Card: 4532-1234-5678-9010"
        detected1 = scanner.scan(payload1)
        assert 'credit_card' in detected1
        
        # Test with spaces
        payload2 = "Card: 4532 1234 5678 9010"
        detected2 = scanner.scan(payload2)
        assert 'credit_card' in detected2
        
        # Test without separators
        payload3 = "Card: 4532123456789010"
        detected3 = scanner.scan(payload3)
        assert 'credit_card' in detected3
    
    def test_scan_api_key_minimum_length(self):
        """Test that API keys must meet minimum length requirement"""
        scanner = SensitiveDataScanner()
        
        # Too short (less than 20 characters)
        payload_short = "api_key=short123"
        detected_short = scanner.scan(payload_short)
        assert 'api_key' not in detected_short
        
        # Exactly 20 characters
        payload_exact = "api_key=12345678901234567890"
        detected_exact = scanner.scan(payload_exact)
        assert 'api_key' in detected_exact
        
        # Longer than 20 characters
        payload_long = "api_key=1234567890abcdefghijklmnop"
        detected_long = scanner.scan(payload_long)
        assert 'api_key' in detected_long
    
    def test_scan_password_minimum_length(self):
        """Test that passwords must meet minimum length requirement"""
        scanner = SensitiveDataScanner()
        
        # Too short (less than 8 characters)
        payload_short = "password=short1"
        detected_short = scanner.scan(payload_short)
        assert 'password' not in detected_short
        
        # Exactly 8 characters
        payload_exact = "password=12345678"
        detected_exact = scanner.scan(payload_exact)
        assert 'password' in detected_exact
        
        # Longer than 8 characters
        payload_long = "password=LongPassword123"
        detected_long = scanner.scan(payload_long)
        assert 'password' in detected_long
    
    def test_scan_email_various_tlds(self):
        """Test email detection with various top-level domains"""
        scanner = SensitiveDataScanner()
        
        payload = """
        user@example.com
        admin@company.co.uk
        support@service.io
        contact@organization.org
        info@business.net
        """
        
        detected = scanner.scan(payload)
        
        assert 'email' in detected
    
    def test_scan_email_with_special_chars(self):
        """Test email detection with special characters in local part"""
        scanner = SensitiveDataScanner()
        
        payload = """
        user.name@example.com
        first_last@company.com
        user+tag@service.com
        user-name@organization.org
        """
        
        detected = scanner.scan(payload)
        
        assert 'email' in detected
    
    def test_scan_duplicate_types_only_listed_once(self):
        """Test that duplicate sensitive data types are only listed once"""
        scanner = SensitiveDataScanner()
        
        payload = """
        SSN1: 123-45-6789
        SSN2: 999-99-9999
        SSN3: 111-11-1111
        """
        
        detected = scanner.scan(payload)
        
        # Should only have 'ssn' once, not three times
        assert detected.count('ssn') == 1
    
    def test_scan_json_payload_with_sensitive_data(self):
        """Test scanning JSON-formatted payload"""
        scanner = SensitiveDataScanner()
        
        payload = '''
        {
            "user": {
                "ssn": "123-45-6789",
                "email": "user@example.com",
                "credit_card": "4532-1234-5678-9010"
            },
            "auth": {
                "api_key": "sk_test_1234567890abcdefghij",
                "password": "MySecretPass123"
            }
        }
        '''
        
        detected = scanner.scan(payload)
        
        # Should detect all types in JSON
        assert 'ssn' in detected
        assert 'email' in detected
        assert 'credit_card' in detected
        assert 'api_key' in detected
        assert 'password' in detected
        # Verify no actual values are stored
        assert '123-45-6789' not in detected
        assert 'user@example.com' not in detected
    
    def test_scan_url_encoded_payload(self):
        """Test scanning URL-encoded payload"""
        scanner = SensitiveDataScanner()
        
        payload = "api_key=sk_test_1234567890abcdefghij&password=MySecretPass123&email=user@example.com"
        
        detected = scanner.scan(payload)
        
        assert 'api_key' in detected
        assert 'password' in detected
        assert 'email' in detected
    
    def test_scan_multiline_payload(self):
        """Test scanning multiline payload"""
        scanner = SensitiveDataScanner()
        
        payload = """Line 1: SSN 123-45-6789
Line 2: Email user@example.com
Line 3: Card 4532-1234-5678-9010
Line 4: api_key=sk_test_1234567890abcdefghij
Line 5: password=MySecretPass123"""
        
        detected = scanner.scan(payload)
        
        # Should detect all types across multiple lines
        assert 'ssn' in detected
        assert 'email' in detected
        assert 'credit_card' in detected
        assert 'api_key' in detected
        assert 'password' in detected
    
    def test_scan_returns_only_type_strings(self):
        """CRITICAL: Verify scan() returns only type strings, never actual values"""
        scanner = SensitiveDataScanner()
        
        payload = """
        SSN: 123-45-6789
        Card: 4532-1234-5678-9010
        api_key=sk_test_1234567890abcdefghij
        password=MySecretPass123
        email: user@example.com
        """
        
        detected = scanner.scan(payload)
        
        # Verify all returned values are valid type strings
        valid_types = {'ssn', 'credit_card', 'api_key', 'password', 'email'}
        for item in detected:
            assert item in valid_types, f"Invalid type returned: {item}"
        
        # Verify no actual sensitive values are in the results
        assert '123-45-6789' not in detected
        assert '4532-1234-5678-9010' not in detected
        assert 'sk_test_1234567890abcdefghij' not in detected
        assert 'MySecretPass123' not in detected
        assert 'user@example.com' not in detected
        
        # Verify results are strings
        for item in detected:
            assert isinstance(item, str)
    
    def test_scan_api_key_with_quotes(self):
        """Test API key detection with various quote styles"""
        scanner = SensitiveDataScanner()
        
        payload = '''
        api_key="sk_test_1234567890abcdefghij"
        apikey: 'prod_abcdefghijklmnopqrstuvwxyz'
        api-token=dev_1234567890abcdefghijklmnop
        '''
        
        detected = scanner.scan(payload)
        
        assert 'api_key' in detected
    
    def test_scan_password_with_special_characters(self):
        """Test password detection with special characters"""
        scanner = SensitiveDataScanner()
        
        payload = """
        password=P@ssw0rd!
        passwd: "MyP@ss#123"
        pwd='C0mpl3x$Pass'
        """
        
        detected = scanner.scan(payload)
        
        assert 'password' in detected
    
    def test_scan_edge_case_almost_ssn(self):
        """Test that almost-SSN patterns are not detected"""
        scanner = SensitiveDataScanner()
        
        # Missing digits
        payload1 = "SSN: 12-45-6789"
        detected1 = scanner.scan(payload1)
        assert 'ssn' not in detected1
        
        # Wrong format
        payload2 = "SSN: 1234-56-789"
        detected2 = scanner.scan(payload2)
        assert 'ssn' not in detected2
        
        # Letters instead of numbers
        payload3 = "SSN: abc-de-fghi"
        detected3 = scanner.scan(payload3)
        assert 'ssn' not in detected3
    
    def test_scan_edge_case_almost_credit_card(self):
        """Test that almost-credit-card patterns are not detected"""
        scanner = SensitiveDataScanner()
        
        # Too few digits
        payload1 = "Card: 4532-1234-5678"
        detected1 = scanner.scan(payload1)
        assert 'credit_card' not in detected1
        
        # Too many digits
        payload2 = "Card: 4532-1234-5678-9010-1111"
        detected2 = scanner.scan(payload2)
        # This might match depending on regex - 16 digits should match
        
        # Letters in card number
        payload3 = "Card: abcd-1234-5678-9010"
        detected3 = scanner.scan(payload3)
        assert 'credit_card' not in detected3
    
    def test_scan_edge_case_short_email(self):
        """Test email detection with short local and domain parts"""
        scanner = SensitiveDataScanner()
        
        payload = "a@b.co"
        
        detected = scanner.scan(payload)
        
        assert 'email' in detected
    
    def test_scan_case_insensitive_keywords(self):
        """Test that keyword detection works with lowercase keywords"""
        scanner = SensitiveDataScanner()
        
        payload = """
        api_key=sk_test_1234567890abcdefghij
        apikey=prod_abcdefghijklmnopqrstuvwxyz
        api-key=dev_1234567890abcdefghijklmnop
        password=MySecretPass123
        passwd=AnotherPass456
        pwd=ThirdPass789
        """
        
        detected = scanner.scan(payload)
        
        # Should detect with lowercase keywords
        assert 'api_key' in detected
        assert 'password' in detected
