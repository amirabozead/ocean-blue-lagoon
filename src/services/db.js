import { createClient } from "@supabase/supabase-js";

/** =========================
 * Ocean Blue Lagoon — Cloud-First DB
 * Priority: Supabase Cloud -> Fallback: Local Storage
 * ========================= */

// 1. إعدادات السيرفر (تأكد من وجودها في Vercel Settings)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// مفاتيح الذاكرة المحلية (للطوارئ)
const LS_KEYS = {
  RATES: "oceanstay_daily_rates",
  EXPENSES: "ocean_expenses_v1",
  SETTINGS: "ocean_settings_v1"
};

export const db = {
  /** --- الحجوزات (Reservations) --- */
  getReservations: async () => {
    if (!supabase) return window.db?.getAll ? window.db.getAll() : [];
    try {
      const { data, error } = await supabase.from("reservations").select("payload");
      if (error) throw error;
      return (data || []).map(r => r.payload);
    } catch (e) {
      console.error("Cloud Error (Reservations):", e);
      return window.db?.getAll ? window.db.getAll() : [];
    }
  },

  setReservations: async (list) => {
    if (!supabase) return window.db?.setAll ? window.db.setAll(list) : list;
    const normalized = list.map(r => ({
      external_id: String(r.id || Math.random()),
      payload: r
    }));
    const { error } = await supabase.from("reservations").upsert(normalized, { onConflict: "external_id" });
    if (error) console.error("Sync Error (Reservations):", error);
    return list;
  },

  /** --- الإعدادات (Settings) --- */
  getSettings: async () => {
    if (!supabase) return JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || "{}");
    try {
      const { data, error } = await supabase.from("ocean_settings").select("id, data");
      if (error) throw error;
      // تحويل مصفوفة الصفوف إلى كائن واحد يفهمه البرنامج
      return (data || []).reduce((acc, item) => {
        acc[item.id] = item.data?.value !== undefined ? item.data.value : item.data;
        return acc;
      }, {});
    } catch (e) {
      return JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || "{}");
    }
  },

  setSettings: async (settingsObj) => {
    if (!supabase) {
      localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settingsObj));
      return true;
    }
    const entries = Object.entries(settingsObj).map(([key, value]) => ({
      id: key,
      data: { value },
      updated_at: new Date().toISOString()
    }));
    await supabase.from("ocean_settings").upsert(entries, { onConflict: "id" });
    return true;
  },

  /** --- الأسعار اليومية (Daily Rates) --- */
  getDailyRates: async () => {
    if (!supabase) return JSON.parse(localStorage.getItem(LS_KEYS.RATES) || "[]");
    try {
      const { data, error } = await supabase.from("ocean_daily_rates").select("data");
      if (error) throw error;
      return (data || []).map(r => r.data);
    } catch (e) {
      return JSON.parse(localStorage.getItem(LS_KEYS.RATES) || "[]");
    }
  },

  setDailyRates: async (rates) => {
    if (!supabase) {
      localStorage.setItem(LS_KEYS.RATES, JSON.stringify(rates));
      return true;
    }
    const entries = rates.map(r => ({ id: String(r.id), data: r, updated_at: new Date().toISOString() }));
    await supabase.from("ocean_daily_rates").upsert(entries, { onConflict: "id" });
    return true;
  },

  /** --- المصاريف (Expenses) --- */
  getExpenses: async () => {
    if (!supabase) return JSON.parse(localStorage.getItem(LS_KEYS.EXPENSES) || "[]");
    try {
      const { data, error } = await supabase.from("ocean_expenses").select("data");
      if (error) throw error;
      return (data || []).map(r => r.data);
    } catch (e) {
      return JSON.parse(localStorage.getItem(LS_KEYS.EXPENSES) || "[]");
    }
  },

  setExpenses: async (expenses) => {
    if (!supabase) {
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(expenses));
      return true;
    }
    const entries = expenses.map(e => ({ id: String(e.id), data: e, updated_at: new Date().toISOString() }));
    await supabase.from("ocean_expenses").upsert(entries, { onConflict: "id" });
    return true;
  }
};