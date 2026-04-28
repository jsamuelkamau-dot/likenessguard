# LikenessGuard Demo - Sample Test Data

This directory contains the demonstration script and sample test data for the LikenessGuard AWS prototype.

## Overview

The demo demonstrates the complete LikenessGuard workflow:
1. User registration with sample photos
2. Consent policy definition
3. Consent checks (ALLOW, DENY, UNKNOWN scenarios)
4. Audit log review
5. Policy updates
6. Verification of policy changes

## Running the Demo

```bash
cd likenessguard-aws/demo
python3 demo_flow.py
```

The demo script uses mock data and does not require AWS resources to be deployed. For actual deployment testing, replace the `MockLikenessGuardAPI` class with real API calls.

## Sample Test Data

### Sample Face Photos

For testing with real face detection, you'll need 5-10 sample face photos. Since we cannot include actual face photos in this repository, here are recommended sources:

#### Option 1: Public Domain Face Datasets
- **Labeled Faces in the Wild (LFW)**: http://vis-www.cs.umass.edu/lfw/
  - Public domain dataset with thousands of face images
  - Download a subset of 5-10 images for testing
  
- **CelebA Dataset**: https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html
  - Large-scale face attributes dataset
  - Free for research purposes

#### Option 2: AI-Generated Faces
- **This Person Does Not Exist**: https://thispersondoesnotexist.com/
  - Generate synthetic faces using StyleGAN
  - No privacy concerns since faces are AI-generated
  - Refresh the page to generate new faces
  - Right-click and save 5-10 different faces

- **Generated Photos**: https://generated.photos/
  - High-quality AI-generated face photos
  - Free tier available for testing

#### Option 3: Your Own Photos
- Use your own photos for testing (with consent)
- Ensure photos meet requirements:
  - Clear, frontal face visible
  - Good lighting
  - JPEG or PNG format
  - Minimum 640x480 resolution

### Directory Structure

Place your sample photos in the following structure:

```
demo/
├── sample_photos/
│   ├── user_alice/
│   │   ├── photo_1.jpg
│   │   ├── photo_2.jpg
│   │   ├── photo_3.jpg
│   │   ├── photo_4.jpg
│   │   ├── photo_5.jpg
│   │   ├── photo_6.jpg
│   │   └── photo_7.jpg
│   ├── user_bob/
│   │   ├── photo_1.jpg
│   │   └── ... (5-10 photos)
│   └── reference_images/
│       ├── alice_reference.jpg
│       ├── bob_reference.jpg
│       └── unknown_person.jpg
├── sample_policies/
│   ├── permissive_policy.json
│   ├── restrictive_policy.json
│   └── default_policy.json
└── demo_flow.py
```

### Sample Consent Policies

Pre-configured consent policy examples are provided in `sample_policies/`:

- **permissive_policy.json**: Allows most usage types
- **restrictive_policy.json**: Denies most usage types
- **default_policy.json**: Balanced policy for typical users

## Image Requirements

For successful face detection with Amazon Rekognition:

- **Format**: JPEG or PNG
- **Resolution**: Minimum 640x480 pixels (recommended: 1024x768 or higher)
- **Face visibility**: Face should occupy at least 50x50 pixels
- **Face orientation**: Frontal or near-frontal (±45 degrees)
- **Lighting**: Good lighting with minimal shadows
- **Quality**: Clear, not blurry
- **File size**: Under 5MB per image

## Testing Scenarios

### Scenario 1: ALLOW (Self-Edit)
- User: Alice
- Requester: Alice
- Usage Type: SELF_EDIT
- Expected: ALLOW

### Scenario 2: DENY (Third-Party Edit)
- User: Alice
- Requester: Bob
- Usage Type: THIRD_PARTY_EDIT
- Policy: deny_third_party_edits = True
- Expected: DENY

### Scenario 3: DENY (Face Swap)
- User: Alice
- Requester: Bob
- Usage Type: FACE_SWAP
- Policy: deny_face_swaps = True
- Expected: DENY

### Scenario 4: UNKNOWN (Unregistered User)
- User: Charlie (not registered)
- Requester: Anyone
- Usage Type: Any
- Expected: UNKNOWN (default-deny)

## Privacy and Ethics

When collecting sample test data:

- **Consent**: Only use photos where you have explicit consent
- **Privacy**: Do not use photos of minors or vulnerable individuals
- **Diversity**: Include diverse faces to test for bias
- **Attribution**: Respect licensing terms of public datasets
- **Cleanup**: Delete test photos after demonstration

## Next Steps

After obtaining sample photos:

1. Place photos in `demo/sample_photos/` directory
2. Update `demo_flow.py` to use real photos (optional)
3. Deploy AWS infrastructure using SAM template
4. Update API endpoints in demo script
5. Run end-to-end demonstration

## Notes

- The current `demo_flow.py` uses mock data and does not require actual photos
- For AWS deployment testing, you'll need to upload photos to S3
- Ensure AWS credentials are configured before running with real API calls
- Monitor AWS Free Tier usage during testing
