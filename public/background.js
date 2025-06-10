// Keep track of connected sites and pending requests
let connectedSites = new Set();
let pendingRequests = new Map();

const API_URL = 'https://dyphira-chain.fly.dev';

// Helper functions for crypto operations
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function ab2str(buf) {
  const decoder = new TextDecoder();
  return decoder.decode(buf);
}

function hex2buf(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Function to check if session is valid
async function getValidSession() {
  const result = await chrome.storage.session.get(['session']);
  if (!result.session) return null;
  
  const { expiresAt, masterKey } = result.session;
  if (Date.now() > expiresAt) {
    await chrome.storage.session.remove(['session']);
    return null;
  }
  
  return masterKey;
}

// Function to decrypt wallet data
async function decryptWalletData(encryptedData, password) {
  try {
    const [saltHex, ivHex, dataHex] = encryptedData.split(':');
    
    const salt = hex2buf(saltHex);
    const iv = hex2buf(ivHex);
    const data = hex2buf(dataHex);
    
    // Derive the key from password
    const passwordBuffer = str2ab(password);
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );

    return JSON.parse(ab2str(decrypted));
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt wallet data');
  }
}

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
          password: request.password,
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
    // Get the encrypted wallet data
    const result = await chrome.storage.local.get(['wallet']);
    if (!result.wallet || !result.wallet.encryptedData) {
      throw new Error('No wallet found');
    }

    // Check for valid session first
    const sessionPassword = await getValidSession();
    const requestId = Date.now().toString();

    // Always show approval UI, but include session info if available
    const response = await new Promise((resolve) => {
      pendingRequests.set(requestId, {
        type: 'connect',
        origin,
        resolver: resolve,
        callbackId,
        hasSession: !!sessionPassword
      });

      chrome.storage.local.set({
        latestRequest: { 
          id: requestId, 
          type: 'connect', 
          origin,
          hasSession: !!sessionPassword
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

    // If we have a session, use the session password, otherwise use the provided password
    const password = sessionPassword || response.password;
    if (!password) {
      throw new Error('No password provided');
    }

    // Try to decrypt the wallet with the password
    try {
      const wallet = await decryptWalletData(result.wallet.encryptedData, password);
      if (!wallet || !wallet.address) {
        throw new Error('Invalid wallet data');
      }

      connectedSites.add(origin);
      // Store connected address for the site
      const connectedAddresses = (await chrome.storage.local.get(['connectedAddresses'])).connectedAddresses || {};
      connectedAddresses[origin] = wallet.address;
      await chrome.storage.local.set({ 
        connectedSites: Array.from(connectedSites),
        connectedAddresses
      });
      
      // Send successful response with address
      const successResponse = { address: wallet.address };
      chrome.tabs.sendMessage(tabId, {
        type: 'CONNECT_RESPONSE',
        callbackId,
        ...successResponse
      });
      
      return successResponse;
    } catch (error) {
      console.error('Decryption error:', error);
      chrome.tabs.sendMessage(tabId, {
        type: 'CONNECT_RESPONSE',
        callbackId,
        error: 'Invalid password'
      });
      return { error: 'Invalid password' };
    }
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
    
    // Check for valid session first
    const sessionPassword = await getValidSession();
    if (sessionPassword) {
      // Get wallet data
      const result = await chrome.storage.local.get(['wallet']);
      if (!result.wallet || !result.wallet.encryptedData) {
        throw new Error('No wallet found');
      }

      try {
        // Try to decrypt with session password
        await decryptWalletData(result.wallet.encryptedData, sessionPassword);
        // If decryption successful, auto-approve the transaction
        return { success: true };
      } catch (error) {
        console.error('Session decryption failed:', error);
        // If session decryption fails, continue with normal flow
      }
    }

    // If no valid session or session decryption failed, proceed with normal flow
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
    const result = await chrome.storage.local.get(['connectedAddresses']);
    const addresses = result.connectedAddresses || {};
    const address = addresses[origin];
    
    if (!address) {
      return { error: 'No address found for this site' };
    }

    // Get balance from API
    const response = await fetch(`${API_URL}/balance/${address}`);
    if (!response.ok) {
      throw new Error('Failed to fetch balance from server');
    }
    const data = await response.json();
    
    return { balance: data.balance };
  } catch (error) {
    console.error('Balance error:', error);
    return { error: error.message || 'Failed to get balance' };
  }
}

async function disconnectSite(origin) {
  connectedSites.delete(origin);
  
  // Remove the stored address for this site
  const result = await chrome.storage.local.get(['connectedAddresses']);
  const connectedAddresses = result.connectedAddresses || {};
  delete connectedAddresses[origin];
  
  await chrome.storage.local.set({ 
    connectedSites: Array.from(connectedSites),
    connectedAddresses
  });
  
  return true;
} 