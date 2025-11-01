import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, stat, mkdir, copyFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import { createModelManager, type ModelStorage } from './manager';

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'innervoice-models-'));
  return dir;
}

describe('createModelManager', () => {
  let baseDir: string;
  let storage: ModelStorage;
  let sourceFile: string;

  beforeEach(async () => {
    baseDir = await createTempDir();
    storage = {
      async getInfo(path) {
        try {
          const result = await stat(path);
          return { exists: true, size: result.size };
        } catch {
          return { exists: false, size: 0 };
        }
      },
      async ensureDir(path) {
        await mkdir(path, { recursive: true });
      },
      async remove(path) {
        await rm(path, { force: true });
      },
      async copyFile(source, target) {
        await copyFile(source, target);
      },
      async downloadFile(source, target) {
        await copyFile(source, target);
      },
      async hashFile(path) {
        const buffer = await readFile(path);
        return createHash('sha256').update(buffer).digest('hex');
      }
    };
    sourceFile = join(baseDir, 'sample.bin');
    await writeFile(sourceFile, Buffer.from('demo-model'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('installs, verifies and removes a model', async () => {
    const manager = createModelManager(baseDir, storage);
    const initial = await manager.getStatus('whisper-tiny');
    expect(initial.installed).toBe(false);

    const installed = await manager.installModel('whisper-tiny', { sourceUri: sourceFile });
    expect(installed.installed).toBe(true);
    expect(installed.sizeOnDisk).toBeGreaterThan(0);

    const verification = await manager.verifyModel('whisper-tiny');
    expect(verification.valid).toBe(true);
    expect(verification.reason === 'no-checksum' || verification.reason === undefined).toBe(true);

    await manager.removeModel('whisper-tiny');
    const afterRemoval = await manager.getStatus('whisper-tiny');
    expect(afterRemoval.installed).toBe(false);
  });

  it('reports total disk usage across models', async () => {
    const manager = createModelManager(baseDir, storage);
    await manager.installModel('embedding-gte-small', { sourceUri: sourceFile });
    await manager.installModel('whisper-base', { sourceUri: sourceFile });
    const usage = await manager.getTotalDiskUsage();
    expect(usage).toBeGreaterThan(0);
  });
});
