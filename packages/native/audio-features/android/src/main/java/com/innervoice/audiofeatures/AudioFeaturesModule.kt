package com.innervoice.audiofeatures

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AudioFeaturesModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  external fun nativeExtractFeatures(path: String): DoubleArray

  override fun getName(): String = "AudioFeaturesModule"

  init {
    System.loadLibrary("audiofeatures")
  }

  @ReactMethod
  fun extractAudioFeatures(fileUri: String, promise: Promise) {
    try {
      val uri = Uri.parse(fileUri)
      val path = uri.path ?: fileUri
      val resolvedPath = if (path.startsWith("/")) path else File(path).absolutePath
      val features = nativeExtractFeatures(resolvedPath)
      if (features.size < 7) {
        promise.reject("invalid_features", "Native module returned incomplete data")
        return
      }
      val map = Arguments.createMap().apply {
        putDouble("duration", features[0])
        putDouble("rms_mean", features[1])
        putDouble("rms_std", features[2])
        putDouble("zcr_mean", features[3])
        if (features[4] <= 0.0) {
          putNull("f0_mean")
        } else {
          putDouble("f0_mean", features[4])
        }
        putDouble("f0_stability", features[5])
        putDouble("speech_ratio", features[6])
      }
      promise.resolve(map)
    } catch (t: Throwable) {
      promise.reject("audio_features_error", t)
    }
  }
}
