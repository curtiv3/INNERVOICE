#include <jni.h>

#include <cstdint>
#include <cstring>
#include <vector>

#include "WhisperBridgeC.h"

extern "C" JNIEXPORT jlong JNICALL
Java_com_innervoice_whisper_WhisperModule_nativeCreate(JNIEnv *env, jobject /*thiz*/, jstring cacheDir) {
    const char *path = cacheDir ? env->GetStringUTFChars(cacheDir, nullptr) : nullptr;
    auto *handle = innervoice_whisper_create(path);
    if (path) {
        env->ReleaseStringUTFChars(cacheDir, path);
    }
    return reinterpret_cast<jlong>(handle);
}

extern "C" JNIEXPORT void JNICALL
Java_com_innervoice_whisper_WhisperModule_nativeDestroy(JNIEnv *env, jobject /*thiz*/, jlong handle) {
    innervoice_whisper_destroy(reinterpret_cast<innervoice_whisper_handle_t *>(handle));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_innervoice_whisper_WhisperModule_nativeLoadModel(JNIEnv *env, jobject /*thiz*/, jlong handle,
                                                          jstring name, jstring url, jlong sizeBytes) {
    auto *bridge = reinterpret_cast<innervoice_whisper_handle_t *>(handle);
    innervoice_model_info_t info{};
    const char *nameChars = env->GetStringUTFChars(name, nullptr);
    const char *urlChars = env->GetStringUTFChars(url, nullptr);
    info.name = nameChars;
    info.url = urlChars;
    info.size_bytes = static_cast<uint64_t>(sizeBytes);
    const bool ok = innervoice_whisper_load_model(bridge, info);
    env->ReleaseStringUTFChars(name, nameChars);
    env->ReleaseStringUTFChars(url, urlChars);
    return ok;
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_innervoice_whisper_WhisperModule_nativeTranscribe(JNIEnv *env, jobject /*thiz*/, jlong handle,
                                                           jshortArray pcm, jint sampleRate, jboolean translate,
                                                           jboolean diarize, jint maxThreads) {
    auto *bridge = reinterpret_cast<innervoice_whisper_handle_t *>(handle);
    const jsize length = env->GetArrayLength(pcm);
    std::vector<int16_t> buffer(length);
    env->GetShortArrayRegion(pcm, 0, length, buffer.data());
    auto result = innervoice_whisper_transcribe(bridge,
                                                buffer.data(),
                                                static_cast<size_t>(length),
                                                sampleRate,
                                                translate,
                                                diarize,
                                                maxThreads);

    if (result.text == nullptr) {
        return nullptr;
    }

    jclass mapClass = env->FindClass("java/util/HashMap");
    jmethodID init = env->GetMethodID(mapClass, "<init>", "()V");
    jmethodID put = env->GetMethodID(mapClass, "put",
                                     "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;");
    jobject map = env->NewObject(mapClass, init);
    jstring textKey = env->NewStringUTF("text");
    jstring durationKey = env->NewStringUTF("durationMs");
    jstring textValue = env->NewStringUTF(result.text);
    jobject durationValue = env->NewObject(env->FindClass("java/lang/Double"),
                                           env->GetMethodID(env->FindClass("java/lang/Double"), "<init>", "(D)V"),
                                           result.duration_ms);
    env->CallObjectMethod(map, put, textKey, textValue);
    env->CallObjectMethod(map, put, durationKey, durationValue);
    env->DeleteLocalRef(textKey);
    env->DeleteLocalRef(durationKey);
    env->DeleteLocalRef(textValue);
    env->DeleteLocalRef(durationValue);
    innervoice_whisper_free_result(result);
    return map;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_innervoice_whisper_WhisperModule_nativeLastError(JNIEnv *env, jobject /*thiz*/) {
    const char *error = innervoice_whisper_last_error();
    if (!error || std::strlen(error) == 0) {
        return nullptr;
    }
    return env->NewStringUTF(error);
}
