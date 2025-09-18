// Global Voiceflow widget cleanup utility
// This runs on every page load to ensure widgets don't persist across pages

export function runGlobalVoiceflowCleanup(forceCleanup: boolean = false) {
  if (typeof window === 'undefined') return;

  // Check if we're on a simulation page - if so, don't run cleanup unless forced
  const currentPath = window.location?.pathname || '';
  const isSimulationPage = currentPath.includes('/simulation/kp') || currentPath.includes('/simulation/fsp');
  
  if (isSimulationPage && !forceCleanup) {
    console.log('🚫 On simulation page, skipping Voiceflow cleanup (use forceCleanup=true to override)');
    return;
  }

  if (forceCleanup) {
    console.log('⚡ Force cleanup requested - cleaning up regardless of page type');
  }

  console.log('🌍 Running global Voiceflow cleanup on page load...');

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
    selectors.forEach(selector => {
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
            console.log(`🗑️ Removing Voiceflow element: ${selector}`, element);
            element.remove();
            removedCount++;
          }
        });
      } catch (error) {
        console.warn(`⚠️ Error removing elements with selector ${selector}:`, error);
      }
    });

    return removedCount;
  };

  // Function to clean up scripts
  const cleanupVoiceflowScripts = () => {
    try {
      const scripts = document.querySelectorAll('script[src*="voiceflow"]');
      scripts.forEach(script => {
        console.log('🗑️ Removing Voiceflow script:', script.getAttribute('src'));
        script.remove();
      });
    } catch (error) {
      console.warn('⚠️ Error removing Voiceflow scripts:', error);
    }
  };

  // Function to clear global objects
  const clearGlobalObjects = () => {
    try {
      if (window.voiceflow) {
        delete (window as any).voiceflow;
        console.log('✅ Cleared global voiceflow object');
      }

      // Clear any Voiceflow-related storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('voiceflow')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage key: ${key}`);
      });

      // Clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.toLowerCase().includes('voiceflow')) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed sessionStorage key: ${key}`);
      });

    } catch (error) {
      console.warn('⚠️ Error clearing global objects:', error);
    }
  };

  // Run cleanup immediately
  const removedCount = cleanupVoiceflowElements();
  cleanupVoiceflowScripts();
  clearGlobalObjects();

  // Run cleanup again after a short delay to catch dynamically loaded content
  setTimeout(() => {
    const additionalRemoved = cleanupVoiceflowElements();
    console.log(`🧹 Global cleanup completed: ${removedCount + additionalRemoved} elements removed`);
  }, 500);

  // Set up mutation observer to catch new Voiceflow elements (only on non-simulation pages)
  const observer = new MutationObserver((mutations) => {
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
          const isVoiceflowElement = 
            element.id?.toLowerCase().includes('voiceflow') ||
            element.className?.toLowerCase().includes('voiceflow') ||
            element.className?.toLowerCase().includes('vfrc') ||
            (element as HTMLElement).innerHTML?.toLowerCase().includes('voiceflow');
          
          if (isVoiceflowElement) {
            shouldCleanup = true;
          }
        }
      });
    });

    if (shouldCleanup) {
      console.log('🔍 Detected new Voiceflow elements on non-simulation page, cleaning up...');
      setTimeout(cleanupVoiceflowElements, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Store observer reference for cleanup
  (window as any).voiceflowCleanupObserver = observer;
}

// Function to stop the cleanup observer
export function stopGlobalVoiceflowCleanup() {
  if (typeof window !== 'undefined' && (window as any).voiceflowCleanupObserver) {
    (window as any).voiceflowCleanupObserver.disconnect();
    delete (window as any).voiceflowCleanupObserver;
    console.log('🛑 Stopped Voiceflow cleanup observer');
  }
}

// Auto-run cleanup when this module is loaded (but not on simulation pages)
if (typeof window !== 'undefined') {
  // Check if we're on a simulation page
  const currentPath = window.location?.pathname || '';
  const isSimulationPage = currentPath.includes('/simulation/');
  
  console.log('🔍 Current path:', currentPath, 'Is simulation page:', isSimulationPage);
  
  if (!isSimulationPage) {
    // Not on simulation page, run cleanup
    runGlobalVoiceflowCleanup();
  }
}