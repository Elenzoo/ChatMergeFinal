#!/usr/bin/env bash
set -o errexit

echo "📦 Instalacja zależności..."
npm install

echo "📁 Tworzę cache Puppeteera..."
export PUPPETEER_CACHE_DIR="/opt/render/.cache/puppeteer"
mkdir -p "$PUPPETEER_CACHE_DIR"

echo "⬇️ Pobieram Chromium..."
npx puppeteer browsers install chrome

echo "✅ Puppeteer + Chromium gotowe!"
