"""
LikenessGuard + Grok (xAI) Integration
Uses xAI's OpenAI-compatible API with function calling.

Usage:
    python grok_integration.py
    Set XAI_API_KEY env var or paste key when prompted.
"""

import os
import json
import httpx
import boto3
import base64
import uuid
from openai import OpenAI  # xAI uses the same OpenAI SDK

API_BASE = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1"
REQUESTER_ID = "grok-xai"

# xAI uses OpenAI SDK but with a different base_url
client = OpenAI(
    api_key=os.environ.get("XAI_API_KEY", ""),
    base_url="https://api.x.ai/v1",
)

TOOLS = [
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
                        "description": "Public URL of the reference image"
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
            "name": "upload_image_for_consent",
            "description": "Upload a base64-encoded image to get a public URL for consent checking.",
            "parameters": {
                "type": "object",
                "properties": {
                    "image_base64": {"type": "string"},
                    "filename": {"type": "string"}
                },
                "required": ["image_base64"]
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
                    "likeness_id": {"type": "string"}
                },
                "required": ["likeness_id"]
            }
        }
    }
]


def execute_tool(name: str, args: dict) -> str:
    if name == "upload_image_for_consent":
        image_bytes = base64.b64decode(args["image_base64"])
        filename = args.get("filename", "consent_check.jpg")
        key = f"tmp-consent-checks/{uuid.uuid4()}/{filename}"
        bucket = "likenessguard-jwks-YOUR_ACCOUNT_ID"
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.put_object(Bucket=bucket, Key=key, Body=image_bytes,
                      ContentType="image/png" if filename.endswith(".png") else "image/jpeg")
        url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=300)
        return json.dumps({"url": url})

    elif name == "check_consent":
        with httpx.Client(timeout=30) as h:
            r = h.post(f"{API_BASE}/v2/consent/check", json={
                "image_url": args["image_url"],
                "requester_id": REQUESTER_ID,
                "usage_type": args.get("usage_type", "GENERAL_GENERATION"),
                "platform": "grok",
            })
            return r.text

    elif name == "get_policy":
        with httpx.Client(timeout=15) as h:
            r = h.get(f"{API_BASE}/v2/policy/{args['likeness_id']}")
            return r.text

    return json.dumps({"error": f"Unknown tool: {name}"})


def chat(user_message: str, image_url: str = None) -> str:
    messages = [
        {"role": "system", "content": (
            "You are Grok with access to LikenessGuard consent enforcement. "
            "Before generating any content involving a real person's likeness, "
            "you MUST call check_consent. Refuse if DENY, proceed if ALLOW."
        )},
        {"role": "user", "content": user_message if not image_url else f"{user_message}\n\nImage: {image_url}"}
    ]

    while True:
        response = client.chat.completions.create(
            model="grok-3",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content

        messages.append(msg)
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            print(f"  → Grok calling {tc.function.name}({list(args.keys())})")
            result = execute_tool(tc.function.name, args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})


if __name__ == "__main__":
    api_key = os.environ.get("XAI_API_KEY") or input("Enter your xAI API key: ").strip()
    client.api_key = api_key

    print("\nLikenessGuard + Grok Integration")
    print("=" * 40)
    image_url = input("Enter a public image URL to check consent for: ").strip()

    print("\nSending to Grok with LikenessGuard consent enforcement...\n")
    result = chat(
        "Check consent for this person's image and tell me if AI image generation is permitted.",
        image_url=image_url
    )
    print("\nGrok Response:")
    print(result)

