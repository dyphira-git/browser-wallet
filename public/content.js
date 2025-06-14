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

        console.log('DYPHIRA_CONNECT', detail);

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

    case 'DYPHIRA_DISCONNECT':
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'DISCONNECT_SITE',
          origin: window.location.origin
        });
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: { success: true }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: { error: error.message || 'Disconnect failed' }
        }, '*');
      }
      break;

    case 'DYPHIRA_SEND_TRANSACTION':
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'REQUEST_TRANSACTION',
          to: detail.to,
          amount: detail.amount,
          fee: detail.fee,
          origin: window.location.origin
        });

        window.postMessage({
          type: 'DYPHIRA_CALLBACK',
          callbackId: detail.callbackId,
          response: response.error ? 
            { error: response.error } : 
            { success: true, hash: response.hash }
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
  console.log('onMessage', message);
  if (message.type === 'CONNECT_RESPONSE' && message.callbackId) {
    const callback = pendingCallbacks.get(message.callbackId);
    if (callback) {
      callback.resolve(message);
      pendingCallbacks.delete(message.callbackId);
    }
  }
}); 