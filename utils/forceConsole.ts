/**
 * TEMPORARY: Force enable all console output for debugging
 * This bypasses the logger and ensures console.log works
 */

// Save original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Force console to work
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.console = originalConsole;

  // Global error handler
  window.onerror = function (message, source, lineno, colno, error) {
    console.error('🔴 GLOBAL ERROR:', {
      message,
      source,
      line: lineno,
      column: colno,
      error: error?.stack || error,
    });
    return false; // Let default handler run too
  };

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 UNHANDLED PROMISE REJECTION:', {
      reason: event.reason,
      promise: event.promise,
    });
  });

  console.log('✅ FORCE CONSOLE ENABLED - All errors will now be visible');
}

export {};
