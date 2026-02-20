# Reservation Recovery Instructions

## What Happened?

Your reservations were likely deleted due to a cloud sync issue where an empty array from the cloud overwrote your local data.

## Immediate Recovery Steps

### Step 1: Check Browser Console for Backups

1. Open your browser's Developer Console (F12 or Right-click → Inspect → Console tab)
2. Copy and paste the recovery script from `recover-reservations.js` into the console
3. Press Enter to run it
4. Look for any backup data in the output

### Step 2: Manual Recovery (if backups found)

If the script finds backup data, you can restore it:

```javascript
// Replace BACKUP_KEY_NAME with the actual key name from the recovery script
const backup = JSON.parse(localStorage.getItem('BACKUP_KEY_NAME'));
localStorage.setItem('oceanstay_reservations_v1', JSON.stringify(backup));
location.reload(); // Refresh the page
```

### Step 3: Check Supabase Cloud (if using cloud sync)

If you're using Supabase cloud sync:
1. Log into your Supabase dashboard
2. Go to Table Editor → `reservations` table
3. Check if your reservations are still there
4. If they exist in Supabase but not in the app, the app will sync them on next refresh

### Step 4: Disable Cloud Sync Temporarily

To prevent further data loss:
1. Go to Settings → System Configuration
2. Disable "Cloud Sync Enabled"
3. This will keep your local data safe

## Prevention Measures Added

I've added safety checks to prevent this from happening again:

1. **Cloud Pull Protection**: The app will no longer overwrite local reservations with empty cloud data
2. **Cloud Push Protection**: The app will not delete all cloud reservations if an empty array is synced

## If No Backup Found

Unfortunately, if no backup is found:
- Check if you have browser backups (Chrome/Edge sync, Firefox sync)
- Check if you exported data recently
- Check Supabase cloud database directly
- Consider restoring from a browser backup or system restore point

## Future Recommendations

1. **Regular Exports**: Export your data regularly from the Reports page
2. **Backup Before Cloud Sync**: Always backup before enabling cloud sync
3. **Monitor Cloud Data**: Check Supabase dashboard periodically to ensure data is syncing correctly
