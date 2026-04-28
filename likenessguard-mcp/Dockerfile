FROM python:3.12-slim

WORKDIR /app
COPY likenessguard-mcp/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY likenessguard-mcp/ .

EXPOSE 8080

CMD ["python", "server.py"]
