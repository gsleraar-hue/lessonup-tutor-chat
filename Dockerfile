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

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
