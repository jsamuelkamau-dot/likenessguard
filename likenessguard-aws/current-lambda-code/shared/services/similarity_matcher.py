"""
Similarity Matcher Service

Implements similarity matching logic for comparing query fingerprints against
registered fingerprints in the consent registry. Handles threshold-based matching,
multiple match scenarios, and policy selection.

Requirements: 9.1, 9.2, 9.3, 9.4
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass
import logging

from ..models.data_models import ConsentRecord, ConsentPolicy
from .fingerprint_generator import calculate_cosine_similarity
from .dynamodb_client import DynamoDBClient

logger = logging.getLogger(__name__)


@dataclass
class Match:
    """Represents a fingerprint match with associated metadata."""
    likeness_id: str
    similarity_score: float
    consent_policy: ConsentPolicy
    fingerprint_hash: str


class SimilarityMatcher:
    """
    Handles similarity matching between query fingerprints and registered fingerprints.
    
    Implements:
    - Threshold-based matching (default 0.85)
    - Multiple match handling (most restrictive policy wins)
    - Efficient comparison against all registered fingerprints
    """
    
    def __init__(
        self,
        dynamodb_client: DynamoDBClient,
        similarity_threshold: float = 0.85
    ):
        """
        Initialize the similarity matcher.
        
        Args:
            dynamodb_client: Client for accessing the consent registry
            similarity_threshold: Minimum similarity score for a match (default 0.85)
        
        Raises:
            ValueError: If similarity_threshold is not between 0 and 1
        """
        if not 0 <= similarity_threshold <= 1:
            raise ValueError(
                f"Similarity threshold must be between 0 and 1, got {similarity_threshold}"
            )
        
        self.dynamodb_client = dynamodb_client
        self.similarity_threshold = similarity_threshold
        logger.info(
            f"SimilarityMatcher initialized with threshold={similarity_threshold}"
        )
    
    def find_matches(
        self,
        query_embedding: List[float],
        threshold: Optional[float] = None
    ) -> List[Match]:
        """
        Find all fingerprints matching the query embedding above the threshold.
        
        This method:
        1. Queries all registered fingerprints from DynamoDB
        2. Calculates cosine similarity for each fingerprint
        3. Returns matches above the threshold, sorted by similarity (highest first)
        
        Args:
            query_embedding: The normalized embedding vector to match against
            threshold: Optional override for similarity threshold
        
        Returns:
            List of Match objects sorted by similarity score (descending)
        
        Requirements:
            - 9.1: Compare against all registered fingerprints
            - 9.2: Calculate similarity scores using cosine similarity
            - 9.3: Identify matches above threshold
        """
        threshold = threshold if threshold is not None else self.similarity_threshold
        
        logger.info(
            f"Finding matches for query embedding (dim={len(query_embedding)}, "
            f"threshold={threshold})"
        )
        
        # Query all registered fingerprints from DynamoDB
        all_records = self.dynamodb_client.query_all_fingerprints()
        logger.info(f"Retrieved {len(all_records)} registered fingerprints")
        
        matches = []
        
        for record in all_records:
            try:
                # Calculate similarity between query and registered embedding
                similarity = calculate_cosine_similarity(
                    query_embedding,
                    record.fingerprint_embedding
                )
                
                # Check if similarity exceeds threshold
                if similarity >= threshold:
                    match = Match(
                        likeness_id=record.likeness_id,
                        similarity_score=similarity,
                        consent_policy=record.consent_policy,
                        fingerprint_hash=record.fingerprint_hash
                    )
                    matches.append(match)
                    logger.debug(
                        f"Match found: likeness_id={record.likeness_id}, "
                        f"similarity={similarity:.4f}"
                    )
            
            except Exception as e:
                logger.warning(
                    f"Error calculating similarity for likeness_id={record.likeness_id}: {e}"
                )
                continue
        
        # Sort matches by similarity score (highest first)
        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        
        logger.info(f"Found {len(matches)} matches above threshold {threshold}")
        return matches
    
    def get_most_restrictive_policy(self, matches: List[Match]) -> Tuple[Match, str]:
        """
        Select the most restrictive consent policy from multiple matches.
        
        Policy restrictiveness ranking (most to least restrictive):
        1. Deny-all policies (all permissions denied)
        2. Policies with most denials
        3. Policies with fewest allows
        
        Args:
            matches: List of Match objects to evaluate
        
        Returns:
            Tuple of (selected_match, reason_code)
        
        Raises:
            ValueError: If matches list is empty
        
        Requirements:
            - 9.4: Apply most restrictive policy when multiple matches found
        """
        if not matches:
            raise ValueError("Cannot select policy from empty matches list")
        
        logger.info(f"Selecting most restrictive policy from {len(matches)} matches")
        
        # If only one match, return it
        if len(matches) == 1:
            return matches[0], "SINGLE_MATCH"
        
        # Calculate restrictiveness score for each match
        # Higher score = more restrictive
        def calculate_restrictiveness(match: Match) -> int:
            policy = match.consent_policy
            
            # Count denials (higher is more restrictive)
            denials = sum([
                policy.deny_third_party_edits,
                policy.deny_face_swaps,
                policy.deny_sexualized_content,
                policy.deny_impersonation,
                policy.deny_political_use
            ])
            
            # Count allows (lower is more restrictive)
            allows = int(policy.allow_self_edits)
            
            # Restrictiveness score: denials * 10 - allows
            # This prioritizes policies with more denials
            return denials * 10 - allows
        
        # Find the most restrictive match
        most_restrictive = max(matches, key=calculate_restrictiveness)
        
        logger.info(
            f"Selected most restrictive policy: likeness_id={most_restrictive.likeness_id}, "
            f"similarity={most_restrictive.similarity_score:.4f}"
        )
        
        return most_restrictive, "MOST_RESTRICTIVE_POLICY"
    
    def match_and_select(
        self,
        query_embedding: List[float],
        threshold: Optional[float] = None
    ) -> Optional[Tuple[Match, str]]:
        """
        Find matches and select the appropriate policy to apply.
        
        This is a convenience method that combines find_matches and
        get_most_restrictive_policy.
        
        Args:
            query_embedding: The normalized embedding vector to match against
            threshold: Optional override for similarity threshold
        
        Returns:
            Tuple of (selected_match, reason_code) if matches found, None otherwise
        """
        matches = self.find_matches(query_embedding, threshold)
        
        if not matches:
            logger.info("No matches found")
            return None
        
        return self.get_most_restrictive_policy(matches)
