#!/bin/bash
echo "📦 Instalacja zależności..."
npm install

echo "📂 Tworzę cache Puppeteera..."
export PUPPETEER_CACHE_DIR=".cache/puppeteer"

echo "📥 Pobieram Chromium..."
npx puppeteer install chromium

echo "✅ Puppeteer Core + Chromium gotowe!"
