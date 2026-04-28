"""
Interpose - Universal AI Access Intelligence Platform

A lightweight monitoring agent that intercepts AI API calls, extracts metadata,
scans for sensitive data, and provides real-time observability.
"""

__version__ = "1.0.0"

from .agent import init

__all__ = ["init"]
