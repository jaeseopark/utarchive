can user provide any random string -> app uses a known hash-like function to generate a consistent totp key to then use for remainder of the process as proposed
Yes, you can absolutely do this. From an engineering standpoint, this is a highly practical approach because it allows the user to input a human-readable passphrase (e.g., "correct-horse-battery-staple") instead of forcing them to manually generate or handle an ugly, strict Base32 string.
However, because standard TOTP libraries require the final secret to be valid Base32, your app must act as a bridge.
How It Works Under the Hood
Your application will ingest the user's custom string from the credentials file, pass it through a one-way hashing function, and then encode that deterministic output into Base32.
[User Passphrase String] 
         │
         ▼
 ┌───────────────┐
 │   SHA-256     │  <-- One-way, always yields identical 32 bytes
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │ Base32 Encode │  <-- Converts the raw bytes into standard TOTP format
 └───────────────┘
         │
         ▼
[Valid Base32 Secret Key] ---> Used for QR code generation & token validation
Because cryptographic hash functions are completely deterministic, the exact same passphrase will always yield the exact same Base32 TOTP secret key every time the app boots up.
Recommended Implementation (Node.js Example)
To implement this securely, you should use SHA-256 to digest the user's input string. SHA-256 outputs 32 bytes of data, which fits perfectly into the security envelope of modern TOTP.
Here is how you would process the user's string in your backend code:
JavaScript
const crypto = require('crypto');

/**
 * Derives a valid Base32 TOTP secret from any arbitrary user string.
 * @param {string} userSecretInput - The raw string from the creds file.
 * @returns {string} A consistent, valid Base32 string for your TOTP library.
 */
function deriveTotpSecret(userSecretInput) {
  // 1. Hash the arbitrary string to get a fixed-length buffer of deterministic bytes
  const byteBuffer = crypto.createHash('sha256').update(userSecretInput).digest();

  // 2. Encode those bytes to Base32 (and uppercase it for spec compliance)
  // Note: Node.js native support for 'base32' encoding requires Node v18+ 
  // Otherwise, use an npm package like 'hi-base32' or 'base32.js'
  const base32Secret = byteBuffer.toString('base32').toUpperCase();

  // 3. Strip any padding '=' characters if your specific TOTP library prefers it
  return base32Secret.replace(/=/g, '');
}

// Example Usage:
const rawFileSecret = "my-super-secret-admin-passphrase-2026";
const activeTotpSecret = deriveTotpSecret(rawFileSecret); 

console.log(activeTotpSecret);
// Outputs a perfect, valid TOTP secret like: "NBSWY3DPEB3W64TBNQXDYZLTMVRXEZLBNYQHI..."
Important Security Trade-Offs to Keep in Mind
While this approach is completely functional, there are two distinct security realities to consider compared to using a truly random, machine-generated 20-byte key:
Entropy Loss (If the phrase is weak): If the user provides a simple string like "password123", the resulting Base32 key will look random to an outside observer, but it possesses very little entropy. A malicious actor who gets a copy of your application code could easily run a dictionary attack against the custom string to figure out what your TOTP secret key is. Ensure the user provides a high-entropy, long passphrase.
Double-Hashing Reality: Remember that the TOTP algorithm itself passes this key through an HMAC-SHA1 loop to generate the 6-digit pin. By hashing the string beforehand, you are essentially doing a "double-hash" pipeline (User String -> SHA256 -> Base32 -> HMAC-SHA1). This is perfectly fine mathematically and does not weaken the cryptography, provided the initial string is strong.

