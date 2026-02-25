# Deploy Ocean Stay Admin: GitHub → Supabase → Vercel

Follow these steps to put your project on GitHub, connect Supabase, and deploy to Vercel.

---

## 1. Push to GitHub

### 1.1 Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository**.
3. Name it (e.g. `ocean-stay-admin`).
4. Choose **Private** or **Public**.
5. **Do not** add a README, .gitignore, or license (you already have them).
6. Click **Create repository**.

### 1.2 Push your code from your PC

Open a terminal in your project folder (`OC`) and run:

```bash
# If this is the first time (no remote yet)
git init
git add .
git commit -m "Initial commit: Ocean Stay Admin"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

If the project is already a git repo:

```bash
git add .
git status
git commit -m "Prepare for deploy: GitHub, Supabase, Vercel"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repository name.

---

## 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New Project**.
3. Choose organization, set **Project name** and **Database password** (save the password).
4. Pick a region and click **Create new project**.
5. When the project is ready, go to **Project Settings** (gear) → **API**.
6. Copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

### Tables your app expects

Your app uses at least:

- **reservations** – id, data (or similar), updated_at
- **app_users** – for login/security (id, email, etc.)

Create these in the Supabase **SQL Editor** or via the Table Editor to match how your app reads/writes data (see your `app.jsx` / services for exact column names).

### Optional: use env vars

- Locally: copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- On Vercel: add the same two variables in the Vercel project (see step 3).

---

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repository (e.g. `ocean-stay-admin`).
4. Vercel will detect **Vite** and use:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add (for production, or for all envs you use):

   | Name                    | Value                          |
   |-------------------------|--------------------------------|
   | `VITE_SUPABASE_URL`     | `https://YOUR_REF.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY`| your anon key                 |

6. Click **Deploy**.

When the build finishes, Vercel will give you a URL like `https://ocean-stay-admin-xxx.vercel.app`.

---

## 4. After deploy

- **Login**: Use the credentials you set in Supabase (e.g. in `app_users`) or the in-app Supabase auth you configured.
- **Supabase in the app**: If you didn’t set env vars on Vercel, you can still configure Supabase from the app’s **Settings** (URL + anon key); they are stored in the browser.
- **CSP**: If you see blocked requests in the browser console, you may need to relax the Content-Security-Policy in `index.html` (e.g. add your Vercel domain or Supabase URLs) so the app can connect to Supabase and any other APIs.

---

## Quick reference

| Step        | Where        | What to do |
|------------|--------------|------------|
| **GitHub** | github.com   | New repo → push code from `OC` folder |
| **Supabase** | supabase.com | New project → copy URL + anon key → create tables |
| **Vercel** | vercel.com   | Import repo → add env vars → Deploy |

Build command: `npm run build`  
Output: `dist`
