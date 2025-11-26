/**
 * Integration tests for ErrorBoundary component
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test content</Text>
      </ErrorBoundary>
    );

    expect(getByText('Test content')).toBeTruthy();
  });

  it('should display error UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Ein Fehler ist aufgetreten')).toBeTruthy();
  });

  it('should show retry button', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Erneut versuchen')).toBeTruthy();
  });

  it('should handle retry with exponential backoff', async () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = getByText('Erneut versuchen');

    // First retry
    retryButton.props.onPress();

    // Should show "Wird wiederholt..."
    await waitFor(() => {
      expect(getByText('Wird wiederholt...')).toBeTruthy();
    });

    // Advance timer for backoff delay (1 second)
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      // After retry, if still erroring, should show retry count
      expect(getByText(/Versuch.*von 3/)).toBeTruthy();
    });
  });

  it('should disable retry after max attempts', async () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = getByText('Erneut versuchen');

    // Retry 3 times
    for (let i = 0; i < 3; i++) {
      retryButton.props.onPress();
      jest.advanceTimersByTime(Math.pow(2, i) * 1000);
    }

    await waitFor(() => {
      expect(getByText('Maximale Versuche erreicht')).toBeTruthy();
    });
  });

  it('should log errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be logged (console.error is mocked)
    expect(console.error).toHaveBeenCalled();
  });
});
