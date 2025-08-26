# Netlify Deployment Guide

## Current Status ✅

Your React Native/Expo medical learning app is now **ready for Netlify deployment**! 

### What's Already Configured:

1. **✅ Build Configuration**: `netlify.toml` properly configured
2. **✅ Build Command**: `npm run build:web` works correctly 
3. **✅ Publish Directory**: `dist` folder with all web assets
4. **✅ Netlify Functions**: Webhook endpoint at `/netlify/functions/webhook.js`
5. **✅ Redirects**: Proper routing for SPA and API endpoints

## Next Steps (Manual Configuration Required)

### 1. Connect to Netlify Dashboard

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Connect your GitHub repository for this project
4. Netlify should auto-detect the settings from `netlify.toml`:
   - **Build command**: `npm run build:web`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### 2. Add Custom Domain (kpmeds.de)

In Netlify Dashboard:
1. Go to **Site Settings** → **Domain management**
2. Click **Add custom domain**
3. Enter: `kpmeds.de`
4. Click **Verify**
5. Netlify will provide DNS records to update

### 3. Update DNS in Squarespace

In your Squarespace domain settings:
1. Go to **Settings** → **Domains** → **kpmeds.de**
2. Click **DNS Settings**
3. Add the records provided by Netlify:
   - **A Record**: `@` → `75.2.60.5`
   - **CNAME Record**: `www` → `[your-site-name].netlify.app`

### 4. SSL Certificate

Netlify will automatically provision an SSL certificate once DNS is configured.

### 5. Environment Variables

In Netlify Dashboard → **Site Settings** → **Environment Variables**, add:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Testing the Webhook

Once deployed, your webhook will be available at:
- **GET**: `https://kpmeds.de/webhook` (status check)
- **POST**: `https://kpmeds.de/webhook` (for Make.com integration)

## Build Verification

The build process has been tested locally and works correctly:
- ✅ Expo web export completed successfully  
- ✅ Generated 4.99 MB optimized bundle
- ✅ All assets properly bundled
- ✅ Ready for production deployment

## Important Notes

- The app is configured for German language (login page already localized)
- All feedback and evaluation systems are ready
- Supabase integration is properly configured
- The webhook endpoint includes CORS headers for Make.com integration

Your app is production-ready for deployment! 🚀