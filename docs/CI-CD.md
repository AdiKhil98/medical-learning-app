# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The pipeline automatically runs on every push to `main` or `develop` branches, as well as on pull requests.

## Pipeline Jobs

### 1. **Test Job** ✅

- **Purpose**: Run all automated tests with coverage reporting
- **Node Versions**: 18.x, 20.x (matrix)
- **Steps**:
  - Checkout code
  - Install dependencies
  - Run linter
  - Run tests with coverage (`npm run test:ci`)
  - Upload coverage to Codecov
  - Archive test results as artifacts

### 2. **Build Job** 🏗️

- **Purpose**: Verify the application builds successfully
- **Depends on**: Test job must pass first
- **Steps**:
  - Checkout code
  - Install dependencies
  - Build web application (`npm run build:web`)
  - Archive build artifacts
  - Run TypeScript type checking

### 3. **Code Quality Job** 📊

- **Purpose**: Ensure code quality and formatting standards
- **Steps**:
  - Check code formatting with Prettier
  - Run ESLint for code quality

### 4. **Security Audit Job** 🔒

- **Purpose**: Check for known vulnerabilities in dependencies
- **Steps**:
  - Run `npm audit` to check for security issues
  - Reports moderate and above severity issues

## Workflow Features

### Concurrency Control

The pipeline uses concurrency groups to automatically cancel in-progress runs when new commits are pushed to the same branch. This saves CI minutes and provides faster feedback.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Timeouts

Each job has appropriate timeouts to prevent hung workflows:

- Test: 15 minutes
- Build: 20 minutes
- Quality: 10 minutes
- Security: 10 minutes

### Caching

Dependencies are cached using GitHub Actions cache to speed up workflow runs.

## Adding CI Badges to README

Add these badges to your `README.md` to show build status:

```markdown
![CI Status](https://github.com/AdiKhil98/medical-learning-app/workflows/CI%2FCD%20Pipeline/badge.svg)
[![codecov](https://codecov.io/gh/AdiKhil98/medical-learning-app/branch/main/graph/badge.svg)](https://codecov.io/gh/AdiKhil98/medical-learning-app)
```

## Required Secrets

To enable all features, configure these secrets in your GitHub repository:

1. **CODECOV_TOKEN** (Optional but recommended)
   - Get from: https://codecov.io/
   - Purpose: Upload test coverage reports

## Local Development

Run the same checks locally before pushing:

```bash
# Run tests
npm run test:ci

# Check code formatting
npm run format:check

# Run linter
npm run lint

# Build application
npm run build:web

# Type check
npx tsc --noEmit

# Security audit
npm audit --audit-level=moderate
```

## Troubleshooting

### Tests Failing in CI but Passing Locally

- Ensure you're running the same Node version as CI (18.x or 20.x)
- Check for environment-specific issues
- Review the test artifacts uploaded by the workflow

### Build Failing

- Check the TypeScript errors in the CI logs
- Ensure all dependencies are properly listed in `package.json`
- Verify that environment variables are correctly set

### Quality Checks Failing

- Run `npm run format` to auto-fix Prettier issues
- Run `npm run lint:fix` to auto-fix ESLint issues
- Commit the fixes and push again

## Performance Optimization

The pipeline is optimized for speed:

- **Parallel Jobs**: Test, Quality, and Security jobs run in parallel
- **Dependency Caching**: npm dependencies are cached between runs
- **Matrix Testing**: Multiple Node versions tested simultaneously
- **Artifact Retention**: Test results kept for 30 days, builds for 7 days

## Future Enhancements

Potential improvements to consider:

- [ ] Add E2E tests (Playwright, Cypress)
- [ ] Add mobile build verification (iOS/Android)
- [ ] Add deployment automation
- [ ] Add performance benchmarking
- [ ] Add visual regression testing
- [ ] Add automated dependency updates (Dependabot)
