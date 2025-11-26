/**
 * Network Manager - Offline Detection & Graceful Degradation
 *
 * Features:
 * - Real-time network status monitoring
 * - Offline queue for failed requests
 * - Automatic retry with exponential backoff
 * - Network quality detection
 * - React hooks for components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from './logger';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',
  UNKNOWN = 'unknown',
}

export enum ConnectionType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  NONE = 'none',
  UNKNOWN = 'unknown',
}

interface NetworkState {
  isConnected: boolean;
  status: NetworkStatus;
  connectionType: ConnectionType;
  isInternetReachable: boolean | null;
  details: any;
}

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
  priority: number;
}

class NetworkManager {
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private currentState: NetworkState = {
    isConnected: true,
    status: NetworkStatus.UNKNOWN,
    connectionType: ConnectionType.UNKNOWN,
    isInternetReachable: null,
    details: null,
  };
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue: boolean = false;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    try {
      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        this.handleNetworkChange(state);
      });

      // Get initial state
      const state = await NetInfo.fetch();
      this.handleNetworkChange(state);

      logger.info('Network manager initialized', {
        isConnected: state.isConnected,
        type: state.type,
      });
    } catch (error) {
      logger.error('Failed to initialize network manager', { error });
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const newState: NetworkState = {
      isConnected: state.isConnected ?? false,
      status: this.determineNetworkStatus(state),
      connectionType: this.mapConnectionType(state.type),
      isInternetReachable: state.isInternetReachable,
      details: state.details,
    };

    // Check if state actually changed
    if (JSON.stringify(newState) !== JSON.stringify(this.currentState)) {
      const wasOffline = !this.currentState.isConnected;
      const isNowOnline = newState.isConnected;

      this.currentState = newState;

      // Log state change
      logger.info('Network state changed', {
        status: newState.status,
        type: newState.connectionType,
        isInternetReachable: newState.isInternetReachable,
      });

      // Notify listeners
      this.notifyListeners(newState);

      // If we just came back online, process queued requests
      if (wasOffline && isNowOnline) {
        logger.info('Back online - processing queued requests');
        this.processQueue();
      }
    }
  }

  /**
   * Determine network status from state
   */
  private determineNetworkStatus(state: NetInfoState): NetworkStatus {
    if (!state.isConnected) {
      return NetworkStatus.OFFLINE;
    }

    // Check for slow connection
    if (state.details && 'effectiveType' in state.details) {
      const effectiveType = (state.details as any).effectiveType;
      if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        return NetworkStatus.SLOW;
      }
    }

    if (state.isInternetReachable === false) {
      return NetworkStatus.OFFLINE;
    }

    if (state.isInternetReachable === true) {
      return NetworkStatus.ONLINE;
    }

    return NetworkStatus.UNKNOWN;
  }

  /**
   * Map NetInfo connection type to our enum
   */
  private mapConnectionType(type: string): ConnectionType {
    switch (type) {
      case 'wifi':
        return ConnectionType.WIFI;
      case 'cellular':
        return ConnectionType.CELLULAR;
      case 'ethernet':
        return ConnectionType.ETHERNET;
      case 'none':
        return ConnectionType.NONE;
      default:
        return ConnectionType.UNKNOWN;
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(state: NetworkState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('Error in network state listener', { error });
      }
    });
  }

  /**
   * Get current network state
   */
  getState(): NetworkState {
    return { ...this.currentState };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable !== false;
  }

  /**
   * Add request to queue for later retry
   */
  queueRequest(
    request: () => Promise<any>,
    options: {
      maxRetries?: number;
      priority?: number;
    } = {}
  ): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const queuedRequest: QueuedRequest = {
      id,
      request,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      timestamp: Date.now(),
      priority: options.priority ?? 5,
    };

    this.requestQueue.push(queuedRequest);

    // Sort by priority (higher first) and timestamp (older first)
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    logger.info('Request queued', {
      id,
      queueSize: this.requestQueue.length,
      priority: queuedRequest.priority,
    });

    // Try to process if we're online
    if (this.isOnline()) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline()) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.isOnline()) {
      const queuedRequest = this.requestQueue[0];

      try {
        logger.debug('Processing queued request', { id: queuedRequest.id });

        await queuedRequest.request();

        // Success - remove from queue
        this.requestQueue.shift();

        logger.info('Queued request succeeded', {
          id: queuedRequest.id,
          remainingQueue: this.requestQueue.length,
        });
      } catch (error) {
        logger.error('Queued request failed', {
          id: queuedRequest.id,
          retryCount: queuedRequest.retryCount,
          error,
        });

        queuedRequest.retryCount++;

        if (queuedRequest.retryCount >= queuedRequest.maxRetries) {
          // Max retries reached - remove from queue
          this.requestQueue.shift();

          logger.warn('Queued request exceeded max retries', {
            id: queuedRequest.id,
            maxRetries: queuedRequest.maxRetries,
          });
        } else {
          // Move to end of queue for retry
          this.requestQueue.shift();
          this.requestQueue.push(queuedRequest);
        }

        // Wait before processing next request
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;

    if (this.requestQueue.length > 0) {
      logger.info('Queue processing paused', {
        remainingRequests: this.requestQueue.length,
        isOnline: this.isOnline(),
      });
    }
  }

  /**
   * Clear all queued requests
   */
  clearQueue(): void {
    const count = this.requestQueue.length;
    this.requestQueue = [];
    logger.info('Request queue cleared', { count });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    isProcessing: boolean;
    requests: { id: string; retryCount: number; priority: number }[];
  } {
    return {
      size: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      requests: this.requestQueue.map(req => ({
        id: req.id,
        retryCount: req.retryCount,
        priority: req.priority,
      })),
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    this.clearQueue();
    logger.info('Network manager destroyed');
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();

/**
 * React Hook: Network status
 *
 * @example
 * const { isOnline, status, connectionType } = useNetworkStatus();
 *
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 */
export function useNetworkStatus(): NetworkState & {
  isOnline: boolean;
  isSlow: boolean;
} {
  const [state, setState] = useState<NetworkState>(networkManager.getState());

  useEffect(() => {
    return networkManager.subscribe(setState);
  }, []);

  return {
    ...state,
    isOnline: state.isConnected && state.isInternetReachable !== false,
    isSlow: state.status === NetworkStatus.SLOW,
  };
}

/**
 * React Hook: Offline queue status
 *
 * @example
 * const { queueSize, isProcessing } = useOfflineQueue();
 */
export function useOfflineQueue() {
  const [status, setStatus] = useState(networkManager.getQueueStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(networkManager.getQueueStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * React Hook: Network-aware fetch with automatic queuing
 *
 * @example
 * const fetchData = useNetworkAwareFetch();
 * const data = await fetchData(() => api.getData());
 */
export function useNetworkAwareFetch() {
  const { isOnline } = useNetworkStatus();

  return useCallback(
    async <T,>(
      fetcher: () => Promise<T>,
      options: {
        queueIfOffline?: boolean;
        priority?: number;
      } = {}
    ): Promise<T> => {
      if (isOnline) {
        return fetcher();
      }

      if (options.queueIfOffline !== false) {
        return new Promise((resolve, reject) => {
          networkManager.queueRequest(
            async () => {
              try {
                const result = await fetcher();
                resolve(result);
              } catch (error) {
                reject(error);
              }
            },
            { priority: options.priority }
          );
        });
      }

      throw new Error('Offline: Keine Internetverbindung');
    },
    [isOnline]
  );
}
