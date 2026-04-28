"""
Image Proxy Lambda — accepts base64 image, uploads to S3, returns presigned URL.
POST /v2/image/upload
Body: { "image": str (base64 or data URI), "filename": str (optional) }

Used by Custom GPT Actions and other AI agents that can't send binary directly
to the consent check endpoint.
"""
import base64
import json
import logging
import os
import uuid
import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

BUCKET = os.environ.get('JWKS_BUCKET', 'likenessguard-jwks-538784191640')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
URL_EXPIRY = 300  # 5 minutes

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

        image_data = body.get('image', '').strip()
        filename = body.get('filename', 'consent_check.jpg').strip() or 'consent_check.jpg'

        if not image_data:
            return _resp(400, {'error': 'image field is required'})

        # Strip data URI prefix if present (data:image/jpeg;base64,...)
        if ',' in image_data and image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]

        # Decode base64
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception:
            return _resp(400, {'error': 'Invalid base64 image encoding'})

        if len(image_bytes) > 10 * 1024 * 1024:
            return _resp(400, {'error': 'Image exceeds 10MB limit'})

        content_type = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
        key = f'tmp-consent-checks/{uuid.uuid4()}/{filename}'

        s3 = boto3.client('s3', region_name=AWS_REGION)
        s3.put_object(Bucket=BUCKET, Key=key, Body=image_bytes, ContentType=content_type)

        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': key},
            ExpiresIn=URL_EXPIRY,
        )

        logger.info(f"Image uploaded: key={key}, size={len(image_bytes)}, expires_in={URL_EXPIRY}s")
        return _resp(200, {'url': url, 'expires_in': URL_EXPIRY, 'key': key})

    except Exception as e:
        logger.error(f"Image proxy error: {e}", exc_info=True)
        return _resp(500, {'error': str(e)})


def _resp(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body)}
