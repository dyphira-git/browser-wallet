// Create a unique callback ID generator
let callbackId = 1;
const callbacks = new Map();

// Define the wallet interface
window.dyphiraWallet = {
  isConnected: false,
  address: null,

  async connect() {
    if (this.isConnected) {
      return { address: this.address };
    }

    let timeoutId;
    try {
      const result = await Promise.race([
        new Promise((resolve, reject) => {
          const id = callbackId++;
          
          timeoutId = setTimeout(() => {
            callbacks.delete(id);
            reject(new Error('Connection request timed out'));
          }, 30000);

          callbacks.set(id, {
            resolve: (response) => {
              clearTimeout(timeoutId);
              resolve(response);
            },
            reject: (error) => {
              clearTimeout(timeoutId);
              reject(error);
            }
          });

          window.postMessage({
            type: 'DYPHIRA_CONNECT',
            detail: { callbackId: id }
          }, '*');
        })
      ]);

      if (result.address) {
        this.isConnected = true;
        this.address = result.address;
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  },

  async disconnect() {
    if (!this.isConnected) {
      return { success: true };
    }

    let timeoutId;
    try {
      const result = await Promise.race([
        new Promise((resolve, reject) => {
          const id = callbackId++;
          
          timeoutId = setTimeout(() => {
            callbacks.delete(id);
            reject(new Error('Disconnect request timed out'));
          }, 30000);

          callbacks.set(id, {
            resolve: (response) => {
              clearTimeout(timeoutId);
              resolve(response);
            },
            reject: (error) => {
              clearTimeout(timeoutId);
              reject(error);
            }
          });

          window.postMessage({
            type: 'DYPHIRA_DISCONNECT',
            detail: { callbackId: id }
          }, '*');
        })
      ]);

      if (result.success) {
        this.isConnected = false;
        this.address = null;
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  },

  async sendTransaction(to, amount, fee) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    return new Promise((resolve, reject) => {
      const id = callbackId++;
      const timeoutId = setTimeout(() => {
        callbacks.delete(id);
        reject(new Error('Transaction request timed out'));
      }, 30000);

      callbacks.set(id, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      window.postMessage({
        type: 'DYPHIRA_SEND_TRANSACTION',
        detail: {
          callbackId: id,
          to,
          amount,
          fee
        }
      }, '*');
    });
  },

  async getBalance() {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    return new Promise((resolve, reject) => {
      const id = callbackId++;
      const timeoutId = setTimeout(() => {
        callbacks.delete(id);
        reject(new Error('Balance request timed out'));
      }, 30000);

      callbacks.set(id, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      window.postMessage({
        type: 'DYPHIRA_GET_BALANCE',
        detail: { callbackId: id }
      }, '*');
    });
  }
};

// Handle responses from the content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const { type, callbackId, response } = event.data;

  if (type === 'DYPHIRA_CALLBACK' && callbacks.has(callbackId)) {
    const { resolve, reject } = callbacks.get(callbackId);
    callbacks.delete(callbackId);

    if (response.error) {
      reject(new Error(response.error));
    } else {
      resolve(response);
    }
  }
});

// Notify that the wallet is available
window.dispatchEvent(new Event('dyphiraWalletLoaded')); 