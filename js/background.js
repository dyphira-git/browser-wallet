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
      handleConnectRequest(sender.tab?.id, sender.origin).then(sendResponse);
      return true;

    case 'REQUEST_TRANSACTION':
      handleTransactionRequest(sender.tab?.id, sender.origin, request).then(sendResponse);
      return true;

    case 'APPROVAL_RESPONSE':
      const pendingRequest = pendingRequests.get(request.requestId);
      if (pendingRequest) {
        const { resolver } = pendingRequest;
        if (resolver) {
          resolver(request.approved);
        }
        pendingRequests.delete(request.requestId);
        
        // Update storage
        chrome.storage.local.get(['pendingRequests'], ({ pendingRequests: storedRequests }) => {
          if (storedRequests) {
            delete storedRequests[request.requestId];
            chrome.storage.local.set({ pendingRequests: storedRequests });
          }
        });
      }
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

async function handleConnectRequest(tabId, origin) {
  if (!currentWallet) {
    return { error: 'No wallet available' };
  }

  try {
    // Create connection request
    const requestId = Date.now().toString();
    const approved = await requestApproval(requestId, {
      type: 'connect',
      origin
    });

    if (!approved) {
      return { error: 'User rejected connection' };
    }

    connectedSites.add(origin);
    return { address: currentWallet.address };
  } catch (error) {
    return { error: error.message || 'Connection failed' };
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