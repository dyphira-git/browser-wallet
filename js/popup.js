let currentWallet = null;

// Track pending requests
let pendingRequests = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  // Load wallet from storage
  chrome.storage.local.get(['wallet'], ({ wallet }) => {
    if (wallet) {
      currentWallet = wallet;
      showWalletInfo();
      updateBalance();
    } else {
      showNoWallet();
    }
  });

  // Event listeners
  document.getElementById('create-wallet').addEventListener('click', createWallet);
  document.getElementById('import-wallet').addEventListener('click', showImportSection);
  document.getElementById('confirm-import').addEventListener('click', importWallet);
  document.getElementById('copy-address').addEventListener('click', copyAddress);
  document.getElementById('send-transaction').addEventListener('click', sendTransaction);
  document.getElementById('deposit').addEventListener('click', deposit);

  // Alert close button listener
  document.querySelector('.alert-close').addEventListener('click', hideAlert);

  // Initialize UI
  initializeUI();
  
  // Check for pending requests
  chrome.storage.local.get(['pendingRequests'], ({ pendingRequests: storedRequests }) => {
    if (storedRequests) {
      Object.entries(storedRequests).forEach(([id, request]) => {
        addConnectionRequest(id, request);
      });
    }
  });
});

function initializeUI() {
  // Initialize the pending requests container
  const requestTemplate = document.getElementById('request-template');
  if (requestTemplate) {
    requestTemplate.remove(); // Remove template from DOM
  }
}

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function showWalletInfo() {
  document.getElementById('no-wallet').classList.add('hidden');
  document.getElementById('wallet-info').classList.remove('hidden');
  const addressElement = document.getElementById('address');
  addressElement.textContent = truncateAddress(currentWallet.address);
  // Store full address as a data attribute for copying
  addressElement.dataset.fullAddress = currentWallet.address;
}

function showNoWallet() {
  document.getElementById('wallet-info').classList.add('hidden');
  document.getElementById('no-wallet').classList.remove('hidden');
}

function showImportSection() {
  document.getElementById('import-section').classList.remove('hidden');
}

function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');
  const alert = alertContainer.querySelector('.alert');
  const messageElement = alertContainer.querySelector('.alert-message');

  messageElement.textContent = message;
  alert.className = 'alert ' + type;
  alertContainer.classList.remove('hidden');

  // Auto hide after 3 seconds
  setTimeout(hideAlert, 3000);
}

function hideAlert() {
  const alertContainer = document.getElementById('alert-container');
  alertContainer.classList.add('hidden');
}

async function createWallet() {
  const response = await chrome.runtime.sendMessage({ type: 'CREATE_WALLET' });
  
  if (response.error) {
    showAlert('Failed to create wallet: ' + response.error, 'error');
    return;
  }

  currentWallet = response;
  chrome.storage.local.set({ wallet: currentWallet });
  showWalletInfo();
  updateBalance();
}

async function importWallet() {
  const privateKey = document.getElementById('private-key').value.trim();
  if (!privateKey) {
    showAlert('Please enter a private key', 'error');
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'IMPORT_WALLET',
    privateKey
  });

  if (response.error) {
    showAlert('Failed to import wallet: ' + response.error, 'error');
    return;
  }

  currentWallet = {
    address: response.address,
    privateKey: privateKey
  };
  
  chrome.storage.local.set({ wallet: currentWallet });
  showWalletInfo();
  updateBalance();
  showAlert('Wallet imported successfully');
}

async function updateBalance() {
  const response = await chrome.runtime.sendMessage({
    type: 'GET_BALANCE',
    address: currentWallet.address
  });

  if (response.error) {
    document.getElementById('balance').textContent = 'Error loading balance';
    return;
  }

  document.getElementById('balance').textContent = `${response.balance} DYP`;
}

async function sendTransaction() {
  const to = document.getElementById('recipient').value.trim();
  const amount = document.getElementById('amount').value;

  if (!to || !amount) {
    showAlert('Please fill in all fields', 'error');
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'SEND_TRANSACTION',
    privateKey: currentWallet.privateKey,
    to,
    amount
  });

  if (response.error) {
    showAlert('Transaction failed: ' + response.error, 'error');
    return;
  }

  showAlert('Transaction successful!');
  updateBalance();
}

async function deposit() {
  const amount = document.getElementById('deposit-amount').value;

  if (!amount) {
    showAlert('Please enter an amount', 'error');
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'DEPOSIT',
    privateKey: currentWallet.privateKey,
    amount
  });

  if (response.error) {
    showAlert('Deposit failed: ' + response.error, 'error');
    return;
  }

  showAlert('Deposit successful!');
  updateBalance();
}

function copyAddress() {
  const addressElement = document.getElementById('address');
  const fullAddress = addressElement.dataset.fullAddress;
  navigator.clipboard.writeText(fullAddress);
  const button = document.getElementById('copy-address');
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  setTimeout(() => {
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
  }, 2000);
}

// Handle connection request
function addConnectionRequest(requestId, request) {
  const pendingRequestsContainer = document.getElementById('pending-requests');
  const template = document.getElementById('request-template');
  
  // If this is the first request, show the container
  if (pendingRequests.size === 0) {
    pendingRequestsContainer.classList.remove('hidden');
  }
  
  // Create new request element
  const requestElement = template.cloneNode(true);
  requestElement.id = `request-${requestId}`;
  requestElement.classList.remove('hidden');
  
  // Set site information
  const siteIcon = requestElement.querySelector('.site-icon');
  const siteName = requestElement.querySelector('.site-name');
  siteIcon.src = `${request.origin}/favicon.ico`;
  siteName.textContent = request.origin;
  
  // Add event listeners to buttons
  const approveButton = requestElement.querySelector('.approve-button');
  const rejectButton = requestElement.querySelector('.reject-button');
  
  approveButton.addEventListener('click', () => handleResponse(requestId, true));
  rejectButton.addEventListener('click', () => handleResponse(requestId, false));
  
  // Add to pending requests
  pendingRequests.set(requestId, {
    element: requestElement,
    request
  });
  
  // Add to DOM
  pendingRequestsContainer.appendChild(requestElement);
}

async function handleResponse(requestId, approved) {
  const { element, request } = pendingRequests.get(requestId);
  
  // Disable buttons
  const buttons = element.querySelectorAll('button');
  buttons.forEach(button => button.disabled = true);
  
  try {
    // Send response
    await chrome.runtime.sendMessage({
      type: 'APPROVAL_RESPONSE',
      requestId,
      approved
    });
    
    // Remove request
    element.remove();
    pendingRequests.delete(requestId);
    
    // Hide container if no more requests
    if (pendingRequests.size === 0) {
      document.getElementById('pending-requests').classList.add('hidden');
    }
    
    // Update storage
    const { pendingRequests: storedRequests } = await chrome.storage.local.get(['pendingRequests']);
    if (storedRequests) {
      delete storedRequests[requestId];
      await chrome.storage.local.set({ pendingRequests: storedRequests });
    }
  } catch (error) {
    console.error('Failed to handle response:', error);
    // Re-enable buttons on error
    buttons.forEach(button => button.disabled = false);
  }
}

// Listen for new connection requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CONNECTION_REQUEST') {
    addConnectionRequest(message.requestId, message.request);
    sendResponse({ received: true });
  }
}); 