package com.innervoice.whisper

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class WhisperModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var nativeHandle: Long = 0
    private var currentModel: Map<String, Any>? = null

    init {
        nativeHandle = nativeCreate(reactContext.cacheDir.absolutePath)
    }

    override fun getName(): String = "IVWhisperModule"

    @ReactMethod
    fun loadModel(model: Map<String, Any>, promise: Promise) {
        val name = model["name"] as? String
        val url = model["url"] as? String
        val size = (model["sizeBytes"] as? Number)?.toLong()
        if (name == null || url == null || size == null) {
            promise.reject("invalid_model", "Model payload missing required fields")
            return
        }
        if (nativeLoadModel(nativeHandle, name, url, size)) {
            currentModel = model
            promise.resolve(null)
        } else {
            promise.reject("load_failed", nativeLastError() ?: "Unknown error")
        }
    }

    @ReactMethod
    fun transcribe(pcmData: ByteArray,
                   sampleRate: Int,
                   translate: Boolean,
                   diarize: Boolean,
                   maxThreads: Int,
                   promise: Promise) {
        if (nativeHandle == 0L) {
            promise.reject("no_model", "No Whisper model loaded")
            return
        }
        if (pcmData.size % 2 != 0) {
            promise.reject("invalid_audio", "PCM payload must contain 16-bit samples")
            return
        }
        val shortArray = ShortArray(pcmData.size / 2)
        for (i in shortArray.indices) {
            val lo = pcmData[i * 2].toInt() and 0xFF
            val hi = pcmData[i * 2 + 1].toInt() and 0xFF
            shortArray[i] = (((hi shl 8) or lo)).toShort()
        }
        val result = nativeTranscribe(nativeHandle, shortArray, sampleRate, translate, diarize, maxThreads)
        if (result != null) {
            val map = Arguments.createMap()
            map.putString("text", result["text"] as? String)
            map.putDouble("durationMs", result["durationMs"] as? Double ?: 0.0)
            currentModel?.get("name")?.let { map.putString("model", it as String) }
            reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("onTranscription", map)
            promise.resolve(result["text"] as? String)
        } else {
            promise.reject("transcription_failed", nativeLastError() ?: "Unknown error")
        }
    }

    override fun invalidate() {
        super.invalidate()
        if (nativeHandle != 0L) {
            nativeDestroy(nativeHandle)
            nativeHandle = 0
        }
    }

    private external fun nativeCreate(cacheDir: String): Long
    private external fun nativeDestroy(handle: Long)
    private external fun nativeLoadModel(handle: Long, name: String, url: String, sizeBytes: Long): Boolean
    private external fun nativeTranscribe(handle: Long,
                                          pcm: ShortArray,
                                          sampleRate: Int,
                                          translate: Boolean,
                                          diarize: Boolean,
                                          maxThreads: Int): Map<String, Any>?
    private external fun nativeLastError(): String?

    companion object {
        init {
            System.loadLibrary("whisper_jni")
        }
    }
}
