import { createClient } from "@supabase/supabase-js";

// قراءة البيانات من ملف .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// وظيفة النقل السحرية - مدمجة داخل التطبيق
window.startMigration = async () => {
  if (!supabase) return console.error("❌ تأكد من إعداد ملف .env أولاً!");
  
  console.log("⏳ جاري نقل البيانات من جهازك إلى السحاب...");

  try {
    // 1. نقل الحجوزات
    if (window.db?.getAll) {
      const res = await window.db.getAll();
      if (res.length > 0) {
        const rows = res.map(r => ({
          external_id: String(r.id || Math.random()),
          payload: r,
          created_at: new Date().toISOString()
        }));
        await supabase.from('reservations').upsert(rows);
        console.log("✅ تم نقل الحجوزات.");
      }
    }

    // 2. نقل الإعدادات والمصاريف من LocalStorage
    const sync = [
      { k: "ocean_settings_v1", t: "ocean_settings", isObj: true },
      { k: "oceanstay_daily_rates", t: "ocean_daily_rates" },
      { k: "ocean_expenses_v1", t: "ocean_expenses" }
    ];

    for (const item of sync) {
      const raw = localStorage.getItem(item.k);
      if (!raw) continue;
      const data = JSON.parse(raw);
      
      if (item.isObj) {
        const rows = Object.entries(data).map(([id, value]) => ({
          id, data: { value }, updated_at: new Date().toISOString()
        }));
        await supabase.from(item.t).upsert(rows);
      } else if (Array.isArray(data) && data.length > 0) {
        const rows = data.map(x => ({
          id: String(x.id || Math.random()),
          data: x, updated_at: new Date().toISOString()
        }));
        await supabase.from(item.t).upsert(rows);
      }
      console.log(`✅ تم نقل ${item.t}.`);
    }
    console.log("🎉 العملية تمت بنجاح! بياناتك الآن على الإنترنت.");
  } catch (err) {
    console.error("❌ حدث خطأ أثناء النقل:", err);
  }
};

export const db = {
  getReservations: async () => {
    if (!supabase) return window.db?.getAll ? window.db.getAll() : [];
    const { data } = await supabase.from("reservations").select("payload");
    return (data || []).map(r => r.payload);
  },
  // أضف باقي الدوال بنفس النمط (getSettings, getDailyRates)
};