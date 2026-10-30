#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
VERSION="v22.23.4"
FOLDER="node-$VERSION-win-x64"
SHA256="cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) ;;
  *) printf '%s\n' 'On macOS/Linux, install Node.js 20.19+ or 22.12+ before development.'; exit 0 ;;
esac
if [ ! -f ".tools/$FOLDER/node.exe" ]; then
  mkdir -p .tools
  curl --fail --location --connect-timeout 20 --max-time 240 \
    "https://nodejs.org/dist/$VERSION/$FOLDER.zip" --output ".tools/$FOLDER.zip"
  printf '%s  %s\n' "$SHA256" ".tools/$FOLDER.zip" | sha256sum --check -
  unzip -q -o ".tools/$FOLDER.zip" -d .tools
fi
".tools/$FOLDER/node.exe" --version
printf '%s\n' 'Project-local Node is ready. The system Node installation was not changed.'
