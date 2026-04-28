# Interpose Agent Dockerfile
# Use Python 3.11 slim base image for minimal footprint
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY interpose/ ./interpose/

# Set environment variables (can be overridden at runtime)
ENV INTERPOSE_API_KEY=""
ENV INTERPOSE_BACKEND_URL="https://api.interpose.io"
ENV PYTHONUNBUFFERED=1

# Create log directory
RUN mkdir -p /var/log/interpose

# Run the agent
CMD ["python", "-m", "interpose.agent"]
