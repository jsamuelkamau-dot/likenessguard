# LikenessGuard MCP Server

Thin MCP wrapper around the LikenessGuard API so Claude.ai can check consent before generation.

## Setup

```bash
cd likenessguard-mcp
pip install -r requirements.txt
python server.py
```

Server starts at `http://localhost:8000`

## Expose publicly (required for Claude.ai)

Claude.ai cannot reach localhost, so expose it via ngrok:

```bash
ngrok http 8000
```

Copy the `https://xxxx.ngrok-free.app` URL.

## Add to Claude.ai

1. Go to Claude.ai → Settings → Connectors → Add custom connector
2. Name: `LikenessGuard`
3. Remote MCP server URL: `https://xxxx.ngrok-free.app/sse`
4. Click Add

## Available Tools

| Tool | Description |
|------|-------------|
| `check_consent` | Check consent via image URL (main tool) |
| `check_consent_base64` | Check consent via base64 image |
| `get_policy` | Get a subject's consent policy |
| `update_policy` | Update a subject's consent policy |
| `list_registered_subjects` | List registered subjects |

## Example Claude prompt

> "Before generating any image of this person [image URL], check their consent first using LikenessGuard."
