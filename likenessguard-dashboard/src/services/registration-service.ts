/**
 * Registration Service
 * 
 * Handles likeness registration operations including:
 * - S3 photo uploads with fallback to base64
 * - Registration API calls
 * - Response parsing and error handling
 * 
 * Requirements: 2.3, 2.4
 */

import { getApiClient } from './api-client';
import { uploadFilesWithFallback } from './s3-upload-service';
import { API_ENDPOINTS } from '../config/api-config';
import type {
  RegistrationRequest,
  RegistrationResponse,
  RegistrationApiResponse,
  ConsentPolicy,
} from '../types/api-types';

/**
 * Compress and resize an image file
 * 
 * @param file - Image file to compress
 * @param maxWidth - Maximum width in pixels (default: 400)
 * @param maxHeight - Maximum height in pixels (default: 400)
 * @param quality - JPEG quality 0-1 (default: 0.5)
 * @returns Promise resolving to compressed image as base64
 */
const compressImage = async (
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.5
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 JPEG
        const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Register a likeness with photos
 * 
 * This function:
 * 1. Compresses and resizes images
 * 2. Uploads images to S3 using presigned URLs
 * 3. Sends registration request with S3 keys to POST /register
 * 4. Parses and returns structured response
 * 
 * @param userId - User identifier
 * @param photos - Array of image File objects (5-10 images)
 * @param consentPolicy - User's consent policy
 * @param email - Optional user email
 * @returns Promise resolving to registration response
 * @throws ApiError if registration fails
 * 
 * Requirements: 2.3, 2.4
 */
export const registerLikeness = async (
  userId: string,
  photos: File[],
  consentPolicy: ConsentPolicy,
  email?: string
): Promise<RegistrationResponse> => {
  const apiClient = getApiClient();
  
  // Validate photo count
  if (photos.length < 5 || photos.length > 10) {
    throw {
      type: 'validation',
      message: 'Please provide between 5 and 10 photos',
      details: `Received ${photos.length} photos`,
    };
  }
  
  try {
    // Compress images before uploading
    // Max dimensions: 400x400, Quality: 0.5 (JPEG)
    console.log('Compressing images...');
    const compressedFiles: File[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const base64 = await compressImage(file, 400, 400, 0.5);
      
      // Convert base64 back to File object for S3 upload
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let j = 0; j < byteString.length; j++) {
        uint8Array[j] = byteString.charCodeAt(j);
      }
      const blob = new Blob([uint8Array], { type: 'image/jpeg' });
      const compressedFile = new File([blob], `photo_${i}.jpg`, { type: 'image/jpeg' });
      compressedFiles.push(compressedFile);
    }
    
    console.log(`Compressed ${compressedFiles.length} photos`);
    
    // Upload photos to S3 and get S3 keys
    console.log('Uploading photos to S3...');
    const uploadResult = await uploadFilesWithFallback(userId, compressedFiles);
    
    console.log(`Upload complete. Method: ${uploadResult.upload_method}`);
    console.log(`Photo keys count: ${uploadResult.photo_keys.length}`);
    
    if (uploadResult.photo_keys.length === 0) {
      throw {
        type: 'upload',
        message: 'Failed to upload photos',
        details: uploadResult.errors?.join(', ') || 'Unknown upload error',
      };
    }
    
    // Wait for S3 eventual consistency (2 seconds)
    // S3 has eventual consistency for new objects, so we need to wait
    // a bit before the Lambda tries to retrieve them
    if (uploadResult.upload_method === 's3') {
      console.log('Waiting for S3 consistency (2 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Create registration request with S3 keys (or base64 as fallback)
    const requestBody: RegistrationRequest = {
      user_id: userId,
      photo_keys: uploadResult.photo_keys,
      consent_policy: consentPolicy,
      email,
    };
    
    console.log('Sending registration request to:', API_ENDPOINTS.REGISTER);
    console.log('Request body structure:', {
      user_id: requestBody.user_id,
      photo_keys_count: requestBody.photo_keys.length,
      photo_keys_sample: requestBody.photo_keys[0]?.substring(0, 50) + '...',
      upload_method: uploadResult.upload_method,
      consent_policy: requestBody.consent_policy,
      email: requestBody.email
    });
    
    // Send registration request
    const response = await apiClient.post<RegistrationApiResponse>(
      API_ENDPOINTS.REGISTER,
      requestBody
    );
    
    console.log('Registration response:', response);
    
    // Parse response
    const responseBody = 'body' in response ? response.body : response;
    const result = responseBody as RegistrationResponse;
    
    return result;
  } catch (error: any) {
    // Log detailed error information
    console.error('Registration error details:', {
      message: error.message,
      type: error.type,
      details: error.details,
      statusCode: error.statusCode,
      fullError: error
    });
    
    // The error is already formatted by api-client
    // Just re-throw it with the message
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
};

/**
 * Validate image file format
 * 
 * @param file - File object to validate
 * @returns true if file format is accepted, false otherwise
 */
export const validateImageFormat = (file: File): boolean => {
  const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return acceptedFormats.includes(file.type.toLowerCase());
};

/**
 * Validate multiple image files
 * 
 * @param files - Array of File objects to validate
 * @returns Object with validation result and error messages
 */
export const validateImageFiles = (files: File[]): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check file count
  if (files.length < 5) {
    errors.push(`At least 5 photos required (provided ${files.length})`);
  }
  if (files.length > 10) {
    errors.push(`Maximum 10 photos allowed (provided ${files.length})`);
  }
  
  // Check each file format
  files.forEach((file, index) => {
    if (!validateImageFormat(file)) {
      errors.push(
        `File ${index + 1} (${file.name}) has invalid format. ` +
        `Accepted formats: JPEG, PNG, WebP`
      );
    }
  });
  
  // Check file sizes (optional - add reasonable limit like 10MB per file)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  files.forEach((file, index) => {
    if (file.size > maxSizeBytes) {
      errors.push(
        `File ${index + 1} (${file.name}) is too large. ` +
        `Maximum size: 10MB (file size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Create a default consent policy
 * 
 * @returns Default consent policy with restrictive settings
 */
export const createDefaultConsentPolicy = (): ConsentPolicy => {
  return {
    allow_self_edits: true,
    deny_third_party_edits: true,
    deny_face_swaps: true,
    deny_sexualized_content: true,
    deny_impersonation: true,
    deny_political_use: true,
  };
};