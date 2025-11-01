import { createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { appConfigDir, join } from '@tauri-apps/api/path';
import {
  DeviceKeyMaterial,
  DeviceKeyStore,
  WrappedContentKeyStore,
  ensureContentKey,
  ensureDeviceKey,
  encryptJSON,
  decryptJSON,
  getContentKeyStorageKey,
  getDeviceKeyStorageKey
} from '@innervoice/core-crypto';
import { getSetting, setSetting } from './settings';

const DEVICE_KEY_FILE = 'device-key.json';
let cachedDevicePath: string | null = null;

async function ensureKeyDirectory(): Promise<string> {
  if (cachedDevicePath) return cachedDevicePath;
  const dir = await appConfigDir();
  const keysDir = await join(dir, 'keys');
  const alreadyExists = await exists(keysDir);
  if (!alreadyExists) {
    await createDir(keysDir, { recursive: true });
  }
  const devicePath = await join(keysDir, DEVICE_KEY_FILE);
  cachedDevicePath = devicePath;
  return devicePath;
}

const deviceKeyStore: DeviceKeyStore = {
  async loadDeviceKey() {
    try {
      const path = await ensureKeyDirectory();
      if (!(await exists(path))) return null;
      return await readTextFile(path);
    } catch (error) {
      console.error('[desktop] Gerätesschlüssel konnte nicht geladen werden', error);
      return null;
    }
  },
  async saveDeviceKey(serialized: string) {
    const path = await ensureKeyDirectory();
    await writeTextFile(path, serialized);
  }
};

const contentKeyStore: WrappedContentKeyStore = {
  async loadWrappedContentKey() {
    try {
      const key = await getSetting(getContentKeyStorageKey());
      return key;
    } catch (error) {
      console.error('[desktop] Content-Key konnte nicht geladen werden', error);
      return null;
    }
  },
  async saveWrappedContentKey(serialized: string) {
    await setSetting(getContentKeyStorageKey(), serialized);
  }
};

export async function ensureDesktopDeviceKey(): Promise<DeviceKeyMaterial> {
  return ensureDeviceKey(deviceKeyStore);
}

export async function ensureDesktopContentKey(): Promise<Uint8Array> {
  await ensureDesktopDeviceKey();
  return ensureContentKey(contentKeyStore, deviceKeyStore);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export async function encryptPayload(value: unknown): Promise<string | null> {
  if (value == null) return null;
  const key = await ensureDesktopContentKey();
  const payload = await encryptJSON(value, key);
  return toBase64(payload);
}

export async function decryptPayload<T>(encoded: string | null): Promise<T | null> {
  if (!encoded) return null;
  const key = await ensureDesktopContentKey();
  const payload = fromBase64(encoded);
  return decryptJSON<T>(payload, key);
}

export async function hasContentKey(): Promise<boolean> {
  const current = await contentKeyStore.loadWrappedContentKey();
  return current != null;
}

export { deviceKeyStore, contentKeyStore };
