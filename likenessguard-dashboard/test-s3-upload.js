/**
 * Comprehensive test script for S3 upload workflow
 * Run this in the browser console at http://localhost:5173/
 */

const testCompleteS3Workflow = async () => {
  console.log('🧪 Testing Complete S3 Upload Workflow...');
  
  const API_BASE = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';
  const API_KEY = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw';
  
  try {
    // Step 1: Test presigned URL generation
    console.log('📋 Step 1: Requesting presigned URLs...');
    
    const userId = 'test-user-' + Date.now();
    const photoCount = 5;
    
    const presignedResponse = await fetch(`${API_BASE}/upload/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        user_id: userId,
        photo_count: photoCount
      })
    });
    
    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      console.error('❌ Presigned URL request failed:', errorData);
      return;
    }
    
    const presignedData = await presignedResponse.json();
    console.log('✅ Got presigned URLs:', presignedData.upload_urls.length, 'URLs');
    
    // Step 2: Create test image data
    console.log('📋 Step 2: Creating test image data...');
    
    const createTestImage = (color = '#FF0000') => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 100, 100);
      
      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
    };
    
    // Create 5 test images with different colors
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    const testImages = await Promise.all(
      colors.map(color => createTestImage(color))
    );
    
    console.log('✅ Created', testImages.length, 'test images');
    
    // Step 3: Upload images to S3
    console.log('📋 Step 3: Uploading images to S3...');
    
    const uploadResults = [];
    const photoKeys = [];
    
    for (let i = 0; i < testImages.length; i++) {
      const image = testImages[i];
      const uploadInfo = presignedData.upload_urls[i];
      
      try {
        const s3Response = await fetch(uploadInfo.upload_url, {
          method: 'PUT',
          body: image,
          headers: {
            'Content-Type': 'image/jpeg'
          }
        });
        
        if (s3Response.ok) {
          console.log(`✅ Uploaded image ${i + 1}:`, uploadInfo.photo_key);
          uploadResults.push({ success: true, key: uploadInfo.photo_key });
          photoKeys.push(uploadInfo.photo_key);
        } else {
          console.error(`❌ Failed to upload image ${i + 1}:`, s3Response.statusText);
          uploadResults.push({ success: false, error: s3Response.statusText });
        }
      } catch (error) {
        console.error(`💥 Error uploading image ${i + 1}:`, error);
        uploadResults.push({ success: false, error: error.message });
      }
    }
    
    const successfulUploads = uploadResults.filter(r => r.success).length;
    console.log(`📊 Upload Results: ${successfulUploads}/${testImages.length} successful`);
    
    if (successfulUploads === 0) {
      console.error('❌ No images uploaded successfully. Cannot proceed with registration.');
      return;
    }
    
    // Step 4: Test registration with S3 keys
    console.log('📋 Step 4: Testing registration with S3 keys...');
    
    const registrationRequest = {
      user_id: userId,
      photo_keys: photoKeys,
      consent_policy: {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true
      },
      email: 'test@example.com'
    };
    
    console.log('📤 Sending registration request:', {
      user_id: registrationRequest.user_id,
      photo_keys_count: registrationRequest.photo_keys.length,
      consent_policy: registrationRequest.consent_policy
    });
    
    const registrationResponse = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(registrationRequest)
    });
    
    console.log('📥 Registration Status:', registrationResponse.status);
    
    const registrationData = await registrationResponse.json();
    console.log('📋 Registration Response:', registrationData);
    
    if (registrationResponse.ok) {
      console.log('✅ Registration successful!');
      console.log('🆔 Likeness ID:', registrationData.likeness_id);
      console.log('📊 Status:', registrationData.status);
      console.log('📸 Processed Photos:', registrationData.processed_photos);
      
      if (registrationData.errors && registrationData.errors.length > 0) {
        console.warn('⚠️ Registration had some issues:', registrationData.errors);
      }
    } else {
      console.error('❌ Registration failed:', registrationData);
    }
    
    // Step 5: Test consent check with the registered likeness
    if (registrationResponse.ok && registrationData.likeness_id) {
      console.log('📋 Step 5: Testing consent check...');
      
      // Create another test image for consent check
      const checkImage = await createTestImage('#00FFFF');
      const checkImageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(checkImage);
      });
      
      const consentCheckRequest = {
        query_image: checkImageBase64,
        usage_type: 'SELF_EDIT',
        requester_id: userId
      };
      
      const consentCheckResponse = await fetch(`${API_BASE}/consent/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(consentCheckRequest)
      });
      
      const consentCheckData = await consentCheckResponse.json();
      console.log('📋 Consent Check Response:', consentCheckData);
      
      if (consentCheckResponse.ok) {
        console.log('✅ Consent check completed!');
        console.log('⚖️ Decision:', consentCheckData.decision);
        console.log('📝 Reason:', consentCheckData.reason_code);
      } else {
        console.error('❌ Consent check failed:', consentCheckData);
      }
    }
    
    console.log('🎉 Complete S3 Upload Workflow Test Finished!');
    
    // Summary
    console.log('\n📊 WORKFLOW SUMMARY:');
    console.log('✅ Presigned URL Generation:', presignedResponse.ok ? 'SUCCESS' : 'FAILED');
    console.log('✅ S3 Image Uploads:', `${successfulUploads}/${testImages.length} successful`);
    console.log('✅ Registration:', registrationResponse.ok ? 'SUCCESS' : 'FAILED');
    
    if (registrationResponse.ok) {
      console.log('🎯 The S3 upload workflow is working correctly!');
      console.log('📋 Next steps:');
      console.log('  - Test with the actual dashboard UI');
      console.log('  - Monitor CloudWatch logs for any issues');
      console.log('  - Verify S3 bucket cleanup (photos should be deleted after processing)');
    } else {
      console.log('⚠️ There are issues with the workflow that need to be addressed.');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
};

// Run the comprehensive test
testCompleteS3Workflow();