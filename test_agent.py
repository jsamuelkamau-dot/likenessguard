"""
Test script to demonstrate Interpose agent monitoring
This simulates an AI API call and shows what data would be logged
"""

from interpose.agent.agent import InterposeAgent
from interpose.agent.log_entry import LogEntry
from interpose.agent.service_detector import ServiceDetector
from interpose.agent.sensitive_data_scanner import SensitiveDataScanner
from interpose.agent.data_source_extractor import DataSourceExtractor
from interpose.agent.risk_calculator import RiskCalculator
import json
import time

# Your API credentials
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
BACKEND_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"

print("=" * 60)
print("Interpose Agent - Live Demo")
print("=" * 60)
print()

# Initialize the agent
print("1. Initializing Interpose agent...")
agent = InterposeAgent(api_key=API_KEY, backend_url=BACKEND_URL)
print("   ? Agent initialized successfully")
print()

# Simulate an AI API request with user data
print("2. Simulating ChatGPT API call with your data...")
print()

# Example: User asking ChatGPT about their personal information
simulated_request = {
    "url": "https://api.openai.com/v1/chat/completions",
    "method": "POST",
    "headers": {
        "Authorization": "Bearer sk-proj-xxxxx",
        "Content-Type": "application/json"
    },
    "body": {
        "model": "gpt-4",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant with access to user database."
            },
            {
                "role": "user",
                "content": "What information do you have about user john.doe@example.com? Check the PostgreSQL database at postgresql://prod-db/users and the S3 bucket s3://customer-data/profiles."
            }
        ]
    }
}

print("   Request URL:", simulated_request["url"])
print("   Model:", simulated_request["body"]["model"])
print("   User Query:", simulated_request["body"]["messages"][1]["content"][:80] + "...")
print()

# Detect AI service
print("3. Analyzing request...")
service_detector = ServiceDetector()
ai_service = service_detector.detect(simulated_request["url"])
print(f"   ? AI Service detected: {ai_service}")

# Extract data sources
data_extractor = DataSourceExtractor()
data_sources = data_extractor.extract(json.dumps(simulated_request["body"]))
print(f"   ? Data sources found: {', '.join(data_sources)}")

# Scan for sensitive data
sensitive_scanner = SensitiveDataScanner()
sensitive_types = sensitive_scanner.scan(json.dumps(simulated_request["body"]))
print(f"   ? Sensitive data detected: {', '.join(sensitive_types)}")

# Calculate risk score
risk_calc = RiskCalculator()
risk_score = risk_calc.calculate(
    ai_service=ai_service,
    data_sources=data_sources,
    sensitive_data_types=sensitive_types
)
print(f"   ? Risk score calculated: {risk_score}/100")
print()

# Create log entry
print("4. Creating log entry...")
log_entry = LogEntry(
    ai_service=ai_service,
    endpoint="/v1/chat/completions",
    data_sources=data_sources,
    sensitive_data_types=sensitive_types,
    risk_score=risk_score,
    request_method="POST",
    request_size_bytes=len(json.dumps(simulated_request["body"])),
    response_status=200
)
print("   ? Log entry created")
print()

# Send to backend
print("5. Sending log to dashboard...")
try:
    agent.send_log(log_entry)
    print("   ? Log sent successfully!")
    print()
    print("=" * 60)
    print("SUCCESS! Check your dashboard at http://localhost:3000")
    print("=" * 60)
    print()
    print("What you'll see:")
    print(f"  • AI Service: {ai_service}")
    print(f"  • Risk Score: {risk_score}/100")
    print(f"  • Data Sources: {', '.join(data_sources)}")
    print(f"  • Sensitive Data: {', '.join(sensitive_types)}")
    print()
    print("This shows exactly what data ChatGPT has access to!")
except Exception as e:
    print(f"   ? Error sending log: {e}")
    print()
    print("Note: This is a simulation. In real usage, the agent")
    print("automatically intercepts actual AI API calls.")

