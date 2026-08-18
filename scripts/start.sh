#!/bin/sh
# Downloads Piper (binary + voice models) on container startup rather than
# during the Docker build. Render's build step turned out not to have a
# working CA certificate bundle for curl (fixed in the Dockerfile now, but
# keeping this at startup is still fine/simpler), while the running
# container clearly has normal internet access (the app already calls the
# Anthropic/LessonUp/etc. APIs at runtime).
#
# Each file is checked individually (not just "does the piper binary
# exist") so swapping which voice models are used doesn't require a fresh
# container to pick up the new files.

PIPER_DIR="${PIPER_DIR:-/opt/piper}"
PIPER_VERSION="2023.11.14-2"

mkdir -p "$PIPER_DIR/voices"

fetch_if_missing() {
  dest="$1"
  url="$2"
  if [ ! -s "$dest" ]; then
    echo "[start.sh] Downloading $(basename "$dest")..."
    curl -fsSL --retry 3 --retry-delay 2 -o "$dest" "$url" \
      || echo "[start.sh] WARNING: failed to download $(basename "$dest")"
  fi
}

if [ ! -x "$PIPER_DIR/piper" ]; then
  echo "[start.sh] Downloading Piper binary..."
  curl -fsSL --retry 3 --retry-delay 2 \
    "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" \
    | tar -xz -C "$PIPER_DIR" --strip-components=1 \
    || echo "[start.sh] WARNING: Piper binary download failed — the read-aloud button will be unavailable this run, rest of the app is unaffected."
fi

# "low" quality voices: noticeably faster to synthesize than "medium" on a
# CPU-constrained free-tier instance (Render's 0.1 vCPU made "medium" take
# 30-50s per message), at the cost of a somewhat less natural voice.
fetch_if_missing "$PIPER_DIR/voices/nl_NL-mls_5809-low.onnx" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx"
fetch_if_missing "$PIPER_DIR/voices/nl_NL-mls_5809-low.onnx.json" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx.json"
fetch_if_missing "$PIPER_DIR/voices/en_US-lessac-low.onnx" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/low/en_US-lessac-low.onnx"
fetch_if_missing "$PIPER_DIR/voices/en_US-lessac-low.onnx.json" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/low/en_US-lessac-low.onnx.json"

echo "[start.sh] Piper setup done."
exec npm start
