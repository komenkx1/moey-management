#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios/App"
WORKSPACE_PATH="$IOS_DIR/App.xcworkspace"
OUTPUT_DIR="${IOS_IPA_OUTPUT_DIR:-$ROOT_DIR/build/ios-ipa}"
ARCHIVE_PATH="$OUTPUT_DIR/App.xcarchive"
EXPORT_OPTIONS_PATH="$OUTPUT_DIR/exportOptions.plist"
SCHEME="${IOS_SCHEME:-App}"
CONFIGURATION="${IOS_CONFIGURATION:-Release}"
EXPORT_METHOD="${IOS_EXPORT_METHOD:-development}"
APP_ID="${IOS_APP_ID:-com.kemana.app.beta}"
APP_NAME="${IOS_APP_NAME:-KeMana Beta}"
RESTORE_APP_ID="${IOS_RESTORE_APP_ID:-com.kemana.app.dev}"
RESTORE_APP_NAME="${IOS_RESTORE_APP_NAME:-KeMana Dev}"
SKIP_WEB_BUILD=false
SKIP_SYNC=false
RESTORE_AFTER_EXPORT=true

usage() {
  cat <<'EOF'
Build and export iOS IPA for this Capacitor app.

Usage:
  npm run ipa:ios -- [--skip-web-build] [--skip-sync] [--no-restore-sync]

Environment variables:
  IOS_APP_ID           Bundle ID to use during IPA sync (default: com.kemana.app.beta)
  IOS_APP_NAME         App name to use during IPA sync (default: KeMana Beta)
  IOS_RESTORE_APP_ID   Bundle ID restored after export (default: com.kemana.app.dev)
  IOS_RESTORE_APP_NAME App name restored after export (default: KeMana Dev)
  IOS_TEAM_ID          Optional Apple Team ID for exportOptions.plist
  IOS_EXPORT_METHOD    Export method (default: development)
  IOS_SCHEME           Xcode scheme (default: App)
  IOS_CONFIGURATION    Build config (default: Release)
  IOS_IPA_OUTPUT_DIR   Output dir (default: ./build/ios-ipa)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-web-build)
      SKIP_WEB_BUILD=true
      shift
      ;;
    --skip-sync)
      SKIP_SYNC=true
      shift
      ;;
    --no-restore-sync)
      RESTORE_AFTER_EXPORT=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script only works on macOS."
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required but not found."
  exit 1
fi

if [[ ! -d "$WORKSPACE_PATH" ]]; then
  echo "Missing workspace: $WORKSPACE_PATH"
  echo "Run: npx cap sync ios"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
rm -rf "$ARCHIVE_PATH"

cd "$ROOT_DIR"

if [[ "$SKIP_WEB_BUILD" != true ]]; then
  echo "==> Building web app"
  npm run build
fi

if [[ "$SKIP_SYNC" != true ]]; then
  echo "==> Syncing Capacitor iOS project"
  CAP_APP_ID="$APP_ID" CAP_APP_NAME="$APP_NAME" npx cap sync ios
fi

echo "==> Generating exportOptions.plist"
cat > "$EXPORT_OPTIONS_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${EXPORT_METHOD}</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>destination</key>
  <string>export</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>compileBitcode</key>
  <false/>
EOF

if [[ -n "${IOS_TEAM_ID:-}" ]]; then
  cat >> "$EXPORT_OPTIONS_PATH" <<EOF
  <key>teamID</key>
  <string>${IOS_TEAM_ID}</string>
EOF
fi

cat >> "$EXPORT_OPTIONS_PATH" <<'EOF'
</dict>
</plist>
EOF

echo "==> Archiving iOS app"
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  archive

echo "==> Exporting IPA"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$OUTPUT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PATH"

IPA_PATH="$(find "$OUTPUT_DIR" -maxdepth 1 -type f -name '*.ipa' | head -n 1)"
if [[ -z "$IPA_PATH" ]]; then
  echo "Export finished but no .ipa found in $OUTPUT_DIR"
  exit 1
fi

echo "Done."
echo "IPA: $IPA_PATH"

if [[ "$SKIP_SYNC" != true && "$RESTORE_AFTER_EXPORT" == true ]]; then
  echo "==> Restoring iOS project to dev variant"
  CAP_APP_ID="$RESTORE_APP_ID" CAP_APP_NAME="$RESTORE_APP_NAME" npx cap sync ios
  echo "Restored to: $RESTORE_APP_ID ($RESTORE_APP_NAME)"
fi
