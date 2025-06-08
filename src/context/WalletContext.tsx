/// <reference types="chrome"/>
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useChromeStorageLocal } from 'use-chrome-storage';
import { generateWallet, importFromPrivateKey, importFromMnemonic } from '../utils/wallet';
import { useAuth } from './AuthContext';

interface WalletContextType {
  hasWallet: boolean;
  balance: number;
  address: string | null;
  mnemonic: string[];
  createWallet: () => Promise<void>;
  importWallet: (privateKeyOrMnemonic: string) => Promise<void>;
  sendTransaction: (to: string, amount: string, fee: string) => Promise<{ hash: string }>;
}

interface DecryptedWallet {
  address: string;
  privateKey: string;
  mnemonic: string[];
}

interface EncryptedWallet {
  encryptedData: string;
}

interface BalanceResponse {
  address: string;
  balance: number;
}

const API_URL = 'https://dyphira-chain.fly.dev';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { encryptData, decryptData, isAuthenticated } = useAuth();
  const [storedWallet, setStoredWallet] = useChromeStorageLocal<EncryptedWallet | null>('wallet', null);
  const [storedBalance, setStoredBalance] = useChromeStorageLocal<number>('balance', 0);
  
  // In-memory states (cleared on logout/session expiry)
  const [decryptedWallet, setDecryptedWallet] = useState<DecryptedWallet | null>(null);
  const [localMnemonic, setLocalMnemonic] = useState<string[]>([]);

  // Clear sensitive data when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setDecryptedWallet(null);
      setLocalMnemonic([]);
    } else if (isAuthenticated && storedWallet) {
      // Decrypt wallet data when authenticated
      decryptWalletData();
    }
  }, [isAuthenticated]);

  const decryptWalletData = async () => {
    if (!storedWallet || !isAuthenticated) return;
    
    try {
      const decryptedJson = await decryptData(storedWallet.encryptedData);
      const wallet: DecryptedWallet = JSON.parse(decryptedJson);
      setDecryptedWallet(wallet);
      setLocalMnemonic(wallet.mnemonic);
    } catch (error) {
      console.error('Failed to decrypt wallet data:', error);
      setDecryptedWallet(null);
      setLocalMnemonic([]);
    }
  };

  const encryptAndStoreWallet = async (wallet: DecryptedWallet) => {
    const walletJson = JSON.stringify(wallet);
    const encryptedData = await encryptData(walletJson);
    await setStoredWallet({ encryptedData });
    setDecryptedWallet(wallet);
    setLocalMnemonic(wallet.mnemonic);
  };

  const updateBalance = async (walletAddress: string) => {
    try {
      const response = await fetch(`${API_URL}/balance/${walletAddress}`);
      const data: BalanceResponse = await response.json();
      await setStoredBalance(data.balance);
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  };

  const createWallet = async () => {
    try {
      const newWallet = generateWallet();
      const walletData: DecryptedWallet = {
        address: newWallet.address,
        privateKey: newWallet.privateKey,
        mnemonic: newWallet.mnemonic,
      };
      
      await encryptAndStoreWallet(walletData);
      await updateBalance(newWallet.address);
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  };

  const importWallet = async (privateKeyOrMnemonic: string) => {
    try {
      const words = privateKeyOrMnemonic.trim().split(/\s+/);
      let importedWallet;
      
      if (words.length === 12) {
        importedWallet = importFromMnemonic(words);
        if (!importedWallet) {
          throw new Error('Invalid mnemonic phrase');
        }
      } else {
        importedWallet = importFromPrivateKey(privateKeyOrMnemonic);
      }

      const walletData: DecryptedWallet = {
        address: importedWallet.address,
        privateKey: importedWallet.privateKey,
        mnemonic: importedWallet.mnemonic,
      };
      
      await encryptAndStoreWallet(walletData);
      await updateBalance(importedWallet.address);
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    }
  };

  const sendTransaction = async (to: string, amount: string, fee: string) => {
    try {
      if (!decryptedWallet) {
        throw new Error('No wallet found or wallet is locked');
      }

      // Send transaction using decrypted private key
      const response = await fetch(`${API_URL}/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: decryptedWallet.address,
          to,
          amount: parseFloat(amount),
          fee: parseFloat(fee),
          private_key: decryptedWallet.privateKey
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transaction failed');
      }

      const data = await response.json();
      await updateBalance(decryptedWallet.address);
      return data;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider 
      value={{ 
        hasWallet: !!storedWallet,
        balance: storedBalance,
        address: decryptedWallet?.address || null,
        mnemonic: localMnemonic,
        createWallet,
        importWallet,
        sendTransaction
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 