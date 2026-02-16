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
 * Table columns: room_type, date_from, date_to, nightly_rate, pkg_bb, pkg_hb, pkg_fb, updated_at
 * NOTE: Upsert uses onConflict: "room_type,date_from,date_to" -> requires UNIQUE constraint on (room_type,date_from,date_to)
 * -------------------------- */
function _normIsoDate(v) {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}
function _num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function _readPkg(r, keyLower) {
  // supports: r.packages.{BB,HB,FB} OR r.pkg_bb/r.bb etc.
  const k = String(keyLower || "").toLowerCase();
  if (r?.packages && typeof r.packages === "object") {
    if (k === "bb") return _num(r.packages.BB ?? r.packages.bb ?? 0, 0);
    if (k === "hb") return _num(r.packages.HB ?? r.packages.hb ?? 0, 0);
    if (k === "fb") return _num(r.packages.FB ?? r.packages.fb ?? 0, 0);
  }
  if (k === "bb") return _num(r.bb ?? r.pkg_bb ?? 0, 0);
  if (k === "hb") return _num(r.hb ?? r.pkg_hb ?? 0, 0);
  if (k === "fb") return _num(r.fb ?? r.pkg_fb ?? 0, 0);
  return 0;
}

async function cloudGetDailyRates() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("ocean_daily_rates")
    .select("room_type,date_from,date_to,nightly_rate,pkg_bb,pkg_hb,pkg_fb,updated_at")
    .limit(10000);

  if (error) throw error;

  return (data || [])
    .map((r) => {
      const roomType = r.room_type;
      const from = _normIsoDate(r.date_from);
      const to = _normIsoDate(r.date_to);
      if (!roomType || !from || !to) return null;

      return {
        id: `${roomType}__${from}__${to}`, // stable local id
        roomType,
        room_type: roomType,
        from,
        to,
        date_from: from,
        date_to: to,
        rate: _num(r.nightly_rate ?? 0, 0),
        nightlyRate: _num(r.nightly_rate ?? 0, 0),
        nightly_rate: _num(r.nightly_rate ?? 0, 0),
        pkg_bb: _num(r.pkg_bb ?? 0, 0),
        pkg_hb: _num(r.pkg_hb ?? 0, 0),
        pkg_fb: _num(r.pkg_fb ?? 0, 0),
        bb: _num(r.pkg_bb ?? 0, 0),
        hb: _num(r.pkg_hb ?? 0, 0),
        fb: _num(r.pkg_fb ?? 0, 0),
        packages: {
          BB: _num(r.pkg_bb ?? 0, 0),
          HB: _num(r.pkg_hb ?? 0, 0),
          FB: _num(r.pkg_fb ?? 0, 0),
        },
        updatedAt: r.updated_at || null,
      };
    })
    .filter(Boolean);
}

async function cloudSetDailyRates(rates) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const arr = Array.isArray(rates) ? rates : [];
  const rows = arr
    .map((r) => {
      const room_type = String(r.roomType ?? r.room_type ?? "").trim();
      const date_from = _normIsoDate(r.from ?? r.date_from ?? r.dateFrom);
      const date_to_raw = _normIsoDate(r.to ?? r.date_to ?? r.dateTo) || date_from;
      const date_to = date_from && date_to_raw && date_to_raw < date_from ? date_from : date_to_raw;

      if (!room_type || !date_from || !date_to) return null;

      return {
        room_type,
        date_from,
        date_to,
        nightly_rate: _num(r.nightlyRate ?? r.nightly_rate ?? r.rate ?? 0, 0),
        pkg_bb: _readPkg(r, "bb"),
        pkg_hb: _readPkg(r, "hb"),
        pkg_fb: _readPkg(r, "fb"),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!rows.length) return true;

  const { error } = await supa
    .from("ocean_daily_rates")
    .upsert(rows, { onConflict: "room_type,date_from,date_to" });

  if (error) throw error;
  return true;
}

/* --------------------------
 * Expenses (ROWS) — ocean_expenses
 * Table columns: id, expense_date, category, vendor, description, amount, method, ref, updated_at
 * -------------------------- */
async function cloudGetExpenses() {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const { data, error } = await supa
    .from("ocean_expenses")
    .select("id,expense_date,category,vendor,description,amount,method,ref,updated_at")
    .limit(10000);

  if (error) throw error;

  return (data || [])
    .map((r) => {
      const id = r.id || null;
      const date = _normIsoDate(r.expense_date);
      if (!id || !date) return null;
      return {
        id,
        date, // app uses `date`
        expense_date: date,
        category: r.category || "",
        vendor: r.vendor || "",
        description: r.description || "",
        amount: _num(r.amount ?? 0, 0),
        method: r.method || "",
        ref: r.ref || "",
        updatedAt: r.updated_at || null,
      };
    })
    .filter(Boolean);
}

async function cloudSetExpenses(expenses) {
  const supa = getClient();
  if (!supa) throw new Error("Supabase not configured");

  const arr = Array.isArray(expenses) ? expenses : [];
  const rows = arr
    .map((x) => {
      const id = x?.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
      const expense_date = _normIsoDate(x.expense_date || x.date);
      if (!expense_date) return null;
      return {
        id,
        expense_date,
        category: x.category || "",
        vendor: x.vendor || "",
        description: x.description || "",
        amount: _num(x.amount ?? 0, 0),
        method: x.method || "",
        ref: x.ref || "",
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!rows.length) return true;

  const { error } = await supa
    .from("ocean_expenses")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  return true;
}


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
 * Local fallback (window.db + localStorage)
 * -------------------------- */
const LS_SETTINGS = "ocean_settings_v1";
const LS_DAILY_RATES = "oceanstay_daily_rates_v1";
const LS_EXPENSES = "ocean_expenses_v1";

function localGetAll() {
  if (!window?.db?.getAll) return [];
  return window.db.getAll();
}

function localSetAll(list) {
  if (window?.db?.setAll) return window.db.setAll(list);
  if (window?.db?.clear && window?.db?.bulkAdd) {
    return window.db.clear().then(() => window.db.bulkAdd(list));
  }
  return list;
}

function localGetSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    const data = raw ? safeJsonParse(raw) : null;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function localSetSettings(settingsObj) {
  try {
    const obj = settingsObj && typeof settingsObj === "object" ? settingsObj : {};
    localStorage.setItem(LS_SETTINGS, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

function localGetDailyRates() {
  try {
    const raw = localStorage.getItem(LS_DAILY_RATES);
    const data = raw ? safeJsonParse(raw) : null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function localSetDailyRates(rates) {
  try {
    const arr = Array.isArray(rates) ? rates : [];
    localStorage.setItem(LS_DAILY_RATES, JSON.stringify(arr));
    return true;
  } catch {
    return false;
  }
}

function localGetExpenses() {
  try {
    const raw = localStorage.getItem(LS_EXPENSES);
    const data = raw ? safeJsonParse(raw) : null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function localSetExpenses(expenses) {
  try {
    const arr = Array.isArray(expenses) ? expenses : [];
    localStorage.setItem(LS_EXPENSES, JSON.stringify(arr));
    return true;
  } catch {
    return false;
  }
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
