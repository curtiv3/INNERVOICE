#include "WhisperBridge.h"

#include "WhisperBridgeC.h"

#include <algorithm>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <memory>
#include <stdexcept>
#include <vector>
#include <string>

#include <whisper.h>

namespace {
constexpr auto kDefaultCache = "~/.cache/innervoice";
thread_local std::string g_last_error;

std::filesystem::path resolve_cache_dir() {
    const char *env = std::getenv("INNVOICE_MODEL_CACHE");
    if (env) {
        return std::filesystem::path(env);
    }
#ifdef _WIN32
    const char *localAppData = std::getenv("LOCALAPPDATA");
    if (localAppData) {
        return std::filesystem::path(localAppData) / "InnerVoice" / "Models";
    }
#endif
    const char *home = std::getenv("HOME");
    if (home) {
        return std::filesystem::path(home) / ".cache" / "innervoice";
    }
    return std::filesystem::path(kDefaultCache);
}

void release_context(whisper_context *ctx) {
    if (ctx) {
        whisper_free(ctx);
    }
}

} // namespace

namespace innervoice {

WhisperBridge::WhisperBridge()
    : WhisperBridge(resolve_cache_dir()) {}

WhisperBridge::WhisperBridge(std::filesystem::path cache_dir)
    : context_(nullptr, &release_context),
      cache_(std::make_unique<ModelCache>(std::move(cache_dir))) {}

WhisperBridge::~WhisperBridge() = default;

void WhisperBridge::ensure_context() {
    if (!context_) {
        throw std::runtime_error("Model not loaded; call load_model first");
    }
}

void WhisperBridge::load_model(const ModelInfo &info) {
    const auto model_path = cache_->ensure_model(info);
    std::lock_guard<std::mutex> guard(mutex_);
    context_.reset(whisper_init_from_file(model_path.string().c_str()));
    if (!context_) {
        throw std::runtime_error("Failed to initialize whisper context");
    }
}

TranscriptionResult WhisperBridge::transcribe_pcm16(const std::vector<int16_t> &pcm16,
                                                    int sample_rate,
                                                    const TranscriptionOptions &options) {
    std::lock_guard<std::mutex> guard(mutex_);
    ensure_context();

    if (sample_rate != 16000) {
        throw std::invalid_argument("Whisper expects 16kHz PCM audio");
    }

    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.translate = options.translate;
    params.diarize = options.diarize;
    params.n_threads = options.max_threads;
    params.print_progress = false;
    params.print_special = false;
    params.print_realtime = false;

    if (whisper_full(context_.get(), params, pcm16.data(), static_cast<int>(pcm16.size())) != 0) {
        throw std::runtime_error("whisper_full failed");
    }

    std::string transcript;
    const int segments = whisper_full_n_segments(context_.get());
    for (int i = 0; i < segments; ++i) {
        transcript += whisper_full_get_segment_text(context_.get(), i);
    }

    TranscriptionResult result;
    result.text = std::move(transcript);
    result.duration_ms = whisper_full_get_total_duration(context_.get());
    return result;
}

} // namespace innervoice

extern "C" {

struct innervoice_whisper_handle_t {
    std::unique_ptr<innervoice::WhisperBridge> instance;
};

innervoice_whisper_handle_t *innervoice_whisper_create(const char *cache_dir) {
    std::filesystem::path path = cache_dir ? std::filesystem::path(cache_dir) : resolve_cache_dir();
    g_last_error.clear();
    auto handle = new innervoice_whisper_handle_t{std::make_unique<innervoice::WhisperBridge>(path)};
    return handle;
}

void innervoice_whisper_destroy(innervoice_whisper_handle_t *handle) {
    delete handle;
}

bool innervoice_whisper_load_model(innervoice_whisper_handle_t *handle, innervoice_model_info_t info) {
    g_last_error.clear();
    try {
        handle->instance->load_model({info.name, info.url, static_cast<std::uintmax_t>(info.size_bytes)});
        return true;
    } catch (const std::exception &ex) {
        g_last_error = ex.what();
    } catch (...) {
        g_last_error = "unknown error";
    }
    return false;
}

innervoice_transcription_result_t innervoice_whisper_transcribe(
    innervoice_whisper_handle_t *handle,
    const int16_t *pcm,
    size_t frame_count,
    int sample_rate,
    bool translate,
    bool diarize,
    int max_threads) {
    g_last_error.clear();
    try {
        std::vector<int16_t> data(pcm, pcm + frame_count);
        auto result = handle->instance->transcribe_pcm16(
            data, sample_rate, {translate, diarize, max_threads});
        auto *text = new char[result.text.size() + 1];
        std::copy(result.text.begin(), result.text.end(), text);
        text[result.text.size()] = '\0';
        return {text, result.duration_ms};
    } catch (const std::exception &ex) {
        g_last_error = ex.what();
    } catch (...) {
        g_last_error = "unknown error";
    }
    return {nullptr, 0.0};
}

void innervoice_whisper_free_result(innervoice_transcription_result_t result) {
    delete[] result.text;
}

const char *innervoice_whisper_last_error() {
    return g_last_error.c_str();
}

}
