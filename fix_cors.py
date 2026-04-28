with open("backend/lambda_handler.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'})", "'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}")

with open("backend/lambda_handler.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed!")
