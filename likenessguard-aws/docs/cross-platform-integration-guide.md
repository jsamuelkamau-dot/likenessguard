# LikenessGuard Cross-Platform AI Integration Guide

## Overview

LikenessGuard enforces pre-generation consent across multiple AI platforms. When any AI model attempts to generate, edit, or manipulate an image involving a real person's likeness, it must first check consent through LikenessGuard. If consent is denied, the AI refuses to proceed.

This guide documents the integration with two platforms:
- **Claude (Anthropic)** — via MCP (Model Context Protocol) connector
- **Grok (xAI)** — via API function calling

Both integrations call the same LikenessGuard backend on AWS, producing unified audit logs visible in the LikenessGuard dashboard.

---

## Architecture

```
┌─────────────┐     MCP Protocol      ┌──────────────────┐
│  Claude.ai  │ ◄──────────────────► │  MCP Server      │
│  (Browser)  │     Streamable HTTP   │  (Python/uvicorn)│
└─────────────┘                       │  Port 8080       │
                                      └────────┬─────────┘
                                               │ HTTPS
                                               ▼
┌─────────────┐     Function Calling  ┌──────────────────┐
│  Grok (xAI) │ ◄──────────────────► │  grok_integration│
│  (API)      │     OpenAI-compat SDK │  .py (local)     │
└─────────────┘                       └────────┬─────────┘
                                               │ HTTPS
                                               ▼
                                      ┌──────────────────┐
                                      │  API Gateway     │
                                      │  (AWS)           │
                                      └────────┬─────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  Supervisor      │
                                      │  Lambda          │
                                      │  (Multi-Agent)   │
                                      └────────┬─────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                        ┌──────────┐   ┌──────────────┐  ┌──────────┐
                        │ Anomaly  │   │   Consent    │  │   KMS    │
                        │ Agent    │   │ Orchestrator │  │ Signing  │
                        │ (Haiku)  │   │ (Nova Pro)   │  │ (PoF)   │
                        └──────────┘   └──────────────┘  └──────────┘
```

---

## Part 1: Claude.ai Integration (MCP)

### What We Built

A Python MCP server that wraps the LikenessGuard REST API into MCP tools that Claude.ai can call natively through its connector system.

### Prerequisites

- Python 3.13+
- AWS credentials configured (for S3 upload tool)
- ngrok account (free tier works)

### Step 1: Create the MCP Server

We created `likenessguard-mcp/server.py` with:

- **4 MCP tools**: `upload_image_for_consent`, `check_consent`, `get_policy`, `update_policy`
- **OAuth stubs**: Required by Claude.ai's connector handshake (`/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, `/register`)
- **Streamable HTTP transport**: Claude.ai uses this instead of SSE
- **DNS rebinding protection disabled**: Required for ngrok reverse proxy to work

Key code decisions:
```python
from mcp.server.transport_security import TransportSecuritySettings

mcp = FastMCP(
    "LikenessGuard",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=False,
        allowed_hosts=["*"],
        allowed_origins=["*"],
    )
)
```

The OAuth authorize endpoint auto-redirects back with a dummy code — no real auth needed since the API is public:
```python
async def oauth_authorize(request: Request):
    redirect_uri = request.query_params.get("redirect_uri", "")
    state = request.query_params.get("state", "")
    sep = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(
        url=f"{redirect_uri}{sep}code=likenessguard-noauth&state={state}",
        status_code=302
    )
```

### Step 2: Install Dependencies

```bash
cd likenessguard-mcp
pip install -r requirements.txt
```

`requirements.txt`:
```
mcp[cli]>=1.0.0
httpx>=0.27.0
```

### Step 3: Start the MCP Server

```bash
cd likenessguard-mcp
python server.py
```

Output:
```
INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
```

### Step 4: Install and Configure ngrok

Claude.ai cannot reach localhost. ngrok creates a public HTTPS tunnel.

```powershell
# Install
winget install ngrok.ngrok

# Add auth token (get from https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken YOUR_TOKEN_HERE

# Start tunnel
ngrok http 8080
```

Output shows the public URL:
```
Forwarding  https://progeny-knelt-payee.ngrok-free.dev -> http://localhost:8080
```

### Step 5: Connect Claude.ai

1. Go to **Claude.ai → Settings → Connectors**
2. Click **Add custom connector**
3. Enter:
   - **Name**: `LikenessGuard`
   - **Remote MCP server URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/mcp`
4. Click **Add**
5. Claude redirects to the OAuth flow → auto-completes → connector is active

> **Screenshot placeholder**: [Claude.ai connector settings dialog]

### Step 6: Test in Claude.ai

Upload a photo and ask Claude to edit it:

> "Put glasses on this person"

Claude's behavior:
1. Detects a human face in the image
2. Calls `check_consent` via the MCP connector
3. LikenessGuard returns `DENY` (unregistered subject)
4. Claude refuses: "I checked consent with LikenessGuard before proceeding, and the decision was DENY"

> **Screenshot placeholder**: [Claude refusing to edit after DENY decision]

### Troubleshooting: Claude Integration

| Issue | Cause | Fix |
|-------|-------|-----|
| "Couldn't reach the MCP server" | MCP server or ngrok not running | Restart both: `python server.py` and `ngrok http 8080` |
| 421 Misdirected Request | DNS rebinding protection | Set `enable_dns_rebinding_protection=False` in TransportSecuritySettings |
| "Authorization failed" | Missing OAuth endpoints | Ensure `/oauth/authorize`, `/oauth/token`, `/register` routes exist |
| Tools not showing | Cached tool list | Disconnect and reconnect the connector in Claude.ai |

---

## Part 2: Grok (xAI) Integration (API Function Calling)

### What We Built

A Python script (`grok_integration.py`) that uses xAI's OpenAI-compatible API with function calling to enforce LikenessGuard consent before Grok generates any content involving a person's likeness.

### How It Works

xAI's API is 100% OpenAI SDK compatible. The only differences:
- `base_url="https://api.x.ai/v1"` instead of OpenAI's URL
- Model name `"grok-3"` instead of `"gpt-4o"`

### Prerequisites

- Python 3.13+
- xAI API key (from https://console.x.ai)
- `openai` and `httpx` packages installed

### Step 1: Install Dependencies

```bash
pip install openai httpx boto3
```

### Step 2: Create the Integration Script

We created `likenessguard-mcp/grok_integration.py` with:

- **3 tool definitions** in OpenAI function calling format: `check_consent`, `upload_image_for_consent`, `get_policy`
- **Agentic loop**: Keeps calling tools until Grok has a final answer
- **System prompt**: Instructs Grok to always check consent before generating

Key configuration:
```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("XAI_API_KEY", ""),
    base_url="https://api.x.ai/v1",
)
```

Tool execution calls the LikenessGuard API directly:
```python
def execute_tool(name, args):
    if name == "check_consent":
        r = httpx.post(f"{API_BASE}/v2/consent/check", json={
            "image_url": args["image_url"],
            "requester_id": "grok-xai",
            "usage_type": args.get("usage_type", "GENERAL_GENERATION"),
            "platform": "grok",
        })
        return r.text
```

### Step 3: Run the Integration

```powershell
cd likenessguard-mcp
$env:XAI_API_KEY = "your-xai-api-key"
python grok_integration.py
```

When prompted, enter a public image URL. Example test:
```
Enter a public image URL to check consent for: https://thispersondoesnotexist.com
```

### Step 4: Observe the Results

Terminal output:
```
LikenessGuard + Grok Integration
========================================
Sending to Grok with LikenessGuard consent enforcement...
  → Grok calling check_consent(['image_url', 'usage_type'])

Grok Response:
I'm sorry, but I must refuse to proceed with any AI image generation
involving this person's likeness. The consent check has returned a "DENY"
decision with the reason code "DENY_IMPERSONATION."
```

The full pipeline executed:
1. Grok recognized a human face → called `check_consent`
2. LikenessGuard Supervisor Lambda orchestrated the multi-agent pipeline
3. Anomaly Agent cleared the request
4. OpenSearch matched a registered subject (similarity: 0.86)
5. Consent Orchestrator evaluated the policy → `DENY_IMPERSONATION`
6. Grok respected the DENY and refused to generate

### Step 5: Verify in Dashboard

All consent checks from both Claude and Grok appear in the LikenessGuard dashboard Activity Logs:

- Navigate to http://localhost:5173 → Activity Logs
- Each log entry shows the requester name (e.g., `grok-xai`, `claude`)
- Filter by decision (ALLOW/DENY), source, or proof-of-face status

> **Screenshot placeholder**: [Dashboard showing Grok activity logs with requester name]

---

## Unified Audit Trail

Both integrations produce audit entries in the same DynamoDB table (`LikenessGuard-AuditLog`), visible in the dashboard. Each entry includes:

| Field | Description |
|-------|-------------|
| QueryID | Unique request identifier |
| RequesterID | Platform identifier (e.g., `grok-xai`, `claude`) |
| Decision | ALLOW or DENY |
| ReasonCode | Why the decision was made (e.g., DENY_IMPERSONATION) |
| SimilarityScore | Face match confidence (0.0 - 1.0) |
| ManifestHash | KMS-signed proof hash (ALLOW only) |
| Timestamp | When the check occurred |

---

## Platform Comparison

| Feature | Claude (MCP) | Grok (API) |
|---------|-------------|------------|
| Protocol | MCP Streamable HTTP | OpenAI-compatible function calling |
| Chat UI | Claude.ai (native) | Terminal script (API only) |
| Auth | OAuth flow (auto) | API key |
| Image handling | MCP tools handle upload | Direct URL or S3 upload |
| Setup complexity | Medium (MCP server + ngrok) | Low (single Python script) |
| Requires running server | Yes (MCP + ngrok) | No (calls API directly) |
| Audit trail | Same dashboard | Same dashboard |

---

## Files Created

```
likenessguard-mcp/
├── server.py              # MCP server for Claude.ai
├── grok_integration.py    # Grok/xAI function calling integration
├── openai_integration.py  # OpenAI function calling integration (bonus)
├── requirements.txt       # Python dependencies
└── README.md              # Quick start guide
```

---

## Running Everything

To have the full stack running for a demo:

```powershell
# Terminal 1: Dashboard
cd likenessguard-dashboard
npm run dev

# Terminal 2: MCP Server (for Claude)
cd likenessguard-mcp
python server.py

# Terminal 3: ngrok tunnel (for Claude)
ngrok http 8080

# Terminal 4: Grok test (one-off)
cd likenessguard-mcp
$env:XAI_API_KEY = "your-key"
python grok_integration.py
```

The AWS backend (API Gateway + Lambda + DynamoDB + OpenSearch + Bedrock) is always running — no deployment needed for the consent pipeline itself.
