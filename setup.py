"""
Setup configuration for the Interpose agent package
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="interpose",
    version="1.0.0",
    author="Interpose Team",
    author_email="support@interpose.io",
    description="Universal AI access intelligence agent for monitoring AI service usage",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/interpose/interpose",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Monitoring",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.11",
    install_requires=[
        "requests>=2.31.0",
        "boto3>=1.34.0",
    ],
    extras_require={
        "dev": [
            "hypothesis>=6.92.0",
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "interpose=interpose.cli:main",
        ],
    },
)
