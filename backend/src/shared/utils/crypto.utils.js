const crypto = require('crypto');

const PREFIX = 'AGY:';
const LEGACY_PREFIX = 'AGY:';
const V2_MARKER = 'v2';
const configuredKey = process.env.QR_ENCRYPTION_KEY;

if (process.env.NODE_ENV === 'production' && (!configuredKey || Buffer.byteLength(configuredKey) < 32)) {
  throw new Error('QR_ENCRYPTION_KEY debe tener al menos 32 bytes en producción.');
}

// V2 usa una derivación estable de 256 bits y AES-GCM para autenticar el QR.
const encryptionKey = crypto.createHash('sha256')
  .update(`TraceFlow QR v2:${configuredKey || 'development-only-key'}`)
  .digest();

// Compatibilidad de lectura temporal para QR creados con AES-CBC. En UAT debe
// configurarse QR_LEGACY_DECRYPTION_KEY; la nueva Producción parte sin QR legado.
const legacyKeySources = [process.env.QR_LEGACY_DECRYPTION_KEY, configuredKey];
const legacyKeys = [...new Set(legacyKeySources.filter(Boolean))].map((key) =>
  Buffer.from(key.padEnd(32, '0').slice(0, 32))
);

const encode = (value) => value.toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url');

const encryptQrData = (text) => {
  if (!text) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${PREFIX}${V2_MARKER}:${encode(iv)}:${encode(cipher.getAuthTag())}:${encode(encrypted)}`;
};

const decryptLegacyQr = (ivText, encryptedText) => {
  if (!legacyKeys.length) throw new Error('QR legado deshabilitado: configure QR_LEGACY_DECRYPTION_KEY.');
  const iv = decode(ivText);
  const payload = decode(encryptedText);
  if (iv.length !== 16 || payload.length === 0) throw new Error('Formato de QR legado inválido.');

  for (const key of legacyKeys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    } catch {
      // Intenta la siguiente clave legado sin exponer detalles de descifrado.
    }
  }
  throw new Error('No se pudo autenticar el QR legado.');
};

const decryptQrData = (encryptedText) => {
  if (!encryptedText) throw new Error('Código QR vacío');
  if (!encryptedText.startsWith(LEGACY_PREFIX)) {
    throw new Error('Código QR no reconocido o inválido.');
  }

  const parts = encryptedText.slice(LEGACY_PREFIX.length).split(':');
  try {
    if (parts.length === 4 && parts[0] === V2_MARKER) {
      const [, ivText, tagText, encryptedValue] = parts;
      const iv = decode(ivText);
      const tag = decode(tagText);
      if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid QR envelope');
      const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(decode(encryptedValue)), decipher.final()]).toString('utf8');
    }

    // Legacy format is AGY:<iv>:<ciphertext>. New QRs are never emitted in it.
    if (parts.length === 2) return decryptLegacyQr(parts[0], parts[1]);
    throw new Error('Invalid QR envelope');
  } catch {
    throw new Error('Código QR inválido o alterado.');
  }
};

module.exports = { encryptQrData, decryptQrData };
