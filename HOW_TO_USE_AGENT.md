# How to Monitor What ChatGPT Knows About You

## Quick Start

Your Interpose agent is installed and ready! Here's how to use it:

### Step 1: View Your Dashboard

Open your browser and go to:
```
http://localhost:3000
```

Login with:
- Email: test@interpose.io
- Password: Test123!

You should already see 15+ log entries showing AI activity!

### Step 2: Run the Agent (Optional - for real monitoring)

To monitor real AI API calls, run:

```powershell
python start_agent.py
```

This will start the agent in the background, monitoring all AI API calls.

### Step 3: Make AI API Calls

The agent automatically monitors calls to:
- OpenAI (ChatGPT, GPT-4, etc.)
- Anthropic (Claude)
- AWS Bedrock
- Any other AI service

Example with OpenAI:

```powershell
# Install OpenAI package
pip install openai

# Set your OpenAI API key
$env:OPENAI_API_KEY="your-openai-key-here"

# Run example
python example_usage.py
```

## What You'll See in the Dashboard

The dashboard shows:

1. **Activity Log** - Every AI API call with:
   - AI service name (OpenAI, Anthropic, etc.)
   - Data sources accessed (databases, S3, APIs)
   - Sensitive data detected (emails, passwords, SSN, etc.)
   - Risk score (0-100)

2. **Risk Gauges** - Average risk score across all activities

3. **System Map** - Visual connections between AI services and your data

4. **Timeline** - Activity over the past 24 hours

5. **Alerts** - High-risk activities (risk score > 70)

## Understanding Risk Scores

- **0-39 (Low)**: Public data, no sensitive information
- **40-69 (Medium)**: Some sensitive data, moderate risk
- **70-100 (High)**: Critical data, high risk (triggers alerts)

## Files Created

- `start_agent.py` - Start the monitoring agent
- `example_usage.py` - Example of how to use with OpenAI
- `AGENT_QUICK_START.txt` - Quick reference guide

## Troubleshooting

### Agent not working?

Make sure you're running Python commands in Python, not PowerShell:

```powershell
# WRONG (PowerShell)
from interpose.agent.agent import InterposeAgent

# RIGHT (Python)
python start_agent.py
```

### No logs appearing?

1. Make sure the agent is initialized BEFORE making AI API calls
2. Check that your API key is correct
3. Verify the dashboard is running at http://localhost:3000

### Need help?

Check the full documentation:
- INTERPOSE_README.md
- deployment/AGENT_DEPLOYMENT.md

## What's Next?

1. Refresh your dashboard to see the test logs
2. Install OpenAI package: `pip install openai`
3. Run `python example_usage.py` to see how it works
4. Make real AI API calls and watch them appear in the dashboard!

The agent shows you EXACTLY what data ChatGPT and other AI services have access to.
