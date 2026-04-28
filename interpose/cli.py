"""
Command-line interface for Interpose agent
"""

import os
import sys
import argparse
from interpose.agent.agent import InterposeAgent
from interpose.agent.exceptions import ConfigurationError


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Interpose - Universal AI Access Intelligence Agent"
    )
    parser.add_argument(
        "--api-key",
        help="Interpose API key (or set INTERPOSE_API_KEY environment variable)",
        default=os.environ.get("INTERPOSE_API_KEY"),
    )
    parser.add_argument(
        "--backend-url",
        help="Interpose backend URL (default: https://api.interpose.io)",
        default=os.environ.get("INTERPOSE_BACKEND_URL", "https://api.interpose.io"),
    )
    parser.add_argument(
        "--version",
        action="version",
        version="Interpose 1.0.0",
    )
    
    args = parser.parse_args()
    
    if not args.api_key:
        print("Error: API key is required. Set INTERPOSE_API_KEY environment variable or use --api-key flag.")
        sys.exit(1)
    
    try:
        agent = InterposeAgent(api_key=args.api_key, backend_url=args.backend_url)
        print(f"Interpose agent started successfully")
        print(f"Backend URL: {args.backend_url}")
        print("Monitoring AI API calls...")
        
        # Keep the agent running
        import time
        while True:
            time.sleep(1)
            
    except ConfigurationError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterpose agent stopped")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
