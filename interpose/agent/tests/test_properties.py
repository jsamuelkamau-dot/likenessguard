"""
Property-based tests for Interpose Agent using Hypothesis

These tests validate correctness properties from the design document
by testing behaviors across a wide range of generated inputs.
"""

import pytest
from hypothesis import given, strategies as st, settings
from interpose.agent import InterposeAgent


# Feature: interpose-saas-platform, Property 1: Request Interception Completeness
# **Validates: Requirements 2.1**
@settings(max_examples=20)
@given(
    method=st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
    url=st.sampled_from([
        'https://api.openai.com/v1/chat/completions',
        'https://api.anthropic.com/v1/messages',
        'https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke',
        'http://localhost:8000/v1/completions',
        'https://api.example.com/ai/generate'
    ]),
    headers=st.dictionaries(
        keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))),
        values=st.text(min_size=1, max_size=50),
        min_size=0,
        max_size=5
    ),
    body=st.one_of(
        st.none(),
        st.dictionaries(
            keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))),
            values=st.one_of(
                st.text(min_size=0, max_size=100),
                st.integers(),
                st.booleans()
            ),
            min_size=0,
            max_size=10
        )
    )
)
def test_property_request_interception_completeness(method, url, headers, body):
    """
    Property 1: Request Interception Completeness
    
    For any HTTP request made to an AI service endpoint, the Interpose_Agent 
    should intercept the request before it reaches the destination and create 
    a log entry with all required fields.
    
    This test verifies that:
    1. intercept_request is called for each request
    2. The intercepted data contains all required fields (method, url, headers, body)
    3. The returned data matches the input data
    """
    # Arrange
    agent = InterposeAgent(api_key="test-api-key")
    
    request_data = {
        'method': method,
        'url': url,
        'headers': headers,
        'body': body
    }
    
    # Act
    result = agent.intercept_request(request_data)
    
    # Assert - Verify all required fields are present in the result
    assert 'method' in result, "Intercepted data must contain 'method' field"
    assert 'url' in result, "Intercepted data must contain 'url' field"
    assert 'headers' in result, "Intercepted data must contain 'headers' field"
    assert 'body' in result, "Intercepted data must contain 'body' field"
    
    # Assert - Verify the intercepted data matches the input
    assert result['method'] == method, f"Method should be {method}, got {result['method']}"
    assert result['url'] == url, f"URL should be {url}, got {result['url']}"
    assert result['headers'] == headers, f"Headers should be {headers}, got {result['headers']}"
    assert result['body'] == body, f"Body should be {body}, got {result['body']}"


# Feature: interpose-saas-platform, Property 2: AI Service Detection Accuracy
# **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
@st.composite
def ai_service_url(draw):
    """
    Generate URLs for known AI services with various formats.
    
    Generates URLs for OpenAI, Anthropic, AWS Bedrock, and local LLM services
    with different protocols (http/https), paths, and query parameters.
    """
    service = draw(st.sampled_from(['openai', 'anthropic', 'bedrock', 'local']))
    protocol = draw(st.sampled_from(['http', 'https']))
    path = draw(st.text(
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='/-_'),
        min_size=1,
        max_size=50
    ))
    
    # Generate query parameters (optional)
    has_query = draw(st.booleans())
    query_string = ''
    if has_query:
        query_params = draw(st.dictionaries(
            keys=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('L', 'N'))),
            values=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('L', 'N'))),
            min_size=1,
            max_size=3
        ))
        query_string = '?' + '&'.join(f"{k}={v}" for k, v in query_params.items())
    
    if service == 'openai':
        domain = draw(st.sampled_from(['api.openai.com', 'openai.azure.com']))
        return (service, f"{protocol}://{domain}/{path}{query_string}")
    elif service == 'anthropic':
        return (service, f"{protocol}://api.anthropic.com/{path}{query_string}")
    elif service == 'bedrock':
        region = draw(st.sampled_from(['us-east-1', 'us-west-2', 'eu-west-1']))
        domain = draw(st.sampled_from([
            f'bedrock-runtime.{region}.amazonaws.com',
            f'bedrock.{region}.amazonaws.com'
        ]))
        return (service, f"{protocol}://{domain}/{path}{query_string}")
    else:  # local
        port = draw(st.integers(min_value=1024, max_value=65535))
        host = draw(st.sampled_from(['localhost', '127.0.0.1', '0.0.0.0']))
        return (service, f"{protocol}://{host}:{port}/{path}{query_string}")


@settings(max_examples=20)
@given(service_url_pair=ai_service_url())
def test_property_ai_service_detection_accuracy(service_url_pair):
    """
    Property 2: AI Service Detection Accuracy
    
    For any HTTP request to a known AI service endpoint (OpenAI, Anthropic, 
    AWS Bedrock, or local LLM), the agent should correctly identify the service 
    type and extract both the service name and endpoint URL.
    
    This test verifies that:
    1. ServiceDetector.detect() correctly identifies the service from the URL
    2. Detection works across various URL formats (http/https, different paths, query parameters)
    3. The detected service name matches the expected service
    """
    from interpose.agent.service_detector import ServiceDetector
    
    # Arrange
    expected_service, url = service_url_pair
    detector = ServiceDetector()
    
    # Act
    detected_service = detector.detect(url)
    
    # Assert - Verify the detected service matches the expected service
    assert detected_service == expected_service, \
        f"Expected service '{expected_service}' for URL '{url}', but detected '{detected_service}'"


# Feature: interpose-saas-platform, Property 3: Data Source Extraction Completeness
# **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
@st.composite
def payload_with_data_sources(draw):
    """
    Generate payloads containing various data source references.
    
    Generates payloads with combinations of:
    - Database connection strings (postgres, mysql, mongodb, redis)
    - File paths (Unix and Windows formats)
    - API endpoints (http/https URLs)
    - SQL queries (SELECT, INSERT, UPDATE, DELETE)
    
    Returns a tuple of (expected_data_sources, payload_text)
    """
    data_sources = []
    payload_parts = []
    
    # Add some base text
    base_text = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?',
        min_size=10,
        max_size=100
    ))
    payload_parts.append(base_text)
    
    # Generate database connection strings (0-3)
    num_databases = draw(st.integers(min_value=0, max_value=3))
    for _ in range(num_databases):
        db_type = draw(st.sampled_from(['postgres', 'mysql', 'mongodb', 'redis']))
        host = draw(st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-',
            min_size=5,
            max_size=20
        ))
        port = draw(st.integers(min_value=1024, max_value=65535))
        db_name = draw(st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
            min_size=3,
            max_size=15
        ))
        db_conn = f"{db_type}://{host}:{port}/{db_name}"
        data_sources.append(db_conn)
        payload_parts.append(f"Connect to {db_conn} for data")
    
    # Generate file paths (0-3)
    num_files = draw(st.integers(min_value=0, max_value=3))
    for _ in range(num_files):
        is_windows = draw(st.booleans())
        if is_windows:
            drive = draw(st.sampled_from(['C', 'D', 'E']))
            path_parts = draw(st.lists(
                st.text(
                    alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
                    min_size=3,
                    max_size=10
                ),
                min_size=1,
                max_size=4
            ))
            file_path = f"{drive}:\\" + "\\".join(path_parts)
        else:
            path_parts = draw(st.lists(
                st.text(
                    alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.',
                    min_size=3,
                    max_size=10
                ),
                min_size=1,
                max_size=4
            ))
            file_path = "/" + "/".join(path_parts)
        
        data_sources.append(file_path)
        payload_parts.append(f"Read from {file_path}")
    
    # Generate API endpoints (0-3)
    num_apis = draw(st.integers(min_value=0, max_value=3))
    for _ in range(num_apis):
        protocol = draw(st.sampled_from(['http', 'https']))
        domain = draw(st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-',
            min_size=5,
            max_size=20
        ))
        path = draw(st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-_',
            min_size=3,
            max_size=20
        ))
        api_url = f"{protocol}://{domain}/{path}"
        data_sources.append(api_url)
        payload_parts.append(f"Call API at {api_url}")
    
    # Generate SQL queries (0-2)
    num_queries = draw(st.integers(min_value=0, max_value=2))
    for _ in range(num_queries):
        query_type = draw(st.sampled_from(['SELECT', 'INSERT', 'UPDATE', 'DELETE']))
        table_name = draw(st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
            min_size=3,
            max_size=15
        ))
        
        # Build SQL query with additional content after FROM to test extraction
        if query_type == 'SELECT':
            sql_query = f"{query_type} * FROM {table_name} WHERE id=1"
            # The regex pattern captures up to and including FROM, so we expect this:
            expected_match = f"{query_type} * FROM"
        elif query_type == 'INSERT':
            sql_query = f"{query_type} INTO {table_name} VALUES (1, 2) FROM dual"
            expected_match = f"{query_type} INTO {table_name} VALUES (1, 2) FROM"
        elif query_type == 'UPDATE':
            sql_query = f"{query_type} {table_name} SET col=1 FROM {table_name}"
            expected_match = f"{query_type} {table_name} SET col=1 FROM"
        else:  # DELETE
            sql_query = f"{query_type} FROM {table_name}"
            expected_match = f"{query_type} FROM"
        
        data_sources.append(expected_match)
        payload_parts.append(f"Execute: {sql_query}")
    
    # Shuffle the parts to create varied payload structures
    # Use draw to get a permutation instead of random.shuffle
    indices = list(range(len(payload_parts)))
    shuffled_indices = draw(st.permutations(indices))
    shuffled_parts = [payload_parts[i] for i in shuffled_indices]
    payload = " ".join(shuffled_parts)
    
    return (data_sources, payload)


@settings(max_examples=20)
@given(data_source_payload=payload_with_data_sources())
def test_property_data_source_extraction_completeness(data_source_payload):
    """
    Property 3: Data Source Extraction Completeness
    
    For any request payload containing data source references (database connection 
    strings, API endpoints, file paths, or SQL queries), the agent should detect 
    and extract all data source references into the log entry.
    
    This test verifies that:
    1. DataSourceExtractor.extract() finds all embedded data sources
    2. Detection works for databases (postgres, mysql, mongodb, redis)
    3. Detection works for file paths (Unix and Windows formats)
    4. Detection works for API endpoints (http/https)
    5. Detection works for SQL queries (SELECT, INSERT, UPDATE, DELETE)
    6. All expected data sources are present in the extracted results
    """
    from interpose.agent.data_source_extractor import DataSourceExtractor
    
    # Arrange
    expected_data_sources, payload = data_source_payload
    extractor = DataSourceExtractor()
    
    # Act
    extracted_data_sources = extractor.extract(payload)
    
    # Deduplicate expected sources to match extractor behavior
    unique_expected_sources = list(set(expected_data_sources))
    
    # Assert - Verify all expected data sources are detected
    for expected_source in unique_expected_sources:
        assert expected_source in extracted_data_sources, \
            f"Expected data source '{expected_source}' not found in extracted sources: {extracted_data_sources}"
    
    # Assert - Verify the count matches (no missing sources)
    assert len(extracted_data_sources) >= len(unique_expected_sources), \
        f"Expected at least {len(unique_expected_sources)} data sources, but found {len(extracted_data_sources)}"


# Feature: interpose-saas-platform, Property 4: Sensitive Data Detection Completeness
# **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
@st.composite
def payload_with_sensitive_data(draw):
    """
    Generate payloads containing various sensitive data types.
    
    Generates payloads with combinations of:
    - SSN (Social Security Numbers)
    - Credit card numbers
    - API keys
    - Passwords
    - Email addresses
    
    Returns a tuple of (expected_sensitive_types, payload_text)
    """
    sensitive_types = []
    payload_parts = []
    
    # Add some base text
    base_text = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?',
        min_size=10,
        max_size=100
    ))
    payload_parts.append(base_text)
    
    # Generate SSNs (0-3)
    num_ssns = draw(st.integers(min_value=0, max_value=3))
    if num_ssns > 0:
        sensitive_types.append('ssn')
        for _ in range(num_ssns):
            # Generate valid SSN format: XXX-XX-XXXX
            area = draw(st.integers(min_value=100, max_value=999))
            group = draw(st.integers(min_value=10, max_value=99))
            serial = draw(st.integers(min_value=1000, max_value=9999))
            ssn = f"{area}-{group}-{serial}"
            payload_parts.append(f"SSN: {ssn}")
    
    # Generate credit card numbers (0-3)
    num_cards = draw(st.integers(min_value=0, max_value=3))
    if num_cards > 0:
        sensitive_types.append('credit_card')
        for _ in range(num_cards):
            # Generate credit card format: XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXX
            use_dashes = draw(st.booleans())
            if use_dashes:
                part1 = draw(st.integers(min_value=1000, max_value=9999))
                part2 = draw(st.integers(min_value=1000, max_value=9999))
                part3 = draw(st.integers(min_value=1000, max_value=9999))
                part4 = draw(st.integers(min_value=1000, max_value=9999))
                separator = draw(st.sampled_from(['-', ' ', '']))
                card = f"{part1}{separator}{part2}{separator}{part3}{separator}{part4}"
            else:
                card = str(draw(st.integers(min_value=1000000000000000, max_value=9999999999999999)))
            payload_parts.append(f"Card: {card}")
    
    # Generate API keys (0-3)
    num_api_keys = draw(st.integers(min_value=0, max_value=3))
    if num_api_keys > 0:
        sensitive_types.append('api_key')
        for _ in range(num_api_keys):
            # Generate API key patterns
            key_prefix = draw(st.sampled_from(['api_key', 'apikey', 'api-key', 'api_token', 'api-token']))
            separator = draw(st.sampled_from([':', '=']))
            quote = draw(st.sampled_from(['', '"', "'"]))
            key_value = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
                min_size=20,
                max_size=40
            ))
            api_key = f"{key_prefix}{quote} {separator} {quote}{key_value}{quote}"
            payload_parts.append(api_key)
    
    # Generate passwords (0-3)
    num_passwords = draw(st.integers(min_value=0, max_value=3))
    if num_passwords > 0:
        sensitive_types.append('password')
        for _ in range(num_passwords):
            # Generate password patterns
            pwd_prefix = draw(st.sampled_from(['password', 'passwd', 'pwd']))
            separator = draw(st.sampled_from([':', '=']))
            quote = draw(st.sampled_from(['', '"', "'"]))
            pwd_value = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
                min_size=8,
                max_size=20
            ))
            password = f"{pwd_prefix}{quote} {separator} {quote}{pwd_value}{quote}"
            payload_parts.append(password)
    
    # Generate email addresses (0-3)
    num_emails = draw(st.integers(min_value=0, max_value=3))
    if num_emails > 0:
        sensitive_types.append('email')
        for _ in range(num_emails):
            # Generate email format: user@domain.tld
            username = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
                min_size=3,
                max_size=15
            ))
            domain = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
                min_size=3,
                max_size=15
            ))
            tld = draw(st.sampled_from(['com', 'org', 'net', 'edu', 'gov', 'io', 'co']))
            email = f"{username}@{domain}.{tld}"
            payload_parts.append(f"Email: {email}")
    
    # Shuffle the parts to create varied payload structures
    indices = list(range(len(payload_parts)))
    shuffled_indices = draw(st.permutations(indices))
    shuffled_parts = [payload_parts[i] for i in shuffled_indices]
    payload = " ".join(shuffled_parts)
    
    # Remove duplicates from sensitive_types while preserving order
    unique_types = []
    for t in sensitive_types:
        if t not in unique_types:
            unique_types.append(t)
    
    return (unique_types, payload)


@settings(max_examples=20)
@given(sensitive_data_payload=payload_with_sensitive_data())
def test_property_sensitive_data_detection_completeness(sensitive_data_payload):
    """
    Property 4: Sensitive Data Detection Completeness
    
    For any request payload containing sensitive data patterns (SSN, credit card 
    numbers, API keys, passwords, or email addresses), the agent should detect 
    all sensitive data types present.
    
    This test verifies that:
    1. SensitiveDataScanner.scan() finds all embedded sensitive data types
    2. Detection works for SSNs (format: XXX-XX-XXXX)
    3. Detection works for credit cards (16 digits with optional separators)
    4. Detection works for API keys (various key=value patterns)
    5. Detection works for passwords (various password=value patterns)
    6. Detection works for email addresses (user@domain.tld)
    7. All expected sensitive data types are present in the scan results
    """
    from interpose.agent.sensitive_data_scanner import SensitiveDataScanner
    
    # Arrange
    expected_types, payload = sensitive_data_payload
    scanner = SensitiveDataScanner()
    
    # Act
    detected_types = scanner.scan(payload)
    
    # Assert - Verify all expected sensitive data types are detected
    for expected_type in expected_types:
        assert expected_type in detected_types, \
            f"Expected sensitive data type '{expected_type}' not found in detected types: {detected_types}\nPayload: {payload}"
    
    # Assert - Verify the count matches (no missing types)
    assert len(detected_types) >= len(expected_types), \
        f"Expected at least {len(expected_types)} sensitive data types, but found {len(detected_types)}\nExpected: {expected_types}\nDetected: {detected_types}\nPayload: {payload}"


# Feature: interpose-saas-platform, Property 5: Sensitive Data Privacy Preservation
# **Validates: Requirements 4.6**
@st.composite
def payload_with_actual_sensitive_values(draw):
    """
    Generate payloads containing actual sensitive values.
    
    Generates payloads with real sensitive data values (SSNs, credit cards, 
    API keys, passwords, emails) that should be detected but never stored.
    
    Returns a tuple of (expected_types, actual_values, payload_text)
    """
    sensitive_types = []
    actual_values = []
    payload_parts = []
    
    # Add some base text
    base_text = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?',
        min_size=10,
        max_size=100
    ))
    payload_parts.append(base_text)
    
    # Generate SSNs (1-3)
    num_ssns = draw(st.integers(min_value=1, max_value=3))
    if num_ssns > 0:
        sensitive_types.append('ssn')
        for _ in range(num_ssns):
            # Generate valid SSN format: XXX-XX-XXXX
            area = draw(st.integers(min_value=100, max_value=999))
            group = draw(st.integers(min_value=10, max_value=99))
            serial = draw(st.integers(min_value=1000, max_value=9999))
            ssn = f"{area}-{group}-{serial}"
            actual_values.append(ssn)
            payload_parts.append(f"SSN: {ssn}")
    
    # Generate credit card numbers (1-3)
    num_cards = draw(st.integers(min_value=1, max_value=3))
    if num_cards > 0:
        sensitive_types.append('credit_card')
        for _ in range(num_cards):
            # Generate credit card format: XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXX
            use_dashes = draw(st.booleans())
            if use_dashes:
                part1 = draw(st.integers(min_value=1000, max_value=9999))
                part2 = draw(st.integers(min_value=1000, max_value=9999))
                part3 = draw(st.integers(min_value=1000, max_value=9999))
                part4 = draw(st.integers(min_value=1000, max_value=9999))
                separator = draw(st.sampled_from(['-', ' ', '']))
                card = f"{part1}{separator}{part2}{separator}{part3}{separator}{part4}"
            else:
                card = str(draw(st.integers(min_value=1000000000000000, max_value=9999999999999999)))
            actual_values.append(card)
            payload_parts.append(f"Card: {card}")
    
    # Generate API keys (1-3)
    num_api_keys = draw(st.integers(min_value=1, max_value=3))
    if num_api_keys > 0:
        sensitive_types.append('api_key')
        for _ in range(num_api_keys):
            # Generate API key patterns
            key_prefix = draw(st.sampled_from(['api_key', 'apikey', 'api-key', 'api_token', 'api-token']))
            separator = draw(st.sampled_from([':', '=']))
            quote = draw(st.sampled_from(['', '"', "'"]))
            key_value = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
                min_size=20,
                max_size=40
            ))
            actual_values.append(key_value)
            api_key = f"{key_prefix}{quote} {separator} {quote}{key_value}{quote}"
            payload_parts.append(api_key)
    
    # Generate passwords (1-3)
    num_passwords = draw(st.integers(min_value=1, max_value=3))
    if num_passwords > 0:
        sensitive_types.append('password')
        for _ in range(num_passwords):
            # Generate password patterns
            pwd_prefix = draw(st.sampled_from(['password', 'passwd', 'pwd']))
            separator = draw(st.sampled_from([':', '=']))
            quote = draw(st.sampled_from(['', '"', "'"]))
            pwd_value = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
                min_size=8,
                max_size=20
            ))
            actual_values.append(pwd_value)
            password = f"{pwd_prefix}{quote} {separator} {quote}{pwd_value}{quote}"
            payload_parts.append(password)
    
    # Generate email addresses (1-3)
    num_emails = draw(st.integers(min_value=1, max_value=3))
    if num_emails > 0:
        sensitive_types.append('email')
        for _ in range(num_emails):
            # Generate email format: user@domain.tld
            username = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
                min_size=3,
                max_size=15
            ))
            domain = draw(st.text(
                alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
                min_size=3,
                max_size=15
            ))
            tld = draw(st.sampled_from(['com', 'org', 'net', 'edu', 'gov', 'io', 'co']))
            email = f"{username}@{domain}.{tld}"
            actual_values.append(email)
            payload_parts.append(f"Email: {email}")
    
    # Shuffle the parts to create varied payload structures
    indices = list(range(len(payload_parts)))
    shuffled_indices = draw(st.permutations(indices))
    shuffled_parts = [payload_parts[i] for i in shuffled_indices]
    payload = " ".join(shuffled_parts)
    
    # Remove duplicates from sensitive_types while preserving order
    unique_types = []
    for t in sensitive_types:
        if t not in unique_types:
            unique_types.append(t)
    
    return (unique_types, actual_values, payload)


@settings(max_examples=20)
@given(sensitive_payload=payload_with_actual_sensitive_values())
def test_property_sensitive_data_privacy_preservation(sensitive_payload):
    """
    Property 5: Sensitive Data Privacy Preservation
    
    For any detected sensitive data, the log entry should contain the data type 
    classification (e.g., 'ssn', 'credit_card') but must not contain the actual 
    sensitive value itself.
    
    This test verifies that:
    1. SensitiveDataScanner.scan() returns only data type strings
    2. The returned list contains the expected data types
    3. NO actual sensitive values appear in the returned list
    4. The scanner preserves privacy by never exposing actual sensitive data
    """
    from interpose.agent.sensitive_data_scanner import SensitiveDataScanner
    
    # Arrange
    expected_types, actual_values, payload = sensitive_payload
    scanner = SensitiveDataScanner()
    
    # Act
    detected_types = scanner.scan(payload)
    
    # Assert - Verify all expected types are detected
    for expected_type in expected_types:
        assert expected_type in detected_types, \
            f"Expected sensitive data type '{expected_type}' not found in detected types: {detected_types}"
    
    # Assert - CRITICAL: Verify NO actual sensitive values appear in the result
    for actual_value in actual_values:
        # Check that the actual sensitive value is not in the detected_types list
        assert actual_value not in detected_types, \
            f"PRIVACY VIOLATION: Actual sensitive value '{actual_value}' found in detected types: {detected_types}"
        
        # Also check that no element in detected_types contains the actual value
        for detected_type in detected_types:
            assert actual_value not in str(detected_type), \
                f"PRIVACY VIOLATION: Actual sensitive value '{actual_value}' found within detected type '{detected_type}'"
    
    # Assert - Verify detected_types contains only valid type strings
    valid_types = ['ssn', 'credit_card', 'api_key', 'password', 'email']
    for detected_type in detected_types:
        assert detected_type in valid_types, \
            f"Invalid data type '{detected_type}' in results. Expected one of: {valid_types}"
    
    # Assert - Verify detected_types is a list of strings, not actual values
    assert all(isinstance(dt, str) for dt in detected_types), \
        f"All detected types must be strings, got: {[type(dt) for dt in detected_types]}"
    
    # Assert - Verify detected_types are short classification strings (not long values)
    for detected_type in detected_types:
        assert len(detected_type) <= 20, \
            f"Detected type '{detected_type}' is too long ({len(detected_type)} chars). Expected short classification strings."


# Feature: interpose-saas-platform, Property 6: Risk Score Boundary Constraint
# **Validates: Requirements 5.1, 5.5**
@settings(max_examples=20)
@given(
    sensitive_data=st.lists(
        st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
        min_size=0,
        max_size=10
    ),
    data_sources=st.lists(
        st.text(min_size=5, max_size=50),
        min_size=0,
        max_size=20
    ),
    service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
    is_unknown_service=st.booleans()
)
def test_property_risk_score_boundary_constraint(sensitive_data, data_sources, service, is_unknown_service):
    """
    Property 6: Risk Score Boundary Constraint
    
    For any log entry created by the agent, the calculated risk score must be 
    an integer within the range [0, 100] inclusive.
    
    This test verifies that:
    1. RiskCalculator.calculate() always returns an integer
    2. The risk score is never less than 0
    3. The risk score is never greater than 100
    4. The boundary constraint holds for all combinations of inputs
    """
    from interpose.agent.risk_calculator import RiskCalculator
    
    # Arrange
    calculator = RiskCalculator()
    
    # Act
    risk_score = calculator.calculate(
        sensitive_data=sensitive_data,
        data_sources=data_sources,
        service=service,
        is_unknown_service=is_unknown_service
    )
    
    # Assert - Verify risk score is an integer
    assert isinstance(risk_score, int), \
        f"Risk score must be an integer, got {type(risk_score)}"
    
    # Assert - Verify risk score is within bounds [0, 100]
    assert 0 <= risk_score <= 100, \
        f"Risk score must be in range [0, 100], got {risk_score} for inputs: " \
        f"sensitive_data={sensitive_data}, data_sources={data_sources}, " \
        f"service={service}, is_unknown_service={is_unknown_service}"


# Feature: interpose-saas-platform, Property 7: Risk Score Monotonicity - Sensitive Data
# **Validates: Requirements 5.2**
@settings(max_examples=20)
@given(
    base_sensitive_data=st.lists(
        st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
        min_size=0,
        max_size=5,
        unique=True
    ),
    additional_sensitive_data=st.lists(
        st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
        min_size=1,
        max_size=5,
        unique=True
    ),
    data_sources=st.lists(
        st.text(min_size=5, max_size=50),
        min_size=0,
        max_size=10
    ),
    service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local']),
    is_unknown_service=st.booleans()
)
def test_property_risk_score_monotonicity_sensitive_data(
    base_sensitive_data, additional_sensitive_data, data_sources, service, is_unknown_service
):
    """
    Property 7: Risk Score Monotonicity - Sensitive Data
    
    For any two payloads where payload A contains a strict superset of the 
    sensitive data types found in payload B (and all other factors are equal), 
    the risk score for payload A should be greater than or equal to the risk 
    score for payload B.
    
    This test verifies that:
    1. More sensitive data types → higher or equal risk score
    2. The monotonicity property holds when all other factors are constant
    3. Adding sensitive data never decreases the risk score
    """
    from interpose.agent.risk_calculator import RiskCalculator
    
    # Arrange
    calculator = RiskCalculator()
    
    # Create payload B with base sensitive data
    payload_b_sensitive = base_sensitive_data
    
    # Create payload A with base + additional sensitive data (strict superset)
    # Filter out any items in additional that are already in base
    additional_unique = [item for item in additional_sensitive_data if item not in base_sensitive_data]
    
    # Skip test if no additional unique items (not a strict superset)
    if not additional_unique:
        return
    
    payload_a_sensitive = base_sensitive_data + additional_unique
    
    # Act - Calculate risk scores with identical other factors
    score_b = calculator.calculate(
        sensitive_data=payload_b_sensitive,
        data_sources=data_sources,
        service=service,
        is_unknown_service=is_unknown_service
    )
    
    score_a = calculator.calculate(
        sensitive_data=payload_a_sensitive,
        data_sources=data_sources,
        service=service,
        is_unknown_service=is_unknown_service
    )
    
    # Assert - Verify monotonicity: more sensitive data → higher or equal score
    assert score_a >= score_b, \
        f"Monotonicity violation: Payload A (with more sensitive data) has lower risk score. " \
        f"Score A: {score_a}, Score B: {score_b}. " \
        f"Payload A sensitive data: {payload_a_sensitive}, " \
        f"Payload B sensitive data: {payload_b_sensitive}"


# Feature: interpose-saas-platform, Property 8: Risk Score Monotonicity - Data Sources
# **Validates: Requirements 5.3**
@settings(max_examples=20)
@given(
    sensitive_data=st.lists(
        st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
        min_size=0,
        max_size=5
    ),
    base_data_sources=st.lists(
        st.text(min_size=5, max_size=50),
        min_size=0,
        max_size=5,
        unique=True
    ),
    additional_data_sources=st.lists(
        st.text(min_size=5, max_size=50),
        min_size=1,
        max_size=5,
        unique=True
    ),
    service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local']),
    is_unknown_service=st.booleans()
)
def test_property_risk_score_monotonicity_data_sources(
    sensitive_data, base_data_sources, additional_data_sources, service, is_unknown_service
):
    """
    Property 8: Risk Score Monotonicity - Data Sources
    
    For any two payloads where payload A references more data sources than 
    payload B (and all other factors are equal), the risk score for payload A 
    should be greater than or equal to the risk score for payload B.
    
    This test verifies that:
    1. More data sources → higher or equal risk score
    2. The monotonicity property holds when all other factors are constant
    3. Adding data sources never decreases the risk score
    """
    from interpose.agent.risk_calculator import RiskCalculator
    
    # Arrange
    calculator = RiskCalculator()
    
    # Create payload B with base data sources
    payload_b_sources = base_data_sources
    
    # Create payload A with base + additional data sources (more sources)
    # Filter out any items in additional that are already in base
    additional_unique = [item for item in additional_data_sources if item not in base_data_sources]
    
    # Skip test if no additional unique items (not strictly more)
    if not additional_unique:
        return
    
    payload_a_sources = base_data_sources + additional_unique
    
    # Act - Calculate risk scores with identical other factors
    score_b = calculator.calculate(
        sensitive_data=sensitive_data,
        data_sources=payload_b_sources,
        service=service,
        is_unknown_service=is_unknown_service
    )
    
    score_a = calculator.calculate(
        sensitive_data=sensitive_data,
        data_sources=payload_a_sources,
        service=service,
        is_unknown_service=is_unknown_service
    )
    
    # Assert - Verify monotonicity: more data sources → higher or equal score
    assert score_a >= score_b, \
        f"Monotonicity violation: Payload A (with more data sources) has lower risk score. " \
        f"Score A: {score_a}, Score B: {score_b}. " \
        f"Payload A data sources count: {len(payload_a_sources)}, " \
        f"Payload B data sources count: {len(payload_b_sources)}"


# Feature: interpose-saas-platform, Property 9: Risk Score Unknown Service Penalty
# **Validates: Requirements 5.4**
@settings(max_examples=20)
@given(
    sensitive_data=st.lists(
        st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
        min_size=0,
        max_size=5
    ),
    data_sources=st.lists(
        st.text(min_size=5, max_size=50),
        min_size=0,
        max_size=10
    ),
    known_service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local'])
)
def test_property_risk_score_unknown_service_penalty(sensitive_data, data_sources, known_service):
    """
    Property 9: Risk Score Unknown Service Penalty
    
    For any two otherwise identical requests where one targets an unknown AI 
    service and the other targets a known service, the unknown service request 
    should have a higher risk score.
    
    This test verifies that:
    1. Unknown service → higher risk score than known service
    2. The penalty is applied consistently
    3. All other factors being equal, unknown services are riskier
    """
    from interpose.agent.risk_calculator import RiskCalculator
    
    # Arrange
    calculator = RiskCalculator()
    
    # Act - Calculate risk score for known service
    score_known = calculator.calculate(
        sensitive_data=sensitive_data,
        data_sources=data_sources,
        service=known_service,
        is_unknown_service=False
    )
    
    # Act - Calculate risk score for unknown service (same other factors)
    score_unknown = calculator.calculate(
        sensitive_data=sensitive_data,
        data_sources=data_sources,
        service='unknown',
        is_unknown_service=True
    )
    
    # Assert - Verify unknown service has higher risk score
    assert score_unknown > score_known, \
        f"Unknown service penalty not applied: Unknown service score ({score_unknown}) " \
        f"should be greater than known service score ({score_known}). " \
        f"Inputs: sensitive_data={sensitive_data}, data_sources={data_sources}, " \
        f"known_service={known_service}"



# Feature: interpose-saas-platform, Property 10: Log Transmission with API Key
# **Validates: Requirements 6.1, 6.2**
@settings(max_examples=20)
@given(
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')),
    ai_service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
    endpoint=st.text(min_size=10, max_size=100),
    risk_score=st.integers(min_value=0, max_value=100),
    request_method=st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
    request_size_bytes=st.integers(min_value=0, max_value=10000000),
    response_status=st.integers(min_value=200, max_value=599)
)
def test_property_log_transmission_with_api_key(
    api_key, ai_service, endpoint, risk_score, request_method, request_size_bytes, response_status
):
    """
    Property 10: Log Transmission with API Key
    
    For any log entry transmitted to the backend, the HTTP request must include 
    the customer API key in the X-API-Key header.
    
    This test verifies that:
    1. send_log includes X-API-Key header in the request
    2. The API key value matches the agent's configured api_key
    3. The request is sent to the correct backend URL
    """
    from interpose.agent import InterposeAgent, LogEntry
    from unittest.mock import Mock, patch
    
    # Arrange
    backend_url = "https://test.backend.com"
    agent = InterposeAgent(api_key=api_key, backend_url=backend_url)
    
    log_entry = LogEntry(
        ai_service=ai_service,
        endpoint=endpoint,
        data_sources=[],
        sensitive_data_types=[],
        risk_score=risk_score,
        request_method=request_method,
        request_size_bytes=request_size_bytes,
        response_status=response_status
    )
    
    # Mock the request to capture the call
    mock_response = Mock()
    mock_response.status_code = 200
    
    with patch.object(agent, '_original_request', return_value=mock_response) as mock_request:
        # Act
        result = agent.send_log(log_entry)
        
        # Assert - Verify send_log succeeded
        assert result is True, "send_log should return True on successful transmission"
        
        # Assert - Verify request was made
        assert mock_request.called, "HTTP request should be made"
        
        # Assert - Verify X-API-Key header is present
        call_args = mock_request.call_args
        headers = call_args[1].get('headers', {})
        assert 'X-API-Key' in headers, "X-API-Key header must be present in request"
        
        # Assert - Verify API key value matches
        assert headers['X-API-Key'] == api_key, \
            f"X-API-Key header should be '{api_key}', got '{headers['X-API-Key']}'"
        
        # Assert - Verify correct URL
        assert call_args[0][1] == f"{backend_url}/logs", \
            f"Request should be sent to {backend_url}/logs"



# Feature: interpose-saas-platform, Property 11: Transmission Retry Logic
# **Validates: Requirements 6.3**
@settings(max_examples=20, deadline=None)
@given(
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')),
    ai_service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
    endpoint=st.text(min_size=10, max_size=100),
    risk_score=st.integers(min_value=0, max_value=100),
    request_method=st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
    request_size_bytes=st.integers(min_value=0, max_value=10000000),
    response_status=st.integers(min_value=200, max_value=599)
)
def test_property_transmission_retry_logic(
    api_key, ai_service, endpoint, risk_score, request_method, request_size_bytes, response_status
):
    """
    Property 11: Transmission Retry Logic
    
    For any log transmission that fails due to network error or backend 
    unavailability, the agent should retry exactly 3 times before giving up.
    
    This test verifies that:
    1. Failed transmissions trigger retry attempts
    2. Exactly 3 retry attempts are made (max_retries=3)
    3. Exponential backoff is applied between retries
    4. send_log returns False after all retries fail
    """
    from interpose.agent import InterposeAgent, LogEntry
    from unittest.mock import Mock, patch
    
    # Arrange
    backend_url = "https://test.backend.com"
    agent = InterposeAgent(api_key=api_key, backend_url=backend_url)
    
    log_entry = LogEntry(
        ai_service=ai_service,
        endpoint=endpoint,
        data_sources=[],
        sensitive_data_types=[],
        risk_score=risk_score,
        request_method=request_method,
        request_size_bytes=request_size_bytes,
        response_status=response_status
    )
    
    # Mock the request to always fail
    with patch.object(agent, '_original_request', side_effect=Exception("Network error")) as mock_request:
        with patch('time.sleep'):  # Mock sleep to speed up test
            # Act
            result = agent.send_log(log_entry, max_retries=3)
            
            # Assert - Verify send_log returns False after all retries fail
            assert result is False, "send_log should return False when all retries fail"
            
            # Assert - Verify exactly 3 attempts were made
            assert mock_request.call_count == 3, \
                f"Expected exactly 3 retry attempts, got {mock_request.call_count}"



# Feature: interpose-saas-platform, Property 12: Failed Transmission Local Logging
# **Validates: Requirements 6.4**
@settings(max_examples=20, deadline=None)
@given(
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')),
    ai_service=st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
    endpoint=st.text(min_size=10, max_size=100),
    risk_score=st.integers(min_value=0, max_value=100),
    request_method=st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
    request_size_bytes=st.integers(min_value=0, max_value=10000000),
    response_status=st.integers(min_value=200, max_value=599)
)
def test_property_failed_transmission_local_logging(
    api_key, ai_service, endpoint, risk_score, request_method, request_size_bytes, response_status
):
    """
    Property 12: Failed Transmission Local Logging
    
    For any log transmission that fails after all retry attempts, an error 
    message should be written to the local log file.
    
    This test verifies that:
    1. Failed transmissions trigger local error logging
    2. The error is written to a log file
    3. The log entry contains relevant information (log_id, ai_service, risk_score)
    """
    from interpose.agent import InterposeAgent, LogEntry
    from unittest.mock import Mock, patch, mock_open
    
    # Arrange
    backend_url = "https://test.backend.com"
    agent = InterposeAgent(api_key=api_key, backend_url=backend_url)
    
    log_entry = LogEntry(
        ai_service=ai_service,
        endpoint=endpoint,
        data_sources=[],
        sensitive_data_types=[],
        risk_score=risk_score,
        request_method=request_method,
        request_size_bytes=request_size_bytes,
        response_status=response_status
    )
    
    # Mock the request to always fail
    mock_file = mock_open()
    
    with patch.object(agent, '_original_request', side_effect=Exception("Network error")):
        with patch('time.sleep'):  # Mock sleep to speed up test
            with patch('builtins.open', mock_file):
                with patch('pathlib.Path.mkdir'):  # Mock directory creation
                    # Act
                    result = agent.send_log(log_entry, max_retries=3)
                    
                    # Assert - Verify send_log returns False
                    assert result is False, "send_log should return False when all retries fail"
                    
                    # Assert - Verify file was opened for writing
                    assert mock_file.called, "Log file should be opened for writing"
                    
                    # Assert - Verify write was called
                    handle = mock_file()
                    assert handle.write.called, "Error should be written to log file"
                    
                    # Assert - Verify log entry information is in the written content
                    written_content = ''.join(call[0][0] for call in handle.write.call_args_list)
                    assert log_entry.log_id in written_content, \
                        f"Log ID {log_entry.log_id} should be in written content"
                    assert ai_service in written_content, \
                        f"AI service {ai_service} should be in written content"
                    assert str(risk_score) in written_content, \
                        f"Risk score {risk_score} should be in written content"
