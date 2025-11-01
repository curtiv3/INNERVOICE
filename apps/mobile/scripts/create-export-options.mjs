#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const teamId = requiredEnv('IOS_TEAM_ID');
const method = process.env.IOS_EXPORT_METHOD ?? 'app-store';
const bundleId = process.env.IOS_BUNDLE_IDENTIFIER ?? 'com.innervoice.app';
const provisioningProfile = process.env.IOS_PROVISIONING_PROFILE;
const signingCertificate = process.env.IOS_SIGNING_CERTIFICATE;
const signingStyle = process.env.IOS_SIGNING_STYLE ?? 'manual';

const exportPlist = buildExportOptions({
  method,
  teamId,
  bundleId,
  provisioningProfile,
  signingCertificate,
  signingStyle
});

const destination = resolve(process.cwd(), 'ios', 'ExportOptions.plist');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, exportPlist, { encoding: 'utf8' });
console.log(`✓ Wrote iOS export options to ${destination}`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function buildExportOptions(params) {
  const { method, teamId, bundleId, provisioningProfile, signingCertificate, signingStyle } = params;
  const provisioningBlock = provisioningProfile
    ? `    <key>${bundleId}</key>\n    <string>${provisioningProfile}</string>\n`
    : '';

  const certificateBlock = signingCertificate
    ? `  <key>signingCertificate</key>\n  <string>${signingCertificate}</string>\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n` +
    `<plist version="1.0">\n` +
    `<dict>\n` +
    `  <key>method</key>\n  <string>${method}</string>\n` +
    `  <key>teamID</key>\n  <string>${teamId}</string>\n` +
    `  <key>signingStyle</key>\n  <string>${signingStyle}</string>\n` +
    certificateBlock +
    (provisioningBlock
      ? `  <key>provisioningProfiles</key>\n  <dict>\n${provisioningBlock}  </dict>\n`
      : '') +
    `  <key>stripSwiftSymbols</key>\n  <true/>\n` +
    `  <key>uploadBitcode</key>\n  <false/>\n` +
    `</dict>\n</plist>\n`;
}
