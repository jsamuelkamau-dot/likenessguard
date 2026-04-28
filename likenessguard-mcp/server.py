"""
LikenessGuard MCP Server
Streamable HTTP transport with OAuth stubs for Claude.ai connector.
"""

import httpx
from contextlib import asynccontextmanager
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse
from starlette.routing import Route, Mount

API_BASE = "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1"

# Allow ngrok host — disable DNS rebinding protection for reverse proxy
from mcp.server.transport_security import TransportSecuritySettings

mcp = FastMCP(
    "LikenessGuard",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=False,
        allowed_hosts=["*"],
        allowed_origins=["*"],
    )
)


@mcp.tool()
async def upload_image_for_consent(image_base64: str, filename: str = "consent_check.jpg") -> dict:
    """
    Upload a base64-encoded image to temporary storage and return a public URL.
    Use this when you have image data but need a public URL for check_consent.

    Args:
        image_base64: Base64-encoded image bytes (JPEG or PNG)
        filename: Optional filename hint

    Returns:
        url: Public URL valid for 5 minutes to use with check_consent
    """
    import boto3, base64, uuid
    key = f"tmp-consent-checks/{uuid.uuid4()}/{filename}"
    bucket = "likenessguard-jwks-538784191640"  # reuse existing public bucket
    image_bytes = base64.b64decode(image_base64)
    content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

    s3 = boto3.client("s3", region_name="us-east-1")
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
    )
    # Generate a pre-signed URL valid for 5 minutes
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=300,
    )
    return {"url": url, "key": key}


@mcp.tool()
async def check_consent(
    image_url: str,
    requester_id: str,
    usage_type: str = "GENERAL_GENERATION",
    platform: str = "claude"
) -> dict:
    """
    Check consent before generating or using a person's likeness.
    MUST be called before any image generation involving a real person.

    Args:
        image_url: Public URL of the reference image of the person
        requester_id: Identifier for who is making the request
        usage_type: One of GENERAL_GENERATION, COMMERCIAL, EDITORIAL, SELF_EDIT, RESEARCH
        platform: Platform making the request

    Returns:
        decision: ALLOW or DENY, plus reasoning and signed proof if ALLOW
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{API_BASE}/v2/consent/check", json={
            "image_url": image_url,
            "requester_id": requester_id,
            "usage_type": usage_type,
            "platform": platform,
        })
        return r.json()


@mcp.tool()
async def get_policy(likeness_id: str) -> dict:
    """
    Retrieve the consent policy for a registered subject.

    Args:
        likeness_id: The subject's LikenessGuard ID
    """
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{API_BASE}/v2/policy/{likeness_id}")
        return r.json()


@mcp.tool()
async def update_policy(
    likeness_id: str,
    allow_commercial: bool = None,
    allow_editorial: bool = None,
    allow_research: bool = None,
    allow_general_generation: bool = None,
) -> dict:
    """
    Update the consent policy for a registered subject.

    Args:
        likeness_id: The subject's LikenessGuard ID
        allow_commercial: Whether to allow commercial use
        allow_editorial: Whether to allow editorial use
        allow_research: Whether to allow research use
        allow_general_generation: Whether to allow general AI image generation
    """
    policy = {k: v for k, v in {
        "allow_commercial": allow_commercial,
        "allow_editorial": allow_editorial,
        "allow_research": allow_research,
        "allow_general_generation": allow_general_generation,
    }.items() if v is not None}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{API_BASE}/v2/policy/update", json={
            "likeness_id": likeness_id,
            "policy": policy,
        })
        return r.json()


# ── OAuth stubs (required by Claude.ai MCP connector) ─────────────────────────

async def oauth_metadata(request: Request):
    base = str(request.base_url).rstrip("/")
    return JSONResponse({
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "code_challenge_methods_supported": ["S256"],
    })


async def register(request: Request):
    body = await request.json()
    return JSONResponse({
        "client_id": "likenessguard-public",
        "client_secret": None,
        "redirect_uris": body.get("redirect_uris", []),
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
    }, status_code=201)


async def oauth_authorize(request: Request):
    redirect_uri = request.query_params.get("redirect_uri", "")
    state = request.query_params.get("state", "")
    sep = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(
        url=f"{redirect_uri}{sep}code=likenessguard-noauth&state={state}",
        status_code=302
    )


async def oauth_token(request: Request):
    return JSONResponse({
        "access_token": "likenessguard-public-token",
        "token_type": "bearer",
        "expires_in": 86400,
        "scope": "mcp",
    })


# ── App assembly with MCP lifespan ────────────────────────────────────────────

mcp_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(app):
    async with mcp_app.router.lifespan_context(app):
        yield


app = Starlette(
    lifespan=lifespan,
    routes=[
        Route("/.well-known/oauth-authorization-server", oauth_metadata),
        Route("/register", register, methods=["POST"]),
        Route("/oauth/authorize", oauth_authorize, methods=["GET"]),
        Route("/oauth/token", oauth_token, methods=["POST"]),
        Mount("/", app=mcp_app),
    ]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, forwarded_allow_ips="*")
