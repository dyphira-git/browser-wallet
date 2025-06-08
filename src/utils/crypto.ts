// Constants
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

// Convert string to Uint8Array
const str2ab = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

// Convert Uint8Array to string
const ab2str = (buf: ArrayBuffer): string => {
  return new TextDecoder().decode(buf);
};

// Convert ArrayBuffer to hex string
const buf2hex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert hex string to Uint8Array
const hex2buf = (hex: string): Uint8Array => {
  const pairs = hex.match(/[\dA-F]{2}/gi) || [];
  return new Uint8Array(pairs.map(s => parseInt(s, 16)));
};

// Generate a random salt
const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
};

// Generate a random IV
const generateIV = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
};

// Derive key from password and salt
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const passwordBuffer = str2ab(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    importedKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt data
export const encrypt = async (data: string, password: string): Promise<string> => {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    str2ab(data)
  );

  // Combine salt, IV, and encrypted data
  return [
    buf2hex(salt),
    buf2hex(iv),
    buf2hex(encrypted)
  ].join(':');
};

// Decrypt data
export const decrypt = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const [saltHex, ivHex, dataHex] = encryptedData.split(':');
    
    const salt = hex2buf(saltHex);
    const iv = hex2buf(ivHex);
    const data = hex2buf(dataHex);
    
    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );

    return ab2str(decrypted);
  } catch (error) {
    throw new Error('Decryption failed. Invalid password or corrupted data.');
  }
};

// Hash password for storage
export const hashPassword = async (password: string): Promise<string> => {
  const salt = generateSalt();
  const passwordBuffer = str2ab(password);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    importedKey,
    KEY_LENGTH
  );

  return `${buf2hex(salt)}:${buf2hex(derived)}`;
};

// Verify password
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = hex2buf(saltHex);
  const hash = hex2buf(hashHex);
  
  const passwordBuffer = str2ab(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    importedKey,
    KEY_LENGTH
  );

  // Compare the hashes
  const derivedArray = new Uint8Array(derived);
  const hashArray = new Uint8Array(hash);
  
  if (derivedArray.length !== hashArray.length) return false;
  
  return derivedArray.every((byte, i) => byte === hashArray[i]);
}; 