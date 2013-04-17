NODEJS_BINARIES_CANDIDATES="nodejs node"

NODEJS="NODE_JS_BINARY_NOT_FOUND"

for candidate in $NODEJS_BINARIES_CANDIDATES; do
  if hash $candidate > /dev/null 2>&1; then
    NODEJS=$candidate
    break
  fi
done
