# Release Checklist — LikenessGuard v2 Open Source Release

Review every item before pushing to GitHub.

## 🔐 Security (CRITICAL — Do First)

- [ ] Run `make scan-secrets` — confirm zero hardcoded credentials
- [ ] Run `gitleaks detect --source .` — confirm clean
- [ ] Verify `.env` is in `.gitignore` and NOT committed
- [ ] Verify `samconfig.toml` (with real account IDs) is NOT committed — only `samconfig-v2.toml.example`
- [ ] Verify `.kiro/steering/likenessguard-v2.md` is NOT committed (contains account IDs/ARNs)
- [ ] Verify no AWS account IDs (YOUR_ACCOUNT_ID) in any committed file
- [ ] Verify no API Gateway IDs (YOUR_API_ID) in any committed file
- [ ] Verify no KMS key IDs (d47b74ed-...) in any committed file
- [ ] Verify no OpenSearch endpoints (nxd3bg25...) in any committed file
- [ ] Verify ngrok auth tokens are NOT committed
- [ ] Verify xAI/OpenAI API keys are NOT committed
- [ ] All Lambda env vars use placeholders in CloudFormation templates

## 📁 Repository Files

- [ ] `LICENSE` — Apache 2.0 present
- [ ] `README.md` — comprehensive, accurate, no dead links
- [ ] `CONTRIBUTING.md` — complete setup instructions
- [ ] `CODE_OF_CONDUCT.md` — present
- [ ] `SECURITY.md` — vulnerability reporting process
- [ ] `CHANGELOG.md` — v2.0.0 entry complete
- [ ] `.env.example` — all variables documented with placeholders
- [ ] `.gitignore` — comprehensive
- [ ] `Makefile` — all commands work
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` — present
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` — present
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — present
- [ ] `.github/workflows/ci.yml` — CI pipeline present

## 🧪 Tests

- [ ] `python -m pytest src/tests/test_v2_properties.py -v` — all 25 pass
- [ ] `python scripts/crosscheck.py` — passes
- [ ] Dashboard builds without errors: `npm run build`

## 📖 Documentation

- [ ] Architecture diagram in README is accurate
- [ ] API reference is complete and accurate
- [ ] Quick start works from a fresh clone using only `.env.example`
- [ ] Claude.ai integration steps are accurate
- [ ] Grok integration steps are accurate
- [ ] Cost table is accurate
- [ ] Performance table is accurate

## 🐙 GitHub Setup (Manual Steps)

- [ ] Create GitHub repository: `github.com/jsamuelkamau-dot/likenessguard`
- [ ] Set repository description: "Pre-generation AI consent enforcement platform — AWS Bedrock multi-agent, edge-capable, cryptographically verifiable"
- [ ] Add topics: `aws`, `bedrock`, `consent`, `ai-safety`, `serverless`, `python`, `react`, `mcp`, `deepfake-prevention`, `biometric-privacy`
- [ ] Enable Issues
- [ ] Enable Discussions
- [ ] Set up branch protection on `main`:
  - Require pull request reviews (1 reviewer)
  - Require status checks to pass (CI)
  - No force pushes
  - No deletions
- [ ] Create `develop` branch from `main`
- [ ] Add `CODEOWNERS` file if needed
- [ ] Create GitHub Release v2.0.0 with CHANGELOG notes
- [ ] Add repository to GitHub Topics for discoverability

## 🚀 Final Push

```bash
# Initialize git (if not already)
git init
git add .
git status  # Review carefully — no secrets!
git commit -m "feat: initial open-source release v2.0.0"
git branch -M main
git remote add origin https://github.com/jsamuelkamau-dot/likenessguard.git
git push -u origin main
```

## ✅ Post-Release

- [ ] Verify GitHub Actions CI passes on first push
- [ ] Verify README renders correctly on GitHub
- [ ] Test clone + setup from scratch using only README instructions
- [ ] Share on social media / AWS Builder Center

