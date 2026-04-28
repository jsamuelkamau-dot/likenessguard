# LikenessGuard v2 — Makefile

.PHONY: help install test lint build deploy clean start-dashboard start-mcp

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd likenessguard-aws && pip install -r requirements-dev.txt
	cd likenessguard-dashboard && npm install
	cd likenessguard-mcp && pip install -r requirements.txt

test: ## Run all unit tests
	cd likenessguard-aws && python -m pytest tests/ -v

lint: ## Lint Python code
	flake8 likenessguard-aws/src/lambdas/ --max-line-length=150 --ignore=E501,W503,E402,F401,F811

build: ## Build SAM application
	cd likenessguard-aws && sam build --template-file infrastructure/cloudformation-v2.yaml

deploy: build ## Deploy full stack to AWS
	cd likenessguard-aws && sam deploy \
		--template-file infrastructure/cloudformation-v2.yaml \
		--stack-name likenessguard-v2 \
		--capabilities CAPABILITY_IAM \
		--no-confirm-changeset
	@echo ""
	@echo "Deployment complete. Run 'make post-deploy' for OpenSearch index and JWKS setup."

post-deploy: ## Run post-deployment setup (OpenSearch index + JWKS)
	cd likenessguard-aws && python scripts/deploy_opensearch_index.py
	cd likenessguard-aws && python scripts/publish_jwks.py

start-dashboard: ## Start React dashboard locally
	cd likenessguard-dashboard && npm run dev

start-mcp: ## Start MCP server for Claude.ai
	cd likenessguard-mcp && python server.py

clean: ## Clean build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf likenessguard-aws/.aws-sam/
	rm -rf likenessguard-dashboard/dist/
