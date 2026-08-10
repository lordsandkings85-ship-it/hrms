import * as crypto from 'crypto';

const GCM_ALGORITHM = 'aes-256-gcm';
const LEGACY_CBC_ALGORITHM = 'aes-256-cbc';
const GCM_IV_LENGTH = 12;
const LEGACY_IV_LENGTH = 16;
const V2_PREFIX = 'v2:';

/**
 * Derives a 32-byte key from ENCRYPTION_KEY. The environment variable is
 * mandatory — there is deliberately no default. A 32-byte value is used
 * verbatim (matching the original key format); anything else is hashed so
 * any sufficiently strong passphrase works.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim() === '') {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. Generate one with: openssl rand -hex 32',
    );
  }
  const normalized = raw.trim();
  if (Buffer.byteLength(normalized, 'utf8') === 32) {
    return Buffer.from(normalized, 'utf8');
  }
  if (Buffer.byteLength(normalized, 'utf8') < 16) {
    throw new Error('ENCRYPTION_KEY must be at least 16 bytes (32 is recommended).');
  }
  return crypto.createHash('sha256').update(normalized).digest();
}

function isEncrypted(text: string): boolean {
  if (text.startsWith(V2_PREFIX)) return true;
  // Legacy CBC format: 32 hex chars IV + ':' + hex ciphertext
  return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
}

/**
 * Encrypts a value with AES-256-GCM using a fresh random nonce (IV) per
 * value. Output format: `v2:<iv hex>:<auth tag hex>:<ciphertext hex>`.
 * Already-encrypted values are returned unchanged.
 */
export function encrypt(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  if (isEncrypted(text)) return text;
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${V2_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM values, legacy AES-256-CBC values, and passes through
 * plaintext values unchanged (so a partial/mixed PII backfill never breaks
 * reads). GCM authentication failures return the original text rather than
 * crashing a read; the backfill/migration path re-encrypts any legacy value.
 */
export function decrypt(text: string | null | undefined): string | null | undefined {
  if (!text) return text;

  if (text.startsWith(V2_PREFIX)) {
    const [ivHex, tagHex, cipherHex] = text.slice(V2_PREFIX.length).split(':');
    if (!ivHex || !tagHex || !cipherHex) return text;
    try {
      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return text;
    }
  }

  // Legacy CBC (pre-rotation rows)
  if (/^[0-9a-f]{32}:[0-9a-f]+$/i.test(text)) {
    const [ivHex, cipherHex] = text.split(':');
    try {
      const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8');
      if (key.length !== LEGACY_IV_LENGTH * 2) return text; // 32-byte key required by legacy cipher
      const decipher = crypto.createDecipheriv(LEGACY_CBC_ALGORITHM, key, Buffer.from(ivHex, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return text;
    }
  }

  return text;
}

const LEGACY_PII_FIELDS = ['aadhaar', 'pan', 'passport', 'drivingLicense', 'uan', 'esic', 'pfNumber', 'bankAccountNumber', 'bankIfsc'];

export function encryptPiiFields(data: any) {
  const res = { ...data };
  for (const field of LEGACY_PII_FIELDS) {
    if (res[field]) res[field] = encrypt(res[field]);
  }
  return res;
}

export function decryptPiiFields(data: any) {
  if (!data) return data;
  const res = { ...data };
  for (const field of LEGACY_PII_FIELDS) {
    if (res[field]) res[field] = decrypt(res[field]);
  }
  return res;
}

/**
 * Extended-info PII lives in the nested Employee* tables. These helpers
 * encrypt/decrypt the sensitive columns so Aadhaar/PAN/bank/immigration data
 * is protected at rest regardless of which table holds it.
 */
const NESTED_PII_MAP: Record<string, string[]> = {
  paymentInfo: ['accountNo', 'ifscCode'],
  adminInfo: ['aadhaarCardNo', 'pfNo', 'uan', 'esiNo', 'gratuityNo'],
  personalInfo: ['panNo', 'drivingLicenseNo'],
  immigrationInfo: ['documentNumber'],
};

export function encryptNestedPii<T extends Record<string, any> | undefined>(record: T, kind: keyof typeof NESTED_PII_MAP): T {
  if (!record) return record;
  const res = { ...record };
  for (const field of NESTED_PII_MAP[kind]) {
    if (res[field]) res[field] = encrypt(res[field]);
  }
  return res;
}

export function decryptNestedPii<T extends Record<string, any> | undefined>(record: T, kind: keyof typeof NESTED_PII_MAP): T {
  if (!record) return record;
  const res = { ...record };
  for (const field of NESTED_PII_MAP[kind]) {
    if (res[field]) res[field] = decrypt(res[field]);
  }
  return res;
}

/** Convenience: encrypt all nested PII in an employee detail payload at write time. */
export function encryptEmployeeNested(data: any) {
  const res = { ...data };
  if (res.paymentInfo) res.paymentInfo = encryptNestedPii(res.paymentInfo, 'paymentInfo');
  if (res.adminInfo) res.adminInfo = encryptNestedPii(res.adminInfo, 'adminInfo');
  if (res.personalInfo) res.personalInfo = encryptNestedPii(res.personalInfo, 'personalInfo');
  return res;
}

/** Convenience: decrypt all nested PII in an employee detail payload at read time. */
export function decryptEmployeeNested(data: any) {
  const res = { ...data };
  if (res.paymentInfo) res.paymentInfo = decryptNestedPii(res.paymentInfo, 'paymentInfo');
  if (res.adminInfo) res.adminInfo = decryptNestedPii(res.adminInfo, 'adminInfo');
  if (res.personalInfo) res.personalInfo = decryptNestedPii(res.personalInfo, 'personalInfo');
  if (Array.isArray(res.immigrations)) {
    res.immigrations = res.immigrations.map((i: any) => decryptNestedPii(i, 'immigrationInfo'));
  }
  return res;
}
