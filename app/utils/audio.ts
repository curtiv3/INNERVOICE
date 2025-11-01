import { PermissionsAndroid, Platform } from 'react-native';
import { useRef, useState } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing';

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const bufferRef = useRef<Int16Array>(new Int16Array());

  async function requestPermission() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  async function start() {
    if (!(await requestPermission())) {
      throw new Error('Microphone permission denied');
    }
    setState('recording');
    bufferRef.current = new Int16Array();
  }

  async function stop() {
    setState('processing');
    const data = bufferRef.current;
    bufferRef.current = new Int16Array();
    setState('idle');
    return data;
  }

  return {
    state,
    start,
    stop,
  };
}
