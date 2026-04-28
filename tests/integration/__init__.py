"""
Integration tests for Interpose SaaS Platform

This package contains end-to-end integration tests that verify the complete
system flow from agent to backend to dashboard.

Test Suites:
- test_complete_log_flow: Tests agent → backend → DynamoDB → dashboard flow
- test_authentication_authorization: Tests login, API key validation, and data isolation
- test_realtime_updates: Tests real-time dashboard updates and system map updates
"""
