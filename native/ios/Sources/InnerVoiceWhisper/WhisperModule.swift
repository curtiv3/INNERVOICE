import Foundation
import React
import InnerVoiceWhisper

@objc(IVWhisperModule)
class IVWhisperModule: RCTEventEmitter {
    private var handle: UnsafeMutableRawPointer?
    private var currentModel: ModelInfo?

    struct ModelInfo {
        let name: String
        let url: String
        let sizeBytes: UInt64
    }

    override static func requiresMainQueueSetup() -> Bool {
        false
    }

    override func supportedEvents() -> [String]! {
        ["onTranscription"]
    }

    @objc(loadModel:resolver:rejecter:)
    func loadModel(model: NSDictionary, resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
        guard
            let name = model["name"] as? String,
            let url = model["url"] as? String,
            let size = model["sizeBytes"] as? NSNumber
        else {
            rejecter("invalid_model", "Model payload missing required fields", nil)
            return
        }

        if handle == nil {
            handle = innervoice_whisper_create(nil)
        }

        let info = innervoice_model_info_t(name: name, url: url, size_bytes: size.uint64Value)
        if innervoice_whisper_load_model(handle, info) {
            currentModel = ModelInfo(name: name, url: url, sizeBytes: size.uint64Value)
            resolver(nil)
        } else {
            let errorPtr = innervoice_whisper_last_error()
            let message = errorPtr != nil ? String(cString: errorPtr!) : "Unknown error"
            rejecter("load_failed", message, nil)
        }
    }

    @objc(transcribe:sampleRate:translate:diarize:maxThreads:resolver:rejecter:)
    func transcribe(pcmData: NSData,
                    sampleRate: NSNumber,
                    translate: NSNumber,
                    diarize: NSNumber,
                    maxThreads: NSNumber,
                    resolver: RCTPromiseResolveBlock,
                    rejecter: RCTPromiseRejectBlock) {
        guard let handle = handle else {
            rejecter("no_model", "No Whisper model loaded", nil)
            return
        }

        let frames = pcmData.length / MemoryLayout<Int16>.size
        guard frames * MemoryLayout<Int16>.size == pcmData.length else {
            rejecter("invalid_audio", "PCM payload must contain 16-bit samples", nil)
            return
        }
        let result = pcmData.bytes.bindMemory(to: Int16.self, capacity: frames)
        let transcription = innervoice_whisper_transcribe(handle,
                                                          result,
                                                          frames,
                                                          Int32(sampleRate.intValue),
                                                          translate.boolValue,
                                                          diarize.boolValue,
                                                          Int32(maxThreads.intValue))

        if let textPtr = transcription.text {
            let text = String(cString: textPtr)
            innervoice_whisper_free_result(transcription)
            sendEvent(withName: "onTranscription", body: [
                "text": text,
                "durationMs": transcription.duration_ms,
                "model": currentModel?.name ?? ""
            ])
            resolver(text)
        } else {
            let errorPtr = innervoice_whisper_last_error()
            let message = errorPtr != nil ? String(cString: errorPtr!) : "Unknown error"
            rejecter("transcription_failed", message, nil)
        }
    }

    deinit {
        if let handle = handle {
            innervoice_whisper_destroy(handle)
        }
    }
}
