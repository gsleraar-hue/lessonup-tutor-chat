# Plain Node image, not a serverless/edge runtime — this app launches a
# headless Chromium (via Playwright) server-side to scrape LessonUp lesson
# pages, which needs a real, persistent Node process.
FROM node:20-slim AS base

WORKDIR /app

# System deps for Chromium (fonts, codecs, etc.) are installed by
# `playwright install --with-deps`, which needs apt available as root.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# Installs the Chromium build matching the exact `playwright` version in
# package.json, plus its OS-level dependencies.
RUN npx playwright install --with-deps chromium

# Piper: self-hosted, offline text-to-speech for the "read aloud" button.
# Used instead of a cloud TTS API so there's no per-character quota to run
# out of (which happened with ElevenLabs' free tier) — this is a
# self-contained release archive (binary + its .so libs + espeak-ng data),
# no extra apt packages needed on top of the Debian base.
RUN mkdir -p /opt/piper/voices && \
    curl -sL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
      | tar -xz -C /opt/piper --strip-components=1 && \
    curl -sL -o /opt/piper/voices/nl_NL-mls-medium.onnx \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx && \
    curl -sL -o /opt/piper/voices/nl_NL-mls-medium.onnx.json \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx.json && \
    curl -sL -o /opt/piper/voices/en_US-lessac-medium.onnx \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
    curl -sL -o /opt/piper/voices/en_US-lessac-medium.onnx.json \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
