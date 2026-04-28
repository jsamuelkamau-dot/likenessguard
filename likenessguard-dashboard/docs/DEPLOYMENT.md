# LikenessGuard Dashboard Deployment Guide

This guide provides instructions for deploying the LikenessGuard Web Dashboard to various static hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Access to your chosen hosting platform
- AWS API Gateway endpoint URL (from the backend deployment)

## Build the Production Bundle

1. Install dependencies:
```bash
npm install
```

2. Configure the API endpoint (see [API Configuration](#api-configuration) below)

3. Build the production bundle:
```bash
npm run build
```

This creates an optimized production build in the `dist/` directory with:
- Minified JavaScript and CSS
- Vendor chunks for better caching
- Optimized assets

4. Test the production build locally:
```bash
npm run preview
```

The preview server runs at http://localhost:4173

## API Configuration

The dashboard needs to connect to your deployed AWS backend. Configure the API endpoint using one of these methods:

### Method 1: Environment Variable (Recommended)

Create a `.env.production` file in the project root:

```env
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

### Method 2: Update Configuration File

Edit `src/config/api-config.ts` and update the production baseURL:

```typescript
production: {
  baseURL: 'https://your-api-gateway-url.execute-api.region.amazonaws.com/prod',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
}
```

### Method 3: Build-time Environment Variable

Pass the API URL during build:

```bash
VITE_API_BASE_URL=https://your-api-url npm run build
```

## Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended for AWS Integration)

Deploy the dashboard alongside your AWS backend infrastructure.

#### Step 1: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://likenessguard-dashboard

# Enable static website hosting
aws s3 website s3://likenessguard-dashboard --index-document index.html --error-document index.html
```

#### Step 2: Configure Bucket Policy

Create a bucket policy to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::likenessguard-dashboard/*"
    }
  ]
}
```

Apply the policy:
```bash
aws s3api put-bucket-policy --bucket likenessguard-dashboard --policy file://bucket-policy.json
```

#### Step 3: Upload Build Files

```bash
# Upload all files from dist/ to S3
aws s3 sync dist/ s3://likenessguard-dashboard --delete

# Set cache headers for assets
aws s3 cp s3://likenessguard-dashboard/assets s3://likenessguard-dashboard/assets \
  --recursive --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable"
```

#### Step 4: Create CloudFront Distribution (Optional but Recommended)

CloudFront provides:
- HTTPS support
- Global CDN distribution
- Better performance
- Custom domain support

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name likenessguard-dashboard.s3-website-region.amazonaws.com
```

Or use the AWS Console:
1. Go to CloudFront → Create Distribution
2. Origin Domain: Select your S3 bucket
3. Viewer Protocol Policy: Redirect HTTP to HTTPS
4. Default Root Object: index.html
5. Error Pages: Add custom error response for 404 → /index.html (for SPA routing)

#### Step 5: Configure CORS (if needed)

If your API Gateway requires CORS configuration, add this to your S3 bucket:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://your-cloudfront-domain.cloudfront.net</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

### Option 2: Netlify

Netlify provides easy deployment with automatic builds from Git.

#### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Step 2: Deploy

```bash
# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist
```

#### Step 3: Configure Environment Variables

In Netlify dashboard:
1. Go to Site Settings → Build & Deploy → Environment
2. Add environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-api-gateway-url`

#### Step 4: Configure Redirects for SPA

Create `public/_redirects` file:

```
/*    /index.html   200
```

This ensures all routes are handled by the React app.

### Option 3: Vercel

Vercel offers seamless deployment with Git integration.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Deploy

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Step 3: Configure Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add variable:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-api-gateway-url`
   - Environment: Production

#### Step 4: Configure Rewrites

Create `vercel.json` in project root:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Option 4: GitHub Pages

Deploy directly from your GitHub repository.

#### Step 1: Update vite.config.ts

Add base path for GitHub Pages:

```typescript
export default defineConfig({
  base: '/likenessguard-dashboard/',
  // ... rest of config
})
```

#### Step 2: Build and Deploy

```bash
# Build with correct base path
npm run build

# Deploy to gh-pages branch
npx gh-pages -d dist
```

#### Step 3: Configure GitHub Pages

1. Go to repository Settings → Pages
2. Source: Deploy from branch
3. Branch: gh-pages
4. Folder: / (root)

## Post-Deployment Verification

After deployment, verify the dashboard works correctly:

### 1. Check Dashboard Loads

Visit your deployed URL and verify:
- [ ] Dashboard home page loads
- [ ] Navigation menu works
- [ ] All pages are accessible
- [ ] Styling is applied correctly

### 2. Test API Connection

1. Open browser DevTools → Network tab
2. Navigate to Registration page
3. Try to register a likeness
4. Verify API requests are sent to correct endpoint
5. Check for CORS errors

### 3. Test Core Functionality

- [ ] Registration flow works
- [ ] Consent policy management works
- [ ] Consent check works
- [ ] Activity logs load
- [ ] Violations panel works

### 4. Test on Multiple Devices

- [ ] Desktop browser (Chrome, Firefox, Safari)
- [ ] Tablet
- [ ] Mobile phone

## Troubleshooting

### Issue: Dashboard shows blank page

**Solution:**
- Check browser console for errors
- Verify build completed successfully
- Check that all assets are uploaded
- Verify base path configuration (for GitHub Pages)

### Issue: API requests fail with CORS errors

**Solution:**
- Configure CORS on API Gateway
- Add your dashboard domain to allowed origins
- Ensure API Gateway has proper CORS headers

### Issue: Routes return 404 errors

**Solution:**
- Configure redirects/rewrites for SPA routing
- For S3: Set error document to index.html
- For Netlify: Add _redirects file
- For Vercel: Add vercel.json with rewrites

### Issue: Environment variables not working

**Solution:**
- Ensure variables start with `VITE_` prefix
- Rebuild after changing environment variables
- Check platform-specific environment variable configuration

## Continuous Deployment

### GitHub Actions (for S3)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to S3

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
        run: npm run build
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'us-east-1'
          SOURCE_DIR: 'dist'
```

Add secrets in GitHub repository settings:
- `API_BASE_URL`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Security Considerations

1. **HTTPS Only**: Always deploy with HTTPS enabled
2. **Environment Variables**: Never commit API keys or secrets to Git
3. **CORS Configuration**: Restrict allowed origins to your dashboard domain
4. **API Authentication**: Implement authentication if handling sensitive data
5. **Content Security Policy**: Consider adding CSP headers for additional security

## Performance Optimization

1. **Enable Compression**: Ensure gzip/brotli compression is enabled on your hosting platform
2. **Cache Headers**: Set appropriate cache headers for static assets
3. **CDN**: Use CloudFront or similar CDN for global distribution
4. **Lazy Loading**: The dashboard already uses code splitting for optimal loading

## Monitoring

After deployment, monitor:
- **Error Tracking**: Use Sentry or similar service
- **Analytics**: Add Google Analytics or similar
- **API Performance**: Monitor API Gateway metrics in AWS CloudWatch
- **User Experience**: Use Lighthouse or WebPageTest for performance audits

## Support

For issues or questions:
- Check the [API Configuration Guide](./API_CONFIGURATION.md)
- Review AWS backend logs in CloudWatch
- Check browser console for client-side errors
- Verify API Gateway endpoint is accessible

## Next Steps

After successful deployment:
1. Share the dashboard URL with competition judges
2. Prepare demo flow walkthrough
3. Monitor usage and performance
4. Gather feedback for improvements
