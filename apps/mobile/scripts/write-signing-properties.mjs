#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const required = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD'
];

const missing = required.filter(name => !process.env[name] || process.env[name]?.length === 0);
if (missing.length > 0) {
  console.error(`Missing Android signing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const storeFile = process.env.ANDROID_KEYSTORE_PATH;
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD;
const storeType = process.env.ANDROID_KEYSTORE_TYPE;

const destination = resolve(process.cwd(), 'android', 'signing.properties');
mkdirSync(dirname(destination), { recursive: true });

const lines = [
  `storeFile=${storeFile}`,
  `storePassword=${storePassword}`,
  `keyAlias=${keyAlias}`,
  `keyPassword=${keyPassword}`
];
if (storeType) {
  lines.push(`storeType=${storeType}`);
}

writeFileSync(destination, lines.join('\n'), { encoding: 'utf8' });
console.log(`✓ Wrote Android signing properties to ${destination}`);
