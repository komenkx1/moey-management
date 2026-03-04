#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
DERIVED_DATA_LINK="$IOS_DIR/DerivedData"
DERIVED_DATA_TARGET="/tmp/moey-ios-deriveddata"

mkdir -p "$DERIVED_DATA_TARGET"

# Clean stale Finder-duplicated links like "DerivedData 2"/"DerivedData 3".
find "$IOS_DIR" -maxdepth 1 -type l -name "DerivedData *" -exec rm {} +

if [ -L "$DERIVED_DATA_LINK" ]; then
  CURRENT_TARGET="$(readlink "$DERIVED_DATA_LINK" || true)"
  if [ "$CURRENT_TARGET" != "$DERIVED_DATA_TARGET" ]; then
    rm "$DERIVED_DATA_LINK"
    ln -s "$DERIVED_DATA_TARGET" "$DERIVED_DATA_LINK"
  fi
elif [ -d "$DERIVED_DATA_LINK" ]; then
  rm -rf "$DERIVED_DATA_LINK"
  ln -s "$DERIVED_DATA_TARGET" "$DERIVED_DATA_LINK"
else
  ln -s "$DERIVED_DATA_TARGET" "$DERIVED_DATA_LINK"
fi

# Clean problematic macOS metadata that can break codesign on framework bundles.
if command -v xattr >/dev/null 2>&1; then
  xattr -cr "$IOS_DIR/App/Pods" "$IOS_DIR/capacitor-cordova-ios-plugins" 2>/dev/null || true
fi
