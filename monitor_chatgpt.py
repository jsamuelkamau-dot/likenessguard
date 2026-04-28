# -*- coding: utf-8 -*-
"""
Real ChatGPT Monitoring Example
This will make a REAL API call to OpenAI and log it to your dashboard
"""

from interpose.agent.agent import InterposeAgent
import os

# Initialize Interpose agent FIRST
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
BACKEND_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"

print("Initializing Interpose agent...")
agent = InterposeAgent(api_key=API_KEY, backend_url=BACKEND_URL)
print("✓ Agent ready - monitoring all AI API calls")
print()

# Now make a real OpenAI API call
# You need to set your OpenAI API key first:
# $env:OPENAI_API_KEY="your-openai-key-here"

openai_key = os.environ.get("OPENAI_API_KEY")

if not openai_key:
    print("ERROR: OpenAI API key not set!")
    print()
    print("To use this script:")
    print("1. Get your OpenAI API key from https://platform.openai.com/api-keys")
    print("2. Set it in PowerShell:")
    print('   $env:OPENAI_API_KEY="sk-your-key-here"')
    print("3. Run this script again: python monitor_chatgpt.py")
    print()
    print("The agent will then monitor the API call and log it to your dashboard!")
else:
    print("Making real ChatGPT API call...")
    print("This will appear in your dashboard!")
    print()
    
    try:
        import openai
        client = openai.OpenAI(api_key=openai_key)
        
        # Make a real API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "What is 2+2?"}
            ]
        )
        
        print("✓ API call successful!")
        print(f"Response: {response.choices[0].message.content}")
        print()
        print("Check your dashboard - this call should now be logged!")
        print("Dashboard: http://localhost:3000")
        
    except ImportError:
        print("OpenAI package not installed!")
        print("Install it with: pip install openai")
    except Exception as e:
        print(f"Error: {e}")
