import * as crypto from 'crypto';
import { encrypt, decrypt, encryptPiiFields, decryptPiiFields, encryptNestedPii, decryptNestedPii } from './crypto.util';

describe('crypto.util', () => {
  const originalKey = process.env.ENCRYPTION_KEY;
  const testKey = '0123456789abcdef0123456789abcdef'; // 32 bytes

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
  });

  it('encrypts and decrypts with AES-256-GCM', () => {
    const cipher = encrypt('PAN: ABCDE1234F');
    expect(cipher).toMatch(/^v2:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(decrypt(cipher)).toBe('PAN: ABCDE1234F');
  });

  it('uses a unique IV per encryption', () => {
    const a = encrypt('same-value');
    const b = encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('does not double-encrypt already encrypted values', () => {
    const once = encrypt('value')!;
    const twice = encrypt(once);
    expect(twice).toBe(once);
    expect(decrypt(once)).toBe('value');
  });

  it('passes through plaintext and empty values', () => {
    expect(decrypt('plaintext')).toBe('plaintext');
    expect(encrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeUndefined();
    expect(decrypt('')).toBe('');
  });

  it('returns the ciphertext as-is when GCM authentication fails', () => {
    const cipher = encrypt('secret')!;
    const parts = cipher.split(':');
    const tampered = `${parts[0]}:${parts[1]}:00${parts[2].slice(2)}`;
    expect(decrypt(tampered)).toBe(tampered);
  });

  it('decrypts legacy AES-256-CBC rows (pre-rotation format)', () => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(testKey), iv);
    const encrypted = Buffer.concat([cipher.update('legacy-aadhaar', 'utf8'), cipher.final()]);
    const legacy = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    expect(decrypt(legacy)).toBe('legacy-aadhaar');
  });

  it('encrypts and decrypts top-level PII fields', () => {
    const data = { aadhaar: '123456789012', pan: 'ABCDE1234F', name: 'Plain' };
    const enc = encryptPiiFields(data);
    expect(enc.aadhaar).not.toBe(data.aadhaar);
    expect(enc.name).toBe('Plain');
    const dec = decryptPiiFields(enc);
    expect(dec.aadhaar).toBe(data.aadhaar);
    expect(dec.pan).toBe(data.pan);
  });

  it('encrypts and decrypts nested PII (payment info)', () => {
    const info = { bankName: 'SBI', accountNo: '32599748671', ifscCode: 'sbin0012932' };
    const enc = encryptNestedPii(info, 'paymentInfo');
    expect(enc.accountNo).toMatch(/^v2:/);
    expect(enc.bankName).toBe('SBI');
    const dec = decryptNestedPii(enc, 'paymentInfo');
    expect(dec.accountNo).toBe('32599748671');
    expect(dec.ifscCode).toBe('sbin0012932');
  });
});
