/**
 * Analytics Integration
 *
 * Privacy-first analytics using PostHog
 *
 * Features:
 * - User behavior tracking
 * - Feature usage analytics
 * - Performance metrics
 * - GDPR compliant
 * - Opt-in/opt-out support
 */

import { logger } from './logger';

// Analytics Events
export enum AnalyticsEvent {
  // User Authentication
  USER_SIGNED_UP = 'user_signed_up',
  USER_SIGNED_IN = 'user_signed_in',
  USER_SIGNED_OUT = 'user_signed_out',

  // Study Sessions
  STUDY_SESSION_STARTED = 'study_session_started',
  STUDY_SESSION_COMPLETED = 'study_session_completed',
  STUDY_SESSION_ABANDONED = 'study_session_abandoned',

  // Flashcards
  FLASHCARD_VIEWED = 'flashcard_viewed',
  FLASHCARD_ANSWERED = 'flashcard_answered',
  FLASHCARD_CREATED = 'flashcard_created',
  FLASHCARD_EDITED = 'flashcard_edited',
  FLASHCARD_DELETED = 'flashcard_deleted',

  // Quiz/Tests
  QUIZ_STARTED = 'quiz_started',
  QUIZ_COMPLETED = 'quiz_completed',
  QUIZ_QUESTION_ANSWERED = 'quiz_question_answered',

  // Library/Content
  CONTENT_VIEWED = 'content_viewed',
  CONTENT_SEARCHED = 'content_searched',
  CONTENT_BOOKMARKED = 'content_bookmarked',

  // Performance
  PAGE_LOADED = 'page_loaded',
  ERROR_OCCURRED = 'error_occurred',
  SCREEN_VIEW = 'screen_view',

  // Features
  FEATURE_USED = 'feature_used',
  SETTINGS_CHANGED = 'settings_changed',

  // Navigation/Links
  EXTERNAL_LINK_CLICKED = 'external_link_clicked',
}

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalyticsConfig {
  apiKey?: string;
  apiHost?: string;
  enabled?: boolean;
  debug?: boolean;
  capturePageViews?: boolean;
  capturePageLeaves?: boolean;
}

class Analytics {
  private config: AnalyticsConfig = {
    enabled: false,
    debug: false,
    capturePageViews: true,
    capturePageLeaves: false,
  };

  private initialized = false;
  private userId: string | null = null;
  private userProperties: AnalyticsProperties = {};

  /**
   * Initialize analytics
   */
  initialize(config: AnalyticsConfig): void {
    this.config = { ...this.config, ...config };

    // Don't initialize if no API key or disabled
    if (!config.apiKey || !config.enabled) {
      logger.info('Analytics disabled or no API key provided');
      return;
    }

    try {
      // Initialize PostHog
      if (typeof window !== 'undefined') {
        // Load PostHog script dynamically
        this.loadPostHog();
        this.initialized = true;
        logger.info('Analytics initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize analytics', { error });
    }
  }

  /**
   * Load PostHog SDK
   */
  private loadPostHog(): void {
    if (typeof window === 'undefined') return;

    // PostHog snippet
    const script = document.createElement('script');
    script.innerHTML = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('${this.config.apiKey}',{
        api_host:'${this.config.apiHost || 'https://app.posthog.com'}',
        capture_pageview: ${this.config.capturePageViews},
        capture_pageleave: ${this.config.capturePageLeaves},
        debug: ${this.config.debug}
      })
    `;
    document.head.appendChild(script);
  }

  /**
   * Check if analytics is enabled and initialized
   */
  private isEnabled(): boolean {
    return this.initialized && this.config.enabled === true;
  }

  /**
   * Identify user
   */
  identifyUser(userId: string, properties?: AnalyticsProperties): void {
    if (!this.isEnabled()) return;

    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.identify(userId, this.userProperties);
        logger.debug('User identified in analytics', { userId });
      }
    } catch (error) {
      logger.error('Failed to identify user', { error });
    }
  }

  /**
   * Reset user identity (on logout)
   */
  reset(): void {
    if (!this.isEnabled()) return;

    this.userId = null;
    this.userProperties = {};

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.reset();
        logger.debug('Analytics user reset');
      }
    } catch (error) {
      logger.error('Failed to reset analytics', { error });
    }
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent | string, properties?: AnalyticsProperties): void {
    if (!this.isEnabled()) {
      if (this.config.debug) {
        logger.debug('Analytics event (not sent - disabled)', { event, properties });
      }
      return;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture(event, properties);

        if (this.config.debug) {
          logger.debug('Analytics event tracked', { event, properties });
        }
      }
    } catch (error) {
      logger.error('Failed to track event', { error, event });
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, properties?: AnalyticsProperties): void {
    this.track(AnalyticsEvent.PAGE_LOADED, {
      page_name: pageName,
      ...properties,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: AnalyticsProperties): void {
    if (!this.isEnabled()) return;

    this.userProperties = { ...this.userProperties, ...properties };

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.people.set(properties);
        logger.debug('User properties set', { properties });
      }
    } catch (error) {
      logger.error('Failed to set user properties', { error });
    }
  }

  /**
   * Opt user out of tracking
   */
  optOut(): void {
    if (!this.isEnabled()) return;

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.opt_out_capturing();
        logger.info('User opted out of analytics');
      }
    } catch (error) {
      logger.error('Failed to opt out', { error });
    }
  }

  /**
   * Opt user in to tracking
   */
  optIn(): void {
    if (!this.isEnabled()) return;

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.opt_in_capturing();
        logger.info('User opted in to analytics');
      }
    } catch (error) {
      logger.error('Failed to opt in', { error });
    }
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(): boolean {
    if (!this.isEnabled()) return true;

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        return (window as any).posthog.has_opted_out_capturing();
      }
    } catch (error) {
      logger.error('Failed to check opt-out status', { error });
    }

    return false;
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Convenience functions
export const trackEvent = (event: AnalyticsEvent | string, properties?: AnalyticsProperties) => {
  analytics.track(event, properties);
};

export const identifyUser = (userId: string, properties?: AnalyticsProperties) => {
  analytics.identifyUser(userId, properties);
};

export const resetAnalytics = () => {
  analytics.reset();
};

export const trackPageView = (pageName: string, properties?: AnalyticsProperties) => {
  analytics.trackPageView(pageName, properties);
};
