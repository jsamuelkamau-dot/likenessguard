"""
LikenessGuard + Stable Diffusion Integration Example

Add consent enforcement to any Stable Diffusion pipeline in 10 lines.
"""
from likenessguard import LikenessGuardClient

# 1. Initialise client
client = LikenessGuardClient(
    api_endpoint="https://YOUR_API_ENDPOINT/v1",
    platform_id="stable-diffusion-webui",
    api_key="YOUR_API_KEY"
)

def generate_with_consent_check(reference_image_path: str, prompt: str):
    """Generate image only if consent is granted."""
    # 2. Check consent (10 lines total)
    result = client.check_consent(reference_image_path, usage_type="GENERAL_GENERATION")

    if result.denied:
        print(f"Generation blocked: {result.reason_code}")
        print(f"Reasoning: {result.reasoning_trace}")
        return None

    print(f"Consent granted (confidence: {result.confidence:.0%})")
    if result.proof_of_face:
        print(f"Proof-of-Face ID: {result.proof_of_face['manifest_id']}")

    # 3. Proceed with generation (your existing SD pipeline here)
    # image = sd_pipeline(prompt=prompt, ...)
    # return image
    return {"status": "would_generate", "proof": result.proof_of_face}


if __name__ == '__main__':
    generate_with_consent_check("reference.jpg", "portrait of a person")
