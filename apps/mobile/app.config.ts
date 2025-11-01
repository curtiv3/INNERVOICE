import { type ConfigContext, type ExpoConfig } from 'expo/config';

const ANDROID_PACKAGE = 'com.innervoice.app';
const IOS_BUNDLE_IDENTIFIER = 'com.innervoice.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'InnerVoice',
  slug: 'innervoice',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'innervoice',
  userInterfaceStyle: 'automatic',
  jsEngine: 'hermes',
  extra: {
    ...config.extra
  },
  platforms: ['ios', 'android'],
  plugins: [
    './plugins/withReleaseSigning'
  ],
  android: {
    ...config.android,
    package: ANDROID_PACKAGE,
    versionCode: 1,
    permissions: ['RECORD_AUDIO']
  },
  ios: {
    ...config.ios,
    bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
    buildNumber: '1.0.0',
    supportsTablet: true,
    infoPlist: {
      ...config.ios?.infoPlist,
      NSMicrophoneUsageDescription: 'InnerVoice benötigt Zugriff auf das Mikrofon, um deine Selbstgespräche lokal zu transkribieren.'
    }
  },
  updates: {
    ...config.updates,
    checkAutomatically: 'ON_LOAD'
  },
  runtimeVersion: {
    policy: 'sdkVersion'
  },
  assetBundlePatterns: ['**/*']
});
