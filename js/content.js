// Inject Dyphira wallet provider
window.dyphiraWallet = {
  isConnected: false,
  address: null,

  async connect() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CONNECT_WALLET' });
      if (response.error) {
        throw new Error(response.error);
      }
      this.isConnected = true;
      this.address = response.address;
      return { address: response.address };
    } catch (error) {
      throw new Error('Failed to connect wallet: ' + error.message);
    }
  },

  async sendTransaction(to, amount) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REQUEST_TRANSACTION',
        to,
        amount
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    } catch (error) {
      throw new Error('Transaction failed: ' + error.message);
    }
  },

  async getBalance() {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BALANCE' });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.balance;
    } catch (error) {
      throw new Error('Failed to get balance: ' + error.message);
    }
  }
};

// Dispatch event to notify websites that Dyphira wallet is available
window.dispatchEvent(new Event('dyphiraWalletLoaded')); 