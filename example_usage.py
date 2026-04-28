# -*- coding: utf-8 -*-
"""
Example: Using Interpose Agent with OpenAI
This shows how the agent monitors real ChatGPT API calls
"""

from interpose.agent.agent import InterposeAgent
import os

# Initialize Interpose agent FIRST
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
BACKEND_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"

print("Initializing Interpose agent...")
agent = InterposeAgent(api_key=API_KEY, backend_url=BACKEND_URL)
print("Agent ready! All AI API calls will now be monitored.")
print()

# Now when you make AI API calls, they will be automatically monitored
# Example with OpenAI (you need to have openai package installed and API key)

print("Example: How to use with OpenAI ChatGPT")
print("-" * 50)
print()
print("1. Install OpenAI package:")
print("   pip install openai")
print()
print("2. Set your OpenAI API key:")
print("   $env:OPENAI_API_KEY='your-openai-key-here'")
print()
print("3. Make API calls (they will be monitored automatically):")
print()
print("   import openai")
print("   client = openai.OpenAI()")
print("   response = client.chat.completions.create(")
print("       model='gpt-4',")
print("       messages=[")
print("           {'role': 'user', 'content': 'What do you know about me?'}")
print("       ]")
print("   )")
print()
print("4. Check your dashboard at http://localhost:3000")
print("   You will see:")
print("   - The AI service used (OpenAI)")
print("   - What data was sent")
print("   - Risk score")
print("   - Sensitive data detected")
print()
print("-" * 50)
print()
print("The agent is now running in the background.")
print("All your AI API calls will be logged to the dashboard!")
