// Retell SDK Loader - Dynamic import from esm.sh
// This file exports RetellWebClient to window

(async function() {
  const TIMEOUT = 30000; // 30 seconds timeout
  const RETRY_COUNT = 3;
  
  let attempts = 0;
  let lastError = null;
  
  while (attempts < RETRY_COUNT) {
    try {
      attempts++;
      console.log(`[Retell SDK] Loading attempt ${attempts}/${RETRY_COUNT}`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SDK load timeout')), TIMEOUT);
      });
      
      // Import SDK with timeout
      const retellModule = await Promise.race([
        import('https://esm.sh/retell-client-js-sdk@2.0.7'),
        timeoutPromise
      ]);
      
      // Export to global scope
      window.retellClientJsSdk = retellModule;
      
      // Verify the SDK is loaded correctly
      if (!window.retellClientJsSdk?.RetellWebClient) {
        throw new Error('RetellWebClient not found in SDK module');
      }
      
      console.log('[Retell SDK] SDK loaded successfully');
      console.log('[Retell SDK] RetellWebClient available:', !!window.retellClientJsSdk?.RetellWebClient);
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('retell-sdk-ready'));
      return; // Success, exit the retry loop
      
    } catch (error) {
      lastError = error;
      console.error(`[Retell SDK] Load attempt ${attempts} failed:`, error);
      
      if (attempts < RETRY_COUNT) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        console.log(`[Retell SDK] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  console.error('[Retell SDK] All load attempts failed:', lastError);
  window.dispatchEvent(new CustomEvent('retell-sdk-error', { 
    detail: { 
      message: lastError?.message || 'Unknown error',
      attempts: attempts 
    } 
  }));
})();
