#!/bin/bash
CHUNKS_DIR="/home/site/wwwroot/.next/server/chunks/ssr"
RUNTIME="$CHUNKS_DIR/[turbopack]_runtime.js"

echo "🧹 startup.sh: cleaning stale SSR chunks..."

if [ ! -f "$RUNTIME" ]; then
  echo "⚠️  No runtime found — skipping chunk cleanup"
else
  DELETED=0
  for chunk in "$CHUNKS_DIR"/*.js; do
    [ -f "$chunk" ] || continue
    BASENAME=$(basename "$chunk")
    [[ "$BASENAME" == *"turbopack"* ]] && continue

    # Check if this filename is actually referenced in the runtime
    # Use the basename without extension for matching
    STEM="${BASENAME%.js}"
    if ! grep -qF "$STEM" "$RUNTIME"; then
      echo "  🗑️  Deleting stale chunk: $BASENAME"
      rm -f "$chunk"
      rm -f "${chunk}.map"
      DELETED=$((DELETED + 1))
    fi
  done

  echo "✅ Chunk cleanup complete. Deleted $DELETED stale chunks."
fi

echo "🚀 Starting Next.js..."
exec node node_modules/.bin/next start

# Old Build command - node node_modules/.bin/next start 