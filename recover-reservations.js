// Recovery script to check for reservation backups in localStorage
// Run this in browser console: copy-paste and run

(function recoverReservations() {
  console.log("🔍 Searching for reservation data in localStorage...\n");
  
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }
  
  // Look for reservation-related keys
  const reservationKeys = keys.filter(k => 
    k.toLowerCase().includes('reservation') || 
    k.toLowerCase().includes('oceanstay')
  );
  
  console.log("📋 Found potential reservation keys:");
  reservationKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(data)) {
        console.log(`\n✅ ${key}: ${data.length} reservations`);
        if (data.length > 0) {
          console.log("   Sample:", JSON.stringify(data[0], null, 2).substring(0, 200));
        }
      } else {
        console.log(`\n📄 ${key}: (not an array)`);
      }
    } catch (e) {
      console.log(`\n❌ ${key}: (parse error)`);
    }
  });
  
  // Check main reservation key
  const mainKey = "oceanstay_reservations_v1";
  const mainData = localStorage.getItem(mainKey);
  
  console.log(`\n\n🎯 Main reservation key: ${mainKey}`);
  if (mainData) {
    try {
      const parsed = JSON.parse(mainData);
      if (Array.isArray(parsed)) {
        console.log(`   Current count: ${parsed.length} reservations`);
        if (parsed.length === 0) {
          console.log("   ⚠️  WARNING: Main key is EMPTY!");
        }
      }
    } catch (e) {
      console.log("   ❌ Parse error:", e.message);
    }
  } else {
    console.log("   ❌ Key not found!");
  }
  
  // Look for backup keys
  console.log("\n\n🔎 Checking all localStorage keys for backup data...");
  const allData = {};
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value && value.length > 100) { // Only check substantial data
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if it looks like reservation data
          const first = parsed[0];
          if (first && typeof first === 'object' && 
              (first.room || first.guest || first.stay || first.pricing)) {
            allData[key] = {
              count: parsed.length,
              sample: first
            };
          }
        }
      }
    } catch (e) {
      // Skip parse errors
    }
  });
  
  if (Object.keys(allData).length > 0) {
    console.log("\n💾 Found potential backup data:");
    Object.entries(allData).forEach(([key, info]) => {
      console.log(`\n   ${key}: ${info.count} items`);
    });
  } else {
    console.log("\n   ❌ No backup data found");
  }
  
  console.log("\n\n📝 To restore from a backup, run:");
  console.log("   localStorage.setItem('oceanstay_reservations_v1', localStorage.getItem('BACKUP_KEY_NAME'));");
  console.log("   Then refresh the page.");
  
  return {
    reservationKeys,
    allData,
    mainKey,
    mainData: mainData ? JSON.parse(mainData) : null
  };
})();
