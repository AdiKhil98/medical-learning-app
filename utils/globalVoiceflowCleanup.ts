import { logger } from './logger';
// Global Voiceflow widget cleanup utility
// This runs on every page load to ensure widgets don't persist across pages

// Global flag to completely disable cleanup (set by simulation pages)
let cleanupDisabled = false;

// Support widget should never be cleaned up
const SUPPORT_WIDGET_SCRIPT_ID = 'voiceflow-support-widget-script';

/**
 * Disable Voiceflow cleanup globally
 * Call this BEFORE loading Voiceflow widget on simulation pages
 */
export function disableVoiceflowCleanup() {
  cleanupDisabled = true;
  logger.info('🛑 Voiceflow cleanup DISABLED globally');
}

/**
 * Re-enable Voiceflow cleanup
 * Call this when leaving simulation pages
 */
export function enableVoiceflowCleanup() {
  cleanupDisabled = false;
  logger.info('✅ Voiceflow cleanup ENABLED globally');
}

export function runGlobalVoiceflowCleanup(forceCleanup: boolean = false) {
  if (typeof window === 'undefined') return;

  // Check global disable flag first
  if (cleanupDisabled && !forceCleanup) {
    logger.info('🚫 Cleanup is globally disabled, skipping (use forceCleanup=true to override)');
    return;
  }

  // Check if we're on a simulation page - if so, don't run cleanup unless forced
  const currentPath = window.location?.pathname || '';
  const isSimulationPage = currentPath.includes('/simulation/kp') || currentPath.includes('/simulation/fsp');

  if (isSimulationPage && !forceCleanup) {
    logger.info('🚫 On simulation page, skipping Voiceflow cleanup (use forceCleanup=true to override)');
    return;
  }

  if (forceCleanup) {
    logger.info('⚡ Force cleanup requested - cleaning up regardless of page type');
  }

  logger.info('🌍 Running global Voiceflow cleanup on page load...');

  // Function to remove all Voiceflow elements
  const cleanupVoiceflowElements = () => {
    const selectors = [
      // Voiceflow widget selectors
      '[id*="voiceflow"]',
      '[class*="voiceflow"]',
      '[class*="vfrc"]',
      '[class*="VF"]',
      '[data-testid*="chat"]',
      '[aria-label*="chat"]',
      'iframe[src*="voiceflow"]',
      'iframe[src*="general-runtime"]',
      'iframe[src*="creator.voiceflow"]',
      '.vfrc-widget',
      '.vfrc-chat',
      '.vfrc-launcher',
      '#voiceflow-chat',
      '.widget-container',

      // Common chat widget patterns
      'div[style*="z-index: 1000"]',
      'div[style*="position: fixed"][style*="bottom"]',
      'div[style*="position: fixed"][style*="right"]',

      // Specific Voiceflow elements
      'div[data-cy="chat-widget"]',
      'div[role="dialog"][aria-label*="chat"]',
    ];

    let removedCount = 0;
    selectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;

          // Check if it's likely a Voiceflow element
          const isVoiceflowElement =
            element.id.toLowerCase().includes('voiceflow') ||
            element.className.toLowerCase().includes('voiceflow') ||
            element.className.toLowerCase().includes('vfrc') ||
            htmlElement.innerHTML?.toLowerCase().includes('voiceflow') ||
            (element as HTMLIFrameElement).src?.includes('voiceflow') ||
            (element as HTMLIFrameElement).src?.includes('general-runtime');

          // Also remove elements that match widget patterns
          const isWidgetElement =
            selector.includes('voiceflow') ||
            selector.includes('vfrc') ||
            selector.includes('chat') ||
            isVoiceflowElement;

          if (isWidgetElement) {
            logger.info(`🗑️ Removing Voiceflow element: ${selector}`, element);
            element.remove();
            removedCount++;
          }
        });
      } catch (error) {
        logger.warn(`⚠️ Error removing elements with selector ${selector}:`, error);
      }
    });

    return removedCount;
  };

  // Function to clean up scripts (but not support widget)
  const cleanupVoiceflowScripts = () => {
    try {
      const scripts = document.querySelectorAll('script[src*="voiceflow"]');
      scripts.forEach((script) => {
        // Don't remove the support widget script
        if (script.id === SUPPORT_WIDGET_SCRIPT_ID) {
          logger.info('✅ Keeping support widget script');
          return;
        }
        logger.info('🗑️ Removing Voiceflow script:', script.getAttribute('src'));
        script.remove();
      });
    } catch (error) {
      logger.warn('⚠️ Error removing Voiceflow scripts:', error);
    }
  };

  // Function to clear global objects
  const clearGlobalObjects = () => {
    try {
      // Properly cleanup the Voiceflow widget to allow re-initialization later
      if (window.voiceflow?.chat) {
        try {
          window.voiceflow.chat.hide?.();
          window.voiceflow.chat.close?.();
          window.voiceflow.chat.destroy?.();
          logger.info('✅ Voiceflow widget hidden and destroyed');
        } catch (error) {
          logger.warn('⚠️ Error cleaning up Voiceflow widget:', error);
        }
      }

      // Delete the global object to allow proper re-initialization
      // This is critical: if window.voiceflow exists but script is removed,
      // reloading the script won't re-initialize the widget
      if (window.voiceflow) {
        delete (window as any).voiceflow;
        logger.info('✅ Deleted window.voiceflow');
      }

      // Be more selective about storage cleanup - avoid auth-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.toLowerCase().includes('voiceflow') &&
          !key.toLowerCase().includes('auth') &&
          !key.toLowerCase().includes('session') &&
          !key.toLowerCase().includes('token')
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        logger.info(`🗑️ Removed localStorage key: ${key}`);
      });

      // Be selective about sessionStorage cleanup too
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          key.toLowerCase().includes('voiceflow') &&
          !key.toLowerCase().includes('auth') &&
          !key.toLowerCase().includes('session') &&
          !key.toLowerCase().includes('token')
        ) {
          sessionKeysToRemove.push(key);
        }
      }

      sessionKeysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
        logger.info(`🗑️ Removed sessionStorage key: ${key}`);
      });
    } catch (error) {
      logger.warn('⚠️ Error clearing global objects:', error);
    }
  };

  // Run cleanup immediately
  const removedCount = cleanupVoiceflowElements();
  cleanupVoiceflowScripts();
  clearGlobalObjects();

  // Run cleanup again after a short delay to catch dynamically loaded content
  setTimeout(() => {
    const additionalRemoved = cleanupVoiceflowElements();
    logger.info(`🧹 Global cleanup completed: ${removedCount + additionalRemoved} elements removed`);
  }, 500);

  // Set up mutation observer to catch new Voiceflow elements (only on non-simulation pages)
  const observer = new MutationObserver((mutations) => {
    // Check global disable flag first
    if (cleanupDisabled) {
      return; // Cleanup is globally disabled
    }

    // Check current path before cleaning up
    const currentPath = window.location?.pathname || '';
    const isSimulationPage = currentPath.includes('/simulation/kp') || currentPath.includes('/simulation/fsp');

    if (isSimulationPage) {
      return; // Don't clean up on simulation pages
    }

    let shouldCleanup = false;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const classNameStr =
            typeof element.className === 'string' ? element.className : String(element.className || '');
          const isVoiceflowElement =
            element.id?.toLowerCase().includes('voiceflow') ||
            classNameStr.toLowerCase().includes('voiceflow') ||
            classNameStr.toLowerCase().includes('vfrc') ||
            (element as HTMLElement).innerHTML?.toLowerCase().includes('voiceflow');

          if (isVoiceflowElement) {
            shouldCleanup = true;
          }
        }
      });
    });

    if (shouldCleanup) {
      logger.info('🔍 Detected new Voiceflow elements on non-simulation page, cleaning up...');
      setTimeout(cleanupVoiceflowElements, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Store observer reference for cleanup
  (window as any).voiceflowCleanupObserver = observer;
}

// Function to stop the cleanup observer
export function stopGlobalVoiceflowCleanup() {
  if (typeof window !== 'undefined' && (window as any).voiceflowCleanupObserver) {
    (window as any).voiceflowCleanupObserver.disconnect();
    delete (window as any).voiceflowCleanupObserver;
    logger.info('🛑 Stopped Voiceflow cleanup observer');
  }
}

// Auto-run cleanup when this module is loaded (but not on simulation pages)
if (typeof window !== 'undefined') {
  // Check if we're on a simulation page
  const currentPath = window.location?.pathname || '';
  const isSimulationPage = currentPath.includes('/simulation/');

  logger.info('🔍 Current path:', currentPath, 'Is simulation page:', isSimulationPage);

  if (!isSimulationPage) {
    // Not on simulation page, run cleanup
    runGlobalVoiceflowCleanup();
  }
}
