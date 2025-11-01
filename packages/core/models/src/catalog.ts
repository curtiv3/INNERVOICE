export type ModelType = 'whisper' | 'embedding';

export type ModelDefinition = {
  id: string;
  name: string;
  type: ModelType;
  sizeMB: number;
  path: string;
  checksum?: string | null;
  downloadUrl?: string | null;
  description?: string;
};

const whisperModels: ModelDefinition[] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (ggml)',
    type: 'whisper',
    sizeMB: 153,
    path: 'whisper/ggml-tiny.bin',
    checksum: null,
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    description: 'Schnellste Variante – gute Verständlichkeit für Notizen.'
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (ggml)',
    type: 'whisper',
    sizeMB: 292,
    path: 'whisper/ggml-base.bin',
    checksum: null,
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: 'Balance aus Geschwindigkeit und Genauigkeit für Alltagsdialoge.'
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (ggml)',
    type: 'whisper',
    sizeMB: 488,
    path: 'whisper/ggml-small.bin',
    checksum: null,
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: 'Mehr Präzision und Stabilität – benötigt mehr Speicher und RAM.'
  }
];

const embeddingModels: ModelDefinition[] = [
  {
    id: 'embedding-gte-small',
    name: 'GTE Small (ONNX)',
    type: 'embedding',
    sizeMB: 91,
    path: 'embeddings/gte-small.onnx',
    checksum: null,
    downloadUrl: 'https://huggingface.co/thenlper/gte-small/resolve/main/model.onnx',
    description: 'Allround Embedding mit gutem semantischen Recall.'
  },
  {
    id: 'embedding-minilm',
    name: 'MiniLM-L6 (ONNX)',
    type: 'embedding',
    sizeMB: 80,
    path: 'embeddings/minilm-l6.onnx',
    checksum: null,
    downloadUrl: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/model.onnx',
    description: 'Kompaktes Modell mit geringerer Latenz für schnelle Suche.'
  }
];

const catalog: ModelDefinition[] = [...whisperModels, ...embeddingModels];

export function getModelCatalog(): ModelDefinition[] {
  return catalog.slice();
}

export function getModelById(id: string): ModelDefinition | undefined {
  return catalog.find(model => model.id === id);
}

export function listModelsByType(type: ModelType): ModelDefinition[] {
  return catalog.filter(model => model.type === type);
}

export function isWhisperModel(modelId: string): boolean {
  return whisperModels.some(model => model.id === modelId);
}

export function isEmbeddingModel(modelId: string): boolean {
  return embeddingModels.some(model => model.id === modelId);
}
