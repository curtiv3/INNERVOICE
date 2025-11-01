import { getModelById, getModelCatalog, type ModelDefinition } from './catalog';

export type ModelStorageInfo = {
  exists: boolean;
  size: number;
};

export type ModelStorage = {
  getInfo(path: string): Promise<ModelStorageInfo>;
  ensureDir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  copyFile?(source: string, target: string): Promise<void>;
  downloadFile?(source: string, target: string, onProgress?: (progress: number) => void): Promise<void>;
  hashFile?(path: string): Promise<string | null>;
};

export type InstallOptions = {
  sourceUri?: string;
  onProgress?: (progress: number) => void;
};

export type ModelStatus = {
  id: string;
  name: string;
  type: ModelDefinition['type'];
  expectedSizeMB: number;
  path: string;
  installed: boolean;
  sizeOnDisk: number;
};

export type ModelVerification = {
  id: string;
  path: string;
  sizeOnDisk: number;
  valid: boolean;
  checksum?: string | null;
  expectedChecksum?: string | null;
  reason?: 'missing' | 'hash-mismatch' | 'no-checksum' | 'no-hash-support';
};

export type ModelManager = {
  resolvePath(modelId: string): string;
  getDefinition(modelId: string): ModelDefinition;
  getStatus(modelId: string): Promise<ModelStatus>;
  listStatuses(): Promise<ModelStatus[]>;
  installModel(modelId: string, options?: InstallOptions): Promise<ModelStatus>;
  removeModel(modelId: string): Promise<void>;
  verifyModel(modelId: string): Promise<ModelVerification>;
  getTotalDiskUsage(): Promise<number>;
};

function assertModel(modelId: string): ModelDefinition {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model;
}

function joinPath(base: string, relative: string): string {
  if (relative.startsWith('file://')) {
    return relative;
  }
  const normalisedBase = base.endsWith('/') ? base : `${base}/`;
  const normalisedRelative = relative.startsWith('/') ? relative.slice(1) : relative;
  return `${normalisedBase}${normalisedRelative}`;
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  if (index <= 0) {
    return path;
  }
  return path.slice(0, index);
}

async function ensureParentDir(storage: ModelStorage, path: string) {
  const directory = dirname(path);
  await storage.ensureDir(directory);
}

export function createModelManager(baseDir: string, storage: ModelStorage): ModelManager {
  async function getStatus(modelId: string): Promise<ModelStatus> {
    const definition = assertModel(modelId);
    const target = joinPath(baseDir, definition.path);
    const info = await storage.getInfo(target);
    return {
      id: definition.id,
      name: definition.name,
      type: definition.type,
      expectedSizeMB: definition.sizeMB,
      path: target,
      installed: info.exists,
      sizeOnDisk: info.exists ? info.size : 0
    };
  }

  async function installModel(modelId: string, options: InstallOptions = {}): Promise<ModelStatus> {
    const definition = assertModel(modelId);
    const target = joinPath(baseDir, definition.path);
    await ensureParentDir(storage, target);

    if (options.sourceUri && storage.copyFile) {
      await storage.copyFile(options.sourceUri, target);
      return getStatus(modelId);
    }

    if (definition.downloadUrl && storage.downloadFile) {
      await storage.downloadFile(definition.downloadUrl, target, options.onProgress);
      return getStatus(modelId);
    }

    throw new Error('Keine Quelle für das Modell angegeben. Bitte manuell platzieren.');
  }

  async function removeModel(modelId: string): Promise<void> {
    const status = await getStatus(modelId);
    if (!status.installed) {
      return;
    }
    await storage.remove(status.path);
  }

  async function verifyModel(modelId: string): Promise<ModelVerification> {
    const definition = assertModel(modelId);
    const status = await getStatus(modelId);
    if (!status.installed) {
      return {
        id: modelId,
        path: status.path,
        sizeOnDisk: 0,
        valid: false,
        expectedChecksum: definition.checksum ?? null,
        checksum: null,
        reason: 'missing'
      };
    }
    if (!storage.hashFile) {
      return {
        id: modelId,
        path: status.path,
        sizeOnDisk: status.sizeOnDisk,
        valid: true,
        expectedChecksum: definition.checksum ?? null,
        checksum: null,
        reason: 'no-hash-support'
      };
    }
    if (!definition.checksum) {
      return {
        id: modelId,
        path: status.path,
        sizeOnDisk: status.sizeOnDisk,
        valid: true,
        expectedChecksum: null,
        checksum: null,
        reason: 'no-checksum'
      };
    }
    const checksum = await storage.hashFile(status.path);
    const valid = checksum === definition.checksum;
    return {
      id: modelId,
      path: status.path,
      sizeOnDisk: status.sizeOnDisk,
      valid,
      checksum,
      expectedChecksum: definition.checksum,
      reason: valid ? undefined : 'hash-mismatch'
    };
  }

  async function listStatuses(): Promise<ModelStatus[]> {
    const models = getModelCatalog();
    const statuses: ModelStatus[] = [];
    for (const model of models) {
      statuses.push(await getStatus(model.id));
    }
    return statuses;
  }

  async function getTotalDiskUsage(): Promise<number> {
    const statuses = await listStatuses();
    return statuses.reduce((sum, status) => sum + status.sizeOnDisk, 0);
  }

  return {
    resolvePath(modelId: string) {
      const definition = assertModel(modelId);
      return joinPath(baseDir, definition.path);
    },
    getDefinition(modelId: string) {
      return assertModel(modelId);
    },
    getStatus,
    listStatuses,
    installModel,
    removeModel,
    verifyModel,
    getTotalDiskUsage
  };
}
