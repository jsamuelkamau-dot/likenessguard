# Read the file
with open("backend/lambda_handler.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find and replace the conversion code
old_conversion = """        # Convert Decimal values back to float for JSON serialization
        items = response.get('Items', [])
        for item in items:
            try:
                if 'risk_score' in item:
                    item['risk_score'] = float(item['risk_score'])
                if 'request_size_bytes' in item:
                    item['request_size_bytes'] = int(item['request_size_bytes'])
                if 'response_status' in item:
                    item['response_status'] = int(item['response_status'])
            except (ValueError, TypeError) as e:
                # If conversion fails, log and skip this item
                log_structured(
                    'ERROR',
                    'Error converting item values',
                    customer_id=customer_id,
                    error=str(e)
                )
                continue"""

new_conversion = """        # Convert Decimal values back to float/int for JSON serialization
        items = response.get('Items', [])
        for item in items:
            try:
                # Convert specific numeric fields
                if 'risk_score' in item:
                    item['risk_score'] = float(item['risk_score'])
                if 'request_size_bytes' in item:
                    item['request_size_bytes'] = int(item['request_size_bytes'])
                if 'response_status' in item:
                    item['response_status'] = int(item['response_status'])
                if 'timestamp' in item:
                    item['timestamp'] = int(item['timestamp'])
                
                # Convert any remaining Decimal values
                for key, value in list(item.items()):
                    if isinstance(value, Decimal):
                        item[key] = float(value)
            except (ValueError, TypeError) as e:
                # If conversion fails, log and skip this item
                log_structured(
                    'ERROR',
                    'Error converting item values',
                    customer_id=customer_id,
                    error=str(e)
                )
                continue"""

content = content.replace(old_conversion, new_conversion)

# Write back
with open("backend/lambda_handler.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Decimal conversion code")
