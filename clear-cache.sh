#!/bin/bash
echo "🧹 Clearing all caches..."

# Clear Metro bundler cache
rm -rf .expo/
rm -rf node_modules/.cache/

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

echo "✅ Cache cleared!"
echo ""
echo "Now run: npm start -- --clear"
