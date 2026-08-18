#!/bin/sh
# Downloads Piper (binary + voice models) on container startup rather than
# during the Docker build. Render's build step turned out not to have
# reliable outbound network access for arbitrary downloads (a documented
# platform quirk, unrelated to the URLs themselves — they work fine
# elsewhere), while the running container clearly does have normal internet
# access (the app already calls the Anthropic/LessonUp/etc. APIs at
# runtime). Skips the download if Piper is already present, so a
# stop/start of the same container (as opposed to a fresh deploy) doesn't
# re-download every time.

PIPER_DIR="${PIPER_DIR:-/opt/piper}"
PIPER_VERSION="2023.11.14-2"

if [ ! -x "$PIPER_DIR/piper" ]; then
  echo "[start.sh] Piper not found, downloading (binary + nl/en voices)..."
  mkdir -p "$PIPER_DIR/voices"
  (
    set -e
    curl -fsSL --retry 3 --retry-delay 2 \
      "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" \
      | tar -xz -C "$PIPER_DIR" --strip-components=1
    curl -fsSL --retry 3 --retry-delay 2 -o "$PIPER_DIR/voices/nl_NL-mls-medium.onnx" \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx"
    curl -fsSL --retry 3 --retry-delay 2 -o "$PIPER_DIR/voices/nl_NL-mls-medium.onnx.json" \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx.json"
    curl -fsSL --retry 3 --retry-delay 2 -o "$PIPER_DIR/voices/en_US-lessac-medium.onnx" \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
    curl -fsSL --retry 3 --retry-delay 2 -o "$PIPER_DIR/voices/en_US-lessac-medium.onnx.json" \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
  ) && echo "[start.sh] Piper ready." \
    || echo "[start.sh] WARNING: Piper download failed — the read-aloud button will be unavailable this run, rest of the app is unaffected."
else
  echo "[start.sh] Piper already present, skipping download."
fi

exec npm start
