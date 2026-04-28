/**
 * S3 Upload Service
 * 
 * Handles S3 photo uploads using presigned URLs from the backend.
 * This service:
 * 1. Requests presigned URLs from the backend
 * 2. Uploads images directly to S3 using the presigned URLs
 * 3. Returns S3 keys for use in registration
 */

import { getApiClient } from './api-client';
import { API_ENDPOINTS } from '../config/api-config';

export interface PresignedUrlRequest {
  user_id: string;
  photo_count: number;
}

export interface PresignedUrlResponse {
  upload_urls: Array<{
    photo_key: string;
    upload_url: string;
  }>;
  expires_in: number;
}

export interface S3UploadResult {
  photo_keys: string[];
  uploaded_count: number;
  failed_uploads: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Get presigned URLs for S3 uploads
 * 
 * @param userId - User identifier
 * @param photoCount - Number of photos to upload
 * @returns Promise resolving to presigned URLs
 */
export const getPresignedUrls = async (
  userId: string,
  photoCount: number
): Promise<PresignedUrlResponse> => {
  const apiClient = getApiClient();
  
  const requestBody: PresignedUrlRequest = {
    user_id: userId,
    photo_count: photoCount,
  };
  
  return apiClient.post<PresignedUrlResponse>(
    API_ENDPOINTS.UPLOAD_PRESIGNED_URL,
    requestBody
  );
};

/**
 * Upload a single file to S3 using a presigned URL
 * 
 * CRITICAL: When the presigned URL is generated WITHOUT a ContentType parameter,
 * we must NOT send a Content-Type header in the upload request. Any Content-Type
 * header will cause a signature mismatch and S3 will reject the upload.
 * 
 * @param file - File to upload
 * @param presignedUrl - Presigned URL for upload
 * @returns Promise resolving when upload completes
 */
const uploadFileToS3 = async (file: File, presignedUrl: string): Promise<void> => {
  console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
  
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    // NO Content-Type header - presigned URL was generated without ContentType parameter
  });
  
  console.log(`S3 upload response: ${response.status} ${response.statusText}`);
  console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`S3 upload error body:`, errorText);
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  // Check if we got an ETag (indicates successful upload)
  const etag = response.headers.get('ETag');
  if (!etag) {
    console.warn('Warning: No ETag in response, upload may have failed silently');
  } else {
    console.log(`Upload successful, ETag: ${etag}`);
  }
};

/**
 * Upload multiple files to S3 using presigned URLs
 * 
 * @param userId - User identifier
 * @param files - Array of files to upload
 * @returns Promise resolving to upload results with S3 keys
 */
export const uploadFilesToS3 = async (
  userId: string,
  files: File[]
): Promise<S3UploadResult> => {
  // Get presigned URLs
  const presignedResponse = await getPresignedUrls(userId, files.length);
  
  const uploadResults: S3UploadResult = {
    photo_keys: [],
    uploaded_count: 0,
    failed_uploads: [],
  };
  
  // Upload each file
  const uploadPromises = files.map(async (file, index) => {
    try {
      const uploadInfo = presignedResponse.upload_urls[index];
      if (!uploadInfo) {
        throw new Error(`No presigned URL available for file ${index + 1}`);
      }
      
      await uploadFileToS3(file, uploadInfo.upload_url);
      
      // Success - add to results
      uploadResults.photo_keys.push(uploadInfo.photo_key);
      uploadResults.uploaded_count++;
    } catch (error) {
      // Failure - add to failed uploads
      uploadResults.failed_uploads.push({
        index,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      });
    }
  });
  
  // Wait for all uploads to complete (or fail)
  await Promise.allSettled(uploadPromises);
  
  return uploadResults;
};

/**
 * Convert File objects to base64 (fallback for when S3 upload is not available)
 * 
 * @param file - File object to convert
 * @returns Promise resolving to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message}`));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Upload files with fallback to base64 if S3 upload fails
 * 
 * SIMPLIFIED APPROACH: Always use base64 to avoid S3 signature issues
 * 
 * @param userId - User identifier
 * @param files - Array of files to upload
 * @returns Promise resolving to base64 strings
 */
export const uploadFilesWithFallback = async (
  _userId: string,
  files: File[]
): Promise<{
  photo_keys: string[];
  upload_method: 's3' | 'base64';
  errors?: string[];
}> => {
  // ALWAYS use base64 to avoid S3 presigned URL signature issues
  console.log('Using base64 upload method (bypassing S3 presigned URLs)');
  
  try {
    const base64Promises = files.map(file => fileToBase64(file));
    const base64Results = await Promise.all(base64Promises);
    
    return {
      photo_keys: base64Results,
      upload_method: 'base64',
    };
  } catch (error) {
    throw new Error(`Base64 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};