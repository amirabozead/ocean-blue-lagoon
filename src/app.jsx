
const toArray = (v) => (Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []));
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
      (async () => {
        try {
          const { error } = await supabase.from("ocean_expenses").upsert({
            id: "master_list",
            data: newExpenses,
            updated_at: new Date().toISOString(),
          });
          if (error) console.error(error);
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
  const saveRevenue = (newRevList) => {
    setExtraRevenues(newRevList);
    storeSave("ocean_extra_rev_v1", newRevList);
  };

  // 4. Daily Rates
  const [dailyRates, setDailyRates] = useState(
    () => storeLoad("oceanstay_daily_rates_v1") || []
  );
  const updateDailyRates = (newRates) => {
    setDailyRates(newRates);
    storeSave("oceanstay_daily_rates_v1", newRates);
    if (supabase && supabaseEnabled) {
      (async () => {
        try {
          const { error } = await supabase.from("ocean_daily_rates").upsert({
            id: "master_list",
            data: newRates,
            updated_at: new Date().toISOString(),
          });
          if (error) console.error(error);
        } catch (e) {
          console.error(e);
        }
      })();
    }
  };



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

  const supabaseEnabled = !!(sbCfg?.enabled && sbCfg?.url && sbCfg?.anon);
  const supabase = useMemo(
    () => (supabaseEnabled ? createClient(sbCfg.url, sbCfg.anon) : null),
    [supabaseEnabled, sbCfg]
  );

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
  const [cloudBootstrapped, setCloudBootstrapped] = useState(false);

  useEffect(() => {
    if (!supabase || !supabaseEnabled) return;
    if (cloudBootstrapped) return;

    const boot = async () => {
      try {
        // 1) Store (Items / Moves / Suppliers)
        const fetchMaster = async (table, id) => {
          try {
            const { data, error } = await supabase
              .from(table)
              .select("data")
              .eq("id", id)
              .maybeSingle();
            if (error) return null;
            return data?.data ?? null;
          } catch {
            return null;
          }
        };

        if ((storeItems || []).length === 0) {
          const cloudItems = await fetchMaster("ocean_store_items", "master_items");
          if (Array.isArray(cloudItems) && cloudItems.length) setStoreItems(cloudItems);
        }
        if ((storeMoves || []).length === 0) {
          const cloudMoves = await fetchMaster("ocean_store_moves", "master_moves");
          if (Array.isArray(cloudMoves) && cloudMoves.length) setStoreMoves(cloudMoves);
        }
        if ((storeSuppliers || []).length === 0) {
          const cloudSup = await fetchMaster("ocean_store_suppliers", "master_suppliers");
          if (Array.isArray(cloudSup) && cloudSup.length) setStoreSuppliers(cloudSup);
        }

        // 2) Expenses
        if ((expenses || []).length === 0) {
          const cloudExp = await fetchMaster("ocean_expenses", "master_list");
          if (Array.isArray(cloudExp) && cloudExp.length) setExpenses(cloudExp);
        }
        // 2.5) Daily Rates
        if ((dailyRates || []).length === 0) {
          const cloudRates = await fetchMaster("ocean_daily_rates", "master_list");
          if (Array.isArray(cloudRates) && cloudRates.length) setDailyRates(cloudRates);
        }



        // 3) Reservations (rows per reservation)
        if ((reservations || []).length === 0) {
          try {
            const { data: rows, error } = await supabase
              .from("reservations")
              .select("id, data, updated_at")
              .order("updated_at", { ascending: false });

            if (!error && Array.isArray(rows) && rows.length) {
              const list = rows
                .map((r) => {
                  const obj = r?.data && typeof r.data === "object" ? { ...r.data } : null;
                  if (!obj) return null;
                  if (!obj.id) obj.id = r.id;
                  if (!obj.updatedAt && r.updated_at) obj.updatedAt = r.updated_at;
                  return obj;
                })
                .filter(Boolean);
              if (list.length) setReservations(list);
            }
          } catch {}
        }
      } finally {
        setCloudBootstrapped(true);
      }
    };

    boot();
  }, [supabase, supabaseEnabled, cloudBootstrapped]);

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
    storeSave("oceanstay_daily_rates_v1", dailyRates);
  }, [dailyRates]);

  useEffect(() => {
    if (!supabase || !supabaseEnabled) return;
    // keep cloud copy of daily rates updated
    (async () => {
      try {
        const { error } = await supabase.from("ocean_daily_rates").upsert({
          id: "master_list",
          data: dailyRates || [],
          updated_at: new Date().toISOString(),
        });
        if (error) console.error(error);
      } catch (e) {
        // ignore hard fail (e.g., table not created yet)
        console.error(e);
      }
    })();
  }, [supabase, supabaseEnabled, dailyRates]);



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
        <SupabaseLoginScreen
          supabase={supabase}
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
              paymentMethods={["Cash", "Card"]}
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