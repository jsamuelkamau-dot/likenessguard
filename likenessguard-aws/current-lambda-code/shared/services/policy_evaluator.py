"""
Policy evaluator for consent check decisions.

This module implements the core policy evaluation logic that determines
whether a requested usage is allowed based on the user's consent policy.

Requirements:
- 10.3: Permitted usage returns ALLOW
- 10.4: Prohibited usage returns DENY
- 10.6: Decisions include reason codes
"""

from typing import Tuple
from ..models.data_models import ConsentPolicy, UsageType, Decision, ReasonCode


def evaluate_consent(
    policy: ConsentPolicy,
    usage_type: UsageType,
    requester_id: str,
    user_id: str
) -> Tuple[Decision, ReasonCode]:
    """
    Evaluate consent policy against a requested usage.
    
    This function implements the core policy evaluation logic:
    1. Check if this is a self-edit (requester == user)
    2. Check specific denials based on usage type
    3. Apply default deny for safety
    
    Args:
        policy: The user's consent policy
        usage_type: The type of usage being requested
        requester_id: ID of the entity requesting to use the likeness
        user_id: ID of the user who owns the likeness
        
    Returns:
        Tuple of (Decision, ReasonCode) explaining the decision
        
    Requirements:
        - 10.3: Permitted usage returns ALLOW
        - 10.4: Prohibited usage returns DENY
        - 10.6: Decisions include reason codes
    """
    # Self-edits are handled specially
    if requester_id == user_id and usage_type == UsageType.SELF_EDIT:
        if policy.allow_self_edits:
            return Decision.ALLOW, ReasonCode.ALLOW_SELF_EDIT
        else:
            return Decision.DENY, ReasonCode.DENY_POLICY_VIOLATION
    
    # Check specific denials based on usage type
    if usage_type == UsageType.THIRD_PARTY_EDIT:
        if policy.deny_third_party_edits:
            return Decision.DENY, ReasonCode.DENY_THIRD_PARTY
        else:
            return Decision.ALLOW, ReasonCode.ALLOW_POLICY_PERMITS
    
    if usage_type == UsageType.FACE_SWAP:
        if policy.deny_face_swaps:
            return Decision.DENY, ReasonCode.DENY_FACE_SWAP
        else:
            return Decision.ALLOW, ReasonCode.ALLOW_POLICY_PERMITS
    
    # For general generation, check all applicable denials
    if usage_type == UsageType.GENERAL_GENERATION:
        # Check if any specific denial applies
        # For general generation, we apply a conservative approach:
        # if third-party edits are denied, general generation is also denied
        if policy.deny_third_party_edits:
            return Decision.DENY, ReasonCode.DENY_THIRD_PARTY
        else:
            return Decision.ALLOW, ReasonCode.ALLOW_POLICY_PERMITS
    
    # Default deny for safety (should not reach here with valid usage types)
    return Decision.DENY, ReasonCode.DENY_POLICY_VIOLATION
