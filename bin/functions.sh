# minimum required node version
REQUIRED_NODE_MAJOR=10
REQUIRED_NODE_MINOR=13

# minimum required npm version
REQUIRED_NPM_MAJOR=5
REQUIRED_NPM_MINOR=5

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
is_cmd() { command -v "$@" >/dev/null 2>&1; }

compute_node_args() {
  NODE_VERSION_STRING=$(node --version)
  NODE_VERSION_STRING=${NODE_VERSION_STRING#"v"}
  DETECTED_MAJOR=$(pecho "$NODE_VERSION_STRING" | cut -s -d "." -f 1)
  ARGS=""

  [ -n "$DETECTED_MAJOR" ] || fatal "Cannot extract $PROGRAM_LABEL major version from version string \"$VERSION_STRING\""

  [ "$DETECTED_MAJOR" -eq "10" ] && ARGS="$ARGS --experimental-worker"

  echo $ARGS
}

require_minimal_version() {
  PROGRAM_LABEL="$1"
  VERSION_STRING="$2"
  REQUIRED_MAJOR="$3"
  REQUIRED_MINOR="$4"

  # Flag -s (--only-delimited on GNU cut) ensures no string is returned
  # when there is no match
  DETECTED_MAJOR=$(pecho "$VERSION_STRING" | cut -s -d "." -f 1)
  DETECTED_MINOR=$(pecho "$VERSION_STRING" | cut -s -d "." -f 2)

  [ -n "$DETECTED_MAJOR" ] || fatal "Cannot extract $PROGRAM_LABEL major version from version string \"$VERSION_STRING\""

  [ -n "$DETECTED_MINOR" ] || fatal "Cannot extract $PROGRAM_LABEL minor version from version string \"$VERSION_STRING\""

  case "$DETECTED_MAJOR" in
      ''|*[!0-9]*)
        fatal "$PROGRAM_LABEL major version from \"$VERSION_STRING\" is not a number. Detected: \"$DETECTED_MAJOR\""
        ;;
  esac

  case "$DETECTED_MINOR" in
      ''|*[!0-9]*)
        fatal "$PROGRAM_LABEL minor version from \"$VERSION_STRING\" is not a number. Detected: \"$DETECTED_MINOR\""
  esac

  [ "$DETECTED_MAJOR" -gt "$REQUIRED_MAJOR" ] || ([ "$DETECTED_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$DETECTED_MINOR" -ge "$REQUIRED_MINOR" ]) \
    || fatal "Your $PROGRAM_LABEL version \"$VERSION_STRING\" is too old. $PROGRAM_LABEL $REQUIRED_MAJOR.$REQUIRED_MINOR.x or higher is required."
}
