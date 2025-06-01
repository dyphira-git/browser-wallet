// Inject the detection code into the webpage
const script = document.createElement('script');
script.src = chrome.runtime.getURL('js/inject.js');
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const { type, detail } = event.data;

  switch (type) {
    case 'DYPHIRA_CONNECT':
      try {
        const response = await chrome.runtime.sendMessage({ 
          type: 'CONNECT_WALLET'
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
          response: { error: error.message || 'Connection failed' }
        }, '*');
      }
      break;

    case 'DYPHIRA_SEND_TRANSACTION':
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'REQUEST_TRANSACTION',
          to: detail.to,
          amount: detail.amount
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
          type: 'GET_BALANCE'
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
          response: { error: error.message || 'Failed to get balance' }
        }, '*');
      }
      break;
  }
});

// Notify that the wallet is ready
window.dispatchEvent(new Event('dyphiraWalletLoaded')); 