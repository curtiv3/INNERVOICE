#!/usr/bin/env bash
set -euo pipefail

npx expo prebuild --platform android --no-install
node ./scripts/write-signing-properties.mjs
pushd android >/dev/null
./gradlew bundleRelease
popd >/dev/null
