# Deployment Guide: Ocean Stay Admin to Vercel

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- Your Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)

## Step-by-Step Deployment Instructions

### Step 1: Prepare Your Code
1. **Commit all changes** to your local git repository:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```

### Step 2: Push to GitHub
1. **Create a GitHub repository** (if you don't have one):
   - Go to https://github.com/new
   - Name it (e.g., "ocean-stay-admin")
   - Choose Public or Private
   - **DO NOT** initialize with README (you already have code)

2. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

### Step 3: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended for first-time)

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Sign up/Login with your GitHub account

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository (ocean-stay-admin)
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-fill)
   - **Output Directory**: `dist` (should auto-fill)
   - **Install Command**: `npm install` (should auto-fill)

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add the following:
     - **Name**: `VITE_SUPABASE_URL`
     - **Value**: Your Supabase project URL
     - **Environment**: Production, Preview, Development (select all)
     - Click "Add"
   
   - **Name**: `VITE_SUPABASE_ANON_KEY`
     - **Value**: Your Supabase anonymous key
     - **Environment**: Production, Preview, Development (select all)
     - Click "Add"

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete (usually 1-3 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

#### Option B: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts:
     - Set up and deploy? **Yes**
     - Which scope? Select your account
     - Link to existing project? **No** (first time)
     - Project name? `ocean-stay-admin` (or your choice)
     - Directory? `./` (press Enter)
     - Override settings? **No**

4. **Add Environment Variables**:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   - Enter the values when prompted
   - Select environments (Production, Preview, Development)

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Step 4: Verify Deployment

1. **Check Build Logs**:
   - Go to your Vercel dashboard
   - Click on your project
   - Check "Deployments" tab for build status

2. **Test Your App**:
   - Visit your deployment URL
   - Test all features
   - Check browser console for any errors

### Step 5: Custom Domain (Optional)

1. **Add Domain**:
   - In Vercel dashboard → Your Project → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### Environment Variables Not Working
- Ensure variable names start with `VITE_` (required for Vite)
- Redeploy after adding environment variables
- Check that variables are added to all environments (Production, Preview, Development)

### Routing Issues (404 on refresh)
- The `vercel.json` file handles this with rewrites
- Ensure `vercel.json` is in your repository root

### Supabase Connection Issues
- Verify your Supabase URL and key are correct
- Check Supabase project settings
- Ensure CORS is configured in Supabase (if needed)

## Post-Deployment Checklist

- [ ] App loads correctly
- [ ] Environment variables are set
- [ ] Supabase connection works
- [ ] All features function properly
- [ ] No console errors
- [ ] Mobile responsive (if applicable)

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Vite Deployment: https://vitejs.dev/guide/static-deploy.html#vercel
- Vercel Support: https://vercel.com/support
