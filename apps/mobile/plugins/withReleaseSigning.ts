import {
  type ConfigPlugin,
  createRunOncePlugin,
  withAppBuildGradle
} from '@expo/config-plugins';

const SIGNING_PROPERTIES_SNIPPET = `def signingPropertiesFile = rootProject.file("signing.properties")
def signingProperties = new java.util.Properties()
if (signingPropertiesFile.exists()) {
    signingPropertiesFile.withInputStream { stream ->
        signingProperties.load(stream)
    }
}`;

const SIGNING_CONFIG_SNIPPET = `signingConfigs {
    release {
        if (signingProperties['storeFile']) {
            storeFile file(signingProperties['storeFile'])
            storePassword signingProperties['storePassword']
            keyAlias signingProperties['keyAlias']
            keyPassword signingProperties['keyPassword']
        }
    }
}`;

const RELEASE_LINK_SNIPPET = `if (signingProperties['storeFile']) {
            signingConfig signingConfigs.release
        }`;

const withReleaseSigningBase: ConfigPlugin = config => {
  return withAppBuildGradle(config, gradleConfig => {
    const { modResults } = gradleConfig;
    if (modResults.language !== 'groovy') {
      return gradleConfig;
    }

    let contents = modResults.contents;

    const needsProperties = !contents.includes('signing.properties');
    const needsConfigBlock = !contents.includes('signingConfigs {');

    const insertions: string[] = [];
    if (needsProperties) {
      insertions.push(indentBlock(SIGNING_PROPERTIES_SNIPPET));
    }
    if (needsConfigBlock) {
      insertions.push(indentBlock(SIGNING_CONFIG_SNIPPET));
    }

    if (insertions.length > 0) {
      contents = contents.replace(/android\s*\{/, match => `${match}\n${insertions.join('\n')}\n`);
    }

    if (!contents.includes('signingConfig signingConfigs.release')) {
      contents = contents.replace(/release\s*\{/, match => `${match}\n        ${RELEASE_LINK_SNIPPET}\n`);
    }

    modResults.contents = contents;
    return gradleConfig;
  });
};

const indentBlock = (block: string, indent = '    '): string =>
  block
    .split('\n')
    .map(line => (line.length > 0 ? indent + line : line))
    .join('\n');

export default createRunOncePlugin(withReleaseSigningBase, 'withReleaseSigning', '1.0.0');
