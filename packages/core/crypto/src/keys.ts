import { getSodium } from './sodium';

export type DeviceKeyStore = {
  loadDeviceKey(): Promise<string | null>;
  saveDeviceKey(serialized: string): Promise<void>;
};

export type WrappedContentKeyStore = {
  loadWrappedContentKey(): Promise<string | null>;
  saveWrappedContentKey(serialized: string): Promise<void>;
};

export type DeviceKeyMaterial = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

const DEVICE_KEY_VERSION = 'v1';
const DEVICE_KEY_STORAGE_KEY = `innervoice:device-key:${DEVICE_KEY_VERSION}`;
const CONTENT_KEY_STORAGE_KEY = `innervoice:content-key:${DEVICE_KEY_VERSION}`;

let cachedDeviceKey: DeviceKeyMaterial | null = null;
let cachedContentKey: Uint8Array | null = null;

export function getDeviceKeyStorageKey() {
  return DEVICE_KEY_STORAGE_KEY;
}

export function getContentKeyStorageKey() {
  return CONTENT_KEY_STORAGE_KEY;
}

export async function ensureDeviceKey(store: DeviceKeyStore): Promise<DeviceKeyMaterial> {
  if (cachedDeviceKey) {
    return cachedDeviceKey;
  }
  const sodium = await getSodium();
  const serialized = await store.loadDeviceKey();
  if (serialized) {
    try {
      const parsed = JSON.parse(serialized) as { publicKey: string; secretKey: string };
      cachedDeviceKey = {
        publicKey: sodium.from_base64(parsed.publicKey, sodium.base64_variants.ORIGINAL),
        secretKey: sodium.from_base64(parsed.secretKey, sodium.base64_variants.ORIGINAL)
      };
      return cachedDeviceKey;
    } catch (error) {
      // Fall through and regenerate if parsing fails.
    }
  }
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  const payload = JSON.stringify({
    version: DEVICE_KEY_VERSION,
    publicKey: sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL),
    secretKey: sodium.to_base64(privateKey, sodium.base64_variants.ORIGINAL)
  });
  await store.saveDeviceKey(payload);
  cachedDeviceKey = { publicKey, secretKey: privateKey };
  return cachedDeviceKey;
}

export function wrapContentKey(
  contentKey: Uint8Array,
  device: DeviceKeyMaterial,
  sodiumInst: typeof import('libsodium-wrappers-sumo')['default']
): Uint8Array {
  return sodiumInst.crypto_box_seal(contentKey, device.publicKey);
}

export function unwrapContentKey(wrapped: Uint8Array, device: DeviceKeyMaterial, sodiumInst: typeof import('libsodium-wrappers-sumo')['default']): Uint8Array {
  return sodiumInst.crypto_box_seal_open(wrapped, device.publicKey, device.secretKey);
}

export async function ensureContentKey(
  store: WrappedContentKeyStore,
  deviceStore: DeviceKeyStore
): Promise<Uint8Array> {
  if (cachedContentKey) {
    return cachedContentKey;
  }
  const sodium = await getSodium();
  const deviceKey = await ensureDeviceKey(deviceStore);
  const serialized = await store.loadWrappedContentKey();
  if (serialized) {
    try {
      const wrapped = sodium.from_base64(serialized, sodium.base64_variants.ORIGINAL);
      cachedContentKey = unwrapContentKey(wrapped, deviceKey, sodium);
      return cachedContentKey;
    } catch (error) {
      // Continue and regenerate
    }
  }
  const newKey = sodium.randombytes_buf(32);
  const wrapped = wrapContentKey(newKey, deviceKey, sodium);
  await store.saveWrappedContentKey(sodium.to_base64(wrapped, sodium.base64_variants.ORIGINAL));
  cachedContentKey = newKey;
  return newKey;
}

export function cacheContentKey(key: Uint8Array) {
  cachedContentKey = key;
}

export function clearCachedKeys() {
  cachedContentKey = null;
  cachedDeviceKey = null;
}
