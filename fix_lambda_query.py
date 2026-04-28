with open("backend/lambda_handler.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add the import for Key
if "from boto3.dynamodb.conditions import Key" not in content:
    content = content.replace(
        "from decimal import Decimal",
        "from decimal import Decimal\nfrom boto3.dynamodb.conditions import Key"
    )
    
    # Fix the KeyConditionExpression to use Key
    content = content.replace(
        "KeyConditionExpression='customer_id = :cid',\n                ExpressionAttributeValues={':cid': customer_id},",
        "KeyConditionExpression=Key('customer_id').eq(customer_id),"
    )
    
    content = content.replace(
        "KeyConditionExpression='api_key = :key',\n            ExpressionAttributeValues={':key': api_key}",
        "KeyConditionExpression=Key('api_key').eq(api_key)"
    )
    
    content = content.replace(
        "KeyConditionExpression='email = :email',\n                ExpressionAttributeValues={':email': email}",
        "KeyConditionExpression=Key('email').eq(email)"
    )
    
    with open("backend/lambda_handler.py", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Updated Lambda handler with Key import")
else:
    print("Already has Key import")
