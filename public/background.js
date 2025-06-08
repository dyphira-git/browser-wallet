// Keep track of connected sites and pending requests
let connectedSites = new Set();
let pendingRequests = new Map();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CONNECT_WALLET':
      handleConnectRequest(sender.tab?.id, request.origin, request.callbackId).then(sendResponse);
      return true;

    case 'REQUEST_TRANSACTION':
      handleTransactionRequest(sender.tab?.id, sender.origin, request).then(sendResponse);
      return true;

    case 'GET_BALANCE':
      handleGetBalance(request.origin).then(sendResponse);
      return true;

    case 'APPROVAL_RESPONSE':
      const pendingRequest = pendingRequests.get(request.requestId);
      if (pendingRequest && pendingRequest.resolver) {
        pendingRequest.resolver({
          approved: request.approved,
          address: request.address
        });
      }
      pendingRequests.delete(request.requestId);
      return false;

    case 'DISCONNECT_SITE':
      disconnectSite(request.origin).then(() => sendResponse({ success: true }));
      return true;
  }
});

async function handleConnectRequest(tabId, origin, callbackId) {
  try {
    const requestId = Date.now().toString();
    
    // Get the current wallet data
    const result = await chrome.storage.local.get(['wallet']);
    const wallet = result.wallet;

    if (!wallet || !wallet.address) {
      throw new Error('No wallet found');
    }

    const address = wallet.address;
    
    const response = await new Promise((resolve) => {
      pendingRequests.set(requestId, {
        type: 'connect',
        origin,
        resolver: resolve,
        callbackId,
        address
      });

      chrome.storage.local.set({
        latestRequest: { 
          id: requestId, 
          type: 'connect', 
          origin,
          address 
        }
      });

      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });

    chrome.action.setBadgeText({ text: '' });

    if (!response.approved) {
      chrome.tabs.sendMessage(tabId, {
        type: 'CONNECT_RESPONSE',
        callbackId,
        error: 'User rejected connection'
      });
      return { error: 'User rejected connection' };
    }

    connectedSites.add(origin);
    chrome.storage.local.set({ connectedSites: Array.from(connectedSites) });
    
    // Send successful response with address
    const successResponse = { address };
    chrome.tabs.sendMessage(tabId, {
      type: 'CONNECT_RESPONSE',
      callbackId,
      ...successResponse
    });
    
    return successResponse;
  } catch (error) {
    console.error('Connection error:', error);
    chrome.action.setBadgeText({ text: '' });
    
    chrome.tabs.sendMessage(tabId, {
      type: 'CONNECT_RESPONSE',
      callbackId,
      error: error.message || 'Connection failed'
    });
    
    return { error: error.message || 'Connection failed' };
  } finally {
    chrome.storage.local.remove('latestRequest');
  }
}

async function handleTransactionRequest(tabId, origin, request) {
  if (!connectedSites.has(origin)) {
    return { error: 'Site not connected' };
  }

  try {
    const requestId = Date.now().toString();
    
    const approved = await new Promise((resolve) => {
      pendingRequests.set(requestId, {
        type: 'transaction',
        site: origin,
        to: request.to,
        amount: request.amount,
        resolver: resolve
      });

      chrome.storage.local.set({
        latestRequest: {
          id: requestId,
          type: 'transaction',
          site: origin,
          to: request.to,
          amount: request.amount
        }
      });

      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });

    chrome.action.setBadgeText({ text: '' });

    if (!approved) {
      return { error: 'User rejected transaction' };
    }

    return { success: true };
  } catch (error) {
    console.error('Transaction error:', error);
    chrome.action.setBadgeText({ text: '' });
    return { error: error.message || 'Transaction failed' };
  } finally {
    chrome.storage.local.remove('latestRequest');
  }
}

async function handleGetBalance(origin) {
  if (!connectedSites.has(origin)) {
    return { error: 'Site not connected' };
  }

  try {
    // Get the current wallet data
    const result = await chrome.storage.local.get(['wallet']);
    const wallet = result.wallet;
    
    if (!wallet || !wallet.address) {
      return { error: 'No wallet found' };
    }

    // Get balance from API
    const response = await fetch(`http://localhost:8080/balance/${wallet.address}`);
    const data = await response.json();
    
    return { balance: data.balance };
  } catch (error) {
    console.error('Balance error:', error);
    return { error: error.message || 'Failed to get balance' };
  }
}

async function disconnectSite(origin) {
  connectedSites.delete(origin);
  await chrome.storage.local.set({ connectedSites: Array.from(connectedSites) });
} 