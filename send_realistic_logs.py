import requests
import json
import time
import random

API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
API_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod/logs"

# Realistic AI usage scenarios
scenarios = [
    {
        "name": "Customer Support Chatbot",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "data_sources": ["postgresql://crm-db/customers", "redis://session-cache", "api://zendesk/tickets"],
        "sensitive_types": ["email", "phone_number", "customer_id"],
        "risk_range": (30, 50)
    },
    {
        "name": "Financial Document Analysis",
        "service": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "data_sources": ["s3://financial-docs/statements", "postgresql://accounting-db", "file:///mnt/invoices"],
        "sensitive_types": ["ssn", "credit_card", "bank_account", "tax_id"],
        "risk_range": (75, 95)
    },
    {
        "name": "Code Review Assistant",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "data_sources": ["github://repo/main", "file:///workspace/src"],
        "sensitive_types": ["api_key", "oauth_token"],
        "risk_range": (60, 80)
    },
    {
        "name": "Email Summarization",
        "service": "bedrock",
        "endpoint": "https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke",
        "data_sources": ["imap://mail.company.com/inbox", "s3://email-archive"],
        "sensitive_types": ["email", "password", "personal_info"],
        "risk_range": (50, 70)
    },
    {
        "name": "HR Resume Screening",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "data_sources": ["s3://hr-resumes", "postgresql://applicant-tracking", "api://linkedin/profiles"],
        "sensitive_types": ["ssn", "address", "phone_number", "email", "date_of_birth"],
        "risk_range": (80, 95)
    },
    {
        "name": "Product Recommendations",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "data_sources": ["dynamodb://user-preferences", "elasticsearch://product-catalog"],
        "sensitive_types": ["email", "purchase_history"],
        "risk_range": (20, 40)
    },
    {
        "name": "Medical Records Analysis",
        "service": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "data_sources": ["postgresql://ehr-system/patients", "s3://medical-images"],
        "sensitive_types": ["ssn", "medical_record_number", "diagnosis"],
        "risk_range": (90, 100)
    },
    {
        "name": "Content Moderation",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/moderations",
        "data_sources": ["mongodb://user-posts", "s3://uploaded-content"],
        "sensitive_types": ["email", "username"],
        "risk_range": (15, 30)
    },
    {
        "name": "Legal Document Review",
        "service": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "data_sources": ["s3://legal-contracts", "postgresql://case-management"],
        "sensitive_types": ["ssn", "tax_id", "legal_case_number"],
        "risk_range": (85, 98)
    },
    {
        "name": "Sales Lead Enrichment",
        "service": "openai",
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "data_sources": ["api://salesforce/leads", "postgresql://crm"],
        "sensitive_types": ["email", "phone_number", "company_info"],
        "risk_range": (35, 55)
    }
]

print("=" * 70)
print("GENERATING REALISTIC AI MONITORING DATA")
print("=" * 70)
print()
print("Sending 20 realistic AI usage scenarios...")
print(f"API URL: {API_URL}")
print()

logs_sent = 0
logs_failed = 0

# Generate logs spread over the last 24 hours
now = int(time.time() * 1000)

for i in range(20):
    # Select a random scenario
    scenario = random.choice(scenarios)
    
    # Calculate timestamp (spread over last 24 hours)
    hours_ago = (i / 20) * 24
    timestamp_offset = int(hours_ago * 60 * 60 * 1000)
    timestamp = now - timestamp_offset - random.randint(0, 60 * 60 * 1000)
    
    # Generate risk score within scenario range
    risk_score = random.randint(scenario["risk_range"][0], scenario["risk_range"][1])
    
    # Create log entry
    log_entry = {
        "log_id": f"realistic-{int(time.time())}-{i+1:03d}",
        "timestamp": timestamp,
        "ai_service": scenario["service"],
        "endpoint": scenario["endpoint"],
        "data_sources": scenario["data_sources"],
        "sensitive_data_types": scenario["sensitive_types"],
        "risk_score": risk_score,
        "request_method": "POST",
        "request_size_bytes": random.randint(2000, 100000),
        "response_status": 200 if random.random() > 0.05 else random.choice([429, 500])
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(API_URL, json=log_entry, headers=headers, timeout=10)
        if response.status_code == 200:
            risk_level = "LOW" if risk_score < 40 else "MED" if risk_score < 70 else "HIGH"
            print(f"✓ [{i+1:2d}/20] {scenario['name'][:35]:35s} | Risk: {risk_score:2d} ({risk_level})")
            logs_sent += 1
        else:
            print(f"✗ [{i+1:2d}/20] FAILED - {response.status_code}")
            logs_failed += 1
    except Exception as e:
        print(f"✗ [{i+1:2d}/20] ERROR - {str(e)[:40]}")
        logs_failed += 1
    
    time.sleep(0.3)

print()
print("=" * 70)
print(f"✓ Successfully sent: {logs_sent} logs")
if logs_failed > 0:
    print(f"✗ Failed: {logs_failed} logs")
print()
print("🎉 Dashboard now has realistic AI monitoring data!")
print("   Visit: http://localhost:3000")
print("=" * 70)
