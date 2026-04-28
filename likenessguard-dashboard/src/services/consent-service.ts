/**
 * Consent Service
 * 
 * Handles consent policy management and consent checking operations including:
 * - Retrieving consent policies
 * - Updating consent policies
 * - Revoking consent
 * - Checking consent for reference images
 * 
 * Requirements: 3.1, 3.3, 3.5, 4.2
 */

import { getApiClient } from './api-client';
import { API_ENDPOINTS } from '../config/api-config';
import { fileToBase64 } from './s3-upload-service';
import type {
  ConsentPolicy,
  ConsentGetResponse,
  ConsentGetApiResponse,
  ConsentUpdateRequest,
  ConsentUpdateResponse,
  ConsentUpdateApiResponse,
  ConsentRevokeRequest,
  ConsentRevokeResponse,
  ConsentRevokeApiResponse,
  ConsentCheckRequest,
  ConsentCheckResponse,
  ConsentCheckApiResponse,
  UsageType,
} from '../types/api-types';

/**
 * Get consent policy for a likeness
 * 
 * This function:
 * 1. Sends GET request to /consent with likeness_id
 * 2. Parses and returns the consent policy
 * 
 * @param likenessId - Likeness identifier
 * @returns Promise resolving to consent policy and metadata
 * @throws ApiError if retrieval fails
 * 
 * Requirements: 3.1
 */
export const getPolicy = async (likenessId: string): Promise<ConsentGetResponse> => {
  const apiClient = getApiClient();
  
  // Validate likeness ID
  if (!likenessId || likenessId.trim() === '') {
    throw {
      type: 'validation',
      message: 'Likeness ID is required',
      details: 'Please provide a valid likeness ID',
    };
  }
  
  // Send GET request with likeness_id as query parameter
  const response = await apiClient.get<ConsentGetApiResponse>(
    API_ENDPOINTS.CONSENT_GET,
    { likeness_id: likenessId }
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as ConsentGetResponse;
};

/**
 * Update consent policy for a likeness
 * 
 * This function:
 * 1. Validates the new policy
 * 2. Sends PUT request to /consent with updated policy
 * 3. Returns confirmation of update
 * 
 * @param likenessId - Likeness identifier
 * @param newPolicy - Updated consent policy
 * @returns Promise resolving to update confirmation
 * @throws ApiError if update fails
 * 
 * Requirements: 3.3
 */
export const updatePolicy = async (
  likenessId: string,
  newPolicy: ConsentPolicy
): Promise<ConsentUpdateResponse> => {
  const apiClient = getApiClient();
  
  // Validate inputs
  if (!likenessId || likenessId.trim() === '') {
    throw {
      type: 'validation',
      message: 'Likeness ID is required',
      details: 'Please provide a valid likeness ID',
    };
  }
  
  if (!newPolicy) {
    throw {
      type: 'validation',
      message: 'Consent policy is required',
      details: 'Please provide a valid consent policy',
    };
  }
  
  // Create update request
  const requestBody: ConsentUpdateRequest = {
    likeness_id: likenessId,
    new_policy: newPolicy,
  };
  
  // Send PUT request
  const response = await apiClient.put<ConsentUpdateApiResponse>(
    API_ENDPOINTS.CONSENT_UPDATE,
    requestBody
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as ConsentUpdateResponse;
};

/**
 * Revoke consent for a likeness
 * 
 * This function:
 * 1. Sends DELETE request to /consent with likeness_id
 * 2. Returns confirmation of revocation
 * 
 * @param likenessId - Likeness identifier
 * @returns Promise resolving to revocation confirmation
 * @throws ApiError if revocation fails
 * 
 * Requirements: 3.5
 */
export const revokeConsent = async (likenessId: string): Promise<ConsentRevokeResponse> => {
  const apiClient = getApiClient();
  
  // Validate likeness ID
  if (!likenessId || likenessId.trim() === '') {
    throw {
      type: 'validation',
      message: 'Likeness ID is required',
      details: 'Please provide a valid likeness ID',
    };
  }
  
  // Create revoke request
  const requestBody: ConsentRevokeRequest = {
    likeness_id: likenessId,
  };
  
  // Send DELETE request with body
  const response = await apiClient.delete<ConsentRevokeApiResponse>(
    API_ENDPOINTS.CONSENT_REVOKE,
    { data: requestBody }
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as ConsentRevokeResponse;
};

/**
 * Check consent for a reference image
 * 
 * This function:
 * 1. Converts reference image to base64
 * 2. Sends POST request to /consent/check
 * 3. Returns decision (ALLOW, DENY, or UNKNOWN) with reason
 * 
 * @param referenceImage - Image file to check
 * @param usageType - Type of AI generation usage requested
 * @param requesterId - Identifier of the entity requesting consent
 * @param userId - Optional user ID if known
 * @returns Promise resolving to consent check decision
 * @throws ApiError if check fails
 * 
 * Requirements: 4.2
 */
export const checkConsent = async (
  referenceImage: File,
  usageType: UsageType,
  requesterId: string,
  userId?: string
): Promise<ConsentCheckResponse> => {
  const apiClient = getApiClient();
  
  // Validate inputs
  if (!referenceImage) {
    throw {
      type: 'validation',
      message: 'Reference image is required',
      details: 'Please provide an image file to check',
    };
  }
  
  if (!usageType) {
    throw {
      type: 'validation',
      message: 'Usage type is required',
      details: 'Please specify the type of AI generation usage',
    };
  }
  
  if (!requesterId || requesterId.trim() === '') {
    throw {
      type: 'validation',
      message: 'Requester ID is required',
      details: 'Please provide a valid requester identifier',
    };
  }
  
  // Convert image to base64
  const imageBase64 = await fileToBase64(referenceImage);
  
  // Create consent check request
  const requestBody: ConsentCheckRequest = {
    referenceImage: imageBase64,
    usageType,
    requesterId,
    userId,
  };
  
  // Send POST request
  const response = await apiClient.post<ConsentCheckApiResponse>(
    API_ENDPOINTS.CONSENT_CHECK,
    requestBody
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as ConsentCheckResponse;
};

/**
 * Validate consent policy structure
 * 
 * @param policy - Consent policy to validate
 * @returns Object with validation result and error messages
 */
export const validateConsentPolicy = (policy: ConsentPolicy): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check required fields
  if (typeof policy.allow_self_edits !== 'boolean') {
    errors.push('allow_self_edits must be a boolean');
  }
  if (typeof policy.deny_third_party_edits !== 'boolean') {
    errors.push('deny_third_party_edits must be a boolean');
  }
  if (typeof policy.deny_face_swaps !== 'boolean') {
    errors.push('deny_face_swaps must be a boolean');
  }
  if (typeof policy.deny_sexualized_content !== 'boolean') {
    errors.push('deny_sexualized_content must be a boolean');
  }
  if (typeof policy.deny_impersonation !== 'boolean') {
    errors.push('deny_impersonation must be a boolean');
  }
  if (typeof policy.deny_political_use !== 'boolean') {
    errors.push('deny_political_use must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
