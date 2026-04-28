#!/usr/bin/env python3

"""
Interpose Database Initialization Script

This script initializes the Customers DynamoDB table with an initial customer
account for testing and development purposes.

Usage:
    python deployment/init-database.py [OPTIONS]

Options:
    --email EMAIL           Customer email address (default: admin@interpose.io)
    --password PASSWORD     Customer password (default: randomly generated)
    --company COMPANY       Company name (default: Interpose Demo)
    --stack-name NAME       CloudFormation stack name (default: interpose-platform)
    --region REGION         AWS region (default: us-east-1)
    --help                  Display this help message
"""

import argparse
import sys
import uuid
import time
import secrets
import string
import bcrypt
import boto3
from typing import Dict, Any


# Color codes for terminal output
class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color


def print_info(message: str) -> None:
    """Print info message in green."""
    print(f"{Colors.GREEN}[INFO]{Colors.NC} {message}")


def print_warn(message: str) -> None:
    """Print warning message in yellow."""
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {message}")


def print_error(message: str) -> None:
    """Print error message in red."""
    print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")


def generate_password(length: int = 16) -> str:
    """
    Generate a secure random password.
    
    Args:
        length: Password length (default: 16)
        
    Returns:
        Random password string
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Bcrypt hash as string
    """
    # Truncate password to 72 bytes for bcrypt compatibility
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt)
    return password_hash.decode('utf-8')


def generate_api_key() -> str:
    """
    Generate a unique API key.
    
    Returns:
        UUID v4 string
    """
    return str(uuid.uuid4())


def get_table_name_from_stack(stack_name: str, region: str, output_key: str) -> str:
    """
    Get DynamoDB table name from CloudFormation stack outputs.
    
    Args:
        stack_name: CloudFormation stack name
        region: AWS region
        output_key: Output key to retrieve
        
    Returns:
        Table name
        
    Raises:
        Exception if stack or output not found
    """
    cloudformation = boto3.client('cloudformation', region_name=region)
    
    try:
        response = cloudformation.describe_stacks(StackName=stack_name)
        stacks = response.get('Stacks', [])
        
        if not stacks:
            raise Exception(f"Stack '{stack_name}' not found")
        
        outputs = stacks[0].get('Outputs', [])
        for output in outputs:
            if output['OutputKey'] == output_key:
                return output['OutputValue']
        
        raise Exception(f"Output '{output_key}' not found in stack '{stack_name}'")
    except Exception as e:
        raise Exception(f"Failed to get table name from stack: {e}")


def customer_exists(table, email: str) -> bool:
    """
    Check if customer with given email already exists.
    
    Args:
        table: DynamoDB table resource
        email: Customer email address
        
    Returns:
        True if customer exists, False otherwise
    """
    try:
        response = table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        return len(response.get('Items', [])) > 0
    except Exception as e:
        print_error(f"Failed to check if customer exists: {e}")
        return False


def create_customer(
    table,
    email: str,
    password: str,
    company_name: str
) -> Dict[str, Any]:
    """
    Create a new customer record in DynamoDB.
    
    Args:
        table: DynamoDB table resource
        email: Customer email address
        password: Plain text password
        company_name: Company name
        
    Returns:
        Customer record dictionary
        
    Raises:
        Exception if customer creation fails
    """
    # Generate customer data
    customer_id = str(uuid.uuid4())
    api_key = generate_api_key()
    password_hash = hash_password(password)
    created_at = int(time.time() * 1000)
    
    customer = {
        'customer_id': customer_id,
        'email': email,
        'password_hash': password_hash,
        'api_key': api_key,
        'alert_email': email,
        'company_name': company_name,
        'created_at': created_at,
        'subscription_tier': 'free'
    }
    
    try:
        table.put_item(Item=customer)
        return customer
    except Exception as e:
        raise Exception(f"Failed to create customer: {e}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Initialize Interpose database with initial customer',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--email',
        default='admin@interpose.io',
        help='Customer email address (default: admin@interpose.io)'
    )
    parser.add_argument(
        '--password',
        default=None,
        help='Customer password (default: randomly generated)'
    )
    parser.add_argument(
        '--company',
        default='Interpose Demo',
        help='Company name (default: Interpose Demo)'
    )
    parser.add_argument(
        '--stack-name',
        default='interpose-platform',
        help='CloudFormation stack name (default: interpose-platform)'
    )
    parser.add_argument(
        '--region',
        default='us-east-1',
        help='AWS region (default: us-east-1)'
    )
    
    args = parser.parse_args()
    
    # Generate password if not provided
    password = args.password
    password_generated = False
    if not password:
        password = generate_password()
        password_generated = True
    
    print_info("Database Initialization Configuration:")
    print_info(f"  Email: {args.email}")
    print_info(f"  Company: {args.company}")
    print_info(f"  Stack Name: {args.stack_name}")
    print_info(f"  Region: {args.region}")
    print()
    
    # Get table name from CloudFormation stack
    print_info("Retrieving table name from CloudFormation stack...")
    try:
        table_name = get_table_name_from_stack(
            args.stack_name,
            args.region,
            'CustomersTableName'
        )
        print_info(f"  Customers Table: {table_name}")
    except Exception as e:
        print_error(str(e))
        print_error("Make sure the CloudFormation stack is deployed first")
        sys.exit(1)
    
    # Initialize DynamoDB client
    print_info("Connecting to DynamoDB...")
    try:
        dynamodb = boto3.resource('dynamodb', region_name=args.region)
        table = dynamodb.Table(table_name)
    except Exception as e:
        print_error(f"Failed to connect to DynamoDB: {e}")
        sys.exit(1)
    
    # Check if customer already exists
    print_info("Checking if customer already exists...")
    if customer_exists(table, args.email):
        print_warn(f"Customer with email '{args.email}' already exists")
        response = input("Do you want to create a new customer with a different email? (y/n): ")
        if response.lower() != 'y':
            print_info("Database initialization cancelled")
            sys.exit(0)
        
        # Prompt for new email
        new_email = input("Enter new email address: ")
        if not new_email or '@' not in new_email:
            print_error("Invalid email address")
            sys.exit(1)
        
        args.email = new_email
        
        # Check again
        if customer_exists(table, args.email):
            print_error(f"Customer with email '{args.email}' already exists")
            sys.exit(1)
    
    # Create customer
    print_info("Creating customer record...")
    try:
        customer = create_customer(
            table,
            args.email,
            password,
            args.company
        )
    except Exception as e:
        print_error(str(e))
        sys.exit(1)
    
    print()
    print_info("==========================================")
    print_info("Database Initialization Complete!")
    print_info("==========================================")
    print()
    print_info("Customer Details:")
    print_info(f"  Customer ID: {customer['customer_id']}")
    print_info(f"  Email: {customer['email']}")
    if password_generated:
        print_info(f"  Password: {password}")
        print_warn("  IMPORTANT: Save this password - it cannot be retrieved later!")
    print_info(f"  API Key: {customer['api_key']}")
    print_info(f"  Company: {customer['company_name']}")
    print_info(f"  Subscription: {customer['subscription_tier']}")
    print()
    print_info("Next Steps:")
    print_info("  1. Use the email and password to log in to the dashboard")
    print_info("  2. Configure the agent with the API key")
    print_info("  3. Start monitoring AI service usage")
    print()
    
    # Save credentials to file
    credentials_file = "deployment/customer-credentials.txt"
    try:
        with open(credentials_file, 'w') as f:
            f.write("Interpose Customer Credentials\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Customer ID: {customer['customer_id']}\n")
            f.write(f"Email: {customer['email']}\n")
            if password_generated:
                f.write(f"Password: {password}\n")
            f.write(f"API Key: {customer['api_key']}\n")
            f.write(f"Company: {customer['company_name']}\n")
            f.write(f"Subscription: {customer['subscription_tier']}\n")
            f.write(f"\nCreated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print_info(f"Credentials saved to: {credentials_file}")
        print_warn("IMPORTANT: Keep this file secure and delete it after saving the credentials!")
    except Exception as e:
        print_warn(f"Failed to save credentials to file: {e}")
    
    print()


if __name__ == '__main__':
    main()
