# InnerVoice Native Whisper Integration

This repository hosts the cross-platform native bindings for [whisper.cpp](https://github.com/ggerganov/whisper.cpp) and the JavaScript bridge used by the InnerVoice React Native application. The goal is to ship fully offline transcription with a one-tap recording UX.

## Directory structure

```
.
├── native/
│   ├── CMakeLists.txt            # Shared whisper binding build
│   ├── ios/                      # Swift package + React Native module
│   ├── android/                  # Android library module with JNI shim
│   └── whisper/                  # C++ binding, cache management
├── react-native-bridge/          # TypeScript wrapper for NativeModules
└── app/
    └── hooks/                    # Hooks consuming the bridge
```

## Building the native libraries

### Common

The `native/CMakeLists.txt` file downloads `whisper.cpp` (tag `v1.5.4`) and builds a static library named `whisper_binding`. The build expects `curl` to be present at runtime for model downloads.

```
mkdir -p build && cd build
cmake -S ../native -B . -DCMAKE_BUILD_TYPE=Release
cmake --build .
```

### iOS (Swift)

The Swift package exposes `IVWhisperModule`, which is automatically bridged to React Native using an Objective-C shim.

```
cd native/ios
swift build
```

To integrate with an existing app, add the package as a local dependency and register `IVWhisperModule` via autolinking.

### Android

The Android library uses Gradle with external native build support.

```
cd native/android
./gradlew assembleDebug
```

Gradle will invoke CMake, compile the JNI shim, and link against the shared whisper binding.

## React Native bridge

`react-native-bridge/src/index.ts` exports three helpers:

- `loadModel(model)` downloads (if needed) and loads a Whisper model via the native layer.
- `transcribe(pcm, sampleRate, options)` sends PCM16 audio buffers to the native layer.
- `addTranscriptionListener(listener)` subscribes to transcription events emitted from native code.

## One-tap transcription hook

`app/hooks/useOneTapTranscription.ts` orchestrates the recording flow:

1. Ensures a model preset is cached offline.
2. Starts recording (permission handling stubbed for brevity).
3. Stops recording, passes audio to the native bridge, and exposes the transcript state.

This hook can be wired to a single button in React Native to start/stop recording and display transcriptions.

## Offline model management

Models are cached under `~/.cache/innervoice` (or platform-specific alternatives). When a preset is requested, the `ModelCache` ensures the model file exists, downloading it via `curl` if necessary. Metadata is stored alongside the model for verification. The hook exposes multiple preset sizes so users can balance accuracy and storage footprint.
