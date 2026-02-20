# How to Check Supabase Backups

## Step-by-Step Guide

### 1. Log into Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Log in with your account
- Select your project

### 2. Check Your Plan
- Go to: **Settings** → **Billing** or **Project Settings**
- Check if you're on:
  - **Free Plan**: ❌ No automatic backups
  - **Pro Plan** ($25/month): ✅ 7 days point-in-time recovery
  - **Team Plan**: ✅ 14 days point-in-time recovery

### 3. Access Database Backups
- Go to: **Settings** → **Database**
- Look for:
  - **Backups** section
  - **Point-in-time recovery** option
  - **Database backups** tab

### 4. If Backups Are Available
- You'll see a timeline or list of backup points
- Select a time BEFORE your data was deleted
- Click **Restore** or **Recover**
- Choose to restore only the `reservations` table

### 5. If No Backups Available
- Check **Logs** → **Database Logs**
- Look for DELETE operations
- This helps understand when deletion happened
- Contact Supabase support: support@supabase.io

### 6. Alternative: Check Supabase SQL Editor
- Go to: **SQL Editor**
- Run this query to check if ANY data exists:
```sql
SELECT COUNT(*) FROM reservations;
SELECT * FROM reservations LIMIT 10;
```

### 7. Check Table Structure
- Go to: **Table Editor** → **reservations**
- Even if empty, check if table structure exists
- This confirms the table wasn't dropped entirely

## Contact Supabase Support

If you have Pro/Team plan and backups should exist:
- Email: support@supabase.io
- Include: Project ID, approximate deletion time
- Ask about: Point-in-time recovery options
