document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const site = params.get('site');

  // Try to get the site favicon
  const siteUrl = new URL(site);
  const iconUrl = `${siteUrl.origin}/favicon.ico`;

  if (type === 'connect') {
    document.getElementById('connect-request').classList.remove('hidden');
    document.getElementById('site-name').textContent = site;
    document.getElementById('site-icon').src = iconUrl;
  } else if (type === 'transaction') {
    document.getElementById('transaction-request').classList.remove('hidden');
    document.getElementById('tx-site-name').textContent = site;
    document.getElementById('tx-site-icon').src = iconUrl;
    document.getElementById('tx-to').textContent = truncateAddress(params.get('to'));
    document.getElementById('tx-amount').textContent = `${params.get('amount')} DYP`;
  }

  const approveButton = document.getElementById('approve');
  const rejectButton = document.getElementById('reject');

  function disableButtons() {
    approveButton.disabled = true;
    rejectButton.disabled = true;
  }

  async function sendResponseAndClose(approved) {
    disableButtons();
    try {
      await chrome.runtime.sendMessage({
        type: 'APPROVAL_RESPONSE',
        windowId: chrome.windows.WINDOW_ID_CURRENT,
        approved
      });
      window.close();
    } catch (error) {
      console.error('Failed to send response:', error);
      // Re-enable buttons if sending fails
      approveButton.disabled = false;
      rejectButton.disabled = false;
    }
  }

  approveButton.addEventListener('click', () => {
    approveButton.textContent = 'Approving...';
    sendResponseAndClose(true);
  });

  rejectButton.addEventListener('click', () => {
    rejectButton.textContent = 'Rejecting...';
    sendResponseAndClose(false);
  });
});

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
} 