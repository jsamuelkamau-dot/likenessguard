# LikenessGuard — Makefile

.PHONY: help install test lint build deploy post-deploy start start-dashboard start-mcp clean dev-mock

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies (no AWS needed)
	cd likenessguard-aws && pip install -r requirements-dev.txt
	cd likenessguard-dashboard && npm install
	cd likenessguard-mcp && pip install -r requirements.txt

dev-mock: ## Run full test suite with mocked AWS services (no AWS account needed)
	@echo "============================================"
	@echo "  Running LikenessGuard in mock mode"
	@echo "  No AWS account or credentials required"
	@echo "============================================"
	@echo ""
	@echo "--- Property-based tests (25 tests, 14 properties) ---"
	cd likenessguard-aws && python -m pytest src/tests/test_v2_properties.py -v --tb=short
	@echo ""
	@echo "--- Unit tests ---"
	cd likenessguard-aws && python -m pytest tests/ -v --tb=short
	@echo ""
	@echo "============================================"
	@echo "  All mock tests passed!"
	@echo "============================================"

test: ## Run all unit tests
	cd likenessguard-aws && python -m pytest tests/ -v

test-properties: ## Run property-based tests only (no AWS needed)
	cd likenessguard-aws && python -m pytest src/tests/test_v2_properties.py -v

lint: ## Lint Python code
	flake8 likenessguard-aws/src/lambdas/ --max-line-length=150 --ignore=E501,W503,E402,F401,F811

build: ## Build SAM application (requires AWS SAM CLI)
	cd likenessguard-aws && sam build --template-file infrastructure/cloudformation-v2.yaml

deploy: build ## Build and deploy full stack to AWS (requires AWS account)
	cd likenessguard-aws && sam deploy \
		--template-file infrastructure/cloudformation-v2.yaml \
		--stack-name likenessguard-v2 \
		--capabilities CAPABILITY_IAM \
		--no-confirm-changeset
	@echo ""
	@echo "=========================================="
	@echo "  Deployment complete!"
	@echo "  Run 'make post-deploy' to set up"
	@echo "  OpenSearch index and JWKS public key."
	@echo "=========================================="

post-deploy: ## Post-deploy setup: create OpenSearch index + publish JWKS public key (requires AWS)
	@echo "Creating OpenSearch vector index..."
	cd likenessguard-aws && python scripts/deploy_opensearch_index.py
	@echo ""
	@echo "Publishing JWKS public key..."
	cd likenessguard-aws && python scripts/publish_jwks.py
	@echo ""
	@echo "Post-deploy setup complete."

start: start-dashboard start-mcp ## Start dashboard + MCP server

start-dashboard: ## Start React dashboard (http://localhost:5173)
	cd likenessguard-dashboard && npm run dev

start-mcp: ## Start MCP server for Claude.ai (http://localhost:8080)
	cd likenessguard-mcp && python server.py

clean: ## Clean build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf likenessguard-aws/.aws-sam/
	rm -rf likenessguard-dashboard/dist/

