import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { privateDecrypt, publicEncrypt } from 'node:crypto';

export const EncryptionHelper = {
  // Encryption function
  encrypt: (data) => {
    if (data === undefined) return undefined;
    // Membaca kunci publik
    const pathPublic = path.dirname(require.main.filename);
    const publicKey = readFileSync(path.join(pathPublic, './config/ssl/server/public.key'), 'utf8');
    // Enkripsi data menggunakan public key
    const encrypted = publicEncrypt(publicKey, Buffer.from(data));
    // Hash hasil enkripsi menggunakan SHA-256
    return encrypted.toString('hex');
  },
  decrypt: (encryptedData) => {
    if (encryptedData === undefined) return undefined;
    // Membaca kunci publik
    const pathPublic = path.dirname(require.main.filename);
    const privateKey = readFileSync(path.join(pathPublic, './config/ssl/server/private.key'), 'utf8');
    // Mengonversi data yang telah dienkripsi dari hex ke buffer
    const bufferData = Buffer.from(encryptedData, 'hex');
    // Dekripsi data menggunakan private key
    const decrypted = privateDecrypt(privateKey, bufferData);
    return decrypted.toString('utf8'); // Mengembalikan hasil dekripsi dalam format string
  },
};
