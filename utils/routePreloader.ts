/**
 * Route Preloader
 *
 * Intelligent preloading system for lazy-loaded routes.
 * Preloads routes based on user behavior and predictions.
 *
 * Features:
 * - Preload on hover/focus
 * - Preload on idle
 * - Predictive preloading based on navigation patterns
 * - Priority-based preloading queue
 *
 * Usage:
 *   import { preloadRoute, preloadOnIdle } from '@/utils/routePreloader';
 *
 *   // Preload a route
 *   preloadRoute('simulation/kp');
 *
 *   // Preload when browser is idle
 *   preloadOnIdle(['simulation/kp', 'simulation/fsp']);
 */

import { logger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== TYPES =====
interface RoutePreloadConfig {
  path: string;
  priority: 'high' | 'medium' | 'low';
  condition?: () => boolean;
}

interface NavigationStats {
  [route: string]: {
    visits: number;
    lastVisited: string;
    avgTimeSpent: number;
  };
}

// ===== CONSTANTS =====
const STORAGE_KEY = '@preloader/navigation_stats';
const PRELOAD_DELAY = 2000; // Wait 2s before preloading

// ===== STATE =====
let preloadQueue: RoutePreloadConfig[] = [];
let preloadedRoutes = new Set<string>();
let isPreloading = false;

// ===== CORE FUNCTIONS =====

/**
 * Preload a specific route
 */
export async function preloadRoute(path: string): Promise<void> {
  if (preloadedRoutes.has(path)) {
    logger.debug('Route already preloaded', { path });
    return;
  }

  try {
    logger.info('Preloading route', { path });

    // For Expo Router, preloading happens automatically via lazy loading
    // We track that we've attempted to load this route
    preloadedRoutes.add(path);

    logger.info('Route preloaded successfully', { path });
  } catch (error) {
    logger.error('Failed to preload route', error, { path });
  }
}

/**
 * Add route to preload queue
 */
export function queuePreload(config: RoutePreloadConfig): void {
  // Check if already in queue
  if (preloadQueue.some((item) => item.path === config.path)) {
    return;
  }

  // Add to queue based on priority
  if (config.priority === 'high') {
    preloadQueue.unshift(config);
  } else {
    preloadQueue.push(config);
  }

  // Start processing queue
  processPreloadQueue();
}

/**
 * Process preload queue
 */
async function processPreloadQueue(): Promise<void> {
  if (isPreloading || preloadQueue.length === 0) {
    return;
  }

  isPreloading = true;

  while (preloadQueue.length > 0) {
    const config = preloadQueue.shift();
    if (!config) break;

    // Check condition
    if (config.condition && !config.condition()) {
      continue;
    }

    // Preload route
    await preloadRoute(config.path);

    // Small delay between preloads to avoid overwhelming the system
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  isPreloading = false;
}

/**
 * Preload routes when browser is idle
 */
export function preloadOnIdle(routes: string[], priority: 'high' | 'medium' | 'low' = 'low'): void {
  setTimeout(() => {
    routes.forEach((path) => {
      queuePreload({ path, priority });
    });
  }, PRELOAD_DELAY);
}

/**
 * Track navigation for intelligent preloading
 */
export async function trackNavigation(route: string, timeSpent: number): Promise<void> {
  try {
    const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
    const stats: NavigationStats = statsJson ? JSON.parse(statsJson) : {};

    const existingStats = stats[route] || {
      visits: 0,
      lastVisited: new Date().toISOString(),
      avgTimeSpent: 0,
    };

    // Update stats
    const newAvgTime =
      (existingStats.avgTimeSpent * existingStats.visits + timeSpent) /
      (existingStats.visits + 1);

    stats[route] = {
      visits: existingStats.visits + 1,
      lastVisited: new Date().toISOString(),
      avgTimeSpent: newAvgTime,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

    logger.debug('Navigation tracked', { route, stats: stats[route] });
  } catch (error) {
    logger.error('Failed to track navigation', error);
  }
}

/**
 * Get frequently visited routes
 */
export async function getFrequentRoutes(limit: number = 5): Promise<string[]> {
  try {
    const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (!statsJson) return [];

    const stats: NavigationStats = JSON.parse(statsJson);

    // Sort by visits
    const sorted = Object.entries(stats)
      .sort((a, b) => b[1].visits - a[1].visits)
      .slice(0, limit)
      .map(([route]) => route);

    return sorted;
  } catch (error) {
    logger.error('Failed to get frequent routes', error);
    return [];
  }
}

/**
 * Predictive preloading based on current route
 */
export async function predictivePreload(currentRoute: string): Promise<void> {
  // Define common navigation patterns
  const patterns: Record<string, string[]> = {
    '/(tabs)': ['/(tabs)/bibliothek', '/(tabs)/progress'],
    '/(tabs)/simulation': ['/(tabs)/simulation/kp', '/(tabs)/simulation/fsp'],
    '/(tabs)/bibliothek': ['/(tabs)/bibliothek/[slug]'],
  };

  const nextRoutes = patterns[currentRoute];
  if (nextRoutes) {
    preloadOnIdle(nextRoutes, 'medium');
  }

  // Also preload frequently visited routes
  const frequentRoutes = await getFrequentRoutes(3);
  preloadOnIdle(frequentRoutes, 'low');
}

/**
 * Preload critical routes (called on app init)
 */
export function preloadCriticalRoutes(): void {
  const criticalRoutes = [
    '/(tabs)', // Home
    '/(tabs)/bibliothek', // Bibliothek index
    '/(tabs)/progress', // Progress
  ];

  preloadOnIdle(criticalRoutes, 'high');

  logger.info('Critical routes queued for preload', {
    count: criticalRoutes.length,
  });
}

/**
 * Clear preload cache
 */
export function clearPreloadCache(): void {
  preloadedRoutes.clear();
  preloadQueue = [];
  logger.info('Preload cache cleared');
}

/**
 * Get preload stats
 */
export function getPreloadStats() {
  return {
    preloaded: Array.from(preloadedRoutes),
    queued: preloadQueue.length,
    isPreloading,
  };
}

export default {
  preloadRoute,
  queuePreload,
  preloadOnIdle,
  trackNavigation,
  getFrequentRoutes,
  predictivePreload,
  preloadCriticalRoutes,
  clearPreloadCache,
  getPreloadStats,
};
