-# Implementation Plan: Interpose SaaS Platform

## Overview

This implementation plan breaks down the Interpose platform into sequential, incremental tasks. The platform consists of three main components: the Python agent (Interpose_Agent), the AWS serverless backend (Backend_API), and the React dashboard. Each task builds on previous work, with property-based tests integrated throughout to validate correctness properties from the design document.

The implementation follows this sequence:
1. Core agent functionality with HTTP interception and service detection
2. Sensitive data scanning and risk scoring
3. Backend API with DynamoDB storage and authentication
4. Alert system with SES integration
5. React dashboard with real-time visualization
6. Deployment packaging and infrastructure

## Tasks

- [x] 1. Set up project structure and development environment
  - Create Python package structure for agent: `interpose/agent/`
  - Create Lambda function structure for backend: `backend/`
  - Create React app structure for dashboard: `dashboard/`
  - Set up virtual environment and install dependencies (requests, boto3, hypothesis for testing)
  - Configure pytest for Python testing, jest for TypeScript testing
  - Create requirements.txt, package.json, and setup.py files
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement core agent HTTP interception mechanism
  - [x] 2.1 Create InterposeAgent class with initialization
    - Implement `__init__` method accepting api_key and backend_url parameters
    - Add configuration validation (raise ConfigurationError if api_key missing)
    - Create basic logging setup
    - _Requirements: 2.1, 6.1_

  - [x] 2.2 Implement HTTP request interception using monkey-patching
    - Monkey-patch requests.request to intercept all HTTP calls
    - Extract request metadata (method, url, headers, body)
    - Forward requests to original destination after logging
    - _Requirements: 2.1_

  - [x] 2.3 Write property test for request interception completeness
    - **Property 1: Request Interception Completeness**
    - **Validates: Requirements 2.1**


- [ ] 3. Implement AI service detection
  - [x] 3.1 Create ServiceDetector class
    - Implement detect() method with URL pattern matching
    - Add support for OpenAI (api.openai.com, openai.azure.com)
    - Add support for Anthropic (api.anthropic.com)
    - Add support for AWS Bedrock (bedrock-runtime, bedrock.amazonaws.com)
    - Add support for local LLMs (localhost, 127.0.0.1, 0.0.0.0)
    - Return 'unknown' for unrecognized services
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Write property test for AI service detection accuracy
    - **Property 2: AI Service Detection Accuracy**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

  - [x] 3.3 Write unit tests for service detection edge cases
    - Test with malformed URLs, missing protocols, custom ports
    - Test with Azure OpenAI endpoints
    - Test with unknown service URLs
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 4. Implement data source extraction
  - [x] 4.1 Create DataSourceExtractor class
    - Implement extract() method with regex pattern matching
    - Add pattern for database connections (postgres://, mysql://, mongodb://, redis://)
    - Add pattern for file paths (Unix and Windows paths)
    - Add pattern for API endpoints (http://, https://)
    - Add pattern for SQL queries (SELECT, INSERT, UPDATE, DELETE)
    - Return list of all detected data sources
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write property test for data source extraction completeness
    - **Property 3: Data Source Extraction Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [x] 4.3 Write unit tests for data source extraction
    - Test with various database connection strings
    - Test with file paths containing special characters
    - Test with SQL queries in different formats
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Implement sensitive data scanning
  - [x] 5.1 Create SensitiveDataScanner class
    - Implement scan() method with regex pattern matching
    - Add pattern for SSN (XXX-XX-XXXX format)
    - Add pattern for credit cards (16 digits with optional separators)
    - Add pattern for API keys (api_key/apikey/api_token patterns)
    - Add pattern for passwords (password/passwd/pwd patterns)
    - Add pattern for email addresses
    - Return list of detected data types (not actual values)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Write property test for sensitive data detection completeness
    - **Property 4: Sensitive Data Detection Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [x] 5.3 Write property test for sensitive data privacy preservation
    - **Property 5: Sensitive Data Privacy Preservation**
    - **Validates: Requirements 4.6**

  - [x] 5.4 Write unit tests for sensitive data scanning
    - Test with fake SSNs, test credit card numbers
    - Test with various API key formats
    - Verify actual values are never stored in results
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_


- [ ] 6. Implement risk score calculation
  - [x] 6.1 Create RiskCalculator class
    - Implement calculate() method accepting sensitive_data, data_sources, service, is_unknown_service
    - Add base score for sensitive data (10 points per type, max 50)
    - Add score for data source complexity (5 points per source, max 25)
    - Add unknown service penalty (15 points)
    - Add high-value sensitive data bonus (10 points for SSN or credit card)
    - Ensure score is clamped to [0, 100] range
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write property test for risk score boundary constraint
    - **Property 6: Risk Score Boundary Constraint**
    - **Validates: Requirements 5.1, 5.5**

  - [x] 6.3 Write property test for risk score monotonicity - sensitive data
    - **Property 7: Risk Score Monotonicity - Sensitive Data**
    - **Validates: Requirements 5.2**

  - [x] 6.4 Write property test for risk score monotonicity - data sources
    - **Property 8: Risk Score Monotonicity - Data Sources**
    - **Validates: Requirements 5.3**

  - [x] 6.5 Write property test for risk score unknown service penalty
    - **Property 9: Risk Score Unknown Service Penalty**
    - **Validates: Requirements 5.4**

  - [x] 6.6 Write unit tests for risk score calculation
    - Test boundary cases (0 sensitive data, 0 data sources)
    - Test maximum score scenarios
    - Test high-value data bonus
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Implement log entry creation and transmission
  - [x] 7.1 Create LogEntry data model
    - Define LogEntry class with all required fields (log_id, customer_id, timestamp, ai_service, endpoint, data_sources, sensitive_data_types, risk_score, request_method, request_size_bytes, response_status)
    - Implement to_dict() method for JSON serialization
    - Add UUID generation for log_id
    - Add timestamp generation (Unix milliseconds)
    - _Requirements: 9.3_

  - [x] 7.2 Implement send_log method with retry logic
    - Implement send_log() method in InterposeAgent
    - Add X-API-Key header to requests
    - Implement exponential backoff retry (3 attempts, 2^attempt seconds delay)
    - Return True on success, False on failure
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.3 Implement local error logging for failed transmissions
    - Create /var/log/interpose/failed_transmissions.log file
    - Log error messages when transmission fails after all retries
    - _Requirements: 6.4_

  - [x] 7.4 Write property test for log transmission with API key
    - **Property 10: Log Transmission with API Key**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 7.5 Write property test for transmission retry logic
    - **Property 11: Transmission Retry Logic**
    - **Validates: Requirements 6.3**

  - [x] 7.6 Write property test for failed transmission local logging
    - **Property 12: Failed Transmission Local Logging**
    - **Validates: Requirements 6.4**

  - [x] 7.7 Write unit tests for log transmission
    - Mock network failures and verify retry behavior
    - Test successful transmission
    - Test local logging on complete failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Checkpoint - Ensure agent core functionality works
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Implement backend Lambda function structure
  - [x] 9.1 Create Lambda handler entry point
    - Implement lambda_handler(event, context) function
    - Add routing logic for POST /logs, GET /logs, POST /auth
    - Return 404 for unknown routes
    - _Requirements: 7.1_

  - [x] 9.2 Create DynamoDB client initialization
    - Initialize boto3 DynamoDB client
    - Read table names from environment variables (LOGS_TABLE, CUSTOMERS_TABLE)
    - _Requirements: 9.1_

  - [x] 9.3 Create SES client initialization
    - Initialize boto3 SES client
    - Read alert email source from environment variable (ALERT_EMAIL_SOURCE)
    - _Requirements: 8.1_

- [ ] 10. Implement API key validation
  - [x] 10.1 Create validate_api_key function
    - Extract X-API-Key header from request
    - Query Customers table by api_key (requires GSI on api_key)
    - Return customer record if found, None otherwise
    - _Requirements: 7.1, 7.2_

  - [x] 10.2 Write property test for API key validation
    - **Property 13: API Key Validation**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 10.3 Write unit tests for API key validation
    - Test with valid API key
    - Test with invalid API key
    - Test with missing API key header
    - Mock DynamoDB responses
    - _Requirements: 7.1, 7.2_

- [ ] 11. Implement log submission endpoint
  - [x] 11.1 Create handle_log_submission function
    - Validate API key using validate_api_key()
    - Return 401 if API key invalid
    - Parse JSON body into log entry
    - Add customer_id and timestamp to log entry
    - Store log entry in AIObserveLogs table using put_item
    - Return 200 on success
    - _Requirements: 7.3, 7.5, 9.1_

  - [x] 11.2 Write property test for valid log persistence
    - **Property 14: Valid Log Persistence**
    - **Validates: Requirements 7.3, 7.5, 9.1**

  - [x] 11.3 Write property test for stored log completeness
    - **Property 16: Stored Log Completeness**
    - **Validates: Requirements 9.3**

  - [x] 11.4 Write unit tests for log submission
    - Test successful log submission
    - Test with invalid API key
    - Test with malformed JSON body
    - Test with missing required fields
    - Mock DynamoDB put_item
    - _Requirements: 7.3, 7.5, 9.1, 9.3_

- [ ] 12. Implement high-risk alert system
  - [x] 12.1 Create send_alert function
    - Accept customer and log_entry parameters
    - Format email body with risk score, AI service, timestamp, sensitive data types, data sources
    - Send email via SES to customer's alert_email
    - Log error if email sending fails (but don't raise exception)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 12.2 Integrate alert sending into log submission
    - Check if log_entry risk_score > 70 after storing in DynamoDB
    - Call send_alert() if threshold exceeded
    - _Requirements: 8.1_

  - [x] 12.3 Write property test for high-risk alert generation
    - **Property 15: High-Risk Alert Generation**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 12.4 Write unit tests for alert system
    - Test alert sent for risk_score = 71
    - Test no alert sent for risk_score = 70
    - Test email content formatting
    - Mock SES send_email
    - _Requirements: 8.1, 8.2, 8.3_


- [ ] 13. Implement log query endpoint
  - [x] 13.1 Create handle_log_query function
    - Validate API key using validate_api_key()
    - Return 401 if API key invalid
    - Query AIObserveLogs table by customer_id (partition key)
    - Set Limit=100 and ScanIndexForward=False (descending order)
    - Return JSON array of log entries
    - _Requirements: 10.4, 11.5_

  - [x] 13.2 Write property test for customer data isolation
    - **Property 19: Customer Data Isolation**
    - **Validates: Requirements 10.4**

  - [x] 13.3 Write property test for activity feed pagination
    - **Property 23: Activity Feed Pagination**
    - **Validates: Requirements 11.5**

  - [x] 13.4 Write unit tests for log query
    - Test successful query with valid API key
    - Test query returns only customer's logs
    - Test pagination limit of 100
    - Test descending order by timestamp
    - Mock DynamoDB query
    - _Requirements: 10.4, 11.5_

- [ ] 14. Implement authentication endpoint
  - [x] 14.1 Create handle_auth function
    - Parse email and password from request body
    - Query Customers table by email using EmailIndex GSI
    - Verify password using bcrypt
    - Return {api_key, customer_id} on success
    - Return 401 on failure
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 14.2 Write property test for credential validation
    - **Property 18: Credential Validation**
    - **Validates: Requirements 10.2, 10.3**

  - [x] 14.3 Write unit tests for authentication
    - Test successful login with valid credentials
    - Test failed login with invalid password
    - Test failed login with non-existent email
    - Mock DynamoDB query and bcrypt verification
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 15. Checkpoint - Ensure backend API works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Create CloudFormation template for backend infrastructure
  - [x] 16.1 Define DynamoDB tables
    - Create AIObserveLogs table with customer_id (HASH) and timestamp (RANGE) keys
    - Enable DynamoDB Streams and TTL
    - Create Customers table with customer_id (HASH) key
    - Add EmailIndex GSI on email attribute
    - Add ApiKeyIndex GSI on api_key attribute (for validation)
    - Set BillingMode to PAY_PER_REQUEST
    - _Requirements: 9.1, 9.2_

  - [x] 16.2 Define Lambda function resource
    - Set Runtime to python3.11
    - Set Handler to index.lambda_handler
    - Set Timeout to 10 seconds, MemorySize to 512MB
    - Add environment variables (LOGS_TABLE, CUSTOMERS_TABLE, ALERT_EMAIL_SOURCE)
    - Attach IAM role with DynamoDB and SES permissions
    - _Requirements: 7.1_

  - [x] 16.3 Define API Gateway resource
    - Create REST API with regional endpoint
    - Define /logs resource with POST and GET methods
    - Define /auth resource with POST method
    - Integrate methods with Lambda function
    - Enable CORS
    - _Requirements: 7.1_

  - [x] 16.4 Define S3 bucket and CloudFront distribution for dashboard
    - Create S3 bucket with website configuration
    - Create CloudFront distribution with S3 origin
    - Set ViewerProtocolPolicy to redirect-to-https
    - _Requirements: 10.1_

  - [x] 16.5 Define IAM roles and policies
    - Create Lambda execution role with CloudWatch Logs access
    - Add DynamoDB policy (PutItem, GetItem, Query on both tables)
    - Add SES policy (SendEmail, SendRawEmail)
    - _Requirements: 7.1, 8.1, 9.1_


- [x] 17. Create React dashboard application structure
  - [x] 17.1 Initialize React app with TypeScript
    - Create React app using create-react-app with TypeScript template
    - Install dependencies: react-router-dom, axios, recharts, react-force-graph
    - Configure TypeScript with strict mode
    - _Requirements: 10.1_

  - [x] 17.2 Create theme configuration
    - Define color palette (background colors, accent colors, text colors)
    - Define glassmorphism effect styles
    - Define glow effect styles for different risk levels
    - Create theme.ts file with all constants
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 17.3 Create API client service
    - Implement api.ts with functions for login, fetchLogs
    - Add X-API-Key header to authenticated requests
    - Handle error responses (401, 500)
    - _Requirements: 10.1, 11.1_

- [x] 18. Implement dashboard authentication
  - [x] 18.1 Create AuthForm component
    - Create login form with email and password inputs
    - Handle form submission
    - Display error messages for invalid credentials
    - Store API key in localStorage on successful login
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 18.2 Create useAuth hook
    - Manage authentication state (isAuthenticated, apiKey, customerId)
    - Implement login and logout functions
    - Check localStorage for existing API key on mount
    - _Requirements: 10.1_

  - [x] 18.3 Implement authentication requirement for dashboard
    - Redirect to login page if not authenticated
    - Show dashboard only after successful authentication
    - _Requirements: 10.1_

  - [x] 18.4 Write property test for dashboard authentication requirement
    - **Property 17: Dashboard Authentication Requirement**
    - **Validates: Requirements 10.1**

  - [x] 18.5 Write unit tests for authentication components
    - Test login form submission
    - Test error message display
    - Test localStorage persistence
    - Mock API responses
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 19. Implement real-time log polling
  - [x] 19.1 Create useLogStream hook
    - Fetch logs from backend API on mount
    - Set up polling interval (2 seconds)
    - Update logs state when new data arrives
    - Clean up interval on unmount
    - _Requirements: 11.1, 11.2_

  - [x] 19.2 Write property test for real-time log updates
    - **Property 20: Real-Time Log Updates**
    - **Validates: Requirements 11.2**

  - [x] 19.3 Write unit tests for log polling
    - Test initial fetch
    - Test polling interval
    - Test cleanup on unmount
    - Mock API responses
    - _Requirements: 11.1, 11.2_


- [x] 20. Implement activity log display
  - [x] 20.1 Create ActivityLog component
    - Display list of log entries in descending chronological order
    - Show timestamp, AI service, risk score, data sources for each entry
    - Apply glassmorphism styling
    - Limit display to 100 most recent entries
    - _Requirements: 11.3, 11.4, 11.5_

  - [x] 20.2 Write property test for activity log display completeness
    - **Property 21: Activity Log Display Completeness**
    - **Validates: Requirements 11.3**

  - [x] 20.3 Write property test for log chronological ordering
    - **Property 22: Log Chronological Ordering**
    - **Validates: Requirements 11.4**

  - [-] 20.4 Write unit tests for activity log
    - Test log entry rendering
    - Test chronological sorting
    - Test pagination limit
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 21. Implement risk gauge visualization
  - [x] 21.1 Create RiskGauge component
    - Accept score prop (0-100)
    - Render circular SVG gauge with score
    - Apply color based on risk level (green 0-30, yellow 31-70, red >70)
    - Add pulsing glow animation for high risk (>70)
    - Display numeric score in center
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 21.2 Write property test for risk gauge color mapping - low risk
    - **Property 24: Risk Gauge Color Mapping - Low Risk**
    - **Validates: Requirements 12.2**

  - [x] 21.3 Write property test for risk gauge color mapping - medium risk
    - **Property 25: Risk Gauge Color Mapping - Medium Risk**
    - **Validates: Requirements 12.3**

  - [x] 21.4 Write property test for risk gauge color mapping - high risk
    - **Property 26: Risk Gauge Color Mapping - High Risk**
    - **Validates: Requirements 12.4, 12.5**

  - [x] 21.5 Write unit tests for risk gauge
    - Test color selection for boundary scores (30, 31, 70, 71)
    - Test pulse animation for high risk
    - Test SVG rendering
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 22. Implement system map visualization
  - [x] 22.1 Create SystemMap component
    - Use react-force-graph for network visualization
    - Generate nodes from logs (system, AI services, data sources)
    - Generate edges from logs (system→AI service, AI service→data source)
    - Apply color coding (cyan for system, magenta for AI services, green for data sources)
    - Update graph when new logs arrive
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 22.2 Write property test for system map node completeness
    - **Property 27: System Map Node Completeness**
    - **Validates: Requirements 13.2, 13.3**

  - [x] 22.3 Write property test for system map edge completeness
    - **Property 28: System Map Edge Completeness**
    - **Validates: Requirements 13.4, 13.5**

  - [x] 22.4 Write property test for system map real-time updates
    - **Property 29: System Map Real-Time Updates**
    - **Validates: Requirements 13.6**

  - [x] 22.5 Write unit tests for system map
    - Test node generation from sample logs
    - Test edge generation from sample logs
    - Test color coding
    - Test updates when logs change
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_


- [-] 23. Implement high-risk alert cards
  - [-] 23.1 Create AlertCard component
    - Display alert for logs with risk_score > 70
    - Show risk score, AI service, timestamp, sensitive data types
    - Apply pulsing animation
    - Add dismiss button
    - Remove card from view when dismissed
    - _Requirements: 14.1, 14.3, 14.4, 14.5_

  - [x] 23.2 Write property test for high-risk alert card display
    - **Property 30: High-Risk Alert Card Display**
    - **Validates: Requirements 14.1, 14.3, 14.4**

  - [x] 23.3 Write property test for alert card dismissal
    - **Property 31: Alert Card Dismissal**
    - **Validates: Requirements 14.5**

  - [x] 23.4 Write unit tests for alert cards
    - Test card rendering for high-risk logs
    - Test no card for low-risk logs
    - Test dismiss functionality
    - Test animation
    - _Requirements: 14.1, 14.3, 14.4, 14.5_

- [x] 24. Implement timeline chart
  - [x] 24.1 Create TimelineChart component
    - Use recharts library for visualization
    - Query logs for past 24 hours
    - Aggregate logs by hour
    - Display line chart with time on x-axis, count on y-axis
    - Apply theme colors
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 24.2 Write property test for timeline query window
    - **Property 32: Timeline Query Window**
    - **Validates: Requirements 16.3**

  - [x] 24.3 Write unit tests for timeline chart
    - Test data aggregation by hour
    - Test 24-hour window filtering
    - Test chart rendering
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 25. Integrate all dashboard components
  - [x] 25.1 Create main App component
    - Add routing for login and dashboard pages
    - Compose ActivityLog, RiskGauge, SystemMap, AlertCard, TimelineChart
    - Apply deep dark theme styling
    - Add responsive layout
    - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 16.1_

  - [x] 25.2 Write integration tests for dashboard
    - Test full authentication flow
    - Test log display after login
    - Test real-time updates
    - Mock API responses
    - _Requirements: 10.1, 11.1, 11.2_

- [x] 26. Checkpoint - Ensure dashboard works end-to-end
  - Ensure all tests pass, ask the user if questions arise.


- [x] 27. Create agent deployment packaging
  - [x] 27.1 Create Dockerfile for agent
    - Use python:3.11-slim base image
    - Copy agent code and requirements.txt
    - Install dependencies
    - Set environment variables
    - Define CMD to run agent
    - _Requirements: 1.1_

  - [x] 27.2 Create setup.py for PyPI distribution
    - Define package metadata (name, version, author, description)
    - Specify dependencies (requests, boto3)
    - Define entry points for CLI
    - Add classifiers and keywords
    - _Requirements: 1.2_

  - [x] 27.3 Create Lambda layer packaging script
    - Create build script to package agent as Lambda layer
    - Install dependencies to layer/python directory
    - Create ZIP file with correct structure
    - Add deployment instructions
    - _Requirements: 1.3_

  - [x] 27.4 Create agent configuration documentation
    - Document environment variables (INTERPOSE_API_KEY, INTERPOSE_BACKEND_URL)
    - Document Docker deployment with docker-compose example
    - Document Python library usage with code examples
    - Document Lambda layer attachment steps
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 28. Create backend deployment scripts
  - [x] 28.1 Create CloudFormation deployment script
    - Write bash script to deploy CloudFormation stack
    - Add parameter validation
    - Add stack creation wait logic
    - Add output extraction
    - _Requirements: 7.1_

  - [x] 28.2 Create Lambda function deployment package
    - Create build script to package Lambda code
    - Install dependencies to package directory
    - Create ZIP file
    - Add upload to S3 step
    - _Requirements: 7.1_

  - [x] 28.3 Create database initialization script
    - Create script to seed Customers table with initial customer
    - Generate API key and password hash
    - Add customer record to DynamoDB
    - _Requirements: 9.2_

- [x] 29. Create dashboard deployment scripts
  - [x] 29.1 Create dashboard build script
    - Write bash script to build React app
    - Set production environment variables
    - Run npm build
    - _Requirements: 10.1_

  - [x] 29.2 Create S3 upload script
    - Write bash script to sync build files to S3
    - Set cache-control headers appropriately
    - Upload index.html with no-cache
    - Upload assets with long cache
    - _Requirements: 10.1_

  - [x] 29.3 Create CloudFront invalidation script
    - Write bash script to invalidate CloudFront cache
    - Invalidate all paths after deployment
    - _Requirements: 10.1_


- [x] 30. Implement error handling and edge cases
  - [x] 30.1 Add agent error handling
    - Handle network failures with exponential backoff
    - Handle malformed payloads (treat as plain text)
    - Handle payload size limits (10MB max)
    - Handle regex timeout (100ms max)
    - Handle missing configuration (raise ConfigurationError)
    - _Requirements: 2.1, 6.3_

  - [x] 30.2 Add backend error handling
    - Return 400 for invalid JSON
    - Return 400 for missing required fields
    - Return 500 for DynamoDB failures
    - Log errors to CloudWatch
    - Handle SES failures gracefully (don't block log storage)
    - _Requirements: 7.3, 7.5, 8.1_

  - [x] 30.3 Add dashboard error handling
    - Display error messages for failed API requests
    - Implement retry logic for failed log queries
    - Handle missing log fields with placeholders
    - Clamp invalid risk scores to [0, 100]
    - Display browser compatibility warning
    - _Requirements: 11.1, 11.2_

  - [x] 30.4 Write unit tests for error handling
    - Test all error scenarios for agent, backend, dashboard
    - Verify error messages and status codes
    - Test retry logic
    - _Requirements: 2.1, 6.3, 7.3, 7.5, 8.1, 11.1, 11.2_

- [x] 31. Implement logging and monitoring
  - [x] 31.1 Add agent logging
    - Configure Python logging with configurable level
    - Log to /var/log/interpose/agent.log
    - Implement log rotation (daily, keep 7 days)
    - Log interception events, transmission results, errors
    - _Requirements: 6.4_

  - [x] 31.2 Add backend CloudWatch logging
    - Log all Lambda invocations
    - Log API key validation results
    - Log DynamoDB operations
    - Log SES email sending results
    - Add structured logging with JSON format
    - _Requirements: 7.1, 8.1, 9.1_

  - [x] 31.3 Add CloudWatch alarms
    - Create alarm for Lambda error rate > 1%
    - Create alarm for API Gateway 5xx errors > 0.1%
    - Create alarm for DynamoDB throttled requests > 0
    - Create alarm for SES bounce rate > 5%
    - _Requirements: 7.1, 8.1, 9.1_

- [x] 32. Write end-to-end integration tests
  - [x] 32.1 Test complete log flow
    - Deploy agent, backend, dashboard to test environment
    - Generate synthetic AI API calls
    - Verify logs appear in DynamoDB
    - Verify logs appear in dashboard
    - Verify high-risk alerts sent via email
    - _Requirements: 2.1, 6.1, 7.3, 8.1, 11.1_

  - [x] 32.2 Test authentication and authorization
    - Test login flow
    - Test customer data isolation
    - Test invalid API key rejection
    - _Requirements: 10.1, 10.2, 10.4, 7.2_

  - [x] 32.3 Test real-time updates
    - Submit new log via agent
    - Verify dashboard updates within 2 seconds
    - Verify system map updates with new nodes
    - _Requirements: 11.2, 13.6_

- [x] 33. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.


- [-] 34. Create documentation
  - [x] 34.1 Write user documentation
    - Create README.md with project overview
    - Document agent installation methods (Docker, PyPI, Lambda layer)
    - Document configuration options
    - Document dashboard usage
    - Add troubleshooting section
    - _Requirements: 1.1, 1.2, 1.3, 10.1_

  - [x] 34.2 Write API documentation
    - Document all API endpoints (POST /logs, GET /logs, POST /auth)
    - Document request/response formats
    - Document authentication requirements
    - Document error codes and messages
    - Add example requests with curl
    - _Requirements: 7.1, 10.1_

  - [x] 34.3 Write deployment documentation
    - Document CloudFormation stack deployment
    - Document environment variable configuration
    - Document SES email verification steps
    - Document custom domain setup (optional)
    - Document monitoring and alerting setup
    - _Requirements: 7.1, 8.1, 9.1, 10.1_

  - [x] 34.4 Write architecture documentation
    - Document system architecture with diagrams
    - Document data flow diagrams
    - Document security considerations
    - Document scalability and performance characteristics
    - Document disaster recovery procedures
    - _Requirements: 1.1, 7.1, 9.1_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end system behavior
- The implementation uses Python 3.11 for agent and backend, TypeScript/React for dashboard
- All 32 correctness properties from the design document have corresponding property test tasks
