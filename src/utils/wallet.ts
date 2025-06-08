import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import * as bip39 from 'bip39';

export interface WalletData {
  address: string;
  privateKey: string;
  mnemonic: string[];
}

function generateMnemonic(): string[] {
  // Generate a random mnemonic (128 bits of entropy = 12 words)
  const mnemonic = bip39.generateMnemonic(128);
  return mnemonic.split(' ');
}

function mnemonicToSeed(mnemonic: string[]): Uint8Array {
  const mnemonicString = mnemonic.join(' ');
  
  // Generate seed using BIP39 standard
  const seed = bip39.mnemonicToSeedSync(mnemonicString);
  
  // Take first 32 bytes as private key
  return new Uint8Array(seed.slice(0, 32));
}

function privateKeyToAddress(privateKey: Uint8Array): string {
  // Get public key
  const publicKey = secp256k1.getPublicKey(privateKey, false);
  
  // Remove the first byte (0x04 prefix)
  const publicKeyWithoutPrefix = publicKey.slice(1);
  
  // Generate Keccak-256 hash
  const hash = keccak_256(publicKeyWithoutPrefix);
  
  // Take last 20 bytes
  const address = Buffer.from(hash.slice(-20)).toString('hex');
  
  return '0x' + address;
}

export function generateWallet(): WalletData {
  // Generate mnemonic
  const mnemonic = generateMnemonic();
  
  // Generate private key from mnemonic
  const privateKeyBytes = mnemonicToSeed(mnemonic);
  
  // Convert private key to hex string
  const privateKey = '0x' + Buffer.from(privateKeyBytes).toString('hex');
  
  // Generate address from private key
  const address = privateKeyToAddress(privateKeyBytes);
  
  return {
    address,
    privateKey,
    mnemonic
  };
}

export function importFromPrivateKey(privateKey: string): WalletData {
  try {
    // Remove '0x' prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Convert to bytes
    const privateKeyBytes = new Uint8Array(Buffer.from(cleanPrivateKey, 'hex'));
    
    // Generate address
    const address = privateKeyToAddress(privateKeyBytes);
    
    return {
      address,
      privateKey: '0x' + cleanPrivateKey,
      mnemonic: [] // Empty for imported wallets
    };
  } catch (error) {
    throw new Error('Invalid private key format');
  }
}

export function validateMnemonic(mnemonic: string[]): boolean {
  return bip39.validateMnemonic(mnemonic.join(' '));
}

export function importFromMnemonic(mnemonic: string[]): WalletData | null {
  const mnemonicString = mnemonic.join(' ');
  
  if (!bip39.validateMnemonic(mnemonicString)) {
    return null;
  }
  
  const privateKeyBytes = mnemonicToSeed(mnemonic);
  const privateKey = '0x' + Buffer.from(privateKeyBytes).toString('hex');
  const address = privateKeyToAddress(privateKeyBytes);
  
  return {
    address,
    privateKey,
    mnemonic
  };
} 