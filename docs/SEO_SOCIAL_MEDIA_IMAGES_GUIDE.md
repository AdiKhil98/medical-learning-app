# Social Media Images Guide for KP Med

This guide will help you create optimized social media preview images for your website.

## 📐 Image Requirements

### Open Graph Image (Facebook, LinkedIn, WhatsApp)
- **Filename**: `og-image.png`
- **Dimensions**: 1200 x 630 pixels (1.91:1 ratio)
- **Max file size**: 8 MB (recommended: under 1 MB)
- **Format**: PNG or JPG
- **Location**: `/public/og-image.png`

### Twitter Image
- **Filename**: `twitter-image.png`
- **Dimensions**: 1200 x 600 pixels (2:1 ratio)
- **Max file size**: 5 MB
- **Format**: PNG or JPG
- **Location**: `/public/twitter-image.png`

**Note**: You can use the same image for both by naming it `og-image.png` and updating the Twitter meta tag to point to the same file.

## 🎨 Design Recommendations

Your social media images should include:

1. **KP Med Logo** - Use your app icon as the main branding element
2. **App Name**: "KP Med" prominently displayed
3. **Tagline**: "Medizinische Prüfungsvorbereitung" or similar
4. **Brand Colors**:
   - Primary: #D4A574 (gold/bronze)
   - Background: #F8FAFC (light)
5. **Key Message**: Brief description like:
   - "Professionelle KP & FSP Vorbereitung"
   - "Für internationale Ärzte in Deutschland"

### Safe Zones
- Keep important content within the **center 80%** of the image
- Avoid placing text near edges (different platforms crop differently)

## 🛠️ Methods to Create Images

### Method 1: Online Tools (Easiest)

#### Canva (Recommended)
1. Go to [canva.com](https://www.canva.com)
2. Create account (free)
3. Click "Create a design"
4. Choose "Custom size" → 1200 x 630 pixels
5. Design your image:
   - Add background color (#F8FAFC)
   - Upload your app icon from `/assets/images/icon.png`
   - Add text: "KP Med" with large font
   - Add tagline: "Medizinische Prüfungsvorbereitung"
   - Add accent color (#D4A574) as decorative elements
6. Download as PNG
7. Save as `og-image.png`

#### Other Free Tools
- **[Figma](https://figma.com)** - Professional design tool, free tier available
- **[Photopea](https://www.photopea.com/)** - Free online Photoshop alternative
- **[Remove.bg](https://www.remove.bg/)** - Remove background from your icon first

### Method 2: Using Existing Icon

If you want a quick solution:

1. Take your app icon: `/assets/images/icon.png`
2. Use an image editor to:
   - Create canvas: 1200 x 630 px
   - Add solid color background (#F8FAFC or #D4A574)
   - Center your icon (resize to about 400-500px)
   - Add text "KP Med" below icon
3. Export as PNG

### Method 3: AI Image Generation

Use AI tools like:
- **DALL-E** (OpenAI)
- **Midjourney**
- **Stable Diffusion**

**Prompt example**:
```
Create a professional social media banner for a medical education app called "KP Med".
1200x630 pixels. Medical theme with gold/bronze accent color (#D4A574),
light background (#F8FAFC). Include medical symbols, clean modern design,
German language context. Professional and trustworthy look.
```

## 📝 Step-by-Step: Complete Setup

### 1. Create the Images

Using your chosen method above, create:
- `og-image.png` (1200 x 630)
- `twitter-image.png` (1200 x 600) - OR use the same og-image.png

### 2. Place Files in Public Directory

```bash
# Copy your images to:
/public/og-image.png
/public/twitter-image.png
```

### 3. Update HTML (if using single image)

If you want to use the same image for both platforms:

```html
<!-- In web/index.html -->
<meta property="og:image" content="https://kpmed.de/og-image.png" />
<meta name="twitter:image" content="https://kpmed.de/og-image.png" />
```

### 4. Test Your Images

After deploying, test your social media previews:

#### Facebook & LinkedIn
1. Go to [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Enter your URL: `https://kpmed.de`
3. Click "Scrape Again" to refresh cache
4. Verify image displays correctly

#### Twitter
1. Go to [Twitter Card Validator](https://cards-dev.twitter.com/validator)
2. Enter your URL: `https://kpmed.de`
3. Click "Preview Card"
4. Verify image and text display correctly

## ✅ Quick Checklist

- [ ] Create og-image.png (1200 x 630 px)
- [ ] Create twitter-image.png (1200 x 600 px) or reuse og-image
- [ ] Images include branding (logo, name, colors)
- [ ] Text is readable and centered
- [ ] File sizes are optimized (< 1 MB)
- [ ] Files placed in `/public/` directory
- [ ] Test with Facebook Sharing Debugger
- [ ] Test with Twitter Card Validator
- [ ] Images look good on mobile preview

## 🎯 Example Design Layout

```
+------------------------------------------+
|                                          |
|         [APP ICON - 400x400px]          |
|                                          |
|              KP Med                      |
|    (Large, bold, brand color)            |
|                                          |
|  Medizinische Prüfungsvorbereitung      |
|  (Subtitle, smaller font)                |
|                                          |
|  Für internationale Ärzte in Deutschland |
|  (Even smaller, descriptive)             |
|                                          |
+------------------------------------------+
```

## 📚 Resources

- [Open Graph Protocol](https://ogp.me/) - Technical documentation
- [Twitter Cards Guide](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Image Optimization Tools](https://tinypng.com/) - Compress images
- [Canva Templates](https://www.canva.com/templates/) - Pre-made designs

---

**Need Help?** If you're unsure about design, consider hiring a freelancer on:
- Fiverr (starting at $5-20)
- Upwork
- 99designs

Most designers can create social media images in 1-2 hours for a reasonable price.
