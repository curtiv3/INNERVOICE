#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(IVWhisperModule, RCTEventEmitter)

RCT_EXTERN_METHOD(loadModel:(NSDictionary *)model
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(transcribe:(NSData *)pcmData
                  sampleRate:(nonnull NSNumber *)sampleRate
                  translate:(nonnull NSNumber *)translate
                  diarize:(nonnull NSNumber *)diarize
                  maxThreads:(nonnull NSNumber *)maxThreads
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
