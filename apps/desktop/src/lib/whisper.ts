import { invoke } from '@tauri-apps/api/tauri';
import { stat } from '@tauri-apps/api/fs';

const MIN_MODEL_SIZE_BYTES = 40 * 1024 * 1024; // 40 MB

function normalizePath(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim();
}

function isLikelyWhisperFilename(path: string): boolean {
  const lower = path.toLowerCase();
  return (lower.includes('ggml') || lower.includes('gguf')) && lower.includes('whisper');
}

export async function verifyWhisperModelPath(modelPath: string): Promise<void> {
  const normalized = normalizePath(modelPath);
  if (!normalized) {
    throw new Error('Kein Modellpfad angegeben.');
  }
  const info = await stat(normalized).catch(error => {
    console.error('Whisper-Modell konnte nicht gelesen werden', error);
    throw new Error('Modellpfad ist nicht erreichbar.');
  });
  if (!info.isFile) {
    throw new Error('Pfad zeigt nicht auf eine Datei.');
  }
  if (info.size < MIN_MODEL_SIZE_BYTES) {
    throw new Error('Datei ist zu klein. Verwende ein ggml/gguf Whisper-Modell.');
  }
  if (!isLikelyWhisperFilename(normalized)) {
    throw new Error('Dateiname sieht nicht nach einem Whisper ggml/gguf Modell aus.');
  }
}

export async function whisperInit(modelPath: string): Promise<string> {
  const normalized = normalizePath(modelPath);
  if (!normalized) {
    throw new Error('Kein Modellpfad angegeben.');
  }
  return invoke<string>('whisper_init', { model_path: normalized });
}

export async function whisperTranscribeWav16Mono(path: string, lang?: string): Promise<string> {
  const normalized = normalizePath(path);
  if (!normalized) {
    throw new Error('Keine Audiodatei angegeben.');
  }
  const payload: Record<string, unknown> = { path: normalized };
  if (lang) {
    payload.lang = lang;
  }
  return invoke<string>('whisper_transcribe_wav16_mono', payload);
}

export async function ensureWhisperReady(modelPath: string): Promise<void> {
  await verifyWhisperModelPath(modelPath);
  await whisperInit(modelPath);
}
