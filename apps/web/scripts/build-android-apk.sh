#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
OUTPUT_DIR="${ANDROID_APK_OUTPUT_DIR:-$ROOT_DIR/build/android-apk}"
BUILD_TYPE="${ANDROID_BUILD_TYPE:-release}"
OUTPUT_FORMAT="${ANDROID_OUTPUT_FORMAT:-apk}"
PACKAGE_NAME="${ANDROID_PACKAGE_NAME:-com.kemana.app.beta}"
APP_NAME="${ANDROID_APP_NAME:-KeMana Beta}"
RESTORE_PACKAGE_NAME="${ANDROID_RESTORE_PACKAGE_NAME:-com.kemana.app.dev}"
RESTORE_APP_NAME="${ANDROID_RESTORE_APP_NAME:-KeMana Dev}"
SKIP_WEB_BUILD=false
SKIP_SYNC=false
RESTORE_AFTER_BUILD=true

usage() {
  cat <<'EOF'
Build and export Android APK/AAB for this Capacitor app.

Usage:
  npm run apk:android -- [--skip-web-build] [--skip-sync] [--no-restore-sync] [--aab]

Options:
  --skip-web-build     Skip web app build
  --skip-sync          Skip Capacitor sync
  --no-restore-sync    Don't restore to dev variant after build
  --aab                Build AAB instead of APK (for Play Store)

Environment variables:
  ANDROID_PACKAGE_NAME         Package name for build (default: com.kemana.app.beta)
  ANDROID_APP_NAME             App name for build (default: KeMana Beta)
  ANDROID_RESTORE_PACKAGE_NAME Package name restored after build (default: com.kemana.app.dev)
  ANDROID_RESTORE_APP_NAME     App name restored after build (default: KeMana Dev)
  ANDROID_BUILD_TYPE           Build type: release or debug (default: release)
  ANDROID_OUTPUT_FORMAT        Output format: apk or aab (default: apk)
  ANDROID_APK_OUTPUT_DIR       Output directory (default: ./build/android-apk)

Examples:
  # Build beta APK
  npm run apk:android

  # Build production APK
  ANDROID_PACKAGE_NAME=com.kemana.app ANDROID_APP_NAME="KeMana" npm run apk:android

  # Build AAB for Play Store
  npm run apk:android -- --aab

  # Build without web rebuild
  npm run apk:android -- --skip-web-build
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
      RESTORE_AFTER_BUILD=false
      shift
      ;;
    --aab)
      OUTPUT_FORMAT="aab"
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

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "Missing Android directory: $ANDROID_DIR"
  echo "Run: npx cap add android"
  exit 1
fi

if ! command -v ./gradlew >/dev/null 2>&1 && ! command -v gradle >/dev/null 2>&1; then
  if [[ ! -f "$ANDROID_DIR/gradlew" ]]; then
    echo "Gradle wrapper not found. Please ensure Android project is properly set up."
    exit 1
  fi
fi

mkdir -p "$OUTPUT_DIR"

cd "$ROOT_DIR"

# Load environment variables
if [[ -f ".env.local" ]]; then
  echo "==> Loading environment variables from .env.local"
  set -a
  source .env.local
  set +a
fi

if [[ "$SKIP_WEB_BUILD" != true ]]; then
  echo "==> Building web app"
  npm run build
fi

if [[ "$SKIP_SYNC" != true ]]; then
  echo "==> Syncing Capacitor Android project"
  echo "    Package: $PACKAGE_NAME"
  echo "    App Name: $APP_NAME"
  
  # Show which OAuth client ID will be used
  if [[ "$PACKAGE_NAME" == "com.kemana.app" && -n "${GOOGLE_ANDROID_CLIENT_ID_PROD:-}" ]]; then
    echo "    Using production OAuth client ID"
  else
    echo "    Using development/beta OAuth client ID"
  fi
  
  CAP_APP_ID="$PACKAGE_NAME" CAP_APP_NAME="$APP_NAME" npx cap sync android
fi

cd "$ANDROID_DIR"

if [[ "$OUTPUT_FORMAT" == "aab" ]]; then
  echo "==> Building Android App Bundle (AAB)"
  GRADLE_TASK="bundle${BUILD_TYPE^}"
  ./gradlew "$GRADLE_TASK"
  
  BUILD_OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/bundle/${BUILD_TYPE}"
  OUTPUT_FILE=$(find "$BUILD_OUTPUT_DIR" -type f -name "*.aab" | head -n 1)
  
  if [[ -z "$OUTPUT_FILE" ]]; then
    echo "Build finished but no .aab found in $BUILD_OUTPUT_DIR"
    exit 1
  fi
  
  FINAL_NAME="${PACKAGE_NAME}-${BUILD_TYPE}.aab"
  cp "$OUTPUT_FILE" "$OUTPUT_DIR/$FINAL_NAME"
  OUTPUT_PATH="$OUTPUT_DIR/$FINAL_NAME"
else
  echo "==> Building Android APK"
  GRADLE_TASK="assemble${BUILD_TYPE^}"
  ./gradlew "$GRADLE_TASK"
  
  BUILD_OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/${BUILD_TYPE}"
  OUTPUT_FILE=$(find "$BUILD_OUTPUT_DIR" -type f -name "*.apk" | head -n 1)
  
  if [[ -z "$OUTPUT_FILE" ]]; then
    echo "Build finished but no .apk found in $BUILD_OUTPUT_DIR"
    exit 1
  fi
  
  FINAL_NAME="${PACKAGE_NAME}-${BUILD_TYPE}.apk"
  cp "$OUTPUT_FILE" "$OUTPUT_DIR/$FINAL_NAME"
  OUTPUT_PATH="$OUTPUT_DIR/$FINAL_NAME"
fi

echo ""
echo "✓ Build complete!"
echo "  Output: $OUTPUT_PATH"
echo "  Package: $PACKAGE_NAME"
echo "  Build Type: $BUILD_TYPE"

cd "$ROOT_DIR"

if [[ "$SKIP_SYNC" != true && "$RESTORE_AFTER_BUILD" == true ]]; then
  echo ""
  echo "==> Restoring Android project to dev variant"
  CAP_APP_ID="$RESTORE_PACKAGE_NAME" CAP_APP_NAME="$RESTORE_APP_NAME" npx cap sync android
  echo "    Restored to: $RESTORE_PACKAGE_NAME ($RESTORE_APP_NAME)"
fi

echo ""
echo "Done."
