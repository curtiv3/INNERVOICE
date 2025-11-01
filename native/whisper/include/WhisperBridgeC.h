#pragma once

#include <cstdint>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#else
#include <stdbool.h>
#endif

typedef struct {
    const char *name;
    const char *url;
    uint64_t size_bytes;
} innervoice_model_info_t;

typedef struct {
    const char *text;
    double duration_ms;
} innervoice_transcription_result_t;

typedef struct innervoice_whisper_handle_t innervoice_whisper_handle_t;

innervoice_whisper_handle_t *innervoice_whisper_create(const char *cache_dir);
void innervoice_whisper_destroy(innervoice_whisper_handle_t *handle);
bool innervoice_whisper_load_model(innervoice_whisper_handle_t *handle, innervoice_model_info_t info);
innervoice_transcription_result_t innervoice_whisper_transcribe(
    innervoice_whisper_handle_t *handle,
    const int16_t *pcm,
    size_t frame_count,
    int sample_rate,
    bool translate,
    bool diarize,
    int max_threads);
void innervoice_whisper_free_result(innervoice_transcription_result_t result);
const char *innervoice_whisper_last_error();

#ifdef __cplusplus
}
#endif

