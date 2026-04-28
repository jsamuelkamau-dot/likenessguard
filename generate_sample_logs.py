import json
import time
import random
from decimal import Decimal

# Your API key from the login
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
CUSTOMER_ID = "a4bd95e3-5e3d-461d-aab6-abc460f138ac"
API_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod/logs"

# Sample log data
services = [
    {"name": "openai", "endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/embeddings"]},
    {"name": "anthropic", "endpoints": ["/v1/messages", "/v1/complete"]},
    {"name": "bedrock", "endpoints": ["/model/anthropic.claude-v2/invoke", "/model/amazon.titan-text/invoke"]}
]

data_sources = [
    ["postgresql://prod-db", "redis://cache"],
    ["s3://customer-data", "dynamodb://user-profiles"],
    ["mysql://analytics", "elasticsearch://logs"],
    ["mongodb://sessions", "file:///var/data/users.csv"],
    ["api://internal/users", "api://external/crm"]
]

sensitive_types = [
    ["email", "phone_number"],
    ["api_key", "password"],
    ["ssn", "credit_card"],
    ["email", "address"],
    ["api_key", "oauth_token"]
]

# Generate 10 sample logs
logs = []
now = int(time.time() * 1000)
one_hour = 60 * 60 * 1000

for i in range(10):
    service = services[i % len(services)]
    endpoint = random.choice(service["endpoints"])
    
    # Risk score distribution
    if i < 3:
        risk_score = random.randint(10, 39)  # Low
    elif i < 7:
        risk_score = random.randint(40, 69)  # Medium
    else:
        risk_score = random.randint(70, 95)  # High
    
    hours_ago = int((i / 10) * 24)
    timestamp = now - (hours_ago * one_hour) - random.randint(0, one_hour)
    
    log = {
        "log_id": f"test-log-{i+1:03d}",
        "ai_service": service["name"],
        "endpoint": endpoint,
        "data_sources": data_sources[i % len(data_sources)],
        "sensitive_data_types": sensitive_types[i % len(sensitive_types)],
        "risk_score": risk_score,
        "request_method": "POST",
        "request_size_bytes": random.randint(1000, 50000),
        "response_status": 200
    }
    logs.append(log)

# Save to file for curl
with open("sample_logs.json", "w") as f:
    json.dump(logs, f, indent=2)

print(f"Generated {len(logs)} sample logs")
print(f"API Key: {API_KEY}")
print(f"Customer ID: {CUSTOMER_ID}")
print("Logs saved to sample_logs.json")
