#pragma once

#include "ModelCache.h"

#include <cstdint>
#include <filesystem>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

struct whisper_context;

namespace innervoice {

struct TranscriptionOptions {
    bool translate = false;
    bool diarize = false;
    int max_threads = 4;
};

struct TranscriptionResult {
    std::string text;
    double duration_ms = 0.0;
};

class WhisperBridge {
  public:
    WhisperBridge();
    explicit WhisperBridge(std::filesystem::path cache_dir);
    ~WhisperBridge();

    void load_model(const ModelInfo &info);
    TranscriptionResult transcribe_pcm16(const std::vector<int16_t> &pcm16,
                                         int sample_rate,
                                         const TranscriptionOptions &options);

  private:
    std::mutex mutex_;
    std::unique_ptr<whisper_context, void (*)(whisper_context *)> context_;
    std::unique_ptr<ModelCache> cache_;

    void ensure_context();
};

} // namespace innervoice
