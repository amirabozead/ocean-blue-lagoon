// ⚡ QUICK RECOVERY - Run this FIRST in browser console (F12)
// This checks the most likely recovery sources quickly

console.log("🚨 QUICK RECOVERY CHECK - Running now...\n");

// 1. Check main localStorage key
const mainKey = "oceanstay_reservations_v1";
const mainData = localStorage.getItem(mainKey);
if (mainData) {
  try {
    const parsed = JSON.parse(mainData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`✅ FOUND IN MAIN KEY: ${parsed.length} reservations!`);
      console.log("   Data exists! The app should show them.");
    } else {
      console.log(`❌ Main key exists but is EMPTY (${parsed.length} reservations)`);
    }
  } catch (e) {
    console.log("❌ Main key exists but has parse error");
  }
} else {
  console.log("❌ Main key NOT FOUND");
}

// 2. Quick scan for ANY reservation-like data
console.log("\n🔍 Scanning all localStorage for backups...");
let foundBackups = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  if (value && value.length > 100) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && 
            (first.room || first.guest || first.stay || first.pricing || 
             first.checkIn || first.checkOut || first.status === 'Booked')) {
          foundBackups.push({ key, count: parsed.length });
          console.log(`   ✅ ${key}: ${parsed.length} reservations`);
        }
      }
    } catch (e) {}
  }
}

if (foundBackups.length === 0) {
  console.log("   ❌ No backups found in localStorage");
} else {
  console.log(`\n💾 Found ${foundBackups.length} backup(s)!`);
  console.log("   Run COMPREHENSIVE_RECOVERY.js for full recovery options.");
}

// 3. Check Supabase config
console.log("\n☁️ Checking Supabase configuration...");
try {
  const sbCfg = JSON.parse(localStorage.getItem("ocean_supabase_cfg_v1") || 
                           localStorage.getItem("oceanstay_supabase_cfg_v1") || "{}");
  if (sbCfg.url && sbCfg.anon) {
    console.log(`   ✅ Supabase configured: ${sbCfg.url}`);
    console.log("   ⚠️  Check Supabase Dashboard for backups!");
    console.log("   📋 See: check-supabase-backups.md");
  } else {
    console.log("   ℹ️  Supabase not configured");
  }
} catch (e) {
  console.log("   ❌ Error checking Supabase config");
}

// 4. Instructions
console.log("\n\n📋 NEXT STEPS:");
console.log("1. If backups found above → Run COMPREHENSIVE_RECOVERY.js");
console.log("2. Check Supabase Dashboard → Settings → Database → Backups");
console.log("3. Check browser sync: chrome://sync-internals/");
console.log("4. Check Downloads folder for export files");
console.log("5. See EMERGENCY_RECOVERY_GUIDE.md for all options");

console.log("\n⏰ ACT FAST - Time is critical for recovery!");
