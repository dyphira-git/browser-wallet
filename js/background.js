const API_URL = 'http://localhost:8080';

// Keep track of connected sites and pending requests
let connectedSites = new Set();
let currentWallet = null;
let pendingRequests = new Map();

// Load wallet from storage
chrome.storage.local.get(['wallet'], ({ wallet }) => {
  if (wallet) {
    currentWallet = wallet;
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CREATE_WALLET':
      createWallet().then(sendResponse);
      return true;

    case 'IMPORT_WALLET':
      importWallet(request.privateKey).then(sendResponse);
      return true;

    case 'GET_BALANCE':
      if (!currentWallet) {
        sendResponse({ error: 'No wallet found' });
        return;
      }
      getBalance(currentWallet.address).then(sendResponse);
      return true;

    case 'SEND_TRANSACTION':
      sendTransaction(request.privateKey, request.to, request.amount).then(sendResponse);
      return true;

    case 'DEPOSIT':
      depositToDyphira(request.privateKey, request.amount).then(sendResponse);
      return true;

    case 'CONNECT_WALLET':
      handleConnectRequest(sender.tab?.id, request.origin, request.callbackId).then(sendResponse);
      return true;

    case 'REQUEST_TRANSACTION':
      handleTransactionRequest(sender.tab?.id, sender.origin, request).then(sendResponse);
      return true;

    case 'APPROVAL_RESPONSE':
      const pendingRequest = pendingRequests.get(request.requestId);
      if (pendingRequest && pendingRequest.resolver) {
        pendingRequest.resolver(request.approved);
      }
      pendingRequests.delete(request.requestId);
      return false;
  }
});

async function createWallet() {
  try {
    const response = await fetch(`${API_URL}/wallet/new`, {
      method: 'POST'
    });
    const wallet = await response.json();
    currentWallet = wallet;
    chrome.storage.local.set({ wallet });
    return wallet;
  } catch (error) {
    return { error: error.message };
  }
}

async function importWallet(privateKey) {
  try {
    const response = await fetch(`${API_URL}/wallet/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ private_key: privateKey })
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getBalance(address) {
  try {
    const response = await fetch(`${API_URL}/wallet/${address}/balance`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function sendTransaction(privateKey, to, amount) {
  try {
    const response = await fetch(`${API_URL}/transaction/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        private_key: privateKey,
        to: to,
        amount: parseInt(amount)
      })
    });
    
    if (!response.ok) {
      throw new Error('Transaction failed');
    }
    
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function depositToDyphira(privateKey, amount) {
  // Using the Dyphira platform wallet address for deposits
  const DYPHIRA_WALLET = 'dyphira_platform_wallet_address';
  return sendTransaction(privateKey, DYPHIRA_WALLET, amount);
}

async function handleConnectRequest(tabId, origin, callbackId) {
  if (!currentWallet) {
    return { error: 'No wallet available' };
  }

  try {
    // Create connection request
    const requestId = Date.now().toString();
    
    // Create a promise that will be resolved when the user responds
    const response = await new Promise((resolve) => {
      pendingRequests.set(requestId, {
        type: 'connect',
        origin,
        resolver: resolve,
        callbackId // Store the callback ID
      });

      // Store only the latest request
      chrome.storage.local.set({
        latestRequest: { id: requestId, type: 'connect', origin }
      });

      // Set badge to indicate pending request
      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });

    // Clear badge when request is handled
    chrome.action.setBadgeText({ text: '' });

    if (!response) {
      // Send response back to content script
      chrome.tabs.sendMessage(tabId, {
        type: 'CONNECT_RESPONSE',
        callbackId,
        error: 'User rejected connection'
      });
      return { error: 'User rejected connection' };
    }

    // Add to connected sites if approved
    connectedSites.add(origin);
    
    // Send successful response back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'CONNECT_RESPONSE',
      callbackId,
      address: currentWallet.address
    });
    
    return { address: currentWallet.address };
  } catch (error) {
    console.error('Connection error:', error);
    // Clear badge on error
    chrome.action.setBadgeText({ text: '' });
    
    // Send error response back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'CONNECT_RESPONSE',
      callbackId,
      error: error.message || 'Connection failed'
    });
    
    return { error: error.message || 'Connection failed' };
  } finally {
    // Clear the latest request when done
    chrome.storage.local.remove('latestRequest');
  }
}

async function handleTransactionRequest(tabId, origin, request) {
  if (!connectedSites.has(origin)) {
    return { error: 'Site not connected' };
  }

  if (!currentWallet) {
    return { error: 'No wallet available' };
  }

  // Create popup to request transaction approval
  const approved = await requestApproval(request.requestId, {
    type: 'transaction',
    site: origin,
    to: request.to,
    amount: request.amount
  });

  if (!approved) {
    return { error: 'User rejected transaction' };
  }

  return sendTransaction(currentWallet.privateKey, request.to, request.amount);
}

async function requestApproval(requestId, details) {
  return new Promise((resolve) => {
    // Store request
    pendingRequests.set(requestId, {
      ...details,
      resolver: resolve
    });

    // Store in local storage for persistence
    chrome.storage.local.get(['pendingRequests'], ({ pendingRequests: storedRequests = {} }) => {
      storedRequests[requestId] = details;
      chrome.storage.local.set({ pendingRequests: storedRequests });
    });

    // Notify popup of new request
    chrome.runtime.sendMessage({
      type: 'NEW_CONNECTION_REQUEST',
      requestId,
      request: details
    });

    // Focus or open popup
    chrome.action.openPopup();
  });
} 