"""
OpenSearch Serverless Client — Vector Collection Operations

Manages facial vector storage and k-NN similarity search against the
LikenessGuard OpenSearch Serverless vector collection.

Requirements: 1.3, 1.10, 11.4
"""
import json
import logging
import os
from typing import Optional
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

OPENSEARCH_ENDPOINT = os.environ.get('OPENSEARCH_ENDPOINT', '')
INDEX_NAME = 'likenessguard-vectors'
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')


class OpenSearchError(Exception):
    pass


def _signed_request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Make a SigV4-signed request to OpenSearch Serverless."""
    url = f"https://{OPENSEARCH_ENDPOINT}{path}"
    body_bytes = json.dumps(body).encode('utf-8') if body else b''

    session = boto3.Session()
    credentials = session.get_credentials().get_frozen_credentials()

    request = AWSRequest(
        method=method,
        url=url,
        data=body_bytes,
        headers={'Content-Type': 'application/json', 'Host': OPENSEARCH_ENDPOINT}
    )
    SigV4Auth(credentials, 'aoss', AWS_REGION).add_auth(request)

    prepared = request.prepare()
    req = urllib.request.Request(
        url=url,
        data=body_bytes if body_bytes else None,
        headers=dict(prepared.headers),
        method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise OpenSearchError(f"OpenSearch {method} {path} failed [{e.code}]: {error_body}")


def index_vector(
    subject_id: str,
    vector: list[float],
    photo_hash: str,
    policy_version: int,
    is_provisional: bool = False
) -> str:
    """
    Index a facial vector document in OpenSearch.

    Returns the document ID.
    """
    from datetime import datetime, timezone
    doc_id = f"{subject_id}_{photo_hash[:16]}"
    document = {
        "subject_id": subject_id,
        "vector": vector,
        "photo_hash": photo_hash,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "policy_version": policy_version,
        "is_provisional": is_provisional
    }
    result = _signed_request('POST', f'/{INDEX_NAME}/_doc', document)
    logger.info(f"Indexed vector for subject {subject_id}, doc_id={doc_id}")
    return result.get('_id', doc_id)


def knn_query(query_vector: list[float], k: int = 10) -> list[dict]:
    """
    Perform k-NN similarity search against all registered facial vectors.

    Returns list of dicts with keys: subject_id, photo_hash, policy_version,
    is_provisional, score (cosine similarity 0.0-1.0).
    """
    query = {
        "size": k,
        "query": {
            "knn": {
                "vector": {
                    "vector": query_vector,
                    "k": k
                }
            }
        },
        "_source": ["subject_id", "photo_hash", "policy_version", "is_provisional"]
    }
    result = _signed_request('POST', f'/{INDEX_NAME}/_search', query)
    hits = result.get('hits', {}).get('hits', [])
    candidates = []
    for hit in hits:
        source = hit.get('_source', {})
        candidates.append({
            'subject_id': source.get('subject_id'),
            'photo_hash': source.get('photo_hash'),
            'policy_version': source.get('policy_version', 1),
            'is_provisional': source.get('is_provisional', False),
            'score': hit.get('_score', 0.0)
        })
    return candidates


def delete_vectors(subject_id: str) -> int:
    """Delete all vectors for a subject. Returns count of deleted docs."""
    query = {
        "query": {
            "term": {"subject_id": subject_id}
        }
    }
    result = _signed_request('POST', f'/{INDEX_NAME}/_delete_by_query', query)
    deleted = result.get('deleted', 0)
    logger.info(f"Deleted {deleted} vectors for subject {subject_id}")
    return deleted


def create_index_if_not_exists() -> bool:
    """Create the vector index with HNSW mapping if it doesn't exist."""
    try:
        _signed_request('GET', f'/{INDEX_NAME}')
        logger.info(f"Index {INDEX_NAME} already exists")
        return False
    except OpenSearchError:
        pass  # Index doesn't exist, create it

    mapping = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 512
            }
        },
        "mappings": {
            "properties": {
                "subject_id": {"type": "keyword"},
                "vector": {
                    "type": "knn_vector",
                    "dimension": 512,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "nmslib",
                        "parameters": {"ef_construction": 512, "m": 16}
                    }
                },
                "photo_hash": {"type": "keyword"},
                "registered_at": {"type": "date"},
                "policy_version": {"type": "integer"},
                "is_provisional": {"type": "boolean"}
            }
        }
    }
    _signed_request('PUT', f'/{INDEX_NAME}', mapping)
    logger.info(f"Created index {INDEX_NAME}")
    return True
