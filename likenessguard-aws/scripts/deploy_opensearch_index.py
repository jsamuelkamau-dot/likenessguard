#!/usr/bin/env python3
"""
Deploy OpenSearch Serverless vector index for LikenessGuard v2.

Usage:
    python deploy_opensearch_index.py --collection-endpoint <endpoint> --region us-east-1

Requirements: 1.3, 1.10, 11.1
"""
import argparse
import sys
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

INDEX_NAME = 'likenessguard-vectors'

INDEX_MAPPING = {
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
                "dimension": 1024,
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


def get_client(endpoint: str, region: str) -> OpenSearch:
    host = endpoint.replace('https://', '').rstrip('/')
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, region, 'aoss')
    return OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        pool_maxsize=20
    )


def main():
    parser = argparse.ArgumentParser(description='Deploy LikenessGuard OpenSearch vector index')
    parser.add_argument('--collection-endpoint', required=True)
    parser.add_argument('--region', default='us-east-1')
    args = parser.parse_args()

    print(f"Deploying index '{INDEX_NAME}' to {args.collection_endpoint}...")
    client = get_client(args.collection_endpoint, args.region)

    try:
        if client.indices.exists(index=INDEX_NAME):
            print(f"Index '{INDEX_NAME}' already exists. Skipping creation.")
            return 0
    except Exception:
        pass

    try:
        result = client.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
        print(f"Index '{INDEX_NAME}' created successfully.")
        print(f"  Acknowledged: {result.get('acknowledged', False)}")
        return 0
    except Exception as e:
        print(f"Failed to create index: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
