# Favicon Update Guide for KP Med

## Quick Update Method

### Step 1: Prepare Your Favicon Image

1. **Image Requirements**:
   - Square aspect ratio (1:1)
   - Minimum size: 512x512 pixels (for best quality)
   - Format: PNG, SVG, or ICO
   - Simple design that's recognizable at small sizes

2. **Replace the existing favicon**:
   - Place your new favicon as `favicon.png` in `assets/images/`
   - Keep it at least 512x512px (Expo will resize automatically)

### Step 2: Update Configuration

The favicon is already configured in two places:

**app.json** (line 23):

```json
"favicon": "./assets/images/favicon.png"
```

**app.config.js** (line 12):

```javascript
favicon: './assets/favicon.png';
```

**Note**: There's a discrepancy! `app.config.js` points to `./assets/favicon.png` but the file is in `./assets/images/favicon.png`. This needs to be fixed.

### Step 3: Fix the Path Issue

The `app.config.js` should match the actual file location:

```javascript
web: {
  ...config.web,
  bundler: 'metro',
  favicon: './assets/images/favicon.png',  // ← Fixed path
  // ... rest of config
}
```

### Step 4: Generate Multiple Sizes

For best browser compatibility, create multiple favicon sizes:

```bash
# Install sharp for image processing (if not already installed)
npm install sharp

# Run the favicon generation script
node create-favicon.js
```

Or create them manually:

- `favicon.ico` (16x16, 32x32, 48x48 multi-resolution ICO)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-192x192.png` (for Android)
- `favicon-512x512.png` (for high-res displays)
- `apple-touch-icon.png` (180x180 for iOS)

### Step 5: Update PWA Manifest

Update `public/manifest.json` to reference your icons:

```json
{
  "name": "KP Med",
  "short_name": "KP Med",
  "icons": [
    {
      "src": "/assets/images/favicon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/assets/images/favicon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "theme_color": "#D4A574",
  "background_color": "#F8FAFC",
  "display": "standalone"
}
```

### Step 6: Add to Public Directory (for Netlify)

Copy your favicon files to the `public/` directory:

```bash
cp assets/images/favicon.png public/favicon.png
cp assets/images/favicon.svg public/favicon.svg
cp assets/images/favicon-192x192.png public/icon-192.png
cp assets/images/favicon-512x512.png public/icon-512.png
```

### Step 7: Build and Test

```bash
# Build for web
npm run build:web

# The output will be in 'dist/' directory
# Check that favicon files are included in the build
```

### Step 8: Deploy

The favicon will automatically be included when you deploy to Netlify.

---

## Advanced: HTML Meta Tags (Optional)

For maximum compatibility, you can add these meta tags. Expo usually handles this automatically, but for manual control, create an HTML template.

Create `web/index.html` (if it doesn't exist):

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Favicons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.ico" />

    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Theme Color -->
    <meta name="theme-color" content="#D4A574" />

    <title>KP Med</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

---

## Using Online Favicon Generators

### Recommended Tools:

1. **Favicon.io** (https://favicon.io/)
   - Generate from text, image, or emoji
   - Downloads a complete package

2. **RealFaviconGenerator** (https://realfavicongenerator.net/)
   - Comprehensive favicon generator
   - Tests on all platforms
   - Generates all required sizes

3. **Canva** (https://www.canva.com/)
   - Design custom favicons
   - Export as PNG

### Workflow:

1. Upload your logo/design
2. Download the generated package
3. Extract to `assets/images/` and `public/`
4. Update manifest.json

---

## Quick Fix Script

Here's a Node.js script to automate favicon generation:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 192, 512];
const inputFile = path.join(__dirname, 'assets', 'images', 'icon.png');

async function generateFavicons() {
  for (const size of sizes) {
    await sharp(inputFile)
      .resize(size, size)
      .toFile(path.join(__dirname, 'public', `favicon-${size}x${size}.png`));

    console.log(`✅ Generated favicon-${size}x${size}.png`);
  }

  // Copy main favicon
  await sharp(inputFile)
    .resize(32, 32)
    .toFile(path.join(__dirname, 'public', 'favicon.png'));

  console.log('✅ All favicons generated!');
}

generateFavicons();
```

---

## Troubleshooting

### Favicon not showing after deployment?

1. **Clear browser cache**: Ctrl+Shift+R (hard refresh)
2. **Check file paths**: Ensure favicons are in `public/` directory
3. **Verify Netlify \_headers**: Check `public/_headers` for cache rules
4. **Check manifest.json**: Ensure icon paths are correct

### Different favicon on different pages?

- Expo generates a single HTML file with one favicon
- Ensure `app.json` and `app.config.js` point to the same file

### Favicon looks blurry?

- Use a higher resolution source image (512x512 minimum)
- Ensure PNG has transparency
- Consider using SVG for crisp rendering at all sizes

---

## Current Issue to Fix

Your `app.config.js` has an incorrect path:

**Current** (line 12):

```javascript
favicon: './assets/favicon.png',
```

**Should be**:

```javascript
favicon: './assets/images/favicon.png',
```

This needs to be corrected for the favicon to work properly.
