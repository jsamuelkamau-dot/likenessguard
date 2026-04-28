# -*- coding: utf-8 -*-
"""
Interpose Agent - Monitor Your AI Usage
Run this script to start monitoring what AI services know about you
"""

from interpose.agent.agent import InterposeAgent
import time

# Your credentials
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
BACKEND_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"

print("=" * 70)
print("INTERPOSE AGENT - AI Monitoring System")
print("=" * 70)
print()
print("This agent will monitor all AI API calls and show you:")
print("  - What data AI services are accessing")
print("  - What sensitive information is being sent")
print("  - Risk scores for each interaction")
print()
print("Dashboard: http://localhost:3000")
print("=" * 70)
print()

# Initialize the agent
print("Initializing agent...")
agent = InterposeAgent(api_key=API_KEY, backend_url=BACKEND_URL)
print("Agent started successfully!")
print()
print("The agent is now running and monitoring AI API calls.")
print("Press Ctrl+C to stop.")
print()

try:
    # Keep the agent running
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print()
    print("Agent stopped.")
