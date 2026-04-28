# -*- coding: utf-8 -*-
"""
Monitor Claude (Anthropic) API Calls
This monitors the same AI model that powers Kiro
"""

from interpose.agent.agent import InterposeAgent
import os

# Initialize Interpose agent
API_KEY = "89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
BACKEND_URL = "https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"

print("Initializing Interpose agent...")
agent = InterposeAgent(api_key=API_KEY, backend_url=BACKEND_URL)
print("✓ Agent ready - monitoring Claude API calls")
print()

# Check for Anthropic API key
anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

if not anthropic_key:
    print("To monitor Claude (the AI that powers Kiro):")
    print()
    print("1. Get Anthropic API key from https://console.anthropic.com/")
    print("2. Set it: $env:ANTHROPIC_API_KEY='your-key-here'")
    print("3. Install: pip install anthropic")
    print("4. Run this script again")
    print()
    print("Then you'll see what data Claude accesses!")
else:
    print("Making Claude API call...")
    print("This will show what Kiro-like AI accesses!")
    print()
    
    try:
        import anthropic
        
        client = anthropic.Anthropic(api_key=anthropic_key)
        
        # Make a real Claude API call
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": "What is 2+2?"}
            ]
        )
        
        print("✓ Claude API call successful!")
        print(f"Response: {message.content[0].text}")
        print()
        print("Check your dashboard - this call is now logged!")
        print("Dashboard: http://localhost:3000")
        
    except ImportError:
        print("Anthropic package not installed!")
        print("Install it with: pip install anthropic")
    except Exception as e:
        print(f"Error: {e}")
