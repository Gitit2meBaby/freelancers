#!/bin/bash
# startup.sh — runs before Next.js starts on every container boot.
#
# PURPOSE: Kudu's zip deploy extracts atomically but does not guarantee
# it deletes files from previous builds. Turbopack generates a new content
# hash per chunk per build. If old chunks survive alongside new ones,
# the Turbopack runtime can load the wrong version of a route — confirmed
# cause of CPU spikes (blobExists v4 chunk loading instead of v5 fix).
#
# This script identifies chunks that do NOT belong to the current build
# by comparing against the hashes referenced in [turbopack]_runtime.js,
# then deletes orphaned chunks before Node starts.

CHUNKS_DIR="/home/site/wwwroot/.next/server/chunks/ssr"
RUNTIME="$CHUNKS_DIR/[turbopack]_runtime.js"

echo "🧹 startup.sh: cleaning stale SSR chunks..."

if [ ! -f "$RUNTIME" ]; then
  echo "⚠️  No runtime found at $RUNTIME — skipping chunk cleanup"
else
  # Extract all chunk filenames that the current runtime actually references
  REFERENCED=$(grep -oP '[a-f0-9]{8}' "$RUNTIME" | sort -u)

  DELETED=0
  for chunk in "$CHUNKS_DIR"/*.js; do
    [ -f "$chunk" ] || continue
    BASENAME=$(basename "$chunk")
    # Skip the runtime itself and any file without an 8-char hex hash segment
    [[ "$BASENAME" == *"turbopack"* ]] && continue
    # Extract the hash from the filename
    HASH=$(echo "$BASENAME" | grep -oP '[a-f0-9]{8}' | head -1)
    if [ -z "$HASH" ]; then
      continue
    fi
    # If this hash is not referenced by the current runtime, it's from an old build
    if ! echo "$REFERENCED" | grep -q "$HASH"; then
      echo "  🗑️  Deleting stale chunk: $BASENAME"
      rm -f "$chunk"
      rm -f "${chunk}.map"
      DELETED=$((DELETED + 1))
    fi
  done

  echo "✅ Chunk cleanup complete. Deleted $DELETED stale chunks."
fi

# Start Next.js
echo "🚀 Starting Next.js..."
exec node node_modules/.bin/next start