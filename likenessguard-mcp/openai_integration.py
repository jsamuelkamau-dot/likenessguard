"""
LikenessGuard + OpenAI Integration
Calls LikenessGuard consent check before GPT-4 generates any image-related content.

Usage:
    pip install openai httpx boto3
    python openai_integration.py
"""

import os
import json
import httpx
import boto3
import base64
import uuid
from openai import OpenAI

API_BASE = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1"
REQUESTER_ID = "openai-gpt4"

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ── Tool definitions (OpenAI function calling format) ─────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "upload_image_for_consent",
            "description": "Upload a base64-encoded image to temporary storage and return a public URL for consent checking.",
            "parameters": {
                "type": "object",
                "properties": {
                    "image_base64": {
                        "type": "string",
                        "description": "Base64-encoded image bytes"
                    },
                    "filename": {
                        "type": "string",
                        "description": "Optional filename hint (e.g. photo.jpg)"
                    }
                },
                "required": ["image_base64"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_consent",
            "description": "Check consent before generating or using a person's likeness. MUST be called before any image generation involving a real person.",
            "parameters": {
                "type": "object",
                "properties": {
                    "image_url": {
                        "type": "string",
                        "description": "Public URL of the reference image of the person"
                    },
                    "usage_type": {
                        "type": "string",
                        "enum": ["GENERAL_GENERATION", "COMMERCIAL", "EDITORIAL", "SELF_EDIT", "RESEARCH"],
                        "description": "How the likeness will be used"
                    }
                },
                "required": ["image_url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_policy",
            "description": "Get the consent policy for a registered subject.",
            "parameters": {
                "type": "object",
                "properties": {
                    "likeness_id": {
                        "type": "string",
                        "description": "The subject's LikenessGuard ID"
                    }
                },
                "required": ["likeness_id"]
            }
        }
    }
]

# ── Tool execution ─────────────────────────────────────────────────────────────

def execute_tool(name: str, args: dict) -> str:
    if name == "upload_image_for_consent":
        image_bytes = base64.b64decode(args["image_base64"])
        filename = args.get("filename", "consent_check.jpg")
        key = f"tmp-consent-checks/{uuid.uuid4()}/{filename}"
        bucket = "likenessguard-jwks-YOUR_ACCOUNT_ID"
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.put_object(Bucket=bucket, Key=key, Body=image_bytes, ContentType=content_type)
        url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=300)
        return json.dumps({"url": url})

    elif name == "check_consent":
        with httpx.Client(timeout=30) as client_http:
            r = client_http.post(f"{API_BASE}/v2/consent/check", json={
                "image_url": args["image_url"],
                "requester_id": REQUESTER_ID,
                "usage_type": args.get("usage_type", "GENERAL_GENERATION"),
                "platform": "openai",
            })
            return r.text

    elif name == "get_policy":
        with httpx.Client(timeout=15) as client_http:
            r = client_http.get(f"{API_BASE}/v2/policy/{args['likeness_id']}")
            return r.text

    return json.dumps({"error": f"Unknown tool: {name}"})


# ── Agentic loop ───────────────────────────────────────────────────────────────

def chat_with_consent_check(user_message: str, image_url: str = None) -> str:
    """
    Send a message to GPT-4 with LikenessGuard consent enforcement.
    GPT-4 will automatically call check_consent before generating anything.
    """
    system_prompt = """You are a helpful assistant with access to LikenessGuard — 
a consent enforcement system for AI image generation.

IMPORTANT RULES:
- Before generating, describing, or creating any content involving a real person's likeness, 
  you MUST call check_consent first.
- If the result is DENY, you must refuse the generation and explain why.
- If the result is ALLOW, you may proceed with the generation.
- Always be transparent about the consent check result."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message if not image_url else f"{user_message}\n\nImage URL: {image_url}"}
    ]

    # Agentic loop — keep going until no more tool calls
    while True:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        msg = response.choices[0].message

        # No tool calls — we have the final answer
        if not msg.tool_calls:
            return msg.content

        # Execute all tool calls
        messages.append(msg)
        for tool_call in msg.tool_calls:
            args = json.loads(tool_call.function.arguments)
            print(f"  → Calling {tool_call.function.name}({list(args.keys())})")
            result = execute_tool(tool_call.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })


# ── Example usage ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("LikenessGuard + OpenAI Integration")
    print("=" * 40)

    # Example: check consent for a public image URL
    image_url = input("Enter a public image URL to check consent for: ").strip()
    if not image_url:
        image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Gatto_europeo4.jpg/320px-Gatto_europeo4.jpg"
        print(f"Using example URL: {image_url}")

    print("\nSending to GPT-4 with LikenessGuard consent enforcement...\n")
    result = chat_with_consent_check(
        "Please check consent for this person's image and tell me if I can generate AI images of them.",
        image_url=image_url
    )
    print("GPT-4 Response:")
    print(result)

