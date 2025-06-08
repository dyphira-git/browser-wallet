// Inject the detection code into the webpage
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);

// Keep track of pending callbacks
const pendingCallbacks = new Map();

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const { type, detail } = event.data;

  switch (type) {
    case 'DYPHIRA_CONNECT':
      try {
        // Store the callback ID
        const callbackId = detail.callbackId;
        
        // Create a promise to handle the response
        const responsePromise = new Promise((resolve, reject) => {
          pendingCallbacks.set(callbackId, { resolve, reject });
        });

        // Send request to background
        chrome.runtime.sendMessage({ 
          type: 'CONNECT_WALLET',
          origin: window.location.origin,
          callbackId: callbackId
        });

        // Wait for response
        const response = await responsePromise;
        
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: callbackId,
          response: response.error ? 
            { error: response.error } : 
            { address: response.address }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: { error: error.message || 'Connection failed' }
        }, '*');
      }
      break;

    case 'DYPHIRA_SEND_TRANSACTION':
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'REQUEST_TRANSACTION',
          to: detail.to,
          amount: detail.amount,
          origin: window.location.origin
        });
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: { error: error.message || 'Transaction failed' }
        }, '*');
      }
      break;

    case 'DYPHIRA_GET_BALANCE':
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_BALANCE',
          origin: window.location.origin
        });
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: response.error ? 
            { error: response.error } : 
            { balance: response.balance }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: { error: error.message || 'Failed to get balance' }
        }, '*');
      }
      break;
  }
});

// Listen for responses from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONNECT_RESPONSE' && message.callbackId) {
    const callback = pendingCallbacks.get(message.callbackId);
    if (callback) {
      callback.resolve(message);
      pendingCallbacks.delete(message.callbackId);
    }
  }
}); 