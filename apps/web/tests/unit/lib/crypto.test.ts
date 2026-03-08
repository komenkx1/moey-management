import { describe, it, expect } from "vitest";
import { encrypt, decrypt, deriveEncryptionKey, getEncryptionKey } from "@/lib/crypto";

describe("Crypto Utilities", () => {
  describe("deriveEncryptionKey", () => {
    it("should generate consistent keys for the same user ID", () => {
      const userId = "user-123";
      const key1 = deriveEncryptionKey(userId);
      const key2 = deriveEncryptionKey(userId);
      
      expect(key1).toBe(key2);
      expect(key1).toBeTruthy();
      expect(key1.length).toBeGreaterThan(0);
    });

    it("should generate different keys for different user IDs", () => {
      const key1 = deriveEncryptionKey("user-123");
      const key2 = deriveEncryptionKey("user-456");
      
      expect(key1).not.toBe(key2);
    });

    it("should handle empty string", () => {
      const key = deriveEncryptionKey("");
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt data successfully", () => {
      const plaintext = "Hello, World!";
      const key = "test-encryption-key";
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^U2FsdGVkX1/); // CryptoJS encrypted format
      expect(decrypted).toBe(plaintext);
    });

    it("should handle JSON data", () => {
      const data = { userName: "Test", preferences: { theme: "dark" } };
      const plaintext = JSON.stringify(data);
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
      
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        expect(parsed.userName).toBe("Test");
        expect(parsed.preferences.theme).toBe("dark");
      }
    });

    it("should handle empty string", () => {
      const plaintext = "";
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      // Empty string encryption may return null or empty string depending on crypto-js behavior
      // Both are acceptable for empty input
      expect(decrypted === plaintext || decrypted === null).toBe(true);
    });

    it("should handle special characters", () => {
      const plaintext = "Special: !@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", () => {
      const plaintext = "Unicode: 你好世界 🌍 مرحبا";
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should return null or empty string for invalid ciphertext", () => {
      const invalidCiphertext = "not-a-valid-encrypted-string";
      const key = "test-key";
      
      const decrypted = decrypt(invalidCiphertext, key);
      
      // Invalid ciphertext should return null or empty string
      expect(decrypted === null || decrypted === "").toBe(true);
    });

    it("should return null or empty string when decrypting with wrong key", () => {
      const plaintext = "Secret data";
      const correctKey = "correct-key";
      const wrongKey = "wrong-key";
      
      const encrypted = encrypt(plaintext, correctKey);
      const decrypted = decrypt(encrypted, wrongKey);
      
      // Decryption with wrong key should fail (return null or empty string)
      expect(decrypted === null || decrypted === "").toBe(true);
      // Should NOT return the original plaintext
      expect(decrypted).not.toBe(plaintext);
    });

    it("should handle large data", () => {
      const largeData = "x".repeat(10000);
      const key = "test-key";
      
      const encrypted = encrypt(largeData, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(largeData);
    });
  });

  describe("getEncryptionKey", () => {
    it("should return user-specific key when userId is provided", () => {
      const userId = "user-123";
      const key = getEncryptionKey(userId);
      const expectedKey = deriveEncryptionKey(userId);
      
      expect(key).toBe(expectedKey);
    });

    it("should return anonymous key when userId is null", () => {
      const key = getEncryptionKey(null);
      const anonymousKey = deriveEncryptionKey("anonymous-user");
      
      expect(key).toBe(anonymousKey);
    });

    it("should return anonymous key when userId is undefined", () => {
      const key = getEncryptionKey(undefined);
      const anonymousKey = deriveEncryptionKey("anonymous-user");
      
      expect(key).toBe(anonymousKey);
    });

    it("should return anonymous key when userId is empty string", () => {
      const key = getEncryptionKey("");
      const anonymousKey = deriveEncryptionKey("anonymous-user");
      
      expect(key).toBe(anonymousKey);
    });
  });

  describe("Encryption format", () => {
    it("should produce CryptoJS-compatible encrypted format", () => {
      const plaintext = "test data";
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      
      // CryptoJS AES encryption produces base64 strings starting with "U2FsdGVkX1"
      expect(encrypted).toMatch(/^U2FsdGVkX1/);
    });

    it("should not contain plaintext in encrypted output", () => {
      const plaintext = "sensitive-data-12345";
      const key = "test-key";
      
      const encrypted = encrypt(plaintext, key);
      
      expect(encrypted).not.toContain("sensitive");
      expect(encrypted).not.toContain("12345");
    });
  });

  describe("Performance", () => {
    it("should encrypt and decrypt within acceptable time", () => {
      const plaintext = JSON.stringify({ userName: "Test", data: "x".repeat(1000) });
      const key = "test-key";
      
      const startTime = performance.now();
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Should complete in less than 5ms for typical data
      expect(duration).toBeLessThan(5);
      expect(decrypted).toBe(plaintext);
    });
  });
});
