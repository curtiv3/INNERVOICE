import { describe, expect, it } from 'vitest';
import { decryptJSON, encryptJSON } from '../box';
import { cacheContentKey, clearCachedKeys } from '../keys';
import { getSodium } from '../sodium';

describe('crypto roundtrip', () => {
  it('encrypts and decrypts JSON deterministically', async () => {
    const sodium = await getSodium();
    const key = sodium.randombytes_buf(32);
    cacheContentKey(key);
    const payload = { message: 'hallo welt', arousal: 0.42 };
    const encrypted = await encryptJSON(payload, key);
    const decrypted = await decryptJSON<typeof payload>(encrypted, key);
    expect(decrypted).toStrictEqual(payload);
    clearCachedKeys();
  });
});
