# Face Detection Diagnostic Script
# This script helps diagnose why face detection is failing

Write-Host "=== Face Detection Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is configured
Write-Host "1. Checking AWS CLI configuration..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ AWS CLI is configured" -ForegroundColor Green
        $identity = $awsIdentity | ConvertFrom-Json
        Write-Host "   Account: $($identity.Account)" -ForegroundColor Gray
        Write-Host "   User: $($identity.Arn)" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ AWS CLI is not configured properly" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ✗ AWS CLI is not installed or configured" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check recent S3 uploads
Write-Host "2. Checking recent S3 uploads..." -ForegroundColor Yellow
$bucket = "likenessguard-photos-538784191640"
$recentFiles = aws s3 ls "s3://$bucket/uploads/" --recursive | Select-Object -Last 10

if ($recentFiles) {
    Write-Host "   ✓ Found recent uploads:" -ForegroundColor Green
    $recentFiles | ForEach-Object {
        Write-Host "     $_" -ForegroundColor Gray
    }
    
    # Get the most recent file
    $lastFile = ($recentFiles | Select-Object -Last 1) -split '\s+' | Select-Object -Last 1
    Write-Host ""
    Write-Host "   Most recent file: $lastFile" -ForegroundColor Cyan
    
    # Download the file for testing
    Write-Host ""
    Write-Host "3. Downloading most recent file for testing..." -ForegroundColor Yellow
    $tempFile = "temp_test_image.jpg"
    aws s3 cp "s3://$bucket/$lastFile" $tempFile 2>&1 | Out-Null
    
    if (Test-Path $tempFile) {
        Write-Host "   ✓ Downloaded: $tempFile" -ForegroundColor Green
        $fileSize = (Get-Item $tempFile).Length
        Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
        
        # Test face detection with Rekognition
        Write-Host ""
        Write-Host "4. Testing face detection with AWS Rekognition..." -ForegroundColor Yellow
        
        # Create a test script
        $testScript = @"
import boto3
import sys

rekognition = boto3.client('rekognition')

with open('$tempFile', 'rb') as image_file:
    image_bytes = image_file.read()

try:
    response = rekognition.detect_faces(
        Image={'Bytes': image_bytes},
        Attributes=['ALL']
    )
    
    print(f"Faces detected: {len(response['FaceDetails'])}")
    
    if len(response['FaceDetails']) == 0:
        print("\n❌ NO FACES DETECTED")
        print("\nPossible reasons:")
        print("  1. Image is too small or low quality")
        print("  2. Face is not clearly visible")
        print("  3. Face is at an extreme angle")
        print("  4. Image compression is too aggressive")
        print("  5. Lighting is too poor")
        sys.exit(1)
    
    for i, face in enumerate(response['FaceDetails']):
        print(f"\nFace {i+1}:")
        print(f"  Confidence: {face['Confidence']:.2f}%")
        print(f"  Bounding Box: {face['BoundingBox']}")
        
        if 'Quality' in face:
            print(f"  Quality:")
            print(f"    Brightness: {face['Quality'].get('Brightness', 'N/A')}")
            print(f"    Sharpness: {face['Quality'].get('Sharpness', 'N/A')}")
        
        if 'Pose' in face:
            print(f"  Pose:")
            print(f"    Yaw: {face['Pose'].get('Yaw', 'N/A')}")
            print(f"    Pitch: {face['Pose'].get('Pitch', 'N/A')}")
            print(f"    Roll: {face['Pose'].get('Roll', 'N/A')}")
    
    # Check if any face meets the 70% threshold
    high_confidence_faces = [f for f in response['FaceDetails'] if f['Confidence'] >= 70.0]
    
    if len(high_confidence_faces) == 0:
        print(f"\n⚠️  WARNING: No faces meet the 70% confidence threshold")
        print(f"   Highest confidence: {max([f['Confidence'] for f in response['FaceDetails']]):.2f}%")
        print(f"\n   RECOMMENDATION: Lower the confidence threshold in rekognition_client.py")
        sys.exit(1)
    elif len(high_confidence_faces) > 1:
        print(f"\n⚠️  WARNING: Multiple faces detected ({len(high_confidence_faces)} faces)")
        print(f"   The system requires exactly one face per photo")
        sys.exit(1)
    else:
        print(f"\n✓ SUCCESS: One face detected with {high_confidence_faces[0]['Confidence']:.2f}% confidence")
        sys.exit(0)
        
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    sys.exit(1)
"@
        
        $testScript | Out-File -FilePath "test_face_detection.py" -Encoding UTF8
        
        # Run the test
        python test_face_detection.py
        $exitCode = $LASTEXITCODE
        
        # Cleanup
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        Remove-Item test_face_detection.py -ErrorAction SilentlyContinue
        
        Write-Host ""
        if ($exitCode -eq 0) {
            Write-Host "=== DIAGNOSIS: Face detection is working correctly ===" -ForegroundColor Green
            Write-Host "The issue may be with the specific photos you're uploading." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Tips for better face detection:" -ForegroundColor Cyan
            Write-Host "  • Use well-lit photos" -ForegroundColor Gray
            Write-Host "  • Face should be clearly visible and facing forward" -ForegroundColor Gray
            Write-Host "  • Avoid sunglasses or face coverings" -ForegroundColor Gray
            Write-Host "  • Use higher resolution images (at least 200x200 pixels)" -ForegroundColor Gray
            Write-Host "  • Ensure only ONE face per photo" -ForegroundColor Gray
        } else {
            Write-Host "=== DIAGNOSIS: Face detection is failing ===" -ForegroundColor Red
            Write-Host "See the error details above for specific issues." -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   ✗ Failed to download file" -ForegroundColor Red
    }
    
} else {
    Write-Host "   ✗ No recent uploads found in S3" -ForegroundColor Red
    Write-Host ""
    Write-Host "   This means photos are not being uploaded to S3." -ForegroundColor Yellow
    Write-Host "   Please try uploading photos through the dashboard first." -ForegroundColor Yellow
}

Write-Host ""
