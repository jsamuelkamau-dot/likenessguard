# Git Commit Instructions for Interpose Rename

Execute these commands in order to create clean, logical commits for the project reorganization.

## Commit 1: Update .gitignore for security best practices

```bash
git add .gitignore
git commit -m "chore: update .gitignore for security best practices

- Add environment variable patterns (.env*)
- Add exception for .env.example
- Add secret and credential patterns (*key*, *secret*, *token*)
- Add certificate patterns (*.pem, id_rsa*, *.p12, *.pfx)
- Add Terraform state file patterns
- Add logs/ and dumps/ directories
- Maintain existing patterns"
```

## Commit 2: Add project README and overview

```bash
git add README.md
git commit -m "docs: add project README and overview

- Create comprehensive README for Interpose platform
- Include architecture diagram and quick start guide
- Document key features and technology stack
- Add links to project documentation structure
- Provide installation and usage examples"
```

## Commit 3: Rename project from Kasongo to Interpose

```bash
# Stage the new directory
git add .kiro/specs/interpose-saas-platform/

# Remove the old directory from git (but keep it for now)
git rm -r .kiro/specs/kasongo-saas-platform/

git commit -m "refactor: rename project from Kasongo to Interpose

- Rename spec directory: kasongo-saas-platform → interpose-saas-platform
- Update all references from Kasongo to Interpose throughout requirements
- Update agent name: Kasongo_Agent → Interpose_Agent
- Update PyPI package name: kasongo → interpose
- Update import statement: 'import kasongo' → 'import interpose'
- Maintain spec configuration and structure"
```

## Commit 4: Add Interpose requirements specification

```bash
# This commit is already included in Commit 3 since we're adding the complete directory
# If you want a separate commit for documentation, you can skip this or use it for future docs
```

## Verification Commands

After creating the commits, verify the changes:

```bash
# View commit history
git log --oneline -4

# View changes in each commit
git show HEAD~2  # Commit 1: .gitignore
git show HEAD~1  # Commit 2: README
git show HEAD    # Commit 3: Rename

# Verify no sensitive files are staged
git status

# Check that old directory is removed
ls .kiro/specs/
```

## Notes

- All commits follow conventional commit format (type: description)
- Each commit is atomic and focused on a single concern
- The old kasongo-saas-platform directory will be removed from git tracking
- No sensitive files are included in any commit
- All file paths have been updated correctly

## If You Need to Undo

```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1
```
