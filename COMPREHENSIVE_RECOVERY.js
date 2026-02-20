// COMPREHENSIVE RECOVERY SCRIPT
// Run this in browser console (F12 → Console tab)
// Copy the ENTIRE file and paste into console, then press Enter
// This will search EVERYWHERE for reservation data

(function() {
  console.log("🚨 COMPREHENSIVE RESERVATION RECOVERY TOOL");
  console.log("==========================================\n");
  
  // 1. Check ALL localStorage keys
  console.log("📦 STEP 1: Checking ALL localStorage keys...\n");
  const allLocalStorage = {};
  const reservationPatterns = ['reservation', 'oceanstay', 'ocean', 'booking', 'guest', 'stay'];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    if (value && value.length > 50) { // Only check substantial data
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object') {
            // Check if it looks like reservation data
            const hasReservationFields = 
              first.room || first.guest || first.stay || first.pricing || 
              first.checkIn || first.checkOut || first.roomNumber ||
              first.status === 'Booked' || first.status === 'Checked-in' ||
              first.mealPlan || first.channel;
            
            if (hasReservationFields) {
              allLocalStorage[key] = {
                count: parsed.length,
                sample: Object.keys(first),
                data: parsed // Keep full data for recovery
              };
              console.log(`✅ FOUND: ${key} - ${parsed.length} reservations`);
            }
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Check nested objects
          for (const subKey in parsed) {
            if (Array.isArray(parsed[subKey]) && parsed[subKey].length > 0) {
              const first = parsed[subKey][0];
              if (first && typeof first === 'object' && 
                  (first.room || first.guest || first.stay)) {
                allLocalStorage[`${key}.${subKey}`] = {
                  count: parsed[subKey].length,
                  sample: Object.keys(first),
                  data: parsed[subKey]
                };
                console.log(`✅ FOUND (nested): ${key}.${subKey} - ${parsed[subKey].length} reservations`);
              }
            }
          }
        }
      } catch (e) {
        // Skip parse errors
      }
    }
  }
  
  // 2. Check sessionStorage
  console.log("\n📦 STEP 2: Checking sessionStorage...\n");
  const sessionData = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    if (value && value.length > 50) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object' && 
              (first.room || first.guest || first.stay)) {
            sessionData[key] = {
              count: parsed.length,
              data: parsed
            };
            console.log(`✅ FOUND in sessionStorage: ${key} - ${parsed.length} reservations`);
          }
        }
      } catch (e) {}
    }
  }
  
  // 3. Check IndexedDB (if used)
  console.log("\n📦 STEP 3: Checking IndexedDB...\n");
  const indexedDBData = {};
  if (window.indexedDB) {
    console.log("   IndexedDB is available. Checking databases...");
    // Note: IndexedDB access is async, so we'll just note it exists
    console.log("   ⚠️  IndexedDB requires async access. Check manually in Application tab → IndexedDB");
  }
  
  // 4. Summary
  console.log("\n\n📊 RECOVERY SUMMARY");
  console.log("===================\n");
  
  const allFound = { ...allLocalStorage, ...sessionData };
  
  if (Object.keys(allFound).length === 0) {
    console.log("❌ NO BACKUP DATA FOUND IN BROWSER STORAGE");
    console.log("\n🔍 NEXT STEPS:");
    console.log("1. Check Supabase Dashboard → Table Editor → reservations table");
    console.log("2. Check Supabase Dashboard → Database → Backups (if available)");
    console.log("3. Check browser sync/backup features:");
    console.log("   - Chrome: chrome://sync-internals/");
    console.log("   - Edge: edge://sync-internals/");
    console.log("4. Check if you exported data recently (Downloads folder)");
    console.log("5. Check system restore points");
    console.log("6. Check browser profile backups");
  } else {
    console.log(`✅ FOUND ${Object.keys(allFound).length} POTENTIAL BACKUP(S):\n`);
    Object.entries(allFound).forEach(([key, info]) => {
      console.log(`   📁 ${key}: ${info.count} reservations`);
    });
    
    console.log("\n💾 TO RESTORE:");
    console.log("   Copy the data from one of the keys above and run:");
    console.log("\n   // Example:");
    const firstKey = Object.keys(allFound)[0];
    const firstData = allFound[firstKey].data;
    console.log(`   const backup = ${JSON.stringify(firstData, null, 2).substring(0, 500)}...`);
    console.log(`   localStorage.setItem('oceanstay_reservations_v1', JSON.stringify(backup));`);
    console.log(`   location.reload();`);
  }
  
  // 5. Create recovery function
  window.recoverReservations = function(keyName) {
    if (!allFound[keyName]) {
      console.error(`Key "${keyName}" not found in backups`);
      return;
    }
    const backup = allFound[keyName].data;
    localStorage.setItem('oceanstay_reservations_v1', JSON.stringify(backup));
    console.log(`✅ Restored ${backup.length} reservations from ${keyName}`);
    console.log("🔄 Refreshing page...");
    setTimeout(() => location.reload(), 1000);
  };
  
  console.log("\n\n🛠️  QUICK RESTORE FUNCTION:");
  console.log("   Use: recoverReservations('KEY_NAME')");
  console.log("   Example: recoverReservations('" + Object.keys(allFound)[0] + "')");
  
  // Return data for manual inspection and expose globally
  const result = {
    localStorage: allLocalStorage,
    sessionStorage: sessionData,
    allFound: allFound,
    restore: window.recoverReservations
  };
  
  // Expose globally for easy access
  window.RECOVERY_RESULT = result;
  
  console.log("\n✅ Recovery scan complete!");
  console.log("💡 Access results with: RECOVERY_RESULT");
  console.log("💡 Restore with: recoverReservations('KEY_NAME')");
  
  return result;
})();
