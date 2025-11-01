import { NativeModules } from 'react-native';

type RecordingSession = {
  sessionId: string;
};

type RecordingResult = {
  fileUri: string;
  duration: number;
};

const Recorder: undefined | {
  start(): Promise<RecordingSession>;
  stop(sessionId: string): Promise<RecordingResult>;
} = NativeModules?.InnerVoiceRecorder;

export async function startRecording(): Promise<RecordingSession> {
  if (Recorder?.start) {
    return Recorder.start();
  }
  console.warn('InnerVoiceRecorder native module not found – using mock recorder');
  return { sessionId: `mock-${Date.now()}` };
}

export async function stopRecording(sessionId: string): Promise<RecordingResult> {
  if (Recorder?.stop) {
    return Recorder.stop(sessionId);
  }
  const fileUri = `file:///mock/${sessionId}.wav`;
  return { fileUri, duration: 5 };
}
