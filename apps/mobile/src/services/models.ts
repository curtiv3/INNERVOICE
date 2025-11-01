import * as FileSystem from 'expo-file-system';
import {
  createModelManager,
  getModelCatalog,
  type InstallOptions,
  type ModelManager,
  type ModelStatus,
  type ModelStorage,
  type ModelVerification
} from '@innervoice/core-models';
import { translate } from '../i18n';

const DOCUMENT_ROOT = FileSystem.documentDirectory;

if (!DOCUMENT_ROOT) {
  console.warn('Dokumentenverzeichnis nicht verfügbar – Modellpfade verwenden Fallback.');
}

const MODEL_BASE = DOCUMENT_ROOT ? `${DOCUMENT_ROOT}InnerVoice/models` : 'file:///InnerVoice/models';

const storage: ModelStorage = {
  async getInfo(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    return { exists: info.exists, size: info.exists && typeof info.size === 'number' ? info.size : 0 };
  },
  async ensureDir(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
  },
  async remove(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  },
  async copyFile(source: string, target: string) {
    await FileSystem.copyAsync({ from: source, to: target });
  },
  async downloadFile(source: string, target: string, onProgress?: (progress: number) => void) {
    const resumable = FileSystem.createDownloadResumable(
      source,
      target,
      {},
      onProgress
        ? progress => {
            const total = progress.totalBytesExpectedToWrite || 1;
            onProgress(Math.min(1, progress.totalBytesWritten / total));
          }
        : undefined
    );
    await resumable.downloadAsync();
  },
  async hashFile(path: string) {
    const info = await FileSystem.getInfoAsync(path, { size: true, md5: true });
    if (!info.exists) {
      return null;
    }
    const md5 = (info as FileSystem.FileInfo & { md5?: string }).md5;
    return md5 ?? null;
  }
};

const manager: ModelManager = createModelManager(MODEL_BASE, storage);

export const DEFAULT_WHISPER_MODEL_ID = 'whisper-base';
export const DEFAULT_EMBEDDING_MODEL_ID = 'embedding-gte-small';

export function getModelManager(): ModelManager {
  return manager;
}

export function getModelCatalogEntries() {
  return getModelCatalog();
}

export async function listModelStatuses(): Promise<ModelStatus[]> {
  return manager.listStatuses();
}

export async function installModel(modelId: string, options?: InstallOptions): Promise<ModelStatus> {
  return manager.installModel(modelId, options);
}

export async function removeModel(modelId: string): Promise<void> {
  await manager.removeModel(modelId);
}

export async function verifyModel(modelId: string): Promise<ModelVerification> {
  return manager.verifyModel(modelId);
}

export async function ensureWhisperModelAvailable(): Promise<string> {
  const status = await manager.getStatus(DEFAULT_WHISPER_MODEL_ID);
  if (!status.installed) {
    throw new Error(translate('models.whisperMissing'));
  }
  return status.path;
}

export async function ensureEmbeddingModelAvailable(): Promise<string> {
  const status = await manager.getStatus(DEFAULT_EMBEDDING_MODEL_ID);
  if (!status.installed) {
    throw new Error(translate('models.embeddingMissing'));
  }
  return status.path;
}

export async function getTotalModelUsage(): Promise<number> {
  return manager.getTotalDiskUsage();
}
