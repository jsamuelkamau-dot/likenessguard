# LikenessGuard v2 — Makefile
# Common commands for development, testing, and deployment

.PHONY: help install test lint build deploy clean start-dashboard start-mcp

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Setup ─────────────────────────────────────────────────────────────────────
install: ## Install all dependencies
	cd likenessguard-aws && pip install -r requirements-dev.txt
	cd likenessguard-dashboard && npm install
	cd likenessguard-mcp && pip install -r requirements.txt

# ── Testing ───────────────────────────────────────────────────────────────────
test: ## Run all tests
	cd likenessguard-aws && python -m pytest src/tests/ -v

test-e2e: ## Run end-to-end tests (requires AWS credentials)
	cd likenessguard-aws && python scripts/test_e2e_v2.py

test-dashboard: ## Run dashboard tests
	cd likenessguard-dashboard && npm test

test-properties: ## Run property-based tests only
	cd likenessguard-aws && python -m pytest src/tests/test_v2_properties.py -v

# ── Linting ───────────────────────────────────────────────────────────────────
lint: ## Lint Python and TypeScript
	cd likenessguard-aws && flake8 src/ --max-line-length=120
	cd likenessguard-dashboard && npx tsc --noEmit

# ── Build ─────────────────────────────────────────────────────────────────────
build: ## Build SAM application
	cd likenessguard-aws && sam build --template-file infrastructure/cloudformation-v2.yaml

build-dashboard: ## Build dashboard for production
	cd likenessguard-dashboard && npm run build

# ── Deploy ────────────────────────────────────────────────────────────────────
deploy: build ## Deploy to AWS (requires AWS credentials and .env)
	cd likenessguard-aws && sam deploy \
		--template-file infrastructure/cloudformation-v2.yaml \
		--stack-name likenessguard-v2 \
		--capabilities CAPABILITY_IAM \
		--no-confirm-changeset

# ── Local Development ─────────────────────────────────────────────────────────
start-dashboard: ## Start the React dashboard locally
	cd likenessguard-dashboard && npm run dev

start-mcp: ## Start the MCP server for Claude.ai integration
	cd likenessguard-mcp && python server.py

# ── Secrets Scan ──────────────────────────────────────────────────────────────
scan-secrets: ## Scan for hardcoded secrets
	@echo "Scanning for secrets..."
	@grep -rn "AKIA[0-9A-Z]\{16\}" --include="*.py" --include="*.ts" --include="*.js" --include="*.yaml" . 2>/dev/null && echo "WARNING: Possible AWS key found" || echo "No AWS keys found"
	@echo "Run 'gitleaks detect' for a full scan"

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Clean build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf likenessguard-aws/.aws-sam/
	rm -rf likenessguard-dashboard/dist/
	rm -rf likenessguard-dashboard/node_modules/.cache/
