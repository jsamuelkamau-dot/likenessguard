"""
LikenessGuard AWS Prototype Setup
"""
from setuptools import setup, find_packages

setup(
    name="likenessguard",
    version="1.0.0",
    description="Privacy-first likeness consent enforcement for generative AI",
    author="LikenessGuard Team",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.9",
    install_requires=[
        "boto3>=1.26.0",
        "hypothesis>=6.0.0",
        "pytest>=7.0.0",
        "pytest-cov>=4.0.0",
        "moto>=4.0.0",
    ],
)
