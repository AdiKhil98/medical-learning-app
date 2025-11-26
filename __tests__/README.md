# Testing Infrastructure

This directory contains all tests for the medical learning app.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (with coverage and maxWorkers)
npm run test:ci
```

## Test Structure

```
__tests__/
├── helpers/          # Test utilities and helpers
├── utils/           # Unit tests for utility functions
├── components/      # Component and integration tests
└── README.md        # This file
```

## Coverage Thresholds

Minimum coverage requirements (configured in jest.config.js):
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

## Writing Tests

### Unit Tests

Unit tests should be placed next to the code they test or in `__tests__/utils/`:

```typescript
import { myFunction } from '../../utils/myUtil';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Integration Tests

Integration tests should be in `__tests__/components/`:

```typescript
import { render } from '@testing-library/react-native';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
});
```

## Pre-commit Hooks

Tests run automatically on changed files before each commit via Husky and lint-staged.

## CI/CD

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

See `.github/workflows/ci.yml` for details.

## Test Utilities

Located in `__tests__/helpers/testUtils.ts`:

- `wait(ms)` - Wait for specific time
- `flushPromises()` - Flush pending promises
- `mockFn()` - Create mock function
- `mockAsyncFn()` - Create async mock
- `mockRejectedFn()` - Create mock that throws
- `mockFetchResponse()` - Mock fetch responses
- And more...

## Debugging Tests

```bash
# Run specific test file
npm test -- inputValidation.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate email"

# Run with verbose output
npm test -- --verbose
```
