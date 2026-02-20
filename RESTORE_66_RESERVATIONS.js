// RESTORE YOUR 66 RESERVATIONS
// Copy and paste this entire file into browser console (F12 → Console)
// Then press Enter

console.log("🔄 Restoring 66 reservations from backup...\n");

// Get the backup data
const backupData = localStorage.getItem('oceanstay_reservations');

if (!backupData) {
  console.error("❌ Backup data not found in 'oceanstay_reservations'");
  console.log("Available keys:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('reservation')) {
      console.log(`   - ${key}`);
    }
  }
} else {
  try {
    const reservations = JSON.parse(backupData);
    
    if (!Array.isArray(reservations)) {
      console.error("❌ Data is not an array");
      return;
    }
    
    console.log(`✅ Found ${reservations.length} reservations in backup`);
    
    // Restore to the main key
    localStorage.setItem('oceanstay_reservations_v1', backupData);
    
    console.log("✅ Successfully restored to 'oceanstay_reservations_v1'");
    console.log(`✅ ${reservations.length} reservations are now available`);
    console.log("\n🔄 Refreshing page in 2 seconds...");
    
    setTimeout(() => {
      location.reload();
    }, 2000);
    
  } catch (e) {
    console.error("❌ Error parsing backup data:", e);
    console.log("Raw data length:", backupData.length);
  }
}
