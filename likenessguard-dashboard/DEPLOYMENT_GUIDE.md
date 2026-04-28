# LikenessGuard Dashboard - Complete Deployment Guide for Beginners

This guide will walk you through deploying your LikenessGuard Dashboard to the web, step by step. No prior deployment experience required!

## 🎯 What You'll Accomplish

By the end of this guide, you'll have:
- Your dashboard live on the internet with a public URL
- Automatic deployments when you make changes
- A professional web application anyone can access

## 📋 Prerequisites

Before starting, make sure you have:
- [x] Your LikenessGuard Dashboard code (this folder)
- [x] A computer with internet access
- [x] A web browser (Chrome, Firefox, Safari, or Edge)

## 🚀 Deployment Options

We'll cover 3 beginner-friendly options, ranked by ease:

1. **Netlify** (Easiest - Recommended for beginners)
2. **Vercel** (Easy - Great for React apps)
3. **GitHub Pages** (Free but requires GitHub account)

---

# Option 1: Netlify Deployment (Recommended)

Netlify is the easiest way to deploy your dashboard. It's free and handles everything automatically.

## Step 1: Prepare Your Code

1. **Open your terminal/command prompt**
   - Windows: Press `Win + R`, type `cmd`, press Enter
   - Mac: Press `Cmd + Space`, type "Terminal", press Enter
   - Linux: Press `Ctrl + Alt + T`

2. **Navigate to your dashboard folder**
   ```bash
   cd path/to/your/likenessguard-dashboard
   ```
   Replace `path/to/your/` with the actual path to your folder.

3. **Build your dashboard for production**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with your optimized website files.

## Step 2: Create a Netlify Account

1. **Go to Netlify**
   - Open your web browser
   - Go to: https://www.netlify.com
   - Click the green "Sign up" button in the top right

2. **Sign up options**
   - Choose "Sign up with GitHub" (recommended) OR
   - Choose "Sign up with email"
   - Fill in your information and verify your email

## Step 3: Deploy Your Site

### Method A: Drag and Drop (Easiest)

1. **After logging in to Netlify:**
   - You'll see your dashboard with a big box that says "Want to deploy a new site without connecting to Git?"
   - Look for the drag-and-drop area

2. **Upload your site:**
   - Open your file explorer/finder
   - Navigate to your `likenessguard-dashboard` folder
   - Find the `dist` folder (created in Step 1)
   - Drag the entire `dist` folder into the Netlify drag-and-drop box

3. **Wait for deployment:**
   - Netlify will show a progress bar
   - This usually takes 1-2 minutes
   - You'll see "Site deploy in progress..."

4. **Get your live URL:**
   - Once complete, you'll see "Your site is live!"
   - Netlify will give you a random URL like: `https://amazing-cupcake-123456.netlify.app`
   - Click on this URL to see your live dashboard!

### Method B: Connect to Git (For automatic updates)

If you want automatic deployments when you make changes:

1. **Push your code to GitHub first:**
   - Create a GitHub account at https://github.com
   - Create a new repository
   - Upload your `likenessguard-dashboard` folder to GitHub

2. **Connect to Netlify:**
   - In Netlify, click "New site from Git"
   - Choose "GitHub"
   - Authorize Netlify to access your GitHub
   - Select your `likenessguard-dashboard` repository

3. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

## Step 4: Configure Your API Connection

Your dashboard needs to connect to your LikenessGuard AWS backend.

1. **Find your site settings:**
   - In Netlify, go to your site dashboard
   - Click "Site settings"
   - Click "Environment variables" in the left menu

2. **Add your API URL:**
   - Click "Add variable"
   - Key: `VITE_API_BASE_URL`
   - Value: Your AWS API Gateway URL (e.g., `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod`)
   - Click "Save"

3. **Redeploy your site:**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

## Step 5: Custom Domain (Optional)

To use your own domain name instead of the Netlify URL:

1. **Buy a domain:**
   - Go to a domain registrar like Namecheap, GoDaddy, or Google Domains
   - Search for and purchase your desired domain (e.g., `mylikenessguard.com`)

2. **Add domain to Netlify:**
   - In your Netlify site settings, click "Domain management"
   - Click "Add custom domain"
   - Enter your domain name
   - Follow the DNS configuration instructions provided

---

# Option 2: Vercel Deployment

Vercel is another excellent option, especially optimized for React applications.

## Step 1: Prepare Your Code

Same as Netlify Step 1 - build your project:
```bash
cd path/to/your/likenessguard-dashboard
npm run build
```

## Step 2: Create Vercel Account

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Click "Sign Up"
   - Choose "Continue with GitHub" (recommended)

## Step 3: Deploy

1. **Import your project:**
   - Click "New Project"
   - If using GitHub: Select your repository
   - If not using GitHub: Use "Import Git Repository" and paste your repo URL

2. **Configure deployment:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click "Deploy"

3. **Add environment variables:**
   - Go to your project settings
   - Click "Environment Variables"
   - Add: `VITE_API_BASE_URL` with your AWS API URL
   - Redeploy

---

# Option 3: GitHub Pages

Free hosting through GitHub, but requires a GitHub account.

## Step 1: Create GitHub Repository

1. **Create GitHub account:**
   - Go to https://github.com
   - Sign up for a free account

2. **Create new repository:**
   - Click the "+" icon in top right
   - Click "New repository"
   - Name: `likenessguard-dashboard`
   - Make it Public
   - Click "Create repository"

## Step 2: Upload Your Code

1. **Upload files:**
   - Click "uploading an existing file"
   - Drag your entire `likenessguard-dashboard` folder
   - Commit the files

## Step 3: Configure GitHub Pages

1. **Enable GitHub Pages:**
   - Go to your repository
   - Click "Settings" tab
   - Scroll down to "Pages" in left menu
   - Source: "Deploy from a branch"
   - Branch: "main"
   - Folder: "/ (root)"
   - Click "Save"

2. **Add build workflow:**
   - Create `.github/workflows/deploy.yml` in your repository
   - Add the GitHub Actions workflow (see technical details below)

---

# 🔧 Technical Configuration Details

## Environment Variables You Need

Add these to your deployment platform:

```
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

## Build Commands

For all platforms:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18 or higher

## GitHub Actions Workflow (for GitHub Pages)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

---

# 🎉 Success! Your Dashboard is Live

## What You've Accomplished

✅ Your LikenessGuard Dashboard is now live on the internet  
✅ Anyone can access it with the URL you received  
✅ It's connected to your AWS backend  
✅ It automatically updates when you make changes (if using Git)  

## Your Live Dashboard Features

Your deployed dashboard includes:
- **Home Page:** Overview of registered likenesses and recent activity
- **Registration:** Upload and register new likenesses
- **Consent Policy:** Manage consent preferences
- **Consent Check:** Test consent verification with reference images
- **Activity Logs:** View all consent check history
- **Violations:** Monitor unauthorized usage attempts

## Next Steps

1. **Test your deployment:**
   - Visit your live URL
   - Try each page to make sure everything works
   - Test the connection to your AWS backend

2. **Share your dashboard:**
   - Send the URL to stakeholders
   - Add it to your documentation
   - Consider setting up a custom domain

3. **Monitor and maintain:**
   - Check the dashboard regularly
   - Update when you make code changes
   - Monitor your AWS backend logs

## 🆘 Troubleshooting

### Common Issues and Solutions

**Problem:** "Site not loading" or blank page
- **Solution:** Check browser console for errors, verify API URL is correct

**Problem:** "API connection failed"
- **Solution:** Verify your `VITE_API_BASE_URL` environment variable is set correctly

**Problem:** "Build failed"
- **Solution:** Run `npm run build` locally first to check for errors

**Problem:** "404 on page refresh"
- **Solution:** Add redirect rules for single-page applications (SPA)

### Getting Help

If you run into issues:
1. Check the deployment platform's documentation
2. Look at the browser console for error messages
3. Verify your AWS backend is running
4. Check that all environment variables are set correctly

---

# 🎊 Congratulations!

You've successfully deployed a professional web application! Your LikenessGuard Dashboard is now live and ready to help protect digital likenesses.

**Your live dashboard URL:** [The URL provided by your chosen platform]

Remember to bookmark this URL and share it with your team!