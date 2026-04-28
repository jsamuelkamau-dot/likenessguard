/**
 * Unit tests for API type definitions
 * 
 * These tests verify that the TypeScript types are properly structured
 * and can be used correctly in the application.
 */

import {
  UsageType,
  Decision,
  ReasonCode,
  ConsentPolicy,
  RegistrationRequest,
  RegistrationResponse,
  ConsentCheckRequest,
  ConsentCheckResponse,
  ConsentUpdateRequest,
  ConsentUpdateResponse,
  ConsentRevokeRequest,
  ConsentRevokeResponse,
  EvidenceRecord,
  EvidenceRetrievalResponse,
  ApiError,
} from './api-types';

describe('API Type Definitions', () => {
  describe('Enums', () => {
    it('should have correct UsageType values', () => {
      expect(UsageType.SELF_EDIT).toBe('SELF_EDIT');
      expect(UsageType.THIRD_PARTY_EDIT).toBe('THIRD_PARTY_EDIT');
      expect(UsageType.FACE_SWAP).toBe('FACE_SWAP');
      expect(UsageType.GENERAL_GENERATION).toBe('GENERAL_GENERATION');
    });

    it('should have correct Decision values', () => {
      expect(Decision.ALLOW).toBe('ALLOW');
      expect(Decision.DENY).toBe('DENY');
      expect(Decision.UNKNOWN).toBe('UNKNOWN');
    });

    it('should have correct ReasonCode values', () => {
      expect(ReasonCode.ALLOW_SELF_EDIT).toBe('ALLOW_SELF_EDIT');
      expect(ReasonCode.DENY_POLICY_VIOLATION).toBe('DENY_POLICY_VIOLATION');
      expect(ReasonCode.UNKNOWN_NO_MATCH).toBe('UNKNOWN_NO_MATCH');
    });
  });

  describe('ConsentPolicy', () => {
    it('should accept valid consent policy object', () => {
      const policy: ConsentPolicy = {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      };

      expect(policy.allow_self_edits).toBe(true);
      expect(policy.deny_third_party_edits).toBe(true);
    });

    it('should accept policy with all denials', () => {
      const policy: ConsentPolicy = {
        allow_self_edits: false,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      };

      expect(policy.allow_self_edits).toBe(false);
    });
  });

  describe('Registration API Types', () => {
    it('should accept valid registration request', () => {
      const request: RegistrationRequest = {
        user_id: 'user123',
        photo_keys: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg'],
        consent_policy: {
          allow_self_edits: true,
          deny_third_party_edits: true,
          deny_face_swaps: true,
          deny_sexualized_content: true,
          deny_impersonation: true,
          deny_political_use: true,
        },
        email: 'user@example.com',
      };

      expect(request.user_id).toBe('user123');
      expect(request.photo_keys.length).toBe(5);
    });

    it('should accept valid registration response', () => {
      const response: RegistrationResponse = {
        likeness_id: 'likeness-uuid-123',
        status: 'SUCCESS',
        processed_photos: 5,
      };

      expect(response.likeness_id).toBe('likeness-uuid-123');
      expect(response.status).toBe('SUCCESS');
    });

    it('should accept registration response with errors', () => {
      const response: RegistrationResponse = {
        likeness_id: 'likeness-uuid-123',
        status: 'PARTIAL_SUCCESS',
        processed_photos: 3,
        errors: ['Photo 4 had no face detected', 'Photo 5 had multiple faces'],
      };

      expect(response.errors).toHaveLength(2);
    });
  });

  describe('Consent Check API Types', () => {
    it('should accept valid consent check request', () => {
      const request: ConsentCheckRequest = {
        referenceImage: 'base64encodedimage',
        usageType: UsageType.SELF_EDIT,
        requesterId: 'requester123',
      };

      expect(request.usageType).toBe(UsageType.SELF_EDIT);
      expect(request.requesterId).toBe('requester123');
    });

    it('should accept consent check request with optional userId', () => {
      const request: ConsentCheckRequest = {
        referenceImage: 'base64encodedimage',
        usageType: UsageType.SELF_EDIT,
        requesterId: 'requester123',
        userId: 'user123',
      };

      expect(request.userId).toBe('user123');
    });

    it('should accept valid consent check response with ALLOW decision', () => {
      const response: ConsentCheckResponse = {
        decision: Decision.ALLOW,
        reason_code: ReasonCode.ALLOW_SELF_EDIT,
        timestamp: 1234567890,
        likeness_id: 'likeness-uuid-123',
        similarity_score: 0.95,
      };

      expect(response.decision).toBe(Decision.ALLOW);
      expect(response.similarity_score).toBe(0.95);
    });

    it('should accept consent check response with DENY decision', () => {
      const response: ConsentCheckResponse = {
        decision: Decision.DENY,
        reason_code: ReasonCode.DENY_POLICY_VIOLATION,
        timestamp: 1234567890,
        likeness_id: 'likeness-uuid-123',
        similarity_score: 0.92,
      };

      expect(response.decision).toBe(Decision.DENY);
    });

    it('should accept consent check response with UNKNOWN decision', () => {
      const response: ConsentCheckResponse = {
        decision: Decision.UNKNOWN,
        reason_code: ReasonCode.UNKNOWN_NO_MATCH,
        timestamp: 1234567890,
      };

      expect(response.decision).toBe(Decision.UNKNOWN);
      expect(response.likeness_id).toBeUndefined();
      expect(response.similarity_score).toBeUndefined();
    });
  });

  describe('Consent Policy API Types', () => {
    it('should accept valid consent update request', () => {
      const request: ConsentUpdateRequest = {
        likeness_id: 'likeness-uuid-123',
        new_policy: {
          allow_self_edits: false,
          deny_third_party_edits: true,
          deny_face_swaps: true,
          deny_sexualized_content: true,
          deny_impersonation: true,
          deny_political_use: true,
        },
      };

      expect(request.likeness_id).toBe('likeness-uuid-123');
      expect(request.new_policy.allow_self_edits).toBe(false);
    });

    it('should accept valid consent update response', () => {
      const response: ConsentUpdateResponse = {
        likeness_id: 'likeness-uuid-123',
        status: 'SUCCESS',
        message: 'Consent policy updated successfully',
        modified_at: 1234567890,
      };

      expect(response.status).toBe('SUCCESS');
      expect(response.modified_at).toBe(1234567890);
    });

    it('should accept valid consent revoke request', () => {
      const request: ConsentRevokeRequest = {
        likeness_id: 'likeness-uuid-123',
      };

      expect(request.likeness_id).toBe('likeness-uuid-123');
    });

    it('should accept valid consent revoke response', () => {
      const response: ConsentRevokeResponse = {
        likeness_id: 'likeness-uuid-123',
        status: 'SUCCESS',
        message: 'Consent revoked successfully',
        revoked_at: 1234567890,
      };

      expect(response.status).toBe('SUCCESS');
      expect(response.revoked_at).toBe(1234567890);
    });
  });

  describe('Activity Logs API Types', () => {
    it('should accept valid evidence record', () => {
      const record: EvidenceRecord = {
        query_id: 'query-uuid-123',
        timestamp: 1234567890,
        decision: 'ALLOW',
        reason_code: 'ALLOW_SELF_EDIT',
        similarity_score: 0.95,
        requester_id: 'requester123',
        usage_type: 'SELF_EDIT',
      };

      expect(record.query_id).toBe('query-uuid-123');
      expect(record.decision).toBe('ALLOW');
    });

    it('should accept evidence record without optional fields', () => {
      const record: EvidenceRecord = {
        query_id: 'query-uuid-123',
        timestamp: 1234567890,
        decision: 'UNKNOWN',
        reason_code: 'UNKNOWN_NO_MATCH',
        requester_id: 'requester123',
        usage_type: 'SELF_EDIT',
      };

      expect(record.similarity_score).toBeUndefined();
    });

    it('should accept valid evidence retrieval response', () => {
      const response: EvidenceRetrievalResponse = {
        likeness_id: 'likeness-uuid-123',
        evidence_records: [
          {
            query_id: 'query1',
            timestamp: 1234567890,
            decision: 'ALLOW',
            reason_code: 'ALLOW_SELF_EDIT',
            similarity_score: 0.95,
            requester_id: 'requester123',
            usage_type: 'SELF_EDIT',
          },
          {
            query_id: 'query2',
            timestamp: 1234567891,
            decision: 'DENY',
            reason_code: 'DENY_POLICY_VIOLATION',
            similarity_score: 0.92,
            requester_id: 'requester456',
            usage_type: 'THIRD_PARTY_EDIT',
          },
        ],
        count: 2,
      };

      expect(response.evidence_records.length).toBe(2);
      expect(response.count).toBe(2);
    });
  });

  describe('Error Response Types', () => {
    it('should accept valid API error', () => {
      const error: ApiError = {
        code: 'INVALID_REQUEST',
        message: 'Missing required field: user_id',
        timestamp: 1234567890,
        requestId: 'request-uuid-123',
      };

      expect(error.code).toBe('INVALID_REQUEST');
      expect(error.message).toBe('Missing required field: user_id');
    });

    it('should accept API error with details array', () => {
      const error: ApiError = {
        code: 'INSUFFICIENT_PHOTOS',
        message: 'At least 5 valid photos required',
        details: ['Photo 1 not found', 'Photo 2 not found'],
      };

      expect(Array.isArray(error.details)).toBe(true);
    });

    it('should accept API error with details string', () => {
      const error: ApiError = {
        code: 'DATABASE_ERROR',
        message: 'Failed to store consent record',
        details: 'Connection timeout',
      };

      expect(typeof error.details).toBe('string');
    });
  });
});
