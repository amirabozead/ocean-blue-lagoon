# How to Update Your Deployment After Making Changes

## Quick Steps to Deploy Updates

### Step 1: Commit Your Changes Locally
```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Add reservation validation and world map updates"

# Push to GitHub
git push origin main
```

### Step 2: Vercel Auto-Deploys
- Vercel automatically detects the push to GitHub
- A new deployment starts automatically
- You'll see it in your Vercel dashboard

### Step 3: Monitor Deployment
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Check the "Deployments" tab
4. Wait for the build to complete (usually 1-3 minutes)

## Alternative: Manual Deployment via Vercel CLI

If you want to deploy manually from command line:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Updating Environment Variables

If you need to update environment variables:

### Via Dashboard:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit the variable you want to change
3. Click "Save"
4. Redeploy (or wait for next auto-deployment)

### Via CLI:
```bash
# Update an environment variable
vercel env rm VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL production

# Then redeploy
vercel --prod
```

## Common Workflow

```bash
# 1. Make your code changes
# ... edit files ...

# 2. Test locally
npm run dev

# 3. Build locally to check for errors
npm run build

# 4. Commit and push
git add .
git commit -m "Description of changes"
git push origin main

# 5. Vercel automatically deploys!
# Check dashboard for status
```

## Troubleshooting

### Changes Not Showing?
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check Vercel deployment logs for errors
- Verify the deployment completed successfully

### Build Failing?
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Need to Rollback?
- Go to Vercel Dashboard → Deployments
- Find the previous working deployment
- Click "..." → "Promote to Production"
