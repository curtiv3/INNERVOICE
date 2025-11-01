import * as Keychain from 'react-native-keychain';
import {
  DeviceKeyMaterial,
  DeviceKeyStore,
  WrappedContentKeyStore,
  ensureContentKey,
  ensureDeviceKey,
  getContentKeyStorageKey,
  getDeviceKeyStorageKey
} from '@innervoice/core-crypto';
import { getSetting, setSetting } from '../storage/settings';

const deviceKeyAlias = getDeviceKeyStorageKey();
const contentKeyAlias = getContentKeyStorageKey();

const deviceKeyStore: DeviceKeyStore = {
  async loadDeviceKey() {
    try {
      const credentials = await Keychain.getInternetCredentials(deviceKeyAlias);
      return credentials?.password ?? null;
    } catch (error) {
      console.error('Geräte-Schlüssel konnte nicht geladen werden.', error);
      return null;
    }
  },
  async saveDeviceKey(serialized: string) {
    const accessibleOption =
      Keychain.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY ?? 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
    try {
      await Keychain.setInternetCredentials(deviceKeyAlias, deviceKeyAlias, serialized, {
        accessible: accessibleOption
      });
    } catch (error) {
      console.error('Geräte-Schlüssel konnte nicht gespeichert werden.', error);
      throw error;
    }
  }
};

const contentKeyStore: WrappedContentKeyStore = {
  async loadWrappedContentKey() {
    try {
      return await getSetting(contentKeyAlias);
    } catch (error) {
      console.error('Content-Key konnte nicht geladen werden.', error);
      return null;
    }
  },
  async saveWrappedContentKey(serialized: string) {
    try {
      await setSetting(contentKeyAlias, serialized);
    } catch (error) {
      console.error('Content-Key konnte nicht gespeichert werden.', error);
      throw error;
    }
  }
};

export async function ensureDeviceKeyMaterial(): Promise<DeviceKeyMaterial> {
  try {
    return await ensureDeviceKey(deviceKeyStore);
  } catch (error) {
    console.error('Konnte Geräteschlüssel nicht initialisieren. Bitte Modelle laden.', error);
    throw error;
  }
}

export async function ensureContentEncryptionKey(): Promise<Uint8Array> {
  try {
    return await ensureContentKey(contentKeyStore, deviceKeyStore);
  } catch (error) {
    console.error('Konnte Inhalts-Schlüssel nicht initialisieren. Bitte Modelle laden.', error);
    throw error;
  }
}

export async function hasContentKey(): Promise<boolean> {
  const wrapped = await contentKeyStore.loadWrappedContentKey();
  return wrapped !== null;
}

export { deviceKeyStore, contentKeyStore };
