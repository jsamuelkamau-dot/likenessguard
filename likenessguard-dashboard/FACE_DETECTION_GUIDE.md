# Face Detection Troubleshooting Guide

## Current Status

✓ S3 uploads are working correctly (Content-Type fix applied)
✓ Files are being persisted in S3
✓ Confidence threshold lowered to 50% (from 70%)
✓ Lambda function deployed with updated threshold

## Issue: "No valid faces detected in any photos"

This error means AWS Rekognition cannot detect faces in your uploaded photos with sufficient confidence. This is NOT an upload issue - your photos are successfully uploaded to S3, but Rekognition cannot find faces in them.

## Why This Happens

AWS Rekognition has specific requirements for face detection:

1. **Image Quality**
   - Photos must be clear and well-lit
   - Minimum recommended resolution: 200x200 pixels
   - Face should occupy a reasonable portion of the image

2. **Face Visibility**
   - Face must be clearly visible
   - Avoid heavy shadows on the face
   - Face should be facing forward (not extreme angles)
   - Eyes, nose, and mouth should be visible

3. **Obstructions**
   - Avoid sunglasses (especially dark ones)
   - Avoid face masks or coverings
   - Avoid hats that cover the forehead
   - Avoid hands covering parts of the face

4. **Number of Faces**
   - Each photo must contain EXACTLY ONE face
   - Multiple faces will be rejected
   - No faces will be rejected

5. **Image Compression**
   - The dashboard compresses images to 400x400px at 0.5 quality
   - If original images are too small, compression may reduce quality further
   - Use higher resolution source images (at least 800x800px recommended)

## Current Configuration

- **Confidence Threshold**: 50% (very permissive)
- **Image Compression**: 400x400px, JPEG quality 0.5
- **Supported Formats**: JPEG, PNG, WebP (all converted to JPEG)

## Recommendations

### For Best Results:

1. **Use High-Quality Photos**
   - Original resolution: 800x800px or higher
   - Well-lit environment (natural light is best)
   - Clear, sharp focus on the face

2. **Face Position**
   - Face should be centered in the frame
   - Face should occupy 30-50% of the image
   - Look directly at the camera
   - Neutral expression works best

3. **Lighting**
   - Even lighting on the face
   - Avoid harsh shadows
   - Avoid backlighting (light behind the person)
   - Indoor lighting or outdoor shade works well

4. **What to Avoid**
   - Selfies with extreme angles
   - Group photos (multiple faces)
   - Photos with sunglasses
   - Very small or distant faces
   - Blurry or out-of-focus photos
   - Photos taken in very dark environments

### Example Good Photos:
- Passport-style photos
- Professional headshots
- Clear selfies with good lighting
- Driver's license photos
- ID card photos

### Example Bad Photos:
- Group photos with multiple people
- Photos with sunglasses
- Very small profile pictures
- Blurry or pixelated images
- Photos with face partially covered
- Extreme close-ups or wide shots

## Testing Your Photos

Before uploading through the dashboard, you can test if Rekognition can detect faces:

1. Upload photos through the dashboard
2. Check the browser console for detailed error messages
3. The error will show which specific photos failed and why

## Diagnostic Tools

### Check Recent Uploads
```powershell
cd likenessguard-aws
./diagnose-face-detection.ps1
```

This script will:
- Check your AWS configuration
- Find recent S3 uploads
- Download the most recent photo
- Test face detection with Rekognition
- Provide specific feedback on why detection failed

### Check Lambda Logs
```powershell
cd likenessguard-aws
./check-registration-logs.ps1
```

This will show detailed logs from the registration Lambda, including:
- Which photos were processed
- Confidence scores for detected faces
- Specific errors for each photo

## If Face Detection Still Fails

### Option 1: Use Better Photos
The most reliable solution is to use higher quality photos that meet Rekognition's requirements.

### Option 2: Lower Threshold Further (Not Recommended)
You can lower the confidence threshold below 50%, but this may result in:
- False positives (detecting faces that aren't really faces)
- Lower quality fingerprints
- Reduced accuracy in consent checking

To lower the threshold:
1. Edit `likenessguard-aws/src/shared/services/rekognition_client.py`
2. Change `min_confidence: float = 50.0` to a lower value (e.g., 30.0)
3. Run `./deploy-lower-threshold.ps1` to deploy

### Option 3: Use Different Photos
Try different photos of the same person:
- Take new photos specifically for this purpose
- Use a smartphone camera (usually better than webcams)
- Ensure good lighting
- Follow the recommendations above

## Technical Details

### How Face Detection Works

1. **Upload**: Photos are compressed and uploaded to S3
2. **Detection**: Lambda downloads photos from S3
3. **Rekognition**: AWS Rekognition analyzes each photo
4. **Confidence Score**: Rekognition assigns a confidence score (0-100%)
5. **Threshold Check**: Photos with confidence < 50% are rejected
6. **Embedding**: Accepted faces are converted to embeddings
7. **Fingerprint**: Embeddings are hashed to create fingerprints

### Current Threshold: 50%

- **50-70%**: Low confidence, may include false positives
- **70-85%**: Medium confidence, good balance (previous setting)
- **85-95%**: High confidence, very strict
- **95-100%**: Very high confidence, extremely strict

We've set it to 50% to be as permissive as possible while still maintaining reasonable accuracy.

## Success Indicators

When face detection works correctly, you'll see:
- ✓ "Registration successful" message
- ✓ Likeness ID generated
- ✓ No error messages in console
- ✓ Status: "SUCCESS" or "PARTIAL_SUCCESS" (if some photos failed)

## Common Error Messages

### "No face detected with confidence >= 50.0%"
- Rekognition found something that might be a face, but confidence is too low
- Try better quality photos or better lighting

### "Multiple faces detected in photo X"
- The photo contains more than one face
- Use photos with only one person

### "No face detected in photo X"
- Rekognition couldn't find any face at all
- The photo may be too small, too blurry, or face is not visible

## Next Steps

1. **Try the dashboard again** with the new 50% threshold
2. **Use high-quality photos** that meet the recommendations above
3. **Check browser console** for specific error messages
4. **Run diagnostic script** if issues persist
5. **Contact support** if you continue to have issues with good quality photos

## Date Updated
February 21, 2026

## Changes Made
- Lowered confidence threshold from 70% to 50%
- Deployed updated Lambda function
- Created diagnostic tools
- Documented best practices for photo selection
