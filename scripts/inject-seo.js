/**
 * Post-build SEO Injection Script
 *
 * This script runs after `expo export --platform web` and injects
 * SEO tags from web/index.html into the generated dist/index.html
 */

const fs = require('fs');
const path = require('path');

const WEB_INDEX = path.join(__dirname, '..', 'web', 'index.html');
const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

function extractSeoContent(html) {
  const seoTags = [];

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    seoTags.push(titleMatch[0]);
  }

  // Extract meta description
  const descMatch = html.match(/<meta\s+name="description"[^>]*>/i);
  if (descMatch) {
    seoTags.push(descMatch[0]);
  }

  // Extract meta keywords
  const keywordsMatch = html.match(/<meta\s+name="keywords"[^>]*>/i);
  if (keywordsMatch) {
    seoTags.push(keywordsMatch[0]);
  }

  // Extract canonical link
  const canonicalMatch = html.match(/<link\s+rel="canonical"[^>]*>/i);
  if (canonicalMatch) {
    seoTags.push(canonicalMatch[0]);
  }

  // Extract JSON-LD structured data
  const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi);
  if (jsonLdMatch) {
    seoTags.push(...jsonLdMatch);
  }

  // Extract Google Analytics
  const gaMatch = html.match(/<!-- Google tag[\s\S]*?<\/script>\s*<script>[\s\S]*?gtag\('config'[^)]+\);\s*<\/script>/i);
  if (gaMatch) {
    seoTags.push(gaMatch[0]);
  }

  // Extract Open Graph meta tags
  const ogMatches = html.match(/<meta\s+property="og:[^"]*"[^>]*>/gi);
  if (ogMatches) {
    seoTags.push(...ogMatches);
  }

  // Extract Twitter Card meta tags
  const twitterMatches = html.match(/<meta\s+name="twitter:[^"]*"[^>]*>/gi);
  if (twitterMatches) {
    seoTags.push(...twitterMatches);
  }

  // Extract favicon links
  const faviconMatches = html.match(/<link\s+rel="(icon|shortcut icon|apple-touch-icon)"[^>]*>/gi);
  if (faviconMatches) {
    seoTags.push(...faviconMatches);
  }

  // Extract manifest link
  const manifestMatch = html.match(/<link\s+rel="manifest"[^>]*>/i);
  if (manifestMatch) {
    seoTags.push(manifestMatch[0]);
  }

  // Extract theme-color meta
  const themeColorMatch = html.match(/<meta\s+name="theme-color"[^>]*>/i);
  if (themeColorMatch) {
    seoTags.push(themeColorMatch[0]);
  }

  // Extract focus styles
  const styleMatch = html.match(/<style>[\s\S]*?\/\* Focus indicators[\s\S]*?<\/style>/i);
  if (styleMatch) {
    seoTags.push('\n  <!-- Keyboard Focus Indicators for Accessibility -->\n  ' + styleMatch[0]);
  }

  return seoTags;
}

function injectSeo() {
  console.log('🔍 Injecting SEO tags into dist/index.html...\n');

  // Check if files exist
  if (!fs.existsSync(WEB_INDEX)) {
    console.error('❌ web/index.html not found!');
    process.exit(1);
  }

  if (!fs.existsSync(DIST_INDEX)) {
    console.error('❌ dist/index.html not found! Run expo export first.');
    process.exit(1);
  }

  // Read files
  const webHtml = fs.readFileSync(WEB_INDEX, 'utf8');
  let distHtml = fs.readFileSync(DIST_INDEX, 'utf8');

  // Extract SEO content
  const seoTags = extractSeoContent(webHtml);

  console.log(`📝 Found ${seoTags.length} SEO elements to inject:`);
  seoTags.forEach((tag, i) => {
    const preview = tag.substring(0, 60).replace(/\n/g, ' ').trim();
    console.log(`   ${i + 1}. ${preview}...`);
  });

  // Fix language attribute
  distHtml = distHtml.replace(/<html\s+lang="en"/, '<html lang="de"');

  // Remove existing tags that we're replacing (Expo generates these)
  distHtml = distHtml.replace(/<title>[^<]*<\/title>/gi, '');
  distHtml = distHtml.replace(/<meta\s+name="description"[^>]*>/gi, '');
  distHtml = distHtml.replace(/<meta\s+name="keywords"[^>]*>/gi, '');
  distHtml = distHtml.replace(/<link\s+rel="shortcut icon"[^>]*>/gi, '');
  distHtml = distHtml.replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  distHtml = distHtml.replace(/<meta\s+name="theme-color"[^>]*>/gi, '');

  // Find the </head> tag and inject SEO content before it
  const seoContent = '\n  <!-- SEO Tags (injected by scripts/inject-seo.js) -->\n  ' +
                     seoTags.join('\n  ') + '\n';

  distHtml = distHtml.replace('</head>', seoContent + '</head>');

  // Write the updated file
  fs.writeFileSync(DIST_INDEX, distHtml);

  console.log('\n✅ SEO tags injected successfully!');
  console.log(`   - Language: de`);
  console.log(`   - Title, description, keywords: ✓`);
  console.log(`   - Structured data (JSON-LD): ✓`);
  console.log(`   - Google Analytics: ✓`);
  console.log(`   - Favicons & manifest: ✓`);
}

// Run
injectSeo();
