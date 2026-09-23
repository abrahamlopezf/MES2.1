const crypto = require('crypto');

// En producción deberías tener esta llave en el .env, pero como fallback usamos una fija de 32 bytes
// process.env.QR_ENCRYPTION_KEY || '...' 
const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY 
  ? Buffer.from(process.env.QR_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  : Buffer.from('enterprise_agy_secure_qr_key_32b'); 
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const PREFIX = 'AGY:';

/**
 * Encripta un texto en plano (ej: UUID o Folio) para inyectarlo en el QR
 */
const encryptQrData = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Convert standard base64 to base64url to be URL-safe for Express routing
  const urlSafeIv = iv.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const urlSafeEncrypted = encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const result = `${PREFIX}${urlSafeIv}:${urlSafeEncrypted}`;
  return result;
};

/**
 * Desencripta el contenido de un QR (si viene encriptado)
 * Lanza error si no es válido
 */
const decryptQrData = (encryptedText) => {
  if (!encryptedText) throw new Error('Código QR vacío');
  
  // Validar prefijo estricto
  if (!encryptedText.startsWith(PREFIX)) {
    throw new Error('Código QR no reconocido o inválido. Por seguridad, solo se aceptan códigos generados por este sistema.');
  }

  const payload = encryptedText.replace(PREFIX, '');
  const parts = payload.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Formato de QR corrupto o inválido.');
  }

  try {
    // Revert base64url to standard base64
    const stdIv = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const stdEnc = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    const iv = Buffer.from(stdIv, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(stdEnc, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Error al desencriptar el código QR. Posible alteración.');
  }
};

module.exports = {
  encryptQrData,
  decryptQrData
};
