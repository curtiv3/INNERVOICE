import { getSodium } from './sodium';

const HEADER = new Uint8Array([0x49, 0x56, 0x01, 0x00]); // "IV" + version markers
const NONCE_LENGTH = 24;

export type EncryptedPayload = Uint8Array;

export async function encryptBinary(data: Uint8Array, key: Uint8Array): Promise<EncryptedPayload> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(NONCE_LENGTH);
  const cipher = sodium.crypto_secretbox_easy(data, nonce, key);
  const packed = new Uint8Array(HEADER.length + nonce.length + cipher.length);
  packed.set(HEADER, 0);
  packed.set(nonce, HEADER.length);
  packed.set(cipher, HEADER.length + nonce.length);
  return packed;
}

export async function decryptBinary(payload: EncryptedPayload, key: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium();
  if (payload.length < HEADER.length + NONCE_LENGTH) {
    throw new Error('Invalid payload length');
  }
  for (let i = 0; i < HEADER.length; i += 1) {
    if (payload[i] !== HEADER[i]) {
      throw new Error('Invalid payload header');
    }
  }
  const nonce = payload.slice(HEADER.length, HEADER.length + NONCE_LENGTH);
  const cipher = payload.slice(HEADER.length + NONCE_LENGTH);
  const message = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  if (!message) {
    throw new Error('Failed to decrypt payload');
  }
  return message;
}

export async function encryptJSON(value: unknown, key: Uint8Array): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const json = encoder.encode(JSON.stringify(value));
  return encryptBinary(json, key);
}

export async function decryptJSON<T = unknown>(payload: EncryptedPayload, key: Uint8Array): Promise<T> {
  const decoder = new TextDecoder();
  const data = await decryptBinary(payload, key);
  const text = decoder.decode(data);
  return JSON.parse(text) as T;
}
