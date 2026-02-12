import { createClient } from "@supabase/supabase-js";

/** =========================
 *  Ocean Stay — Cloud-aware DB
 *  Uses Supabase if config exists, else falls back to window.db
 *  ========================= */

let _client = null;

function safeJsonParse(v) {
  try { return JSON.parse(v); } catch { return null; }
}

// ✅ tries to discover saved config from localStorage without relying on one key name
function findSupabaseConfig() {
  // 1) check common keys (لو عندك اسم معين هيشتغل)
  const commonKeys = [
    "ocean_supabase_cfg_v1",
    "oceanstay_supabase_cfg_v1",
    "oceanstay_cloud_cfg_v1",
    "oceanstay_supabase_cloud_v1",
    "ocean_cloud_sync_v1",
  ];

  for (const k of commonKeys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    const obj = safeJsonParse(raw);
    if (obj?.url && (obj?.anonKey || obj?.key)) {
      return {
        url: String(obj.url).trim(),
        anonKey: String(obj.anonKey || obj.key).trim(),
        enabled: obj.enabled !== false, // default true
      };
    }
  }

  // 2) heuristic scan: any JSON object containing supabase.co + token-like key
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const raw = localStorage.getItem(k);
    if (!raw || raw.length < 10) continue;
    const obj = safeJsonParse(raw);
    if (!obj || typeof obj !== "object") continue;

    const url = obj.url || obj.supabaseUrl || obj.projectUrl;
    const key = obj.anonKey || obj.anon || obj.key || obj.supabaseAnonKey;

    if (typeof url === "string" && url.includes(".supabase.co") && typeof key === "string" && key.length > 20) {
      return { url: url.trim(), anonKey: key.trim(), enabled: obj.enabled !== false };
    }
  }

  return null;
}

function getClient() {
  if (_client) return _client;

  const cfg = findSupabaseConfig();
  if (!cfg?.enabled) return null;

  // important: URL must be like https://xxxx.supabase.co
  const url = cfg.url.replace(/\/+$/, "");
  const anonKey = cfg.anonKey;

  try {
    _client = createClient(url, anonKey);
    return _client;
  } catch {
    return null;
  }
}

function getExternalId(reservation) {
  // your reservations should already have a stable id
  return reservation?.id || reservation?.reservationId || reservation?.bookingId || null;
}

/** -------------------------
 * Reservations (Cloud)
 * -------------------------- */
async function cloudGetReservations() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("reservations")
    .select("payload")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((r) => r.payload);
}

async function cloudSetReservations(list) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const arr = Array.isArray(list) ? list : [];
  // ensure each reservation has a stable external_id
  const normalized = arr.map((r) => {
    const ext = getExternalId(r) || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
    // keep the id inside payload as well (important for app logic)
    const payload = r?.id ? r : { ...r, id: ext };
    return { external_id: ext, payload };
  });

  // upsert current list
  if (normalized.length) {
    const { error: upErr } = await supa
      .from("reservations")
      .upsert(normalized, { onConflict: "external_id" });

    if (upErr) throw upErr;
  }

  // delete removed reservations (to keep tables clean)
  const keepIds = normalized.map((x) => x.external_id);

  const { data: existing, error: exErr } = await supa
    .from("reservations")
    .select("external_id");

  if (exErr) throw exErr;

  const existingIds = (existing || []).map((x) => x.external_id).filter(Boolean);
  const toDelete = existingIds.filter((id) => !keepIds.includes(id));

  if (toDelete.length) {
    const { error: delErr } = await supa
      .from("reservations")
      .delete()
      .in("external_id", toDelete);

    if (delErr) throw delErr;
  }

  return true;
}

/** -------------------------
 * Daily Rates (ROWS) — ocean_daily_rates
 * Each row: { id, data, updated_at }
 * -------------------------- */
async function cloudGetDailyRates() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("ocean_daily_rates")
    .select("id, data, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  // return array of payloads
  return (data || [])
    .map((r) => (r?.data && typeof r.data === "object" ? { ...r.data, id: r.data.id || r.id } : null))
    .filter(Boolean);
}

async function cloudSetDailyRates(rates) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const arr = Array.isArray(rates) ? rates : [];
  const normalized = arr.map((x) => {
    const id = x?.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
    return { id, data: { ...x, id }, updated_at: new Date().toISOString() };
  });

  if (normalized.length) {
    const { error: upErr } = await supa
      .from("ocean_daily_rates")
      .upsert(normalized, { onConflict: "id" });
    if (upErr) throw upErr;
  }

  // delete removed
  const keepIds = normalized.map((x) => x.id);

  const { data: existing, error: exErr } = await supa
    .from("ocean_daily_rates")
    .select("id");

  if (exErr) throw exErr;

  const existingIds = (existing || []).map((x) => x.id).filter(Boolean);
  const toDelete = existingIds.filter((id) => !keepIds.includes(id));

  if (toDelete.length) {
    const { error: delErr } = await supa
      .from("ocean_daily_rates")
      .delete()
      .in("id", toDelete);

    if (delErr) throw delErr;
  }

  return true;
}
/* --------------------------
 * Expenses (ROWS) — ocean_expenses
 * Each row: { id, data, updated_at }
 * -------------------------- */
async function cloudGetExpenses() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("ocean_expenses")
    .select("id, data, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || [])
    .map((r) => (r?.data && typeof r.data === "object" ? { ...r.data, id: r.data.id || r.id } : null))
    .filter(Boolean);
}

async function cloudSetExpenses(expenses) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const arr = Array.isArray(expenses) ? expenses : [];
  const normalized = arr.map((x) => {
    const id = x?.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
    return { id, data: { ...x, id }, updated_at: new Date().toISOString() };
  });

  if (normalized.length) {
    const { error: upErr } = await supa
      .from("ocean_expenses")
      .upsert(normalized, { onConflict: "id" });
    if (upErr) throw upErr;
  }

  // delete removed
  const keepIds = normalized.map((x) => x.id);

  const { data: existing, error: exErr } = await supa
    .from("ocean_expenses")
    .select("id");

  if (exErr) throw exErr;

  const existingIds = (existing || []).map((x) => x.id).filter(Boolean);
  const toDelete = existingIds.filter((id) => !keepIds.includes(id));

  if (toDelete.length) {
    const { error: delErr } = await supa
      .from("ocean_expenses")
      .delete()
      .in("id", toDelete);

    if (delErr) throw delErr;
  }

  return true;
}

const LS_DAILY_RATES = "oceanstay_daily_rates";
const LS_EXPENSES = "ocean_expenses_v1";
const LS_SETTINGS = "ocean_settings_v1";

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function localGetDailyRates() {
  const v = lsGet(LS_DAILY_RATES, []);
  return Array.isArray(v) ? v : [];
}
function localSetDailyRates(rates) {
  lsSet(LS_DAILY_RATES, Array.isArray(rates) ? rates : []);
  return true;
}

function localGetExpenses() {
  const v = lsGet(LS_EXPENSES, []);
  return Array.isArray(v) ? v : [];
}
function localSetExpenses(expenses) {
  lsSet(LS_EXPENSES, Array.isArray(expenses) ? expenses : []);
  return true;
}

function localGetSettings() {
  const v = lsGet(LS_SETTINGS, {});
  return v && typeof v === "object" ? v : {};
}
function localSetSettings(settingsObj) {
  const obj = settingsObj && typeof settingsObj === "object" ? settingsObj : {};
  lsSet(LS_SETTINGS, obj);
  return true;
}

/* --------------------------
 * Settings (ROWS) — ocean_settings
 * Each row: { id: setting_key, data: { value }, updated_at }
 * -------------------------- */
async function cloudGetSettings() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("ocean_settings")
    .select("id, data, updated_at");

  if (error) throw error;

  const out = {};
  (data || []).forEach((r) => {
    const key = r?.id;
    if (!key) return;
    const d = r?.data;
    out[key] = (d && typeof d === "object" && "value" in d) ? d.value : d;
  });

  return out;
}

async function cloudSetSettings(settingsObj) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const obj = settingsObj && typeof settingsObj === "object" ? settingsObj : {};
  const entries = Object.entries(obj);

  const normalized = entries.map(([key, value]) => ({
    id: String(key),
    data: { value },
    updated_at: new Date().toISOString(),
  }));

  if (normalized.length) {
    const { error: upErr } = await supa
      .from("ocean_settings")
      .upsert(normalized, { onConflict: "id" });
    if (upErr) throw upErr;
  }

  // delete removed keys
  const keepIds = normalized.map((x) => x.id);

  const { data: existing, error: exErr } = await supa
    .from("ocean_settings")
    .select("id");

  if (exErr) throw exErr;

  const existingIds = (existing || []).map((x) => x.id).filter(Boolean);
  const toDelete = existingIds.filter((id) => !keepIds.includes(id));

  if (toDelete.length) {
    const { error: delErr } = await supa
      .from("ocean_settings")
      .delete()
      .in("id", toDelete);

    if (delErr) throw delErr;
  }

  return true;
}

/** -------------------------
 * Local fallback (window.db)
 * -------------------------- */
function localGetAll() {
  if (!window?.db?.getAll) return [];
  return window.db.getAll();
}

function localSetAll(list) {
  // if your local db supports bulk replace, use it.
  // fallback: naive clear+add if exists
  if (window?.db?.setAll) return window.db.setAll(list);
  if (window?.db?.clear && window?.db?.bulkAdd) {
    return window.db.clear().then(() => window.db.bulkAdd(list));
  }
  // last resort: do nothing
  return list;
}

export const db = {
  // reservations
  getReservations: async () => {
    const supa = getClient();
    if (supa) return cloudGetReservations();
    return localGetAll();
  },
  setReservations: async (list) => {
    const supa = getClient();
    if (supa) return cloudSetReservations(list);
    return localSetAll(list);
  },

    // settings
  getSettings: async () => {
    const supa = getClient();
    if (supa) return cloudGetSettings();
    return localGetSettings();
  },
  setSettings: async (settingsObj) => {
    const supa = getClient();
    if (supa) return cloudSetSettings(settingsObj);
    return localSetSettings(settingsObj);
  },


  // daily rates
  getDailyRates: async () => {
    const supa = getClient();
    if (supa) return cloudGetDailyRates();
    return localGetDailyRates();
  },
  setDailyRates: async (rates) => {
    const supa = getClient();
    if (supa) return cloudSetDailyRates(rates);
    return localSetDailyRates(rates);
  },

  // expenses
  getExpenses: async () => {
    const supa = getClient();
    if (supa) return cloudGetExpenses();
    return localGetExpenses();
  },
  setExpenses: async (expenses) => {
    const supa = getClient();
    if (supa) return cloudSetExpenses(expenses);
    return localSetExpenses(expenses);
  },
};
