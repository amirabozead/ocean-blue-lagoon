/* ================= IMPORTS ================= */
import React, { useEffect, useMemo, useState } from "react";
import "./app.css";
import { createClient } from "@supabase/supabase-js";

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
} from "./utils/helpers";

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
    setExpenses(newExpenses);
    storeSave("ocean_expenses_v1", newExpenses);
    if (supabase && supabaseEnabled) {
      supabase
        .from("ocean_expenses")
        .upsert({
          id: "master_list",
          data: newExpenses,
          updated_at: new Date().toISOString(),
        })
        .catch(console.error);
    }
  };

  // 3. Extra Revenues
  const [extraRevenues, setExtraRevenues] = useState(
    () => storeLoad("ocean_extra_rev_v1") || []
  );
  const saveRevenue = (newRevList) => {
    setExtraRevenues(newRevList);
    storeSave("ocean_extra_rev_v1", newRevList);
  };

  // 4. Daily Rates
  const [dailyRates, setDailyRates] = useState(
    () => storeLoad("oceanstay_daily_rates") || []
  );

  // 5. Store Data
  const [storeItems, setStoreItems] = useState(() =>
    lsGet(LS_STORE_ITEMS, [])
  );
  const [storeMoves, setStoreMoves] = useState(() =>
    lsGet(LS_STORE_MOVES, [])
  );
  const [storeSuppliers, setStoreSuppliers] = useState(() =>
    lsGet(LS_STORE_SUPPLIERS, [])
  );

  // 6. Reservations
  const [reservations, setReservations] = useState(
    () => storeLoad("oceanstay_reservations") || []
  );
  const LS_KEY_RES = "oceanstay_reservations";

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

  const [currentUser, setCurrentUser] = useState(() =>
    storeLoad(SEC_LS_SESSION)
  );
  const [loginOpen, setLoginOpen] = useState(() => !storeLoad(SEC_LS_SESSION));
  const [preAuthScreen, setPreAuthScreen] = useState("login");

  const [sbCfg, setSbCfg] = useState(() => {
    const c = storeLoad(SB_LS_CFG);
    return c
      ? { enabled: !!c.enabled, url: c.url || "", anon: c.anon || "" }
      : { enabled: false, url: "", anon: "" };
  });

  // Auto-load Supabase config from environment variables (Vercel) if user didn't set it in Settings.
  // This avoids having to configure each device manually.
  useEffect(() => {
    const envUrl = (import.meta?.env?.VITE_SUPABASE_URL || "").trim();
    const envAnon =
      (import.meta?.env?.VITE_SUPABASE_ANON_KEY ||
        import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "").trim();

    if (!envUrl || !envAnon) return;

    setSbCfg((prev) => {
      // If user already configured it, don't overwrite.
      if (prev?.enabled && prev?.url && prev?.anon) return prev;

      const next = { enabled: true, url: envUrl, anon: envAnon };
      try {
        localStorage.setItem(SB_LS_CFG, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

    const ENV_SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
  const ENV_SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const envSupabaseEnabled = !!(ENV_SB_URL && ENV_SB_ANON);

  const supabaseEnabled = envSupabaseEnabled || !!(sbCfg?.enabled && sbCfg?.url && sbCfg?.anon);

  const supabase = useMemo(() => {
    if (envSupabaseEnabled) return createClient(ENV_SB_URL, ENV_SB_ANON);
    if (sbCfg?.enabled && sbCfg?.url && sbCfg?.anon) return createClient(sbCfg.url, sbCfg.anon);
    return null;
  }, [envSupabaseEnabled, ENV_SB_URL, ENV_SB_ANON, sbCfg?.enabled, sbCfg?.url, sbCfg?.anon]);

  // =========================
  //  Cloud KV Sync (ocean_kv)
  // =========================
  const KV_TABLE = "ocean_kv";
  const KV_META_KEY = "ocean_kv_meta_v1";
  const KV_CLIENT_ID_KEY = "ocean_kv_client_id_v1";

  const KV_SYNC_KEYS = useMemo(
    () => [
      "oceanstay_reservations",
      "oceanstay_daily_rates",
      "ocean_expenses_v1",
      "ocean_settings_v1",
      "ocean_extra_rev_v1",
      "ocean_room_physical_v1",
      "ocean_security_users_v1",
      "oceanstay_store_items_v1",
      "oceanstay_store_moves_v1",
      "oceanstay_store_suppliers_v1",
      // EXCLUDED (per-device / sensitive):
      // "ocean_security_session_v1",
      // "ocean_supabase_cfg_v1",
    ],
    []
  );

  useMemo(() => {
    try {
      const existing = localStorage.getItem(KV_CLIENT_ID_KEY);
      if (existing) return existing;
      const id = `cid_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
      localStorage.setItem(KV_CLIENT_ID_KEY, id);
      return id;
    } catch {
      return `cid_${Date.now().toString(16)}`;
    }
  }, []);

  const kvReadMeta = () => {
    try { return JSON.parse(localStorage.getItem(KV_META_KEY) || "{}") || {}; } catch { return {}; }
  };
  const kvWriteMeta = (meta) => {
    try { localStorage.setItem(KV_META_KEY, JSON.stringify(meta || {})); } catch {}
  };

  const kvLsGet = (k) => {
    const raw = localStorage.getItem(k);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  };
  const kvLsSet = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch { try { localStorage.setItem(k, String(v)); } catch {} }
  };
  const kvNowIso = () => new Date().toISOString();

  const kvPullFromCloud = async () => {
    if (!supabase) return { ok: false, reason: "no_supabase" };
    const { data, error } = await supabase
      .from(KV_TABLE)
      .select("key,data,updated_at")
      .in("key", KV_SYNC_KEYS);

    if (error) return { ok: false, reason: "select_error", error };

    const meta = kvReadMeta();
    for (const row of data || []) {
      if (!row?.key) continue;
      kvLsSet(row.key, row.data);
      meta[row.key] = row.updated_at || kvNowIso();
    }
    kvWriteMeta(meta);
    return { ok: true, count: (data || []).length };
  };

  const kvPushToCloud = async ({ onlyMissing = false } = {}) => {
    if (!supabase) return { ok: false, reason: "no_supabase" };

    const { data: cloudRows, error: cloudErr } = await supabase
      .from(KV_TABLE)
      .select("key,updated_at")
      .in("key", KV_SYNC_KEYS);

    if (cloudErr) return { ok: false, reason: "select_error", error: cloudErr };

    const cloudMeta = {};
    for (const r of cloudRows || []) cloudMeta[r.key] = r.updated_at;

    const meta = kvReadMeta();
    const upserts = [];

    for (const k of KV_SYNC_KEYS) {
      const localVal = kvLsGet(k);
      if (localVal == null) continue;

      const localKnownTs = meta[k] || null;
      const cloudTs = cloudMeta[k] || null;

      if (onlyMissing && cloudTs) continue;

      if (cloudTs && localKnownTs && new Date(cloudTs).getTime() > new Date(localKnownTs).getTime()) {
        continue;
      }

      upserts.push({ key: k, data: localVal, updated_at: kvNowIso() });
    }

    if (!upserts.length) return { ok: true, count: 0 };

    const { error: upsertErr } = await supabase.from(KV_TABLE).upsert(upserts, { onConflict: "key" });
    if (upsertErr) return { ok: false, reason: "upsert_error", error: upsertErr };

    const now = kvNowIso();
    for (const r of upserts) meta[r.key] = now;
    kvWriteMeta(meta);

    return { ok: true, count: upserts.length };
  };

  const kvSeedCloudFromThisDevice = async () => {
    const res = await kvPushToCloud({ onlyMissing: true });
    await kvPullFromCloud();
    return res;
  };

  useEffect(() => {
    try {
      window.OceanKV = {
        pull: kvPullFromCloud,
        push: kvPushToCloud,
        seed: kvSeedCloudFromThisDevice,
        keys: KV_SYNC_KEYS,
      };
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ✅ Auto-pull from cloud ONCE on first load (web devices have empty localStorage)
useEffect(() => {
  if (!supabase) return;

  const flag = "ocean_kv_autopulled_v1";
  if (sessionStorage.getItem(flag) === "1") return;

  (async () => {
    try {
      const r = await kvPullFromCloud();
      if (r?.ok) {
        sessionStorage.setItem(flag, "1");
        window.location.reload(); // reload once so UI reads fresh localStorage
      }
    } catch {}
  })();
}, [supabase]);


  useEffect(() => {
    if (!supabase) return;

    let lastLocalPushAt = 0;
    const markLocalPush = () => { lastLocalPushAt = Date.now(); };

    const origPush = window?.OceanKV?.push;
    if (origPush) {
      window.OceanKV.push = async (...args) => {
        markLocalPush();
        return origPush(...args);
      };
    }

    const channel = supabase
      .channel("ocean_kv_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: KV_TABLE },
        async (payload) => {
          const k = payload?.new?.key || payload?.old?.key;
          if (!k || !KV_SYNC_KEYS.includes(k)) return;

          if (Date.now() - lastLocalPushAt < 1200) return;

          await kvPullFromCloud();

          try { window.location.reload(); } catch {}
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [supabase, KV_SYNC_KEYS]);


  const sbSaveCfg = (cfg, forceEnabled) => {
    const next = { ...cfg, enabled: forceEnabled ?? cfg.enabled };
    storeSave(SB_LS_CFG, next);
    setSbCfg(next);
  };

  const persistUsers = (val) => {
    setUsers(val);
    storeSave(SEC_LS_USERS, val);
  };

  // ✅ دالة الخروج (موجودة بالفعل وتم ربطها الآن)
  const doLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(SEC_LS_SESSION);
    setCurrentUser(null);
    setLoginOpen(true);
    setPage("dashboard");
  };

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
    setReservations(next);
    storeSave("oceanstay_reservations", next);
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

  useEffect(() => {
    if (!supabase || !supabaseEnabled) return;
    const sync = async () => {
      await supabase.from("ocean_store_items").upsert({
        id: "master_items",
        data: storeItems,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("ocean_store_moves").upsert({
        id: "master_moves",
        data: storeMoves,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("ocean_store_suppliers").upsert({
        id: "master_suppliers",
        data: storeSuppliers,
        updated_at: new Date().toISOString(),
      });
    };
    const t = setTimeout(sync, 2000);
    return () => clearTimeout(t);
  }, [storeItems, storeMoves, storeSuppliers, supabase, supabaseEnabled]);

  useEffect(() => {
    if (!supabase || !supabaseEnabled) return;
    const saveRes = async () => {
      const rows = reservations
        .filter((r) => r && r.id)
        .map((r) => ({
          id: String(r.id),
          data: r,
          updated_at: r.updatedAt || new Date().toISOString(),
        }));
      if (rows.length)
        await supabase.from("reservations").upsert(rows, { onConflict: "id" });
    };
    const t = setTimeout(saveRes, 1000);
    return () => clearTimeout(t);
  }, [reservations, supabase, supabaseEnabled]);

  useEffect(() => {
    storeSave("oceanstay_daily_rates", dailyRates);
  }, [dailyRates]);

  useEffect(() => {
    const s = storeLoad("ocean_settings_v1");
    const taxRate = Number(s?.taxRate ?? 17);
    const serviceCharge = Number(s?.serviceCharge ?? 10);
    const cityTaxFixed = Number(s?.cityTax ?? 0);

    setReservations((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (!r || r.status !== "Booked") return r;

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

        const prevTotal = Number(r.pricing?.total ?? NaN);
        if (Math.abs(prevTotal - snap.total) < 0.01) return r;

        changed = true;
        const cityTaxAmount =
          (r.pax ?? 1) *
          cityTaxFixed *
          calcNights(r.stay?.checkIn, r.stay?.checkOut);

        return {
          ...r,
          pricing: {
            ...r.pricing,
            nightly: snap.nightly,
            subtotal: snap.subtotal,
            taxAmount: snap.taxAmount,
            serviceAmount: snap.serviceAmount,
            cityTaxFixed,
            cityTaxAmount,
            total: snap.total + cityTaxAmount,
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
      "oceanstay_reservations",
      "oceanstay_daily_rates",
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
        const nextRes = data.keys["oceanstay_reservations"];
        if (Array.isArray(nextRes)) setReservations(nextRes);
      } catch {}
      try {
        const nextRates = data.keys["oceanstay_daily_rates"];
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
    // NOTE: We do NOT use Supabase Auth for login.
// Access control is handled by the app's local PIN users list (ocean_security_users_v1).
// Keeping the app usable even when Supabase Auth is not set up.
/* if (supabaseEnabled && supabase) return (
  <SupabaseLoginScreen
    open
    onClose={() => setLoginOpen(false)}
    sbCfg={sbCfg}
    setSbCfg={setSbCfg}
    supabase={supabase}
    onLoggedIn={() => {}}
  />
); */
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
      <Sidebar
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        mobileNavOpen={mobileNavOpen}
        onLogout={doLogout} // 👈 هذا هو التعديل المهم
      />

      {/* MAIN CONTENT AREA */}
      <main className="main">
        {page === "dashboard" && (
          <DashboardPage
            reservations={reservations}
            rooms={BASE_ROOMS}
            expenses={expenses}
            extraRevenues={extraRevenues}
            user={currentUser}
          />
        )}

        {page === "reservations" && (
          <ReservationsPage
            reservations={reservations}
            onNewReservation={handleNewReservation}
            onEditReservation={handleEditReservation}
            onInvoice={handleInvoice}
            onDeleteReservation={handleDeleteReservation}
          />
        )}

        {page === "rooms" && (
          <RoomsPage
            reservations={reservations}
            roomPhysicalStatus={roomPhysicalStatus}
            updateRoomStatus={updateRoomStatus}
            onEditReservation={handleEditReservation}
            setSelectedRoom={setSelectedRoom}
            onAddReservation={handleAddReservationClick}
          />
        )}

        {page === "dailyRate" && (
          <DailyRatePage dailyRates={dailyRates} setDailyRates={setDailyRates} />
        )}

        {page === "revenue" && (
          <RevenuePage
            data={extraRevenues}
            reservations={reservations}
            totalRooms={BASE_ROOMS.length}
            onUpdate={saveRevenue}
            user={currentUser}
          />
        )}

        {page === "store" && (
          <StorePage
            items={storeItems}
            setItems={setStoreItems}
            moves={storeMoves}
            setMoves={setStoreMoves}
            suppliers={storeSuppliers}
            setSuppliers={setStoreSuppliers}
          />
        )}

        {page === "expenses" && (
          <ExpensesPage
            paymentMethods={["Cash", "Card"]}
            expenses={expenses}
            setExpenses={updateExpenses}
            supabase={supabase}
            supabaseEnabled={supabaseEnabled}
          />
        )}

        {page === "reports" && (
          <ReportsPage
            reservations={reservations}
            expenses={expenses}
            extraRevenues={extraRevenues}
            totalRooms={BASE_ROOMS.length}
          />
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
