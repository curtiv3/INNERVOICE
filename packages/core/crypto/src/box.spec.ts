import { TextDecoder, TextEncoder } from 'node:util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptBinary, decryptJSON, encryptBinary, encryptJSON } from './box';

const sodiumMock = {
  randombytes_buf: vi.fn((length: number) => new Uint8Array(length).fill(7)),
  crypto_secretbox_easy: vi.fn((data: Uint8Array) => {
    const reversed = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
      reversed[i] = data[data.length - 1 - i] ^ 0xff;
    }
    return reversed;
  }),
  crypto_secretbox_open_easy: vi.fn((cipher: Uint8Array) => {
    const restored = new Uint8Array(cipher.length);
    for (let i = 0; i < cipher.length; i += 1) {
      restored[i] = cipher[cipher.length - 1 - i] ^ 0xff;
    }
    return restored;
  })
};

vi.mock('./sodium', () => ({
  getSodium: () => Promise.resolve(sodiumMock)
}));

describe('crypto box', () => {
  const key = new Uint8Array(32).fill(1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('round-trips binary payloads', async () => {
    const data = new TextEncoder().encode('hello');
    const cipher = await encryptBinary(data, key);
    const plain = await decryptBinary(cipher, key);
    expect(new TextDecoder().decode(plain)).toBe('hello');
  });

  it('fails with wrong key', async () => {
    const cipher = await encryptJSON({ value: 1 }, key);
    const wrongKey = new Uint8Array(32).fill(2);
    sodiumMock.crypto_secretbox_open_easy.mockReturnValueOnce(null as unknown as Uint8Array);
    await expect(decryptJSON(cipher, wrongKey)).rejects.toThrow('Failed to decrypt payload');
  });
});
