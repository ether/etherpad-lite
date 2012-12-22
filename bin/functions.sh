NODEJS_BINARIES_CANDIDATES="node nodejs"

NODEJS=node

for candidate in $NODEJS_BINARIES_CANDIDATES; do
  if hash $candidate > /dev/null 2>&1; then
    NODEJS=$candidate
    break
  fi
done
