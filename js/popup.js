let currentWallet = null;
let requestTemplate = null;
let transactionRequestTemplate = null;

// Track pending requests
let pendingRequests = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  // Store the templates and remove them from DOM
  requestTemplate = document.getElementById('request-template');
  transactionRequestTemplate = document.getElementById('transaction-request-template');
  if (requestTemplate) {
    requestTemplate.remove();
  }
  if (transactionRequestTemplate) {
    transactionRequestTemplate.remove();
  }

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
  // document.getElementById('deposit').addEventListener('click', deposit);

  // Alert close button listener
  document.querySelector('.alert-close')?.addEventListener('click', hideAlert);

  // Check for pending request
  chrome.storage.local.get(['latestRequest'], ({ latestRequest }) => {
    if (latestRequest) {
      if (latestRequest.type === 'connect') {
        showConnectionRequest(latestRequest.id, latestRequest);
      } else if (latestRequest.type === 'transaction') {
        showTransactionRequest(latestRequest.id, latestRequest);
      }
    }
  });
});

function initializeUI() {
  // Initialize the pending requests container
  const requestTemplate = document.getElementById('request-template');
  if (requestTemplate) {
    requestTemplate.remove();
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
  const private_key = document.getElementById('private-key').value.trim();
  if (!private_key) {
    showAlert('Please enter a private key', 'error');
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'IMPORT_WALLET',
    private_key
  });

  if (response.error) {
    showAlert('Failed to import wallet: ' + response.error, 'error');
    return;
  }

  currentWallet = {
    address: response.address,
    private_key: private_key
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

  console.log("currentWallet", currentWallet);

  const response = await chrome.runtime.sendMessage({
    type: 'SEND_TRANSACTION',
    private_key: currentWallet.private_key,
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
    private_key: currentWallet.private_key,
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

function showTransactionRequest(requestId, request) {
  if (!transactionRequestTemplate) {
    console.error('Transaction request template not found');
    return;
  }

  // Hide all main sections
  document.getElementById('wallet-info')?.classList.add('hidden');
  document.getElementById('no-wallet')?.classList.add('hidden');
  
  // Show pending requests section
  const pendingRequestsContainer = document.getElementById('pending-requests');
  if (!pendingRequestsContainer) {
    console.error('Pending requests container not found');
    return;
  }

  // Clear any existing requests
  const existingRequests = pendingRequestsContainer.querySelectorAll('.connection-request:not(#request-template):not(#transaction-request-template)');
  existingRequests.forEach(req => req.remove());
  
  // Show the container
  pendingRequestsContainer.classList.remove('hidden');
  
  // Clone the template
  const requestElement = transactionRequestTemplate.cloneNode(true);
  requestElement.id = `request-${requestId}`;
  requestElement.classList.remove('hidden');
  
  // Set site information
  const siteIcon = requestElement.querySelector('.site-icon');
  const siteName = requestElement.querySelector('.site-name');
  
  // Try to get the site favicon
  siteIcon.src = `https://www.google.com/s2/favicons?domain=${request.site}&sz=32`;
  siteIcon.onerror = () => {
    siteIcon.src = '../images/default-site-icon.png';
  };
  siteName.textContent = request.site;

  // Set transaction details
  requestElement.querySelector('.address-value').textContent = request.to;
  requestElement.querySelector('.amount-value').textContent = `${request.amount} DYP`;

  // Add event listeners to buttons
  const approveButton = requestElement.querySelector('.approve-button');
  const rejectButton = requestElement.querySelector('.reject-button');

  approveButton.addEventListener('click', async () => {
    // Send approval response
    await chrome.runtime.sendMessage({
      type: 'APPROVAL_RESPONSE',
      requestId: requestId,
      approved: true
    });

    // Remove the request element
    requestElement.remove();

    // Show wallet info if no more requests
    if (!pendingRequestsContainer.querySelector('.connection-request:not(.hidden)')) {
      pendingRequestsContainer.classList.add('hidden');
      if (currentWallet) {
        showWalletInfo();
      } else {
        showNoWallet();
      }
    }
  });

  rejectButton.addEventListener('click', async () => {
    // Send rejection response
    await chrome.runtime.sendMessage({
      type: 'APPROVAL_RESPONSE',
      requestId: requestId,
      approved: false
    });

    // Remove the request element
    requestElement.remove();

    // Show wallet info if no more requests
    if (!pendingRequestsContainer.querySelector('.connection-request:not(.hidden)')) {
      pendingRequestsContainer.classList.add('hidden');
      if (currentWallet) {
        showWalletInfo();
      } else {
        showNoWallet();
      }
    }
  });

  // Add the request element to the container
  pendingRequestsContainer.appendChild(requestElement);
}

function showConnectionRequest(requestId, request) {
  if (!requestTemplate) {
    console.error('Request template not found');
    return;
  }

  // Hide all main sections
  document.getElementById('wallet-info')?.classList.add('hidden');
  document.getElementById('no-wallet')?.classList.add('hidden');
  
  // Show pending requests section
  const pendingRequestsContainer = document.getElementById('pending-requests');
  if (!pendingRequestsContainer) {
    console.error('Pending requests container not found');
    return;
  }

  // Clear any existing requests
  const existingRequests = pendingRequestsContainer.querySelectorAll('.connection-request:not(#request-template):not(#transaction-request-template)');
  existingRequests.forEach(req => req.remove());
  
  // Show the container
  pendingRequestsContainer.classList.remove('hidden');
  
  // Clone the template
  const requestElement = requestTemplate.cloneNode(true);
  requestElement.id = `request-${requestId}`;
  requestElement.classList.remove('hidden');
  
  // Set site information
  const siteIcon = requestElement.querySelector('.site-icon');
  const siteName = requestElement.querySelector('.site-name');
  
  // Try to get the site favicon
  siteIcon.src = `https://www.google.com/s2/favicons?domain=${request.origin}&sz=32`;
  siteIcon.onerror = () => {
    siteIcon.src = '../images/default-site-icon.png';
  };
  siteName.textContent = request.origin;

  // Add event listeners to buttons
  const approveButton = requestElement.querySelector('.approve-button');
  const rejectButton = requestElement.querySelector('.reject-button');

  approveButton.addEventListener('click', async () => {
    // Send approval response
    await chrome.runtime.sendMessage({
      type: 'APPROVAL_RESPONSE',
      requestId: requestId,
      approved: true
    });

    // Remove the request element
    requestElement.remove();

    // Show wallet info if no more requests
    if (!pendingRequestsContainer.querySelector('.connection-request:not(.hidden)')) {
      pendingRequestsContainer.classList.add('hidden');
      if (currentWallet) {
        showWalletInfo();
      } else {
        showNoWallet();
      }
    }
  });

  rejectButton.addEventListener('click', async () => {
    // Send rejection response
    await chrome.runtime.sendMessage({
      type: 'APPROVAL_RESPONSE',
      requestId: requestId,
      approved: false
    });

    // Remove the request element
    requestElement.remove();

    // Show wallet info if no more requests
    if (!pendingRequestsContainer.querySelector('.connection-request:not(.hidden)')) {
      pendingRequestsContainer.classList.add('hidden');
      if (currentWallet) {
        showWalletInfo();
      } else {
        showNoWallet();
      }
    }
  });

  // Add the request element to the container
  pendingRequestsContainer.appendChild(requestElement);
}

// Listen for new connection requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CONNECTION_REQUEST') {
    showConnectionRequest(message.requestId, message.request);
  }
}); 