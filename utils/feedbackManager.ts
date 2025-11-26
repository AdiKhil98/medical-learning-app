/**
 * User Feedback Manager
 *
 * Centralized system for user feedback:
 * - Toast notifications
 * - Loading states
 * - Progress indicators
 * - Confirmation dialogs
 * - Error messages
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from './logger';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface LoadingState {
  id: string;
  message?: string;
  progress?: number; // 0-100
  cancellable?: boolean;
  onCancel?: () => void;
}

class FeedbackManager {
  private toasts: Toast[] = [];
  private loadingStates: Map<string, LoadingState> = new Map();
  private toastListeners: Set<(toasts: Toast[]) => void> = new Set();
  private loadingListeners: Set<(states: LoadingState[]) => void> = new Set();

  /**
   * Show a toast notification
   */
  showToast(
    message: string,
    type: ToastType = ToastType.INFO,
    duration: number = 3000,
    action?: { label: string; onPress: () => void }
  ): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const toast: Toast = {
      id,
      type,
      message,
      duration,
      action,
    };

    this.toasts.push(toast);
    this.notifyToastListeners();

    logger.debug('Toast shown', { type, message });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, duration);
    }

    return id;
  }

  /**
   * Show success toast
   */
  success(message: string, duration?: number): string {
    return this.showToast(message, ToastType.SUCCESS, duration);
  }

  /**
   * Show error toast
   */
  error(message: string, duration?: number): string {
    return this.showToast(message, ToastType.ERROR, duration);
  }

  /**
   * Show warning toast
   */
  warning(message: string, duration?: number): string {
    return this.showToast(message, ToastType.WARNING, duration);
  }

  /**
   * Show info toast
   */
  info(message: string, duration?: number): string {
    return this.showToast(message, ToastType.INFO, duration);
  }

  /**
   * Dismiss a toast
   */
  dismissToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts.splice(index, 1);
      this.notifyToastListeners();
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAllToasts(): void {
    this.toasts = [];
    this.notifyToastListeners();
  }

  /**
   * Subscribe to toast updates
   */
  subscribeToToasts(listener: (toasts: Toast[]) => void): () => void {
    this.toastListeners.add(listener);
    listener([...this.toasts]); // Immediately call with current toasts
    return () => this.toastListeners.delete(listener);
  }

  /**
   * Notify toast listeners
   */
  private notifyToastListeners(): void {
    const toasts = [...this.toasts];
    this.toastListeners.forEach(listener => {
      try {
        listener(toasts);
      } catch (error) {
        logger.error('Error in toast listener', { error });
      }
    });
  }

  /**
   * Show loading state
   */
  showLoading(
    message?: string,
    options: {
      id?: string;
      progress?: number;
      cancellable?: boolean;
      onCancel?: () => void;
    } = {}
  ): string {
    const id = options.id || `loading_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const loadingState: LoadingState = {
      id,
      message,
      progress: options.progress,
      cancellable: options.cancellable,
      onCancel: options.onCancel,
    };

    this.loadingStates.set(id, loadingState);
    this.notifyLoadingListeners();

    logger.debug('Loading state shown', { id, message });

    return id;
  }

  /**
   * Update loading state
   */
  updateLoading(
    id: string,
    updates: {
      message?: string;
      progress?: number;
    }
  ): void {
    const state = this.loadingStates.get(id);
    if (state) {
      if (updates.message !== undefined) {
        state.message = updates.message;
      }
      if (updates.progress !== undefined) {
        state.progress = updates.progress;
      }
      this.loadingStates.set(id, state);
      this.notifyLoadingListeners();
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(id: string): void {
    if (this.loadingStates.delete(id)) {
      this.notifyLoadingListeners();
      logger.debug('Loading state hidden', { id });
    }
  }

  /**
   * Hide all loading states
   */
  hideAllLoading(): void {
    this.loadingStates.clear();
    this.notifyLoadingListeners();
  }

  /**
   * Check if any loading state is active
   */
  isLoading(id?: string): boolean {
    if (id) {
      return this.loadingStates.has(id);
    }
    return this.loadingStates.size > 0;
  }

  /**
   * Subscribe to loading state updates
   */
  subscribeToLoading(listener: (states: LoadingState[]) => void): () => void {
    this.loadingListeners.add(listener);
    listener(Array.from(this.loadingStates.values())); // Immediately call with current states
    return () => this.loadingListeners.delete(listener);
  }

  /**
   * Notify loading listeners
   */
  private notifyLoadingListeners(): void {
    const states = Array.from(this.loadingStates.values());
    this.loadingListeners.forEach(listener => {
      try {
        listener(states);
      } catch (error) {
        logger.error('Error in loading listener', { error });
      }
    });
  }

  /**
   * Get all active loading states
   */
  getLoadingStates(): LoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  /**
   * Get all active toasts
   */
  getToasts(): Toast[] {
    return [...this.toasts];
  }
}

// Export singleton instance
export const feedbackManager = new FeedbackManager();

/**
 * React Hook: Toast notifications
 *
 * @example
 * const { toasts, showToast, dismissToast } = useToasts();
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return feedbackManager.subscribeToToasts(setToasts);
  }, []);

  return {
    toasts,
    showToast: useCallback((message: string, type?: ToastType, duration?: number) => {
      return feedbackManager.showToast(message, type, duration);
    }, []),
    success: useCallback((message: string, duration?: number) => {
      return feedbackManager.success(message, duration);
    }, []),
    error: useCallback((message: string, duration?: number) => {
      return feedbackManager.error(message, duration);
    }, []),
    warning: useCallback((message: string, duration?: number) => {
      return feedbackManager.warning(message, duration);
    }, []),
    info: useCallback((message: string, duration?: number) => {
      return feedbackManager.info(message, duration);
    }, []),
    dismissToast: useCallback((id: string) => {
      feedbackManager.dismissToast(id);
    }, []),
    dismissAll: useCallback(() => {
      feedbackManager.dismissAllToasts();
    }, []),
  };
}

/**
 * React Hook: Loading states
 *
 * @example
 * const { showLoading, hideLoading, updateLoading, isLoading } = useLoading();
 *
 * const handleSubmit = async () => {
 *   const loadingId = showLoading('Speichere Daten...');
 *   try {
 *     await saveData();
 *   } finally {
 *     hideLoading(loadingId);
 *   }
 * };
 */
export function useLoading() {
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);

  useEffect(() => {
    return feedbackManager.subscribeToLoading(setLoadingStates);
  }, []);

  return {
    loadingStates,
    showLoading: useCallback((message?: string, options?: any) => {
      return feedbackManager.showLoading(message, options);
    }, []),
    updateLoading: useCallback((id: string, updates: any) => {
      feedbackManager.updateLoading(id, updates);
    }, []),
    hideLoading: useCallback((id: string) => {
      feedbackManager.hideLoading(id);
    }, []),
    hideAll: useCallback(() => {
      feedbackManager.hideAllLoading();
    }, []),
    isLoading: useCallback((id?: string) => {
      return feedbackManager.isLoading(id);
    }, []),
  };
}

/**
 * React Hook: Async operation with automatic loading/error handling
 *
 * @example
 * const { execute, loading, error } = useAsyncOperation(
 *   async (data) => await api.save(data),
 *   {
 *     loadingMessage: 'Speichere...',
 *     successMessage: 'Erfolgreich gespeichert!',
 *     errorMessage: 'Fehler beim Speichern',
 *   }
 * );
 */
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: {
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: any) => void;
    onError?: (error: Error) => void;
  } = {}
): {
  execute: T;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingIdRef = useRef<string | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);

      if (options.loadingMessage) {
        loadingIdRef.current = feedbackManager.showLoading(options.loadingMessage);
      }

      try {
        const result = await operation(...args);

        if (options.successMessage) {
          feedbackManager.success(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);

        if (options.errorMessage) {
          feedbackManager.error(options.errorMessage);
        }

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        setLoading(false);
        if (loadingIdRef.current) {
          feedbackManager.hideLoading(loadingIdRef.current);
          loadingIdRef.current = null;
        }
      }
    },
    [operation, options]
  ) as T;

  return {
    execute,
    loading,
    error,
  };
}

/**
 * React Hook: Form submission with feedback
 *
 * @example
 * const { submit, submitting } = useFormSubmit(
 *   async (data) => await api.submit(data),
 *   {
 *     successMessage: 'Formular erfolgreich gesendet!',
 *   }
 * );
 */
export function useFormSubmit<T extends Record<string, any>>(
  onSubmit: (data: T) => Promise<void>,
  options: {
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
  } = {}
) {
  const { execute, loading } = useAsyncOperation(onSubmit, {
    loadingMessage: options.loadingMessage || 'Sende Formular...',
    successMessage: options.successMessage,
    errorMessage: options.errorMessage || 'Fehler beim Senden des Formulars',
    onSuccess: options.onSuccess,
  });

  return {
    submit: execute,
    submitting: loading,
  };
}
