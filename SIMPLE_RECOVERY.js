// SIMPLE RECOVERY SCRIPT - Copy entire file and paste into browser console
// No errors, just works!

console.log("🔍 Searching for reservation backups...\n");

const backups = [];

// Check all localStorage
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  try {
    const value = localStorage.getItem(key);
    if (value && value.length > 50) {
      const data = JSON.parse(value);
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (first && typeof first === 'object') {
          if (first.room || first.guest || first.stay || first.pricing || 
              first.checkIn || first.checkOut || first.status === 'Booked') {
            backups.push({ key, count: data.length, data });
            console.log(`✅ Found: ${key} - ${data.length} reservations`);
          }
        }
      }
    }
  } catch (e) {}
}

// Check sessionStorage
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  try {
    const value = sessionStorage.getItem(key);
    if (value && value.length > 50) {
      const data = JSON.parse(value);
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (first && typeof first === 'object' && 
            (first.room || first.guest || first.stay)) {
          backups.push({ key: 'session:' + key, count: data.length, data });
          console.log(`✅ Found in sessionStorage: ${key} - ${data.length} reservations`);
        }
      }
    }
  } catch (e) {}
}

console.log(`\n📊 Total backups found: ${backups.length}`);

if (backups.length > 0) {
  console.log("\n💾 To restore, run:");
  console.log(`   restoreReservation('${backups[0].key}')`);
  
  // Create restore function
  window.restoreReservation = function(keyName) {
    const backup = backups.find(b => b.key === keyName);
    if (!backup) {
      console.error(`Backup "${keyName}" not found`);
      console.log("Available backups:", backups.map(b => b.key));
      return;
    }
    localStorage.setItem('oceanstay_reservations_v1', JSON.stringify(backup.data));
    console.log(`✅ Restored ${backup.count} reservations! Refreshing page...`);
    setTimeout(() => location.reload(), 1000);
  };
  
  console.log("\n📋 Available backups:");
  backups.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.key} (${b.count} reservations)`);
  });
} else {
  console.log("\n❌ No backups found in browser storage");
  console.log("📋 Next steps:");
  console.log("   1. Check Supabase Dashboard → Settings → Database → Backups");
  console.log("   2. Check browser sync: chrome://sync-internals/");
  console.log("   3. Check Downloads folder for export files");
  console.log("   4. Check other devices/browsers");
}

// Store backups globally
window.RESERVATION_BACKUPS = backups;
