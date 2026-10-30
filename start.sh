#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
if [ -d "$ROOT/.tools/node-v22.23.4-win-x64" ]; then
  export PATH="$ROOT/.tools/node-v22.23.4-win-x64:$PATH"
fi
if [ ! -f dist/index.html ]; then
  printf '%s\n' 'Building HTML Studio for the first time...'
  if [ ! -d node_modules ]; then npm ci; fi
  npm run build
fi
exec node scripts/launcher.cjs start "$@"
