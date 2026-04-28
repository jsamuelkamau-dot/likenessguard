import requests

API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
API_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod/logs"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

print("Testing log query...")
response = requests.get(API_URL, headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    logs = response.json()
    print(f"SUCCESS! Found {len(logs)} logs")
    if logs:
        log = logs[0]
        print(f"First log: {log.get('ai_service')} - Risk: {log.get('risk_score')}")
else:
    print(f"Error: {response.text}")
