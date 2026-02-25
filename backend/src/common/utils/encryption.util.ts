import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 암호화 키를 가져옵니다.
 * 환경변수 ENCRYPTION_KEY가 없으면 기본 키 생성 (개발용)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // 환경변수에서 가져온 키를 32바이트로 해시
    return crypto.createHash('sha256').update(envKey).digest();
  }
  
  // 개발용 기본 키 (프로덕션에서는 반드시 ENCRYPTION_KEY 설정 필요)
  console.warn('[Encryption] Using default encryption key. Set ENCRYPTION_KEY in production!');
  return crypto.createHash('sha256').update('default-dev-key-do-not-use-in-production').digest();
}

/**
 * 문자열을 AES-256-GCM으로 암호화합니다.
 * @param plainText 암호화할 평문
 * @returns 암호화된 문자열 (IV + AuthTag + CipherText, Base64 인코딩)
 */
export function encrypt(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // IV (16bytes) + AuthTag (16bytes) + EncryptedData
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

/**
 * AES-256-GCM으로 암호화된 문자열을 복호화합니다.
 * @param encryptedText 암호화된 문자열 (Base64)
 * @returns 복호화된 평문
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedText, 'base64');
  
  // IV (16bytes) + AuthTag (16bytes) + EncryptedData
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 암호화/복호화 테스트
 */
export function testEncryption(): boolean {
  const testString = 'team-sk-test1234567890abcdef';
  
  try {
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    
    if (decrypted === testString) {
      console.log('[Encryption] Test passed');
      return true;
    } else {
      console.error('[Encryption] Test failed: decrypted value does not match');
      return false;
    }
  } catch (error) {
    console.error('[Encryption] Test failed:', error);
    return false;
  }
}
