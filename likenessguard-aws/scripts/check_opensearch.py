"""Check OpenSearch vector count."""
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
import boto3

host = 'YOUR_COLLECTION_ID.us-east-1.aoss.amazonaws.com'
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, 'us-east-1', 'aoss')
client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=auth, use_ssl=True, verify_certs=True,
    connection_class=RequestsHttpConnection
)
try:
    result = client.count(index='likenessguard-vectors')
    print('Vectors in OpenSearch:', result['count'])
except Exception as e:
    print('Error:', e)
