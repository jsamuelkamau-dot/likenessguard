# Read the file
with open("backend/lambda_handler.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the Key() format with string format
old_query = """            response = logs_table.query(
                KeyConditionExpression=Key('customer_id').eq(customer_id),
                Limit=100,
                ScanIndexForward=False  # Descending order by timestamp
            )"""

new_query = """            response = logs_table.query(
                KeyConditionExpression='customer_id = :cid',
                ExpressionAttributeValues={':cid': customer_id},
                Limit=100,
                ScanIndexForward=False  # Descending order by timestamp
            )"""

content = content.replace(old_query, new_query)

# Write back
with open("backend/lambda_handler.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated query format")
