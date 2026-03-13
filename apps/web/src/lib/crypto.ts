import CryptoJS from 'crypto-js';

/**
 * Encryption Utilities for Secure localStorage
 * 
 * Security Rationale:
 * - Reduces casual inspection of browser-stored UI state
 * - Uses AES-256 encryption (industry standard symmetric encryption)
 * - Key derivation from user ID ensures consistency across sessions
 * - Anonymous users get basic obfuscation with default key
 *
 * Important limitation:
 * - This is not a meaningful defense against active XSS, because the key is
 *   deterministically derived from data the browser can also read.
 * 
 * Implementation Notes:
 * - Encryption key is deterministic (same user = same key)
 * - No key storage needed - derived on-demand from user ID
 * - Graceful fallback for decryption failures
 * - Size limits prevent CryptoJS memory issues (10MB max)
 */

/**
 * Derives an encryption key from a user ID using SHA-256 hashing
 * 
 * Key Derivation Strategy:
 * - Uses SHA-256 to create deterministic key from user ID
 * - Same user always gets same key across sessions and devices
 * - No separate key storage is needed (derived on-demand)
 * - Anonymous users get default key for basic obfuscation
 * 
 * @param userId - The user ID to derive the key from
 * @returns A deterministic encryption key
 */
export function deriveEncryptionKey(userId: string): string {
  // Use SHA-256 to create a deterministic key from user ID
  // This ensures the same user always gets the same key across sessions
  return CryptoJS.SHA256(userId).toString();
}

/**
 * Encrypts data using AES-256 encryption
 * 
 * @param data - The plain text data to encrypt
 * @param key - The encryption key
 * @returns The encrypted ciphertext
 */
export function encrypt(data: string, key: string): string {
  try {
    // Check data size before encryption (CryptoJS has limits)
    if (data.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error(`Data too large for encryption: ${(data.length / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return CryptoJS.AES.encrypt(data, key).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    if (error instanceof RangeError) {
      throw new Error(`Data size exceeds encryption limits: ${(data.length / 1024 / 1024).toFixed(2)}MB`);
    }
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-256 decryption
 * 
 * @param ciphertext - The encrypted data to decrypt
 * @param key - The encryption key
 * @returns The decrypted plain text, or null if decryption fails
 */
export function decrypt(ciphertext: string, key: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // Empty string is a valid decryption result
    // Only return null if decryption actually failed (bytes are invalid)
    // We can check this by seeing if the bytes object is empty
    if (bytes.sigBytes === 0 && ciphertext.length > 0) {
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Gets the current encryption key based on auth state
 * 
 * For authenticated users: derives key from user ID
 * For anonymous users: uses a default key
 * 
 * @param userId - Optional user ID from auth state
 * @returns The encryption key to use
 */
export function getEncryptionKey(userId?: string | null): string {
  if (userId) {
    return deriveEncryptionKey(userId);
  }
  
  // For anonymous users, use a default key
  // This provides basic obfuscation even when not logged in
  return deriveEncryptionKey('anonymous-user');
}
