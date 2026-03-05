#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: folder ini bukan git repository."
  exit 1
fi

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # Gunakan Node 22 sesuai requirement project bila nvm tersedia.
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null || true
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm tidak ditemukan. Jalankan 'nvm use 22' lalu ulangi."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree belum bersih. Commit/stash dulu sebelum push."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Error: remote 'origin' belum ada."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "$CURRENT_BRANCH" ]; then
  echo "Error: tidak bisa mendeteksi branch aktif."
  exit 1
fi

echo "==> Menjalankan test (apps/web)..."
(cd apps/web && npm run test)

echo
read -r -p "Masukkan versi release (contoh: 0.1.1 atau v0.1.1): " INPUT_VERSION
if [ -z "$INPUT_VERSION" ]; then
  echo "Error: versi tidak boleh kosong."
  exit 1
fi

TAG="$INPUT_VERSION"
if [[ "$TAG" != v* ]]; then
  TAG="v$TAG"
fi
VERSION="${TAG#v}"

if ! [[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)*$ ]]; then
  echo "Error: format versi tidak valid. Gunakan format semver, contoh v0.1.1"
  exit 1
fi

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Error: tag $TAG sudah ada."
  exit 1
fi

echo "==> Bump apps/web/package.json ke versi $VERSION..."
(
  cd apps/web
  npm version "$VERSION" --no-git-tag-version >/dev/null
  echo "==> Syncing versi native iOS & Android & SW..."
  npm run cap:sync-version >/dev/null
)

echo "==> Commit perubahan versi..."
git add apps/web/package.json
if [ -f "apps/web/package-lock.json" ]; then
  git add apps/web/package-lock.json
fi

# Add Android and iOS version files to the commit if they exist
if [ -f "apps/web/android/app/build.gradle" ]; then
  git add apps/web/android/app/build.gradle
fi
if [ -f "apps/web/ios/App/App/Info.plist" ]; then
  git add apps/web/ios/App/App/Info.plist
fi
if [ -f "apps/web/public/sw.js" ]; then
  git add apps/web/public/sw.js
fi

if git diff --cached --quiet; then
  echo "Error: tidak ada perubahan versi yang bisa di-commit."
  exit 1
fi

git commit -m "chore(release): bump web version to $VERSION"

echo "==> Membuat tag $TAG..."
git tag -a "$TAG" -m "release $TAG"

echo "==> Push branch $CURRENT_BRANCH ke origin..."
git push -u origin "$CURRENT_BRANCH"

echo "==> Push tag $TAG ke origin..."
git push origin "$TAG"

echo
echo "Selesai: branch '$CURRENT_BRANCH' dan tag '$TAG' sudah ter-push."
