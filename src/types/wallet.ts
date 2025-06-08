export interface Transaction {
  from: string;
  to: string;
  amount: string;
  timestamp: number;
}

export interface WalletState {
  address: string;
  balance: string;
  isConnected: boolean;
  transactions: Transaction[];
}

export interface WalletContextType {
  walletState: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTransaction: (to: string, amount: string) => Promise<void>;
} 