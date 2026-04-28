# How to Get REAL Data in Your Dashboard

## Current Status
✓ Dashboard is working at http://localhost:3000
✓ Backend API is working
✓ Agent is installed
✓ Test data is visible (15 logs)

## To See REAL AI Activity:

### Option 1: Monitor Your Own ChatGPT API Calls

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy it

2. **Install OpenAI Package**
   ```powershell
   pip install openai
   ```

3. **Set Your API Key**
   ```powershell
   $env:OPENAI_API_KEY="sk-your-key-here"
   ```

4. **Run the Monitor Script**
   ```powershell
   python monitor_chatgpt.py
   ```

5. **Check Dashboard**
   - Refresh http://localhost:3000
   - You will see your REAL ChatGPT API call logged!

### Option 2: Monitor Existing Applications

If you have applications that already use AI APIs:

1. **Add Interpose to Your App**
   
   At the START of your application, add:
   ```python
   from interpose.agent.agent import InterposeAgent
   
   agent = InterposeAgent(
       api_key="89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea",
       backend_url="https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"
   )
   ```

2. **Run Your App Normally**
   - All AI API calls will be automatically monitored
   - They will appear in your dashboard in real-time

### Option 3: Monitor System-Wide (Advanced)

To monitor ALL AI API calls on your system:

1. **Set Environment Variables**
   ```powershell
   $env:INTERPOSE_API_KEY="89f22d5f-0aaf-40b9-a127-1c3af3c4a4ea"
   $env:INTERPOSE_BACKEND_URL="https://vs6hlg109c.execute-api.us-east-1.amazonaws.com/prod"
   ```

2. **Run Agent as Service**
   ```powershell
   python start_agent.py
   ```
   (Keep this running in the background)

3. **Use Any AI Service**
   - The agent will intercept and log all calls

## What Gets Logged

When you make a real AI API call, the dashboard will show:

- **AI Service**: OpenAI, Anthropic, Bedrock, etc.
- **Endpoint**: Which API endpoint was called
- **Data Sources**: What databases/files were accessed
- **Sensitive Data**: Emails, passwords, API keys detected
- **Risk Score**: 0-100 based on sensitivity
- **Timestamp**: When the call was made

## Clear Test Data (Optional)

To remove the test data and start fresh:

```powershell
# Delete all logs for your account
aws dynamodb delete-table --table-name AIObserveLogs --region us-east-1
# Then recreate it (or just leave the test data)
```

## Next Steps

1. Try `python monitor_chatgpt.py` to see a real API call
2. Integrate the agent into your existing applications
3. Watch your dashboard populate with REAL AI activity!

The system is fully working - you just need to make actual AI API calls for real data to appear!
