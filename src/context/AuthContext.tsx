import React, { createContext, useContext, useState, useEffect } from 'react';
import { useChromeStorageLocal, useChromeStorageSession } from 'use-chrome-storage';
import { hashPassword, verifyPassword, encrypt, decrypt } from '../utils/crypto';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  setInitialPassword: (password: string) => Promise<void>;
  hasPassword: boolean;
  encryptData: (data: string) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<string>;
}

interface SessionData {
  expiresAt: number;
  masterKey: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedPasswordHash, setStoredPasswordHash] = useChromeStorageLocal<string | null>('walletPasswordHash', null);
  const [storedSession, setStoredSession] = useChromeStorageSession<SessionData | null>('session', null);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check session status on mount and when storage changes
  useEffect(() => {
    const checkSession = async () => {
      if (!storedSession) {
        setIsAuthenticated(false);
        setMasterKey(null);
        return;
      }

      const now = Date.now();
      if (now > storedSession.expiresAt) {
        // Session expired
        setStoredSession(null);
        setIsAuthenticated(false);
        setMasterKey(null);
      } else {
        // Valid session
        setIsAuthenticated(true);
        setMasterKey(storedSession.masterKey);
        
        // Set up new timeout for this session
        const timeLeft = storedSession.expiresAt - now;
        setTimeout(() => {
          setStoredSession(null);
          setIsAuthenticated(false);
          setMasterKey(null);
        }, timeLeft);
      }
    };

    checkSession();

    // Listen for storage changes from other windows/tabs
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.session) {
        checkSession();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storedSession]);

  const createSession = (key: string) => {
    const sessionData: SessionData = {
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      masterKey: key
    };
    setStoredSession(sessionData);
    setIsAuthenticated(true);
    setMasterKey(key);
  };

  const login = async (password: string): Promise<boolean> => {
    if (!storedPasswordHash) return false;
    
    const isValid = await verifyPassword(password, storedPasswordHash);
    if (isValid) {
      createSession(password);
      return true;
    }
    return false;
  };

  const logout = async () => {
    setStoredSession(null);
    setIsAuthenticated(false);
    setMasterKey(null);
  };

  const setInitialPassword = async (password: string) => {
    const hashedPassword = await hashPassword(password);
    setStoredPasswordHash(hashedPassword);
    createSession(password);
  };

  const encryptData = async (data: string): Promise<string> => {
    if (!masterKey) {
      throw new Error('Not authenticated');
    }
    return encrypt(data, masterKey);
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    if (!masterKey) {
      throw new Error('Not authenticated');
    }
    return decrypt(encryptedData, masterKey);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        setInitialPassword,
        hasPassword: storedPasswordHash !== null,
        encryptData,
        decryptData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 