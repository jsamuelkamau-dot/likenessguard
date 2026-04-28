# API Configuration Guide

This guide explains how to configure API endpoints for the LikenessGuard Dashboard.

## Overview

The dashboard uses environment-based configuration to connect to different API endpoints. This allows you to easily switch between development, staging, and production environments.

## Configuration Files

### Environment Variables

The dashboard uses Vite's environment variable system. Configuration is managed through `.env` files:

- `.env.example` - Template file with all available options
- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration
- `.env.local` - Local overrides (not committed to git)

### Configuration Code

The API configuration logic is in `src/config/api-config.ts`. This file:
- Defines environment-specific API endpoints
- Provides a function to get the current configuration
- Allows environment variable overrides

## Available Environments

### Development
- **Base URL**: `http://localhost:3000/api`
- **Use case**: Local development with mock API or local backend

### Staging
- **Base URL**: `https://staging-api.likenessguard.com`
- **Use case**: Testing with staging backend before production deployment

### Production
- **Base URL**: `https://api.likenessguard.com`
- **Use case**: Production deployment with live backend

## How to Configure

### Method 1: Using Environment Files (Recommended)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your API URL:
   ```env
   VITE_APP_ENV=production
   VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

### Method 2: Using Environment-Specific Files

1. Edit the appropriate environment file:
   - `.env.development` for development
   - `.env.production` for production

2. Set the `VITE_API_BASE_URL` variable:
   ```env
   VITE_API_BASE_URL=https://your-api-url.com
   ```

3. Build or run with the specific environment:
   ```bash
   # Development
   npm run dev

   # Production build
   npm run build
   ```

### Method 3: Command Line Override

You can override the API URL at build time:

```bash
VITE_API_BASE_URL=https://your-api-url.com npm run build
```

## Configuration Priority

The configuration system uses the following priority order (highest to lowest):

1. **VITE_API_BASE_URL** environment variable (overrides everything)
2. **Environment-specific configuration** (development, staging, production)
3. **Development configuration** (default fallback)

## Connecting to AWS API Gateway

If you've deployed the LikenessGuard backend to AWS, your API Gateway URL will look like:

```
https://[api-id].execute-api.[region].amazonaws.com/[stage]
```

Example:
```
https://abc123def4.execute-api.us-east-1.amazonaws.com/prod
```

To configure the dashboard to use this endpoint:

1. Create or edit `.env.local`:
   ```env
   VITE_APP_ENV=production
   VITE_API_BASE_URL=https://abc123def4.execute-api.us-east-1.amazonaws.com/prod
   ```

2. Restart the development server or rebuild:
   ```bash
   npm run dev
   # or
   npm run build
   ```

## Verifying Configuration

To verify which API endpoint is being used:

1. Open the browser console
2. Check the network tab for API requests
3. The requests should be going to your configured base URL

You can also add a console log in `src/config/api-config.ts`:

```typescript
console.log('API Configuration:', apiConfig);
```

## Troubleshooting

### Issue: API requests are going to the wrong URL

**Solution**: Check the following in order:
1. Verify `.env.local` exists and has the correct `VITE_API_BASE_URL`
2. Restart the development server after changing environment variables
3. Clear browser cache and reload
4. Check that environment variables are prefixed with `VITE_`

### Issue: Environment variables not working

**Solution**: 
- Vite only exposes environment variables prefixed with `VITE_`
- Restart the dev server after changing `.env` files
- Ensure `.env.local` is not in `.gitignore` (it should be)

### Issue: CORS errors when connecting to API

**Solution**:
- Ensure your API Gateway has CORS enabled
- Check that the API allows requests from your dashboard domain
- For local development, you may need to configure CORS to allow `http://localhost:5173`

## Security Notes

- Never commit `.env.local` to version control
- Never commit production API keys or secrets to `.env` files
- Use environment-specific files (`.env.production`) for deployment
- Consider using AWS Secrets Manager or similar for sensitive configuration in production

## Additional Configuration

### Timeout Settings

You can adjust API timeout settings in `src/config/api-config.ts`:

```typescript
const environments = {
  production: {
    baseURL: 'https://api.likenessguard.com',
    timeout: 30000,  // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
  },
};
```

### Retry Logic

The configuration includes retry settings for failed requests:
- `retryAttempts`: Number of times to retry failed requests (default: 3)
- `retryDelay`: Delay between retries in milliseconds (default: 1000)

These settings apply to network errors and server errors (5xx), but not to validation errors (4xx).
