#!/usr/bin/env bash
set -o errexit

echo "📦 Instalacja zależności..."
npm install

echo "⬇️ Instaluję Chromium (Lite)..."
export PUPPETEER_CACHE_DIR="/opt/render/.cache/puppeteer"
mkdir -p "$PUPPETEER_CACHE_DIR"
npx puppeteer install chromium

echo "✅ Puppeteer Core + Chromium gotowe!"
