import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 
const IV_LENGTH = 16;

export function encrypt(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  const textParts = text.split(':');
  if (textParts.length !== 2) return text;
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  try {
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

export function encryptPiiFields(data: any) {
  const piiFields = ['aadhaar', 'pan', 'passport', 'drivingLicense', 'uan', 'esic', 'pfNumber', 'bankAccountNumber', 'bankIfsc'];
  const res = { ...data };
  for (const field of piiFields) {
    if (res[field]) {
      res[field] = encrypt(res[field]);
    }
  }
  return res;
}

export function decryptPiiFields(data: any) {
  if (!data) return data;
  const piiFields = ['aadhaar', 'pan', 'passport', 'drivingLicense', 'uan', 'esic', 'pfNumber', 'bankAccountNumber', 'bankIfsc'];
  const res = { ...data };
  for (const field of piiFields) {
    if (res[field]) {
      res[field] = decrypt(res[field]);
    }
  }
  return res;
}
