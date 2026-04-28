#!/usr/bin/env python3
"""
LikenessGuard AWS Prototype - Demonstration Script

This script demonstrates the complete LikenessGuard system flow:
1. Register a user with sample photos
2. Define consent policy
3. Submit consent check (ALLOW scenario)
4. Submit consent check (DENY scenario)
5. Display audit logs
6. Update consent policy
7. Verify policy change applied

Requirements: 18.1, 18.2, 18.3, 18.4

NOTE: This is a mock demonstration for the prototype.
For actual deployment, replace mock functions with real API calls.
"""

import json
import time
import uuid
from typing import Dict, Any

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")


def print_step(step_num: int, text: str):
    """Print a formatted step."""
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}Step {step_num}: {text}{Colors.ENDC}")


def print_success(text: str):
    """Print a success message."""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print an info message."""
    print(f"{Colors.OKCYAN}  {text}{Colors.ENDC}")


def print_json(data: Dict[str, Any], indent: int = 2):
    """Print formatted JSON."""
    print(json.dumps(data, indent=indent, default=str))


class MockLikenessGuardAPI:
    """Mock API for demonstration purposes."""
    
    def __init__(self):
        self.registered_users = {}
        self.audit_logs = []
        
    def register_user(self, user_id: str, photo_count: int, consent_policy: Dict) -> Dict:
        """Mock user registration."""
        likeness_id = str(uuid.uuid4())
        self.registered_users[likeness_id] = {
            'user_id': user_id,
            'consent_policy': consent_policy,
            'created_at': int(time.time())
        }
        
        return {
            'likeness_id': likeness_id,
            'status': 'SUCCESS',
            'processed_photos': photo_count
        }
    
    def consent_check(self, likeness_id: str, usage_type: str, requester_id: str) -> Dict:
        """Mock consent check."""
        if likeness_id not in self.registered_users:
            decision = 'UNKNOWN'
            reason_code = 'UNKNOWN_NO_MATCH'
        else:
            user = self.registered_users[likeness_id]
            policy = user['consent_policy']
            
            # Evaluate policy
            if usage_type == 'SELF_EDIT' and requester_id == user['user_id']:
                decision = 'ALLOW' if policy.get('allow_self_edits') else 'DENY'
                reason_code = 'ALLOW_SELF_EDIT' if decision == 'ALLOW' else 'DENY_POLICY_VIOLATION'
            elif usage_type == 'THIRD_PARTY_EDIT':
                decision = 'DENY' if policy.get('deny_third_party_edits') else 'ALLOW'
                reason_code = 'DENY_THIRD_PARTY' if decision == 'DENY' else 'ALLOW_POLICY_PERMITS'
            elif usage_type == 'FACE_SWAP':
                decision = 'DENY' if policy.get('deny_face_swaps') else 'ALLOW'
                reason_code = 'DENY_FACE_SWAP' if decision == 'DENY' else 'ALLOW_POLICY_PERMITS'
            else:
                decision = 'DENY'
                reason_code = 'DENY_POLICY_VIOLATION'
        
        # Record audit log
        audit_entry = {
            'query_id': str(uuid.uuid4()),
            'timestamp': int(time.time()),
            'likeness_id': likeness_id if likeness_id in self.registered_users else None,
            'decision': decision,
            'reason_code': reason_code,
            'usage_type': usage_type,
            'requester_id': requester_id,
            'similarity_score': 0.95 if likeness_id in self.registered_users else None
        }
        self.audit_logs.append(audit_entry)
        
        return {
            'decision': decision,
            'reason_code': reason_code,
            'likeness_id': likeness_id if likeness_id in self.registered_users else None,
            'similarity_score': 0.95 if likeness_id in self.registered_users else None,
            'timestamp': audit_entry['timestamp']
        }
    
    def update_consent_policy(self, likeness_id: str, new_policy: Dict) -> Dict:
        """Mock policy update."""
        if likeness_id not in self.registered_users:
            return {'status': 'FAILURE', 'message': 'Likeness not found'}
        
        self.registered_users[likeness_id]['consent_policy'] = new_policy
        self.registered_users[likeness_id]['modified_at'] = int(time.time())
        
        return {
            'status': 'SUCCESS',
            'message': 'Policy updated successfully',
            'modified_at': self.registered_users[likeness_id]['modified_at']
        }
    
    def get_audit_logs(self, likeness_id: str = None) -> list:
        """Mock audit log retrieval."""
        if likeness_id:
            return [log for log in self.audit_logs if log.get('likeness_id') == likeness_id]
        return self.audit_logs


def run_demo():
    """Run the complete demonstration flow."""
    
    print_header("LikenessGuard AWS Prototype - System Demonstration")
    
    print(f"{Colors.OKCYAN}This demonstration shows the complete LikenessGuard workflow:")
    print("  • Privacy-preserving likeness consent enforcement")
    print("  • Machine-readable consent policies")
    print("  • Default-deny approach for unknown likenesses")
    print(f"  • Comprehensive audit logging{Colors.ENDC}\n")
    
    # Initialize mock API
    api = MockLikenessGuardAPI()
    
    # Step 1: Register user with sample photos
    print_step(1, "Register User with Sample Photos")
    print_info("Registering user 'alice@example.com' with 7 sample photos...")
    
    consent_policy = {
        'allow_self_edits': True,
        'deny_third_party_edits': True,
        'deny_face_swaps': True,
        'deny_sexualized_content': True,
        'deny_impersonation': True,
        'deny_political_use': True
    }
    
    registration_response = api.register_user(
        user_id='alice@example.com',
        photo_count=7,
        consent_policy=consent_policy
    )
    
    likeness_id = registration_response['likeness_id']
    print_success(f"User registered successfully!")
    print_info(f"Likeness ID: {likeness_id}")
    print_info(f"Photos processed: {registration_response['processed_photos']}")
    print_info("Consent Policy:")
    print_json(consent_policy)
    
    time.sleep(1)
    
    # Step 2: Submit consent check (ALLOW scenario)
    print_step(2, "Consent Check - ALLOW Scenario (Self-Edit)")
    print_info("Alice wants to edit her own photo...")
    print_info(f"Usage Type: SELF_EDIT")
    print_info(f"Requester: alice@example.com")
    
    allow_response = api.consent_check(
        likeness_id=likeness_id,
        usage_type='SELF_EDIT',
        requester_id='alice@example.com'
    )
    
    print_success(f"Decision: {allow_response['decision']}")
    print_info(f"Reason: {allow_response['reason_code']}")
    print_info(f"Similarity Score: {allow_response['similarity_score']}")
    
    time.sleep(1)
    
    # Step 3: Submit consent check (DENY scenario)
    print_step(3, "Consent Check - DENY Scenario (Third-Party Edit)")
    print_info("Bob wants to use Alice's likeness in his content...")
    print_info(f"Usage Type: THIRD_PARTY_EDIT")
    print_info(f"Requester: bob@example.com")
    
    deny_response = api.consent_check(
        likeness_id=likeness_id,
        usage_type='THIRD_PARTY_EDIT',
        requester_id='bob@example.com'
    )
    
    print_success(f"Decision: {deny_response['decision']}")
    print_info(f"Reason: {deny_response['reason_code']}")
    print_info(f"Similarity Score: {deny_response['similarity_score']}")
    print_info("Evidence recorded in audit log ✓")
    
    time.sleep(1)
    
    # Step 4: Submit consent check (UNKNOWN scenario)
    print_step(4, "Consent Check - UNKNOWN Scenario (Unregistered User)")
    print_info("Charlie (not registered) attempts to use system...")
    print_info(f"Usage Type: FACE_SWAP")
    print_info(f"Requester: charlie@example.com")
    
    unknown_response = api.consent_check(
        likeness_id='unknown-likeness-id',
        usage_type='FACE_SWAP',
        requester_id='charlie@example.com'
    )
    
    print_success(f"Decision: {unknown_response['decision']}")
    print_info(f"Reason: {unknown_response['reason_code']}")
    print_info("Default-deny protects unregistered individuals ✓")
    
    time.sleep(1)
    
    # Step 5: Display audit logs
    print_step(5, "Display Audit Logs")
    print_info(f"Retrieving audit logs for Likeness ID: {likeness_id}")
    
    audit_logs = api.get_audit_logs(likeness_id=likeness_id)
    print_success(f"Found {len(audit_logs)} audit log entries:")
    
    for i, log in enumerate(audit_logs, 1):
        print(f"\n{Colors.OKCYAN}  Entry {i}:{Colors.ENDC}")
        print_json(log)
    
    time.sleep(1)
    
    # Step 6: Update consent policy
    print_step(6, "Update Consent Policy")
    print_info("Alice decides to allow third-party edits...")
    
    new_policy = consent_policy.copy()
    new_policy['deny_third_party_edits'] = False
    
    update_response = api.update_consent_policy(
        likeness_id=likeness_id,
        new_policy=new_policy
    )
    
    print_success(f"Policy updated: {update_response['status']}")
    print_info(f"Modified at: {update_response['modified_at']}")
    print_info("New Policy:")
    print_json(new_policy)
    
    time.sleep(1)
    
    # Step 7: Verify policy change applied
    print_step(7, "Verify Policy Change Applied")
    print_info("Bob tries again with the updated policy...")
    print_info(f"Usage Type: THIRD_PARTY_EDIT")
    print_info(f"Requester: bob@example.com")
    
    verify_response = api.consent_check(
        likeness_id=likeness_id,
        usage_type='THIRD_PARTY_EDIT',
        requester_id='bob@example.com'
    )
    
    print_success(f"Decision: {verify_response['decision']}")
    print_info(f"Reason: {verify_response['reason_code']}")
    print_info("Policy change applied immediately ✓")
    
    # Summary
    print_header("Demonstration Complete")
    
    print(f"{Colors.OKGREEN}✓ All steps completed successfully!{Colors.ENDC}\n")
    
    print(f"{Colors.OKCYAN}Key Features Demonstrated:{Colors.ENDC}")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} User registration with consent policy")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} ALLOW decision for permitted usage (self-edit)")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} DENY decision for prohibited usage (third-party edit)")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} UNKNOWN decision for unregistered users (default-deny)")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} Comprehensive audit logging with evidence")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} Policy updates with immediate effect")
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} Privacy-preserving design (no raw biometric data)")
    
    print(f"\n{Colors.OKCYAN}Total Audit Log Entries: {len(api.audit_logs)}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}Registered Users: {len(api.registered_users)}{Colors.ENDC}\n")


if __name__ == '__main__':
    try:
        run_demo()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}Demo interrupted by user{Colors.ENDC}")
    except Exception as e:
        print(f"\n\n{Colors.FAIL}Error: {str(e)}{Colors.ENDC}")
        raise
