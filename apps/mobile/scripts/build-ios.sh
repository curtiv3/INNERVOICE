#!/usr/bin/env bash
set -euo pipefail

: "${IOS_TEAM_ID:?IOS_TEAM_ID environment variable is required}"

npx expo prebuild --platform ios --no-install
node ./scripts/create-export-options.mjs

IOS_WORKSPACE=${IOS_WORKSPACE:-InnerVoice.xcworkspace}
IOS_SCHEME=${IOS_SCHEME:-InnerVoice}
IOS_ARCHIVE_PATH=${IOS_ARCHIVE_PATH:-./build/InnerVoice.xcarchive}
IOS_EXPORT_PATH=${IOS_EXPORT_PATH:-./build}

pushd ios >/dev/null
xcodebuild \
  -workspace "$IOS_WORKSPACE" \
  -scheme "$IOS_SCHEME" \
  -configuration Release \
  -archivePath "$IOS_ARCHIVE_PATH" \
  archive \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID"

xcodebuild \
  -exportArchive \
  -archivePath "$IOS_ARCHIVE_PATH" \
  -exportOptionsPlist ./ExportOptions.plist \
  -exportPath "$IOS_EXPORT_PATH"
popd >/dev/null
