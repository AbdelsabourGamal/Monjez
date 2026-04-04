
import CryptoJS from 'crypto-js';

// In a production environment, this key should be more complex or environment-based.
// For client-side only apps, this provides "at-rest" protection against casual snooping.
const SECRET_KEY = "mashhor-quote-secure-vault-key-v1";

export const secureSetItem = (key: string, value: any) => {
    try {
        const stringValue = JSON.stringify(value);
        const encrypted = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
        localStorage.setItem(key, encrypted);
    } catch (error) {
        console.error("Error encrypting data", error);
    }
};

export const secureGetItem = (key: string) => {
    try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        // Try to decrypt
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decrypted) {
                // If decryption yields empty string, it might be old unencrypted data
                // Attempt to parse original value to see if it's valid JSON
                return JSON.parse(encrypted);
            }
            
            return JSON.parse(decrypted);
        } catch (e) {
            // Fallback: If decryption fails, assume it's legacy unencrypted data
            // This ensures migration doesn't break the app for existing users
            return JSON.parse(encrypted);
        }
    } catch (error) {
        console.error("Error retrieving/decrypting data", error);
        return null;
    }
};

export const secureRemoveItem = (key: string) => {
    localStorage.removeItem(key);
};

// PIN Management
const PIN_KEY = 'mashhor-app-pin-hash';

export const hasPinSetup = (): boolean => {
    return !!localStorage.getItem(PIN_KEY);
};

export const verifyPin = (pin: string): boolean => {
    const storedHash = localStorage.getItem(PIN_KEY);
    if (!storedHash) return false;
    const inputHash = CryptoJS.SHA256(pin).toString();
    return inputHash === storedHash;
};

export const setAppPin = (pin: string) => {
    const hash = CryptoJS.SHA256(pin).toString();
    localStorage.setItem(PIN_KEY, hash);
};
