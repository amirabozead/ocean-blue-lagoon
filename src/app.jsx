/* ================= IMPORTS ================= */
import { createClient } from "@supabase/supabase-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./app.css";
// ================= Daily Rates helpers (Supabase-safe) =================
// Convert Date | "MM/DD/YYYY" | "YYYY-MM-DD" -> "YYYY-MM-DD" (or null)
const toISODate = (v) => {
  if (!v) return null;
  // Already ISO
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // MM/DD/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = String(m[1]).padStart(2, "0");
      const dd = String(m[2]).padStart(2, "0");
      const yy = m[3];
      return `${yy}-${mm}-${dd}`;
    }
    // Try Date.parse for other formats
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

const pickNumFirst = (...vals) => {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n; // includes 0
  }
  return 0;
};

// Like pickNumFirst, but returns undefined if NOTHING is provided.
// Use this when syncing to Supabase to avoid overwriting existing values with 0 by accident.
const pickNumMaybe = (...vals) => {
  let sawAny = false;
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    sawAny = true;
    const n = Number(v);
    if (!Number.isNaN(n)) return n; // includes 0
  }
  return sawAny ? 0 : undefined;
};

// Packages reader that returns undefined when the field is truly absent (so it won't overwrite in Supabase).
const readPkgMaybe = (r, key) => {
  const k = String(key || "").toLowerCase();
  const kUpper = k.toUpperCase();

  const strongHas =
    (r?.packages && (Object.prototype.hasOwnProperty.call(r.packages, k) || Object.prototype.hasOwnProperty.call(r.packages, kUpper))) ||
    (r?.packageRates && Object.prototype.hasOwnProperty.call(r.packageRates, k)) ||
    (r?.foodPackages && Object.prototype.hasOwnProperty.call(r.foodPackages, k)) ||
    (r?.food && Object.prototype.hasOwnProperty.call(r.food, k)) ||
    (r?.pkg && Object.prototype.hasOwnProperty.call(r.pkg, k)) ||
    (r?.addons && Object.prototype.hasOwnProperty.call(r.addons, k)) ||
    (r?.addOns && Object.prototype.hasOwnProperty.call(r.addOns, k)) ||
    Object.prototype.hasOwnProperty.call(r || {}, `pkg_${k}`) ||
    Object.prototype.hasOwnProperty.call(r || {}, `pkg${k.toUpperCase()}`);

  const legacyHas =
    Object.prototype.hasOwnProperty.call(r || {}, k) ||
    Object.prototype.hasOwnProperty.call(r || {}, k.toUpperCase());

  if (!strongHas && !legacyHas) return undefined;

  // If present, use the existing robust reader
  return readPkg(r, k);
};



// Useful when you have legacy "0" placeholders that should NOT override a real non-zero value later.
const pickNumPreferNonZero = (...vals) => {
  let sawZero = false;
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    const n = Number(v);
    if (Number.isNaN(n)) continue;
    if (n === 0) { sawZero = true; continue; }
    return n;
  }
  return sawZero ? 0 : 0;
};

// Packages reader (bb/hb/fb) — fixes the "0 overrides real value" bug.
// DailyRatePage saves packages: { BB, HB, FB } (uppercase), so we must read both cases.
const readPkg = (r, key) => {
  const k = String(key || "").toLowerCase(); // bb|hb|fb
  const kUpper = k.toUpperCase();

  // 1) Strong sources: if user edited here, accept even 0 (include packages.BB etc.)
  const strong = pickNumFirst(
    r?.packages?.[k],
    r?.packages?.[kUpper],
    r?.packageRates?.[k],
    r?.foodPackages?.[k],
    r?.food?.[k],
    r?.pkg?.[k],
    r?.addons?.[k],
    r?.addOns?.[k],
    r?.[`pkg_${k}`],
    r?.[`pkg${kUpper}`] // pkgBB
  );

  // If any strong source was actually present (including 0), return it.
  const hasStrong =
    (r?.packages && (Object.prototype.hasOwnProperty.call(r.packages, k) || Object.prototype.hasOwnProperty.call(r.packages, kUpper))) ||
    (r?.packageRates && Object.prototype.hasOwnProperty.call(r.packageRates, k)) ||
    (r?.foodPackages && Object.prototype.hasOwnProperty.call(r.foodPackages, k)) ||
    (r?.food && Object.prototype.hasOwnProperty.call(r.food, k)) ||
    (r?.pkg && Object.prototype.hasOwnProperty.call(r.pkg, k)) ||
    (r?.addons && Object.prototype.hasOwnProperty.call(r.addons, k)) ||
    (r?.addOns && Object.prototype.hasOwnProperty.call(r.addOns, k)) ||
    Object.prototype.hasOwnProperty.call(r || {}, `pkg_${k}`) ||
    Object.prototype.hasOwnProperty.call(r || {}, `pkg${k.toUpperCase()}`);

  if (hasStrong) return strong;

  // 2) Weak legacy shortcuts: prefer non-zero over zero
  return pickNumPreferNonZero(
    r?.[k],
    r?.[k.toUpperCase()]
  );
};

// Safe upsert for ocean_daily_rates:
// - tries UPSERT with onConflict "room_type,date_from,date_to"
// - if your table is missing the required UNIQUE constraint, it falls back to delete+insert per-row
const upsertDailyRatesSafe = async (sb, rows) => {
  if (!sb || !Array.isArray(rows) || !rows.length) return { ok: true };

  const attempt = await sb
    .from("ocean_daily_rates")
    .upsert(rows, { onConflict: "room_type,date_from,date_to" });

  if (!attempt?.error) return { ok: true };

  const msg = String(attempt.error?.message || "");
  const code = String(attempt.error?.code || "");
  const needsUnique = code === "42P10" || msg.toLowerCase().includes("no unique") || msg.toLowerCase().includes("on conflict");

  if (!needsUnique) return { ok: false, error: attempt.error };

  // fallback: delete+insert to behave like upsert without requiring UNIQUE constraint
  for (const r of rows) {
    try {
      await sb.from("ocean_daily_rates").delete().match({
        room_type: r.room_type,
        date_from: r.date_from,
        date_to: r.date_to,
      });
      const ins = await sb.from("ocean_daily_rates").insert(r);
      if (ins?.error) return { ok: false, error: ins.error };
    } catch (e) {
      return { ok: false, error: e };
    }
  }
  return { ok: true, fallback: true };
};


// 1. Components
import Sidebar from "./components/Sidebar"; // الـ Sidebar الجديد

// 2. Pages Components
import DashboardPage from "./components/DashboardPage";
import ReservationsPage from "./components/ReservationsPage";
import RoomsPage from "./components/RoomsPage";
import DailyRatePage from "./components/DailyRatePage";
import StorePage from "./components/StorePage";
import ExpensesPage from "./components/ExpensesPage";
import ReportsPage from "./components/ReportsPage";
import RevenuePage from "./components/RevenuePage";
import SettingsPage from "./components/SettingsPage";
import {
  PreAuthCloudSyncScreen,
  SecurityLoginScreen,
  SupabaseLoginScreen,
} from "./components/LoginScreens";

// 3. Global Modals
import ReservationModal from "./components/ReservationModal";
import InvoiceModal from "./components/InvoiceModal";
import RoomDetailsModal from "./components/RoomDetailsModal";

// 4. Helpers & Constants
import {
  BASE_ROOMS,
  PAYMENT_METHODS,
  LS_STORE_ITEMS,
  LS_STORE_MOVES,
  LS_STORE_SUPPLIERS,
  SEC_LS_USERS,
  SEC_LS_SESSION,
  SB_LS_CFG,
} from "./data/constants";

import {
  uid,
  storeLoad,
  storeSave,
  lsGet,
  secSeedUsers,
  normalizePhysicalStatus,
  computeSplitPricingSnapshot,
  calcNights,
  roundTo2,
} from "./utils/helpers";

const toArray = (v) =>
  Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);


/* ================= ERROR BOUNDARY ================= */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // keep console for debugging
    console.error("Page crashed:", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = String(this.state.error?.message || this.state.error || "Unknown error");
    return (
      <div style={{ padding: 16 }}>
        <div style={{ 
          padding: 16, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "rgba(255,255,255,0.9)",
          maxWidth: 860
        }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>حصل خطأ في الصفحة</h2>
          <p style={{ marginTop: 8, marginBottom: 8, opacity: 0.9 }}>
            ده سبب “الشاشة البيضا”. انسخ الرسالة دي وابعتها لي علشان أصلّحها بسرعة.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.06)" }}>
            {msg}
          </pre>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                try { navigator.clipboard.writeText(msg); } catch {}
                alert("Copied");
              }}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}
            >
              Copy Error
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const SafePage = ({ children }) => <PageErrorBoundary>{children}</PageErrorBoundary>;

function SupabaseLoginInline({ supabase, onLogin, onOpenCloudSettings }) {
  const [employeeOrEmail, setEmployeeOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const normalizeEmail = (v) => {
    const s = String(v || "").trim();
    if (!s) return "";
    // لو كتب Email صريح
    if (s.includes("@")) return s.toLowerCase();
    // لو كتب Employee ID
    return `${s}@oceanstay.local`;
  };

  const handleLogin = async () => {
    setErr("");
    const email = normalizeEmail(employeeOrEmail);
    if (!email || !password) {
      setErr("Please enter Employee ID/Email and Password.");
      return;
    }
    if (!supabase) {
      setErr("Supabase is not configured. Open Settings and set URL/Anon Key.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const authUser = data?.user;
      if (!authUser?.id) throw new Error("Auth user not returned.");

      // اقرأ ملف المستخدم من app_users
      let profile = null;
      try {
        const { data: p, error: pErr } = await supabase
          .from("app_users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (pErr) throw pErr;
        profile = p || null;
      } catch (e) {
        // لو الجدول مش جاهز/سياسات… نسيبها هنا
        console.warn("Profile read error:", e);
      }

      // لو مفيش profile، اعمل واحد افتراضي (اختياري لكن مفيد)
      if (!profile) {
        try {
          const fallback = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.email,
            role: "viewer",
            allowed_pages: ["dashboard"],
          };
          await supabase.from("app_users").upsert(fallback);
          profile = fallback;
        } catch (e) {
          console.warn("Profile upsert error:", e);
          profile = { id: authUser.id, email: authUser.email, role: "viewer", allowed_pages: ["dashboard"] };
        }
      }

      // دخّل اليوزر في سيشن التطبيق
      onLogin({
        id: profile.id,
        email: profile.email || authUser.email,
        full_name: profile.full_name || "",
        role: profile.role || "viewer",
        allowedPages: profile.allowed_pages || ["dashboard"],
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 20 }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 22, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
        <div style={{ fontSize: 28, fontFamily: "'Brush Script MT', cursive", textAlign: "center", color: "#0ea5e9" }}>
          Cloud Login
        </div>
        <div style={{ textAlign: "center", marginTop: 6, color: "#64748b", fontWeight: 700, fontSize: 12 }}>
          Sign in to continue
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>Employee ID or Email</div>
          <input
            value={employeeOrEmail}
            onChange={(e) => setEmployeeOrEmail(e.target.value)}
            className="input"
            style={{ width: "100%" }}
            placeholder="admin  OR  admin@oceanstay.local"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            style={{ width: "100%" }}
            placeholder="••••••••"
          />
        </div>

        {err && (
          <div style={{ marginTop: 12, background: "#fff1f2", border: "1px solid #fecaca", padding: 10, borderRadius: 12, color: "#9f1239", fontWeight: 800, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleLogin}
            disabled={busy}
            style={{ flex: 1, background: "#0ea5e9", color: "#fff", border: "none", padding: "12px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer" }}
          >
            {busy ? "Signing in..." : "LOGIN"}
          </button>
          <button
            onClick={onOpenCloudSettings}
            style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer" }}
          >
            SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}

function loadSupabaseCfg() {
  try {
    const raw = JSON.parse(localStorage.getItem(SB_LS_CFG) || "{}");
    const enabled = raw.enabled === true || raw.enabled === "true" || raw.enabled === 1 || raw.enabled === "1";
    let url = (raw.url || "").trim();
    const anonKey = (raw.anon || raw.anonKey || raw.key || "").trim();

    if (url && !url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;

    return { enabled, url, anonKey, push: raw.push !== false, pull: raw.pull !== false };
  } catch {
    return { enabled: false, url: "", anonKey: "", push: true, pull: true };
  }
}

let _sb = null;
let _sbSig = "";

function getSupabaseClient() {
  const cfg = loadSupabaseCfg();
  if (!cfg.enabled || !cfg.url || !cfg.anonKey) return null;

  const sig = `${cfg.url}::${cfg.anonKey.slice(0, 12)}`;
  if (_sb && _sbSig === sig) return _sb;

  _sb = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  _sbSig = sig;
  return _sb;
}



/* ================= APP COMPONENT ================= */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  

  // ================= DATA STATES (GLOBAL) =================

  // 1. Rooms Physical Status
  const [roomPhysicalStatus, setRoomPhysicalStatus] = useState(() => {
    const raw = JSON.parse(
      localStorage.getItem("ocean_room_physical_v1") || "{}"
    );
    const fixed = {};
    for (const [k, v] of Object.entries(raw || {})) {
      fixed[String(k).trim()] = normalizePhysicalStatus(v);
    }
    return fixed;
  });

  const updateRoomStatus = (roomNum, newStatus) => {
    const cleanStatus = normalizePhysicalStatus(newStatus);
    const next = { ...roomPhysicalStatus, [roomNum]: cleanStatus };
    setRoomPhysicalStatus(next);
    localStorage.setItem("ocean_room_physical_v1", JSON.stringify(next));
  };

  // 2. Expenses
  const [expenses, setExpenses] = useState(
    () => storeLoad("ocean_expenses_v1") || []
  );
  
  const updateExpenses = (newExpenses) => {
  // ثبّت ids
  const withIds = (newExpenses || []).map((x) => ({
    ...x,
    id: x.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
  }));

  setExpenses(withIds);
  storeSave("ocean_expenses_v1", withIds);

  if (supabase && supabaseEnabled) {
    (async () => {
      try {
        const rows = withIds.map((x) => ({
          id: x.id,
          expense_date: x.expense_date || x.date || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
          category: x.category || "Other",
          vendor: x.vendor || "",
          description: x.description || "",
          amount: Number(x.amount || 0),
          method: x.method || "",
          ref: x.ref || "",
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("ocean_expenses")
          .upsert(rows, { onConflict: "id" });

        if (error) console.error("SUPABASE upsert ocean_expenses error:", error);
      } catch (e) {
        console.error(e);
      }
    })();
  }
};



  // 3. Extra Revenues
  const [extraRevenues, setExtraRevenues] = useState(
    () => storeLoad("ocean_extra_rev_v1") || []
  );

  const syncExtraRevenuesToSupabase = async (list) => {
    const cfg = lsGet(SB_LS_CFG, null);
    const anon = (cfg?.anon || cfg?.anonKey || "").trim();
    if (!cfg?.enabled || !cfg?.url || !anon) return;
    const arr = Array.isArray(list) ? list : [];
    const localIds = new Set(arr.filter((r) => r && r.id).map((r) => String(r.id)));
    const todayYMD = new Date().toISOString().slice(0, 10);
    const rows = arr
      .filter((r) => r && r.id)
      .map((r) => {
        const dateStr = (r.date || "").toString().trim().slice(0, 10);
        const revenueDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayYMD;
        const nowIso = new Date().toISOString();
        return {
          id: String(r.id),
          revenue_date: revenueDate,
          type: (r.type || "Services").trim() || "Services",
          description: (r.description || "").trim(),
          amount: Number(r.amount ?? 0),
          created_at: nowIso,
          updated_at: nowIso,
        };
      });
    try {
      const sb = createClient(cfg.url, anon);
      if (rows.length) {
        const { error: upErr } = await sb.from("ocean_extra_revenues").upsert(rows, { onConflict: "id" });
        if (upErr) {
          console.error("Extra revenue sync (upsert) failed:", upErr.message, upErr.code, upErr.details);
          return;
        }
      }
      const { data: existing, error: selErr } = await sb.from("ocean_extra_revenues").select("id");
      if (selErr) {
        console.error("Extra revenue sync (select) failed:", selErr.message);
        return;
      }
      const toRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
      if (toRemove.length) await sb.from("ocean_extra_revenues").delete().in("id", toRemove);
    } catch (e) {
      console.error("Extra revenue sync error:", e);
    }
  };

  const saveRevenue = (newRevList) => {
    setExtraRevenues(newRevList);
    storeSave("ocean_extra_rev_v1", newRevList);
    syncExtraRevenuesToSupabase(newRevList);
  };

  // 4. Daily Rates
  const [dailyRates, setDailyRates] = useState(() => {
    const v1 = storeLoad("oceanstay_daily_rates_v1");
    if (Array.isArray(v1) && v1.length) return v1;
    const legacy = storeLoad("oceanstay_daily_rates");
    if (Array.isArray(legacy) && legacy.length) {
      // migrate legacy key -> v1
      try { storeSave("oceanstay_daily_rates_v1", legacy); } catch {}
      return legacy;
    }
    return [];
  });
  const prevDailyRatesRef = useRef(null);

const updateDailyRates = (next) => {
  setDailyRates((prev) => {
    // 1) احسب النسخة الجديدة بدون ما تمسح القديم بالغلط
    const computed = typeof next === "function" ? next(prev) : next;
    const list = Array.isArray(computed) ? computed : (computed ? [computed] : []);

    // 2) احفظ لوكال
    storeSave("oceanstay_daily_rates_v1", list);
    // (اختياري) لو عندك key قديم
    storeSave("oceanstay_daily_rates", list);

    // 3) ارفع للسحابة (Row-based) بنفس أعمدة الجدول الحقيقي
    if (supabase && supabaseEnabled && (lsGet(SB_LS_CFG, null)?.push !== false)) {
      setTimeout(async () => {
        try {
          const payloadClean = (list || [])
            .map((r) => {
              const room_type = (r.roomType ?? r.room_type ?? "").toString().trim();

              const fromISO = toISODate(r.from ?? r.date_from ?? r.dateFrom ?? r.date_from);
              let toISO = toISODate(r.to ?? r.date_to ?? r.dateTo ?? r.date_to) || fromISO;
              if (fromISO && toISO && toISO < fromISO) toISO = fromISO;

              return {
                room_type,
                date_from: fromISO,
                date_to: toISO,
                nightly_rate: pickNumMaybe(r.nightlyRate, r.nightly_rate, r.rate),
                pkg_bb: readPkgMaybe(r, "bb"),
                pkg_hb: readPkgMaybe(r, "hb"),
                pkg_fb: readPkgMaybe(r, "fb"),
              };
            })
            // امنع إرسال صفوف ناقصة
            .filter((x) => x.room_type && x.date_from && x.date_to);

          if (!payloadClean.length) return; 

          const res = await upsertDailyRatesSafe(supabase, payloadClean);
          if (!res.ok) {
            const error = res.error;
            console.error("ocean_daily_rates upsert error:", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
          } 
        } catch (e) {
          console.error("ocean_daily_rates upsert exception:", e);
        }
      }, 0);
    }

    return list;
  });
};



  // 5. Store Data

  // LocalStorage key fallback (prevents wiping data if key name changed between versions)
  const getAnyLs = (keys, fallback) => {
    for (const k of keys) {
      const v = lsGet(k, null);
      if (v == null) continue;
      if (Array.isArray(v)) {
        if (v.length) return v;
        // keep checking other keys if empty array
        continue;
      }
      return v;
    }
    return fallback;
  };

  const [storeItems, setStoreItems] = useState(() =>
    getAnyLs([LS_STORE_ITEMS, 'ocean_store_items_v1', 'oceanstore_store_items_v1', 'ocean_store_items'], [])
  );
  const [storeMoves, setStoreMoves] = useState(() =>
    getAnyLs([LS_STORE_MOVES, 'ocean_store_moves_v1', 'oceanstore_store_moves_v1', 'ocean_store_moves'], [])
  );
  const [storeSuppliers, setStoreSuppliers] = useState(() =>
    getAnyLs([LS_STORE_SUPPLIERS, 'ocean_store_suppliers_v1', 'oceanstore_store_suppliers_v1', 'ocean_store_suppliers'], [])
  );

  // Must be declared before any effect that uses it (pull-before-push sync)
  const [cloudBootstrapped, setCloudBootstrapped] = useState(false);

  // Persist Store tables locally + optional cloud sync (row-based)
  // Skip Supabase push until bootstrap has run (pull first), so we don't overwrite cloud with stale local
useEffect(() => {
  storeSave(LS_STORE_ITEMS, storeItems);

  if (!cloudBootstrapped) return;
  const cfg = lsGet(SB_LS_CFG, null);
  const anon = cfg?.anon || cfg?.anonKey;
  if (!cfg?.enabled || !cfg?.url || !anon || cfg.push === false) return;

  (async () => {
    try {
      const sb = createClient(cfg.url, anon);
      const localList = storeItems || [];
      const localIds = new Set(localList.map((it) => it.id).filter(Boolean));
      await sb.from("ocean_store_items").upsert(
        localList.map((it) => ({ id: it.id, data: it })),
        { onConflict: "id" }
      );
      const { data: existing } = await sb.from("ocean_store_items").select("id");
      const idsToRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
      if (idsToRemove.length) {
        await sb.from("ocean_store_items").delete().in("id", idsToRemove);
      }
    } catch (e) {
      console.warn("Store cloud sync (items) failed:", e?.message || e);
    }
  })();
}, [storeItems, cloudBootstrapped]);

useEffect(() => {
  storeSave(LS_STORE_MOVES, storeMoves);

  if (!cloudBootstrapped) return;
  const cfg = lsGet(SB_LS_CFG, null);
  const anon = cfg?.anon || cfg?.anonKey;
  if (!cfg?.enabled || !cfg?.url || !anon || cfg.push === false) return;

  (async () => {
    try {
      const sb = createClient(cfg.url, anon);
      const localList = storeMoves || [];
      const localIds = new Set(localList.map((m) => m.id).filter(Boolean));
      await sb.from("ocean_store_moves").upsert(
        localList.map((m) => ({ id: m.id, data: m })),
        { onConflict: "id" }
      );
      const { data: existing } = await sb.from("ocean_store_moves").select("id");
      const idsToRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
      if (idsToRemove.length) {
        await sb.from("ocean_store_moves").delete().in("id", idsToRemove);
      }
    } catch (e) {
      console.warn("Store cloud sync (moves) failed:", e?.message || e);
    }
  })();
}, [storeMoves, cloudBootstrapped]);

useEffect(() => {
  storeSave(LS_STORE_SUPPLIERS, storeSuppliers);

  if (!cloudBootstrapped) return;
  const cfg = lsGet(SB_LS_CFG, null);
  const anon = cfg?.anon || cfg?.anonKey;
  if (!cfg?.enabled || !cfg?.url || !anon || cfg.push === false) return;

  (async () => {
    try {
      const sb = createClient(cfg.url, anon);
      const localList = storeSuppliers || [];
      const localIds = new Set(localList.map((s) => s.id).filter(Boolean));
      await sb.from("ocean_store_suppliers").upsert(
        localList.map((s) => ({ id: s.id, data: s })),
        { onConflict: "id" }
      );
      const { data: existing } = await sb.from("ocean_store_suppliers").select("id");
      const idsToRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
      if (idsToRemove.length) {
        await sb.from("ocean_store_suppliers").delete().in("id", idsToRemove);
      }
    } catch (e) {
      console.warn("Store cloud sync (suppliers) failed:", e?.message || e);
    }
  })();
}, [storeSuppliers, cloudBootstrapped]);




  // 6. Reservations
  const [reservations, setReservations] = useState(
    () => storeLoad("oceanstay_reservations_v1") || []
  );
  const LS_KEY_RES = "oceanstay_reservations_v1";

  // Delete a reservation (used by ReservationsPage). Keeps local storage in sync.
  const handleDeleteReservation = (res) => {
    setReservations((prev) => {
      const next = (prev || []).filter(
        (x) => String(x?.id) !== String(res?.id)
      );
      try {
        storeSave(LS_KEY_RES, next);
      } catch (e) {
        console.warn("Failed to save reservations after delete", e);
      }
      return next;
    });
  };

  // ================= AUTH & CONFIG =================
  const [users, setUsers] = useState(() => {
    const existing = storeLoad(SEC_LS_USERS);
    if (existing?.length) return existing;
    const seed = secSeedUsers();
    storeSave(SEC_LS_USERS, seed);
    return seed;
  });

  const [currentUser, setCurrentUser] = useState(() => null);
  const [loginOpen, setLoginOpen] = useState(() => true);
  const [preAuthScreen, setPreAuthScreen] = useState("login");

  const [sbCfg, setSbCfg] = useState(() => {
    const c = storeLoad(SB_LS_CFG);
    return c
      ? { enabled: !!c.enabled, url: c.url || "", anon: c.anon || "", push: c.push !== false, pull: c.pull !== false }
      : { enabled: false, url: "", anon: "", push: true, pull: true };
  });

  const supabaseEnabled = !!(sbCfg?.enabled && sbCfg?.url && sbCfg?.anon);

const supabase = useMemo(() => {
  if (!supabaseEnabled) return null;
  return getSupabaseClient(); // ✅ singleton client
}, [supabaseEnabled, sbCfg?.url, sbCfg?.anon]);


  const sbSaveCfg = (cfg, forceEnabled) => {
    const next = { ...cfg, enabled: forceEnabled ?? cfg.enabled };
    storeSave(SB_LS_CFG, next);
    setSbCfg(next);
  };

  const persistUsers = (val) => {
    setUsers(val);
    storeSave(SEC_LS_USERS, val);
  };

  // ================= CLOUD BOOTSTRAP (DOWNLOAD FROM SUPABASE) =================
useEffect(() => {
  if (cloudBootstrapped) return;

  const cfg = lsGet(SB_LS_CFG, null);
  const anon = (cfg?.anon || cfg?.anonKey || "").trim();
  if (!cfg?.enabled || !cfg?.url || !anon) {
    setCloudBootstrapped(true);
    return;
  }

  let cancelled = false;
  (async () => {
    try {
      const sb = createClient(cfg.url, anon);

      const allowPull = cfg.pull !== false;
      const allowPush = cfg.push !== false;

      const [itemsRes, movesRes, suppliersRes, expRes, drRes, resRes, extraRevRes] = await Promise.all([
        allowPull ? sb.from("ocean_store_items").select("id,data") : Promise.resolve({ data: [] }),
        allowPull ? sb.from("ocean_store_moves").select("id,data") : Promise.resolve({ data: [] }),
        allowPull ? sb.from("ocean_store_suppliers").select("id,data") : Promise.resolve({ data: [] }),
        allowPull ? sb.from("ocean_expenses").select("id,expense_date,category,vendor,description,amount,method,ref,updated_at").limit(10000) : Promise.resolve({ data: [] }),
        allowPull
          ? sb.from("ocean_daily_rates")
              .select("room_type,date_from,date_to,nightly_rate,pkg_bb,pkg_hb,pkg_fb")
              .limit(10000)
          : Promise.resolve({ data: [] }),
        allowPull ? sb.from("reservations").select("id,data,updated_at") : Promise.resolve({ data: [] }),
        allowPull ? sb.from("ocean_extra_revenues").select("id,revenue_date,type,description,amount,created_at,updated_at") : Promise.resolve({ data: [] }),
      ]);

      const itemsCloud = (itemsRes?.data || []).map((r) => r.data).filter(Boolean);
      const movesCloud = (movesRes?.data || []).map((r) => r.data).filter(Boolean);
      const suppliersCloud = (suppliersRes?.data || []).map((r) => r.data).filter(Boolean);
      const expensesCloud = (expRes?.data || []).map((r) => ({
        id: r.id,
        date: (r.expense_date || "").toString().slice(0, 10),
        expense_date: (r.expense_date || "").toString().slice(0, 10),
        category: r.category || "",
        vendor: r.vendor || "",
        description: r.description || "",
        amount: Number(r.amount ?? 0),
        method: r.method || "",
        ref: r.ref || "",
        updatedAt: r.updated_at || null,
      })).filter((x) => x.id && x.date);
      const dailyRatesCloud = (drRes?.data || []).map((r) => ({
        roomType: r.room_type,
        room_type: r.room_type,
        from: r.date_from,
        to: r.date_to,
        date_from: r.date_from,
        date_to: r.date_to,
        nightlyRate: Number(r.nightly_rate ?? 0),
        nightly_rate: Number(r.nightly_rate ?? 0),
        pkg_bb: Number(r.pkg_bb ?? 0),
        pkg_hb: Number(r.pkg_hb ?? 0),
        pkg_fb: Number(r.pkg_fb ?? 0),
        bb: Number(r.pkg_bb ?? 0),
        hb: Number(r.pkg_hb ?? 0),
        fb: Number(r.pkg_fb ?? 0),
      })).filter((x) => x.roomType && x.from && x.to);
      const reservationsCloud = (resRes?.data || []).map((r) => r.data).filter(Boolean);
      if (extraRevRes?.error) {
        console.warn("Extra revenues pull failed:", extraRevRes.error.message, "→ Run supabase_ocean_extra_revenues.sql in Supabase SQL Editor.");
      }
      const extraRevenuesCloud = (extraRevRes?.data || []).map((r) => ({
        id: r.id,
        date: (r.revenue_date || r.date || "").toString().slice(0, 10),
        type: r.type || "Services",
        description: r.description || "",
        amount: Number(r.amount ?? 0),
        createdAt: r.created_at || null,
        updatedAt: r.updated_at || null,
      })).filter((x) => x.id);

      // Apply Supabase → app: use cloud as source of truth so deletions in Supabase reflect in app on refresh
      if (!cancelled && allowPull) {
        setStoreItems(itemsCloud);
        storeSave(LS_STORE_ITEMS, itemsCloud);
        setStoreMoves(movesCloud);
        storeSave(LS_STORE_MOVES, movesCloud);
        setStoreSuppliers(suppliersCloud);
        storeSave(LS_STORE_SUPPLIERS, suppliersCloud);
        setExpenses(expensesCloud);
        storeSave("ocean_expenses_v1", expensesCloud);
        setDailyRates(dailyRatesCloud);
        storeSave("oceanstay_daily_rates_v1", dailyRatesCloud);
        storeSave("oceanstay_daily_rates", dailyRatesCloud);
        setReservations(reservationsCloud);
        storeSave("oceanstay_reservations_v1", reservationsCloud);
        setExtraRevenues(extraRevenuesCloud);
        storeSave("ocean_extra_rev_v1", extraRevenuesCloud);
        setCloudBootstrapped(true);
        return;
      }

      // Else: push local to cloud (seed when pull disabled or first-time)
      const localItems = storeItems || [];
      const localMoves = storeMoves || [];
      const localSuppliers = storeSuppliers || [];
      const localExpenses = expenses || [];
      const localReservations = reservations || [];
      const localExtraRevenues = extraRevenues || [];

      if (allowPush && localReservations.length) {
        const resRows = localReservations
          .filter((r) => r && r.id)
          .map((r) => ({ id: String(r.id), data: r, updated_at: r.updatedAt || new Date().toISOString() }));
        if (resRows.length) await sb.from("reservations").upsert(resRows, { onConflict: "id" });
      }
      if (allowPush && localItems.length) {
        await sb.from("ocean_store_items").upsert(localItems.map((it) => ({ id: it.id, data: it })), { onConflict: "id" });
      }
      if (allowPush && localMoves.length) {
        await sb.from("ocean_store_moves").upsert(localMoves.map((m) => ({ id: m.id, data: m })), { onConflict: "id" });
      }
      if (allowPush && localSuppliers.length) {
        await sb.from("ocean_store_suppliers").upsert(localSuppliers.map((s) => ({ id: s.id, data: s })), { onConflict: "id" });
      }
      if (allowPush && localExtraRevenues.length) {
        const todayYMD = new Date().toISOString().slice(0, 10);
        const extraRows = localExtraRevenues
          .filter((r) => r && r.id)
          .map((r) => {
            const dateStr = (r.date || "").toString().trim().slice(0, 10);
            const revenueDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayYMD;
            const nowIso = new Date().toISOString();
            return {
              id: String(r.id),
              revenue_date: revenueDate,
              type: (r.type || "Services").trim() || "Services",
              description: (r.description || "").trim(),
              amount: Number(r.amount ?? 0),
              created_at: nowIso,
              updated_at: nowIso,
            };
          });
        if (extraRows.length) await sb.from("ocean_extra_revenues").upsert(extraRows, { onConflict: "id" });
      }

      // Expenses (ROWS)
      if (allowPush && Array.isArray(localExpenses) && localExpenses.length) {
        const payloadExpenses = (localExpenses || []).map((x) => ({
          id: x.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
          expense_date: (x.expense_date || x.date || new Date().toISOString().slice(0, 10)).toString().slice(0, 10),
          category: x.category || "",
          vendor: x.vendor || "",
          description: x.description || "",
          amount: Number(x.amount || 0),
          method: x.method || "",
          ref: x.ref || "",
          updated_at: new Date().toISOString(),
        }));
        if (payloadExpenses.length) {
          const { error: expErr } = await sb
            .from("ocean_expenses")
            .upsert(payloadExpenses, { onConflict: "id" });
          if (expErr) console.error("ocean_expenses upsert error:", expErr);
        }
      }

      // Daily Rates (rows)
      if (allowPush && Array.isArray(dailyRates) && dailyRates.length) {
        const payloadClean = (dailyRates || [])
          .map((r) => {
            const room_type = (r.roomType ?? r.room_type ?? "").toString().trim();
            const fromISO = toISODate(r.from ?? r.date_from ?? r.dateFrom ?? r.date_from);
            let toISO = toISODate(r.to ?? r.date_to ?? r.dateTo ?? r.date_to) || fromISO;
            if (fromISO && toISO && toISO < fromISO) toISO = fromISO;

            return {
              room_type,
              date_from: fromISO,
              date_to: toISO,
              nightly_rate: pickNumMaybe(r.nightlyRate, r.nightly_rate, r.rate),
              pkg_bb: readPkgMaybe(r, "bb"),
              pkg_hb: readPkgMaybe(r, "hb"),
              pkg_fb: readPkgMaybe(r, "fb"),
            };
          })
          .filter((x) => x.room_type && x.date_from && x.date_to);

        if (payloadClean.length) {
          const drRes2 = await upsertDailyRatesSafe(sb, payloadClean);
          if (!drRes2.ok) console.error("ocean_daily_rates upsert error:", drRes2.error);
        }
      }

      if (!cancelled) setCloudBootstrapped(true);
    } catch (e) {
      console.warn("Store cloud bootstrap failed:", e?.message || e);
      if (!cancelled) setCloudBootstrapped(true);
    }
  })();

  return () => { cancelled = true; };
}, [cloudBootstrapped]);

  // ✅ دالة الخروج (موجودة بالفعل وتم ربطها الآن)
  const doLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(SEC_LS_SESSION);
    setCurrentUser(null);
    setLoginOpen(true);
    setPage("dashboard");
  };
  const dologout = doLogout; // alias to avoid typo-related runtime errors

  const doLogin = (user) => {
    setCurrentUser(user);
    storeSave(SEC_LS_SESSION, user);
    setLoginOpen(false);
  };

  // ================= MODALS STATE =================
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [invoiceReservation, setInvoiceReservation] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleNewReservation = () => {
    setEditingIndex(null);
    setEditingReservation({
      room: { roomNumber: "" },
      stay: { checkIn: "", checkOut: "" },
      status: "Booked",
      pax: 1,
      mealPlan: "BO",
      channel: "Direct booking",
      paymentMethod: "Cash",
      guest: {},
      pricing: {
        nightly: 0,
        subtotal: 0,
        taxAmount: 0,
        serviceAmount: 0,
        cityTaxFixed: 0,
        cityTaxAmount: 0,
        total: 0,
      },
    });
    setShowReservationModal(true);
  };

  const handleEditReservation = (resOrIdx) => {
    let idx = null;

    if (typeof resOrIdx === "number") {
      idx = resOrIdx;
    } else if (resOrIdx && typeof resOrIdx === "object") {
      idx = reservations.findIndex(
        (x) => String(x?.id) === String(resOrIdx?.id)
      );
    }

    if (idx === null || idx < 0 || idx >= reservations.length) return;

    setEditingIndex(idx);
    setEditingReservation(reservations[idx]);
    setShowReservationModal(true);
  };

  const handleInvoice = (resOrIdx) => {
    const r = typeof resOrIdx === "number" ? reservations[resOrIdx] : resOrIdx;
    if (!r) return;
    setInvoiceReservation(r);
  };

  const handleSaveReservation = (data) => {
    let next;
    if (editingIndex !== null) {
      next = [...reservations];
      next[editingIndex] = {
        ...next[editingIndex],
        ...data,
        updatedAt: new Date().toISOString(),
      };
    } else {
      next = [
        ...reservations,
        { ...data, id: uid("res"), createdAt: new Date().toISOString() },
      ];
    }
    const savedRes = editingIndex !== null ? next[editingIndex] : next[next.length - 1];
    const s = storeLoad("ocean_settings_v1", null);
    const taxRate = Number(s?.taxRate ?? 17);
    const serviceCharge = Number(s?.serviceCharge ?? 10);
    const cityTaxFixed = Number(s?.cityTax ?? 0);
    const snap = computeSplitPricingSnapshot({
      roomType: savedRes?.room?.roomType,
      checkIn: savedRes?.stay?.checkIn,
      checkOut: savedRes?.stay?.checkOut,
      dailyRates,
      taxRate,
      serviceCharge,
      mealPlan: savedRes?.mealPlan ?? data?.mealPlan ?? "BO",
      pax: savedRes?.pax ?? data?.pax ?? 1,
    });
    if (snap.ok) {
      const roomSubtotal = snap.nightly.reduce((sum, x) => sum + Number(x.baseRate ?? 0), 0);
      const packageSubtotal = snap.nightly.reduce((sum, x) => sum + Math.max(0, Number(x.rate ?? 0) - Number(x.baseRate ?? 0)), 0);
      const cityTaxAmount = roundTo2((savedRes?.pax ?? 1) * cityTaxFixed * calcNights(savedRes?.stay?.checkIn, savedRes?.stay?.checkOut));
      const total = roundTo2(snap.total + cityTaxAmount);
      const idx = editingIndex !== null ? editingIndex : next.length - 1;
      next = [...next];
      next[idx] = {
        ...next[idx],
        pricing: {
          ...next[idx].pricing,
          nightly: snap.nightly,
          subtotal: snap.subtotal,
          taxAmount: snap.taxAmount,
          serviceAmount: snap.serviceAmount,
          roomSubtotal: roundTo2(roomSubtotal),
          packageSubtotal: roundTo2(packageSubtotal),
          cityTaxFixed,
          cityTaxAmount,
          total,
        },
        updatedAt: new Date().toISOString(),
      };
    }
    setReservations(next);
    storeSave("oceanstay_reservations_v1", next);
    setShowReservationModal(false);
  };

  const handleCloseModal = () => {
    setShowReservationModal(false);
    setEditingIndex(null);
    setEditingReservation(null);
  };

  const handleAddReservationClick = (roomNumber, dateStr) => {
    setEditingIndex(null);
    const newBookingData = {
      room: { roomNumber: roomNumber },
      stay: { checkIn: "", checkOut: "" },
      status: "Booked",
      pax: 1,
      mealPlan: "BO",
      channel: "Direct booking",
      paymentMethod: "Cash",
      guest: {},
      pricing: {
        nightly: 0,
        subtotal: 0,
        taxAmount: 0,
        serviceAmount: 0,
        cityTaxFixed: 0,
        cityTaxAmount: 0,
        total: 0,
      },
    };
    setEditingReservation(newBookingData);
    setShowReservationModal(true);
  };

  // ================= EFFECTS: DATA SYNC =================
  // Don't push to Supabase until bootstrap has run (pull first), so cloud stays source of truth on load
  useEffect(() => {
    if (!cloudBootstrapped || !supabase || !supabaseEnabled) return;
    const saveRes = async () => {
      const localList = reservations || [];
      const localIds = new Set(localList.filter((r) => r && r.id).map((r) => String(r.id)));
      const rows = localList
        .filter((r) => r && r.id)
        .map((r) => ({
          id: String(r.id),
          data: r,
          updated_at: r.updatedAt || new Date().toISOString(),
        }));
      if (rows.length) {
        await supabase.from("reservations").upsert(rows, { onConflict: "id" });
      }
      // Remove from Supabase any reservation that was deleted locally
      const { data: existing } = await supabase.from("reservations").select("id");
      const idsToRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
      if (idsToRemove.length) {
        await supabase.from("reservations").delete().in("id", idsToRemove);
      }
    };
    const t = setTimeout(saveRes, 1000);
    return () => clearTimeout(t);
  }, [cloudBootstrapped, reservations, supabase, supabaseEnabled]);

  // Extra revenues: push to Supabase (use same config as bootstrap so sync always works)
  useEffect(() => {
    if (!cloudBootstrapped) return;
    const cfg = lsGet(SB_LS_CFG, null);
    const anon = (cfg?.anon || cfg?.anonKey || "").trim();
    if (!cfg?.enabled || !cfg?.url || !anon) return;

    const localList = Array.isArray(extraRevenues) ? extraRevenues : [];
    const localIds = new Set(localList.filter((r) => r && r.id).map((r) => String(r.id)));
    const todayYMD = new Date().toISOString().slice(0, 10);
    const rows = localList
      .filter((r) => r && r.id)
      .map((r) => {
        const dateStr = (r.date || "").toString().trim().slice(0, 10);
        const revenueDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayYMD;
        const nowIso = new Date().toISOString();
        return {
          id: String(r.id),
          revenue_date: revenueDate,
          type: (r.type || "Services").trim() || "Services",
          description: (r.description || "").trim(),
          amount: Number(r.amount ?? 0),
          created_at: nowIso,
          updated_at: nowIso,
        };
      });

    (async () => {
      try {
        const sb = createClient(cfg.url, anon);
        if (rows.length) {
          const { error: upErr } = await sb.from("ocean_extra_revenues").upsert(rows, { onConflict: "id" });
          if (upErr) {
            console.error("ocean_extra_revenues upsert error:", upErr.message, upErr.details);
            return;
          }
        }
        const { data: existing, error: selErr } = await sb.from("ocean_extra_revenues").select("id");
        if (selErr) {
          console.error("ocean_extra_revenues select error:", selErr.message);
          return;
        }
        const idsToRemove = (existing || []).map((r) => r.id).filter((id) => id && !localIds.has(id));
        if (idsToRemove.length) {
          await sb.from("ocean_extra_revenues").delete().in("id", idsToRemove);
        }
      } catch (e) {
        console.error("ocean_extra_revenues sync failed:", e);
      }
    })();
  }, [cloudBootstrapped, extraRevenues]);

  useEffect(() => {
    storeSave("oceanstay_daily_rates_v1", dailyRates);
  }, [dailyRates]);

  useEffect(() => {
  if (!cloudBootstrapped || !supabase || !supabaseEnabled) return;

  const list = Array.isArray(dailyRates) ? dailyRates : (dailyRates ? [dailyRates] : []);
  if (!list.length) return;

  (async () => {
    try {
      // Detect deletions: if a rate was removed locally, delete it from Supabase too
      const prevListRaw = Array.isArray(prevDailyRatesRef.current)
        ? prevDailyRatesRef.current
        : (prevDailyRatesRef.current ? [prevDailyRatesRef.current] : []);

      const normKey = (r) => {
        const rt = (r?.roomType ?? r?.room_type ?? r?.type ?? r?.room ?? "").toString().trim();
        const df = toISODate(r?.from ?? r?.date_from ?? r?.dateFrom ?? r?.date_from);
        let dt = toISODate(r?.to ?? r?.date_to ?? r?.dateTo ?? r?.date_to) || df;
        if (df && dt && dt < df) dt = df;
        return rt && df && dt ? `${rt}__${df}__${dt}` : null;
      };

      const prevKeys = new Set(prevListRaw.map(normKey).filter(Boolean));
      const payloadClean = list
        .map((r) => {
          const room_type =
            (r.roomType ?? r.room_type ?? r.type ?? r.room ?? "").toString().trim() || null;

          const fromISO = toISODate(r.from ?? r.date_from ?? r.dateFrom ?? r.date_from);
          let toISO = toISODate(r.to ?? r.date_to ?? r.dateTo ?? r.date_to) || fromISO;
          if (fromISO && toISO && toISO < fromISO) toISO = fromISO;

          return {
            room_type,
            date_from: fromISO || null,
            date_to: toISO || null,
            nightly_rate: pickNumMaybe(r.nightlyRate, r.nightly_rate, r.rate),
            pkg_bb: readPkgMaybe(r, "bb"),
            pkg_hb: readPkgMaybe(r, "hb"),
            pkg_fb: readPkgMaybe(r, "fb"),
          };
        })
        // مهم جدًا: امنع إرسال row بدون room_type أو date_from/date_to
        .filter((x) => x.room_type && x.date_from && x.date_to);

      if (!payloadClean.length) {
        console.warn("Skip upsert: missing required fields (room_type/date_from/date_to).");
        return;
      }


      // Compute deletions vs previous snapshot (by composite key)
      const nextKeys = new Set(payloadClean.map((x) => (x.room_type && x.date_from && x.date_to) ? `${x.room_type}__${x.date_from}__${x.date_to}` : null).filter(Boolean));
      const removed = Array.from(prevKeys).filter((k) => !nextKeys.has(k)).map((k) => {
        const [room_type, date_from, date_to] = k.split("__");
        return { room_type, date_from, date_to };
      });

      const { error } = await supabase
        .from("ocean_daily_rates")
        .upsert(payloadClean, { onConflict: "room_type,date_from,date_to" });

      if (error) console.error("ocean_daily_rates upsert error:", { message: error.message, details: error.details, hint: error.hint, code: error.code });

      if (!error) {
        // Apply deletions (best-effort)
        for (const r of removed) {
          try {
            const del = await supabase.from("ocean_daily_rates").delete().match({
              room_type: r.room_type,
              date_from: r.date_from,
              date_to: r.date_to,
            });
            if (del?.error) console.error("ocean_daily_rates delete error:", del.error);
          } catch (e) {
            console.error("ocean_daily_rates delete exception:", e);
          }
        }
        // Update snapshot only after successful upsert (and attempted deletions)
        prevDailyRatesRef.current = list;
      }
    } catch (e) {
      console.error("ocean_daily_rates upsert exception:", e);
    }
  })();
}, [cloudBootstrapped, supabase, supabaseEnabled, dailyRates]);


  useEffect(() => {
    const s = storeLoad("ocean_settings_v1");
    const taxRate = Number(s?.taxRate ?? 17);
    const serviceCharge = Number(s?.serviceCharge ?? 10);
    const cityTaxFixed = Number(s?.cityTax ?? 0);

    setReservations((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (!r || (r.status !== "Booked" && r.status !== "Checked-in")) return r;

        const snap = computeSplitPricingSnapshot({
          roomType: r.room?.roomType,
          checkIn: r.stay?.checkIn,
          checkOut: r.stay?.checkOut,
          dailyRates,
          taxRate,
          serviceCharge,
          mealPlan: r.mealPlan || "BO",
          pax: r.pax ?? 1,
        });

        if (!snap.ok) return r;

        const roomSubtotal = snap.nightly.reduce((s, x) => s + Number(x.baseRate ?? 0), 0);
        const packageSubtotal = snap.nightly.reduce((s, x) => s + Math.max(0, Number(x.rate ?? 0) - Number(x.baseRate ?? 0)), 0);
        const cityTaxAmount = roundTo2(
          (r.pax ?? 1) * cityTaxFixed * calcNights(r.stay?.checkIn, r.stay?.checkOut)
        );
        const total = roundTo2(snap.total + cityTaxAmount);
        const prevTotal = Number(r.pricing?.total ?? NaN);
        if (Math.abs(prevTotal - total) < 0.01) return r;

        changed = true;
        return {
          ...r,
          pricing: {
            ...r.pricing,
            nightly: snap.nightly,
            subtotal: snap.subtotal,
            taxAmount: snap.taxAmount,
            serviceAmount: snap.serviceAmount,
            roomSubtotal: roundTo2(roomSubtotal),
            packageSubtotal: roundTo2(packageSubtotal),
            cityTaxFixed,
            cityTaxAmount,
            total,
          },
          updatedAt: new Date().toISOString(),
        };
      });

      return changed ? next : prev;
    });
  }, [dailyRates]);

  // ================= RENDER =================

  // ================= BACKUP / RESTORE (Settings) =================
  const BACKUP_KEYS = useMemo(() => {
    const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
    return uniq([
      // Core
      "oceanstay_reservations_v1",
      "oceanstay_daily_rates_v1",
      "ocean_settings_v1",
      "ocean_expenses_v1",
      "ocean_extra_rev_v1",
      "ocean_room_physical_v1",

      // Store
      LS_STORE_ITEMS,
      LS_STORE_MOVES,
      LS_STORE_SUPPLIERS,

      // Security / Session
      SEC_LS_USERS,
      SEC_LS_SESSION,

      // Supabase config
      SB_LS_CFG,
    ]);
  }, []); // constants only

  const exportBackup = () => {
    try {
      const payload = {
        app: "Ocean Stay Admin",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        keys: {},
      };

      for (const k of BACKUP_KEYS) {
        const raw = localStorage.getItem(k);
        if (raw == null) continue;
        // Store as parsed JSON when possible, otherwise raw string
        try {
          payload.keys[k] = JSON.parse(raw);
        } catch {
          payload.keys[k] = raw;
        }
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `oceanstay-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Backup failed. Check console for details.");
    }
  };

  const restoreBackupFromFile = async (file) => {
    try {
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);

      if (
        !data ||
        typeof data !== "object" ||
        !data.keys ||
        typeof data.keys !== "object"
      ) {
        alert("Invalid backup file.");
        return;
      }

      const isOceanStay =
        String(data.app || "").toLowerCase().includes("ocean") &&
        String(data.app || "").toLowerCase().includes("stay");
      if (!isOceanStay) {
        const ok = window.confirm(
          "This backup file doesn't look like Ocean Stay Admin.\n\nDo you want to continue anyway?"
        );
        if (!ok) return;
      }

      const ok = window.confirm(
        "Restore backup now?\n\nThis will overwrite your current local data (reservations, daily rates, store, etc.)."
      );
      if (!ok) return;

      // Write keys
      for (const [k, v] of Object.entries(data.keys)) {
        if (!k) continue;
        if (v === undefined) continue;
        if (typeof v === "string") localStorage.setItem(k, v);
        else localStorage.setItem(k, JSON.stringify(v));
      }

      // Ensure UI state aligns immediately (then hard reload for full consistency)
      try {
        const nextRes = data.keys["oceanstay_reservations_v1"];
        if (Array.isArray(nextRes)) setReservations(nextRes);
      } catch {}
      try {
        const nextRates = data.keys["oceanstay_daily_rates_v1"];
        if (Array.isArray(nextRates)) setDailyRates(nextRates);
      } catch {}
      try {
        const nextExp = data.keys["ocean_expenses_v1"];
        if (Array.isArray(nextExp)) setExpenses(nextExp);
      } catch {}
      try {
        const nextExtra = data.keys["ocean_extra_rev_v1"];
        if (Array.isArray(nextExtra)) setExtraRevenues(nextExtra);
      } catch {}
      try {
        const nextPhys = data.keys["ocean_room_physical_v1"];
        if (nextPhys && typeof nextPhys === "object")
          setRoomPhysicalStatus(nextPhys);
      } catch {}
      try {
        const nextUsers = data.keys[SEC_LS_USERS];
        if (Array.isArray(nextUsers)) persistUsers(nextUsers);
      } catch {}
      try {
        const nextCfg = data.keys[SB_LS_CFG];
        if (nextCfg && typeof nextCfg === "object") sbSaveCfg(nextCfg);
      } catch {}

      alert("Restore completed. The app will reload now.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(
        "Restore failed. Make sure you selected a valid Ocean Stay backup JSON file."
      );
    }
  };

  const BackupRestorePanel = () => {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 16 }}>
              Backup & Restore
            </div>
            <div
              style={{
                color: "#64748b",
                fontWeight: 700,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Export a safe copy of your data (reservations, daily rates, store,
              expenses). Import it anytime to recover.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={exportBackup}
              style={{
                background: "#0ea5e9",
                color: "#fff",
                border: "none",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(14,165,233,0.22)",
              }}
              title="Download a JSON backup file"
            >
              Export Backup
            </button>

            <label
              style={{
                background: "#f8fafc",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Import a JSON backup file"
            >
              Import Restore
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // reset input value to allow importing same file again
                  e.target.value = "";
                  restoreBackupFromFile(f);
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
          Tip: Make a backup before big changes (daily rates / importing many reservations).
        </div>
      </div>
    );
  };

  if (loginOpen || !currentUser) {
    if (preAuthScreen === "cloud")
      return (
        <PreAuthCloudSyncScreen
          sbCfg={sbCfg}
          sbSaveCfg={sbSaveCfg}
          onBack={() => setPreAuthScreen("login")}
        />
      );
    if (supabaseEnabled && supabase)
  return (
    <SupabaseLoginInline
      supabase={supabase}
      onLogin={doLogin}
      onOpenCloudSettings={() => setPreAuthScreen("cloud")}
    />
  );

    return (
      <SecurityLoginScreen
        users={users}
        onLogin={doLogin}
        onOpenCloudSettings={() => setPreAuthScreen("cloud")}
      />
    );
  }

  return (
    <div className="layout">
      {/* SIDEBAR - ✅ تم ربط خاصية onLogout بدالة doLogout */}
      {/* Mobile Menu Button */}
      <button
        className="mobMenuBtn"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Toggle menu"
      >
        {mobileNavOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Mobile Overlay */}
      {mobileNavOpen && (
        <div
          className="sidebarOverlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        onLogout={doLogout}
      />

      {/* MAIN CONTENT AREA */}
      <main className="main">
        {page === "dashboard" && (
          <DashboardPage
            reservations={toArray(reservations)}
            rooms={BASE_ROOMS}
            expenses={expenses}
            extraRevenues={extraRevenues}
            user={currentUser}
          />
        )}

        {page === "reservations" && (
          <ReservationsPage
            reservations={toArray(reservations)}
            onNewReservation={handleNewReservation}
            onEditReservation={handleEditReservation}
            onInvoice={handleInvoice}
            onDeleteReservation={handleDeleteReservation}
          />
        )}

        {page === "rooms" && (
          <RoomsPage
            reservations={toArray(reservations)}
            roomPhysicalStatus={roomPhysicalStatus}
            updateRoomStatus={updateRoomStatus}
            onEditReservation={handleEditReservation}
            setSelectedRoom={setSelectedRoom}
            onAddReservation={handleAddReservationClick}
          />
        )}

        {page === "dailyRate" && (
          <DailyRatePage dailyRates={dailyRates} setDailyRates={updateDailyRates} />
        )}

        {page === "revenue" && (
          <RevenuePage
            data={extraRevenues}
            reservations={toArray(reservations)}
            totalRooms={BASE_ROOMS.length}
            onUpdate={saveRevenue}
            user={currentUser}
          />
        )}

        {page === "store" && (
          <SafePage>
            <StorePage
              items={toArray(storeItems)}
              setItems={setStoreItems}
              moves={toArray(storeMoves)}
              setMoves={setStoreMoves}
              suppliers={toArray(storeSuppliers)}
              setSuppliers={setStoreSuppliers}
            />
          </SafePage>
        )}

        {page === "expenses" && (
          <SafePage>
            <ExpensesPage
              paymentMethods={PAYMENT_METHODS}
              expenses={toArray(expenses)}
              setExpenses={updateExpenses}
              supabase={supabase}
              supabaseEnabled={supabaseEnabled}
            />
          </SafePage>
        )}

        {page === "reports" && (
          <SafePage>
            <ReportsPage
              reservations={toArray(reservations)}
              expenses={toArray(expenses)}
              extraRevenues={toArray(extraRevenues)}
              totalRooms={BASE_ROOMS.length}
            />
          </SafePage>
        )}

        {page === "settings" && (
          <>
            <SettingsPage
              users={users}
              setUsers={persistUsers}
              currentUser={currentUser}
              onLogout={doLogout}
              supabase={supabase}
              supabaseEnabled={supabaseEnabled}
              sbCfg={sbCfg}
              setSbCfg={setSbCfg}
              sbSaveCfg={sbSaveCfg}
            />

            {/* ✅ Backup في آخر الصفحة */}
            <BackupRestorePanel />
          </>
        )}
      </main>

      {/* GLOBAL MODALS */}
      {showReservationModal && (
        <ReservationModal
          mode={editingIndex !== null ? "edit" : "add"}
          initialData={editingReservation}
          onClose={handleCloseModal}
          onSave={handleSaveReservation}
          dailyRates={dailyRates}
          roomPhysicalStatus={roomPhysicalStatus}
        />
      )}

      {invoiceReservation && (
        <InvoiceModal
          reservation={invoiceReservation}
          onClose={() => setInvoiceReservation(null)}
        />
      )}

      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onEditReservation={(idx) => {
            setSelectedRoom(null);
            handleEditReservation(idx);
          }}
        />
      )}
    </div>
  );
}