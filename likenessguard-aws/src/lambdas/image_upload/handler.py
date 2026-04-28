"""
Image Upload Lambda — accepts base64 image, stores in S3, returns a temporary public URL.
POST /v2/image/upload
Body: { "image": "<base64>", "content_type": "image/jpeg" }
Returns: { "image_url": "https://...", "expires_in": 3600 }

This enables GPT Actions to work: user uploads image here first, gets URL, GPT passes URL to consent check.
"""
import json, logging, os, time, uuid, base64, boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

BUCKET = os.environ.get('IMAGE_UPLOAD_BUCKET', 'likenessguard-jwks-YOUR_ACCOUNT_ID')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
UPLOAD_PREFIX = 'temp-images/'
EXPIRY_SECONDS = 3600  # 1 hour

CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}


def lambda_handler(event, context):
    try:
        body = event.get('body', event)
        if isinstance(body, str):
            body = json.loads(body)

        image_b64 = body.get('image', '')
        content_type = body.get('content_type', 'image/jpeg')

        if not image_b64:
            return _resp(400, {'error': 'image (base64) is required'})

        # Decode
        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return _resp(400, {'error': 'Invalid base64 encoding'})

        if len(image_bytes) > 10 * 1024 * 1024:
            return _resp(400, {'error': 'Image exceeds 10MB'})

        # Determine extension
        ext = 'jpg'
        if content_type == 'image/png':
            ext = 'png'
        elif content_type == 'image/webp':
            ext = 'webp'

        # Upload to S3 with TTL metadata
        key = f"{UPLOAD_PREFIX}{uuid.uuid4()}.{ext}"
        s3 = boto3.client('s3', region_name=AWS_REGION)
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=image_bytes,
            ContentType=content_type,
            Metadata={'uploaded_at': str(int(time.time())), 'expires_at': str(int(time.time()) + EXPIRY_SECONDS)},
        )

        # Generate presigned URL (1 hour)
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': key},
            ExpiresIn=EXPIRY_SECONDS,
        )

        logger.info(f"Image uploaded: {key}, size={len(image_bytes)}")
        return _resp(200, {
            'image_url': url,
            'expires_in': EXPIRY_SECONDS,
            'message': 'Image uploaded. Use image_url in your consent check. URL expires in 1 hour.',
        })

    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        return _resp(500, {'error': str(e)})


def _resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps(body)}

