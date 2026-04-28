import requests
import json
import time
import random

API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
API_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod/logs"

services = [
    {"name": "openai", "endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/embeddings"]},
    {"name": "anthropic", "endpoints": ["/v1/messages", "/v1/complete"]},
    {"name": "bedrock", "endpoints": ["/model/anthropic.claude-v2/invoke", "/model/amazon.titan-text/invoke"]}
]

data_sources_list = [
    ["postgresql://prod-db", "redis://cache"],
    ["s3://customer-data", "dynamodb://user-profiles"],
    ["mysql://analytics", "elasticsearch://logs"],
    ["mongodb://sessions", "file:///var/data/users.csv"],
    ["api://internal/users", "api://external/crm"]
]

sensitive_types_list = [
    ["email", "phone_number"],
    ["api_key", "password"],
    ["ssn", "credit_card"],
    ["email", "address"],
    ["api_key", "oauth_token"]
]

print("Sending 10 test logs to your account...")
print(f"API URL: {API_URL}")
print(f"API Key: {API_KEY[:20]}...")
print()

for i in range(10):
    service = services[i % len(services)]
    endpoint = random.choice(service["endpoints"])
    
    # Risk score distribution
    if i < 3:
        risk_score = random.randint(10, 39)
    elif i < 7:
        risk_score = random.randint(40, 69)
    else:
        risk_score = random.randint(70, 95)
    
    log_entry = {
        "log_id": f"test-log-{int(time.time())}-{i+1:03d}",
        "ai_service": service["name"],
        "endpoint": endpoint,
        "data_sources": data_sources_list[i % len(data_sources_list)],
        "sensitive_data_types": sensitive_types_list[i % len(sensitive_types_list)],
        "risk_score": risk_score,
        "request_method": "POST",
        "request_size_bytes": random.randint(1000, 50000),
        "response_status": 200
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(API_URL, json=log_entry, headers=headers)
        if response.status_code == 200:
            print(f"? Log {i+1}/10: {service['name']} (risk: {risk_score}) - SUCCESS")
        else:
            print(f"? Log {i+1}/10: FAILED - {response.status_code} - {response.text}")
    except Exception as e:
        print(f"? Log {i+1}/10: ERROR - {str(e)}")
    
    time.sleep(0.5)

print()
print("Done! Refresh your dashboard to see the logs.")
