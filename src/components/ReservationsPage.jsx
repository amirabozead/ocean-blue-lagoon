import React, { useMemo, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaFileInvoiceDollar,
  FaTrash,
  FaUser,
  FaDoorOpen,
  FaTag,
  FaMoon,
  FaUsers,
  FaBed,
  FaUtensils,
  FaCoins,
  FaBolt,
  FaCheckCircle,
  FaRegCalendarCheck,
  FaSignInAlt,
  FaSignOutAlt,
  FaBan,
  FaListUl,
  FaLayerGroup,
  FaChartPie,
  FaGlobeAmericas,
  FaCreditCard,
} from "react-icons/fa";
import { FILTER_TABS, BASE_ROOMS, BOOKING_CHANNELS, PAYMENT_METHODS } from "../data/constants";
import { statusPillClass, isDateBetween, storeLoad, calcNights as calcNightsHelper } from "../utils/helpers";
import { getOOSRoomsCountOnDate } from "../utils/oosHelpers";
import SearchModal from "./SearchModal";

const HOTEL_LOGO = "/logo.png";

const cellPadding = "6px 5px";
const TH = ({ icon, label, title, center, right }) => (
  <th
    style={{
      padding: "10px 12px",
      textAlign: right ? "right" : center ? "center" : "left",
      color: "#1e293b",
      fontSize: "0.8rem",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
      borderBottom: "2px solid #e2e8f0",
    }}
    title={title || label}
  >
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#64748b", display: "inline-flex", opacity: 0.8 }}>{icon}</span>
      <span style={{ color: "#334155" }}>{label}</span>
    </span>
  </th>
);

const FilterCard = ({ active, icon, label, count, onClick, color = "#0ea5e9" }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 12,
      border: active ? `2px solid ${color}55` : "1px solid #e2e8f0",
      background: active ? `${color}14` : "#fff",
      cursor: "pointer",
      transition: "all .15s",
      minWidth: 150,
      justifyContent: "space-between",
    }}
    title={`Filter: ${label}`}
  >
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? `${color}22` : "#f1f5f9",
          color: active ? color : "#475569",
        }}
      >
        {icon}
      </span>

      <span style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13, lineHeight: 1.1 }}>{label}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Rooms</div>
      </span>
    </span>

    <span
      style={{
        fontWeight: 900,
        color: active ? color : "#0f172a",
        background: active ? `${color}22` : "#f8fafc",
        border: "1px solid #e2e8f0",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        minWidth: 42,
        textAlign: "center",
      }}
    >
      {count}
    </span>
  </button>
);

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const norm = (s) => String(s ?? "").trim().toLowerCase();

const isBooked = (status) => norm(status) === "booked";

const normStatus = (s) => norm(s || "");
/** Include any status that represents a real stay (for room nights sold / occupancy). Exclude only Cancelled and Out of Service. */
const statusCountsForSales = (status) => {
  const t = normStatus(status);
  if (t === "cancelled" || t === "canceled") return false;
  if (/out\s*of\s*service|oos|maintenance/i.test(t)) return false;
  return (
    t === "booked" ||
    t === "confirmed" ||
    t === "in house" ||
    t === "checked in" ||
    t === "checked out" ||
    t === "checked-out" ||
    (t.includes("check") && t.includes("in")) ||
    (t.includes("check") && t.includes("out")) ||
    (t.includes("in") && t.includes("house"))
  );
};

const getGuestFirstName = (r) =>
  r?.guest?.firstName ?? r?.guestFirstName ?? r?.guest_name?.first ?? r?.customer?.firstName ?? "";

const getGuestLastName = (r) =>
  r?.guest?.lastName ?? r?.guestLastName ?? r?.guest_name?.last ?? r?.customer?.lastName ?? "";

const getRoomNumber = (r) =>
  r?.room?.roomNumber ?? r?.roomNumber ?? r?.room_no ?? r?.room?.number ?? r?.room?.no ?? "";

const getPaymentMethod = (r) => r?.paymentMethod ?? r?.payment?.method ?? r?.payment_method ?? "";
const getChannel = (r) => r?.channel ?? r?.source ?? "";
const channelDisplayLabel = (ch) => (ch === "Direct booking" || !ch) ? "Direct" : ch;
const normPayment = (p) => (/credit\s*card|card/i.test(String(p || "")) ? "Credit Card" : "Cash");

const statusDisplayLabel = (s) => {
  const t = String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (/check[- ]?out|checkout|checked[- ]?out/.test(t)) return "C-Out";
  if (/check[- ]?in|checkin|checked[- ]?in/.test(t)) return "C-In";
  return s ?? "";
};

const getTotal = (r) => toNumber(r?.pricing?.total ?? r?.total ?? r?.amount ?? 0, 0);

const calcRoomNights = (r) => {
  const direct = r?.pricing?.nights ?? r?.stay?.nights ?? r?.stay?.roomNights ?? r?.roomNights ?? null;
  if (direct !== null && direct !== undefined && String(direct) !== "") return Math.max(0, Math.round(toNumber(direct, 0)));

  const ci = r?.stay?.checkIn ?? r?.checkIn;
  const co = r?.stay?.checkOut ?? r?.checkOut;
  if (!ci || !co) return 0;

  const d1 = new Date(ci);
  const d2 = new Date(co);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;

  const n1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), 12, 0, 0, 0).getTime();
  const n2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), 12, 0, 0, 0).getTime();
  return Math.max(0, Math.round((n2 - n1) / (1000 * 60 * 60 * 24)));
};

const calcPax = (r) => {
  const candidates = [
    r?.pax,
    r?.stay?.pax,
    r?.stay?.noOfPax,
    r?.stay?.paxTotal,
    r?.guest?.pax,
    r?.guests?.pax,
    r?.guests?.total,
    r?.pricing?.pax,
  ];
  for (const c of candidates) {
    if (c !== null && c !== undefined && String(c) !== "") return Math.max(0, Math.round(toNumber(c, 0)));
  }
  return 0;
};

// Room revenue = room only (exclude F&B and all tax). F&B shown separately; Total = Room + F&B.
const calcRoomRevenue = (r) => {
  const p = r?.pricing;
  const roomBase = p?.roomBase;
  if (roomBase !== null && roomBase !== undefined) {
    return Math.max(0, toNumber(roomBase, 0));
  }

  const direct = p?.roomRevenue ?? p?.roomTotal ?? p?.roomAmount ?? r?.roomRevenue ?? null;
  if (direct !== null && direct !== undefined && String(direct) !== "") return Math.max(0, toNumber(direct, 0));

  const nightly = p?.nightly;
  if (Array.isArray(nightly) && nightly.length) {
    return Math.max(
      0,
      nightly.reduce((acc, x) => {
        if (typeof x === "number") return acc + toNumber(x, 0);
        if (x && typeof x === "object") return acc + toNumber(x.rate ?? x.amount ?? x.value ?? x.price, 0);
        return acc;
      }, 0)
    );
  }

  // Fallback: use pre-tax subtotal (total minus tax/service/city) so Room $ never includes tax
  const totalVal = toNumber(p?.total, 0);
  const taxVal = toNumber(p?.taxAmount, 0);
  const serviceVal = toNumber(p?.serviceAmount, 0);
  const cityVal = toNumber(p?.cityTaxAmount, 0);
  if (totalVal > 0 && (taxVal > 0 || serviceVal > 0 || cityVal > 0)) {
    return Math.max(0, totalVal - taxVal - serviceVal - cityVal);
  }
  return Math.max(0, totalVal);
};

const calcFnbRevenue = (r) => {
  const direct =
    r?.pricing?.fnbRevenue ??
    r?.pricing?.foodBeverageRevenue ??
    r?.pricing?.foodRevenue ??
    r?.pricing?.mealBase ??
    r?.pricing?.packageRevenue ??
    r?.pricing?.packagesTotal ??
    r?.pricing?.extras?.foodBeverage ??
    r?.pricing?.extras?.fnb ??
    r?.fnbRevenue ??
    null;

  if (direct !== null && direct !== undefined && String(direct) !== "") return Math.max(0, toNumber(direct, 0));
  return 0;
};

const formatMoney = (n) => `$${toNumber(n, 0).toLocaleString()}`;

export default function ReservationsPage({
  reservations = [],
  onNewReservation,
  onEditReservation,
  onInvoice,
  onDeleteReservation,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({});
  const [kpiMode, setKpiMode] = useState("TODAY");

  // 🔒 Month closing (by check-out date)
  const __s = storeLoad("ocean_settings_v1", null);
  const __closedThrough = String(__s?.closedThrough || "2026-01-31");
  const isClosedReservation = (r) => {
    const co = String(r?.stay?.checkOut || "");
    return !!(__closedThrough && co && co <= __closedThrough);
  };

  const isCheckedOutReservation = (r) => {
    const s = normStatus(r?.status);
    // Treat any "checked out" / "check out" variation as closed for editing
    return (s === "checked out" || s === "check out" || s === "checkout" || (s.includes("check") && s.includes("out")));
  };

  const isEditLocked = (r) => isClosedReservation(r) || isCheckedOutReservation(r);

  const passesAdvancedSearch = (r) => {
    const f = searchFilters || {};

    const fn = norm(getGuestFirstName(r));
    const ln = norm(getGuestLastName(r));
    const roomNo = String(getRoomNumber(r));
    const pm = String(getPaymentMethod(r));
    const status = String(r?.status ?? "");

    if (String(f.firstName || "").trim()) {
      if (!fn.includes(norm(f.firstName))) return false;
    }
    if (String(f.lastName || "").trim()) {
      if (!ln.includes(norm(f.lastName))) return false;
    }

    if (String(f.roomNumber || "").trim()) {
      const want = String(f.roomNumber).trim();
      const wantDigits = want.replace(/\D/g, "");
      const have = String(roomNo || "").trim();
      const haveDigits = have.replace(/\D/g, "");
      if (wantDigits) {
        if (haveDigits !== wantDigits) return false;
      } else {
        if (norm(have) !== norm(want)) return false;
      }
    }

    if (f.status && f.status !== "All") {
      if (norm(status) !== norm(f.status)) return false;
    }

    if (f.paymentMethod && f.paymentMethod !== "All") {
      const filterPm = normPayment(f.paymentMethod);
      if (normPayment(pm) !== filterPm) return false;
    }
    if (f.channel && f.channel !== "All") {
      const resChannel = String(getChannel(r)).trim() || "Direct booking";
      if (resChannel !== f.channel) return false;
    }

    const total = getTotal(r);
    if (String(f.rateMin || "").trim() && total < Number(f.rateMin)) return false;
    if (String(f.rateMax || "").trim() && total > Number(f.rateMax)) return false;

    const ci = r?.stay?.checkIn ?? r?.checkIn;
    const co = r?.stay?.checkOut ?? r?.checkOut;

    const checkInTime = ci ? new Date(ci).getTime() : NaN;
    const checkOutTime = co ? new Date(co).getTime() : NaN;

    if (f.checkInFrom && Number.isFinite(checkInTime) && checkInTime < new Date(f.checkInFrom).getTime()) return false;
    if (f.checkInTo && Number.isFinite(checkInTime) && checkInTime > new Date(f.checkInTo).getTime()) return false;

    if (f.checkOutFrom && Number.isFinite(checkOutTime) && checkOutTime < new Date(f.checkOutFrom).getTime()) return false;
    if (f.checkOutTo && Number.isFinite(checkOutTime) && checkOutTime > new Date(f.checkOutTo).getTime()) return false;

    return true;
  };

  const filteredReservations = useMemo(() => {
    let data = (reservations || []).filter(passesAdvancedSearch);

    if (statusFilter !== "All") data = data.filter((r) => r?.status === statusFilter);

    return data.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }, [reservations, searchFilters, statusFilter]);

  const tabCounts = useMemo(() => {
    const base = (reservations || []).filter(passesAdvancedSearch);
    const map = {};
    for (const tab of FILTER_TABS) {
      map[tab] = tab === "All" ? base.length : base.filter((r) => r?.status === tab).length;
    }
    return map;
  }, [reservations, searchFilters]);

  const tabIcon = (tab) => {
    const t = norm(tab);
    if (t === "all") return <FaListUl size={14} />;
    if (t === "booked") return <FaRegCalendarCheck size={14} />;
    if (t === "confirmed") return <FaCheckCircle size={14} />;
    if (t.includes("check") && t.includes("in")) return <FaSignInAlt size={14} />;
    if (t.includes("check") && t.includes("out")) return <FaSignOutAlt size={14} />;
    if (t.includes("cancel")) return <FaBan size={14} />;
    return <FaTag size={14} />;
  };

  const tabColor = (tab) => {
    const t = norm(tab);
    if (t === "all") return "#0ea5e9";
    if (t === "booked") return "#f59e0b";
    if (t === "confirmed") return "#10b981";
    if (t.includes("check") && t.includes("in")) return "#6366f1";
    if (t.includes("check") && t.includes("out")) return "#8b5cf6";
    if (t.includes("cancel")) return "#ef4444";
    return "#64748b";
  };

  // Upcoming check-ins: today or in the next 3 days (non-cancelled only)
  const upcomingCheckIns = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const end = new Date(now);
    end.setDate(end.getDate() + 3);
    const endStr = end.toISOString().slice(0, 10);
    return (reservations || []).filter((r) => {
      if ((r?.status || "").toLowerCase() === "cancelled") return false;
      const ci = r?.stay?.checkIn ?? r?.checkIn;
      if (!ci) return false;
      const ciYMD = String(ci).slice(0, 10);
      return ciYMD >= todayStr && ciYMD <= endStr;
    });
  }, [reservations]);

  // =======================
  // Header KPI (same vibe as Rooms page)
  // =======================
  const pad2 = (n) => String(n).padStart(2, "0");
  const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (ymd, days) => {
    const dt = new Date(`${ymd}T12:00:00`);
    dt.setDate(dt.getDate() + days);
    return toYMD(dt);
  };
  const startOfMonthYMD = (ymd) => {
    const dt = new Date(`${ymd}T12:00:00`);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-01`;
  };
  const startOfYearYMD = (ymd) => {
    const dt = new Date(`${ymd}T12:00:00`);
    return `${dt.getFullYear()}-01-01`;
  };
  const diffDays = (fromYMD, toYMDExclusive) => {
    const a = new Date(`${fromYMD}T12:00:00`).getTime();
    const b = new Date(`${toYMDExclusive}T12:00:00`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  };

  const headerKpis = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const safe = Array.isArray(reservations) ? reservations : [];
    const totalRoomsBase = Array.isArray(BASE_ROOMS) ? BASE_ROOMS.length : 0;
    const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
    const todayOOSCount = getOOSRoomsCountOnDate(today, oosPeriods);
    const totalRooms = Math.max(0, totalRoomsBase - todayOOSCount);

    const rangeStart = kpiMode === "MTD" ? startOfMonthYMD(today) : kpiMode === "YTD" ? startOfYearYMD(today) : today;
    const rangeEndExclusive = addDays(today, 1);
    const rangeNights = Math.max(1, diffDays(rangeStart, rangeEndExclusive));
    const totalCapacityNights = totalRooms * rangeNights;

    const inHouseRoomSetToday = new Set();
    let soldRoomNights = 0;
    let futureRoomNights = 0;
    let futureResCount = 0;

    for (const r of safe) {
      if (!statusCountsForSales(r?.status)) continue;

      const ci = r?.stay?.checkIn ?? r?.checkIn;
      const co = r?.stay?.checkOut ?? r?.checkOut;
      const roomNo = String(getRoomNumber(r) ?? "").trim();
      if (!ci || !co) continue;

      const ciYMD = String(ci).slice(0, 10);
      const coYMD = String(co).slice(0, 10);

      if (isDateBetween(today, ciYMD, coYMD) && roomNo) {
        inHouseRoomSetToday.add(roomNo);
      }

      const overlapStart = ciYMD > rangeStart ? ciYMD : rangeStart;
      const overlapEnd = coYMD < rangeEndExclusive ? coYMD : rangeEndExclusive;
      if (overlapStart < overlapEnd) {
        const nights = diffDays(overlapStart, overlapEnd);
        soldRoomNights += nights;
      }

      if (ciYMD > today) {
        futureResCount += 1;
        futureRoomNights += calcNightsHelper(ci, co);
      }
    }

    const roomsSoldToday = inHouseRoomSetToday.size;
    const roomsAvailableToday = Math.max(0, totalRooms - roomsSoldToday);
    const occPctToday = totalRooms > 0 ? (roomsSoldToday / totalRooms) * 100 : 0;

    const capacityNightsSafe = Math.max(0, totalCapacityNights);
    const availableRoomNights = Math.max(0, capacityNightsSafe - soldRoomNights);
    const occPctRange = capacityNightsSafe > 0 ? (soldRoomNights / capacityNightsSafe) * 100 : 0;

    return {
      totalRooms,
      mode: kpiMode,
      rangeStart,
      rangeEnd: today,
      rangeNights,
      roomsSoldToday,
      roomsAvailableToday,
      occPctToday,
      soldRoomNights,
      availableRoomNights,
      occPctRange,
      futureRoomNights,
      futureResCount,
    };
  }, [reservations, kpiMode]);

  const headerStyles = {
    headerCard: {
      position: "relative",
      background: "var(--header-card-bg)",
      padding: "20px 28px",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--header-card-shadow)",
      border: "var(--header-card-border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      border: "1px solid rgba(20, 184, 166, 0.2)",
      gap: 14,
      flexWrap: "wrap",
    },
    logoImage: {
      width: "72px",
      height: "72px",
      objectFit: "cover",
      borderRadius: "50%",
      border: "3px solid rgba(20, 184, 166, 0.35)",
      boxShadow: "0 6px 16px rgba(13, 148, 136, 0.15)",
    },
    statsBar: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "18px",
      marginBottom: "20px",
    },
    statCard: (color) => ({
      background: "white",
      borderRadius: "14px",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 4px 20px rgba(13, 148, 136, 0.06)",
      borderLeft: `5px solid ${color}`,
      border: "1px solid rgba(20, 184, 166, 0.12)",
      minHeight: 78,
    }),
    statLabel: {
      display: "block",
      fontSize: "11px",
      color: "#54716e",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    statValue: { fontSize: "24px", fontWeight: 800, color: "#134e4a" },
    pill: (bg) => ({ background: bg, padding: "10px", borderRadius: "50%" }),
  };

  return (
    <div
      style={{
        padding: "0",
        minHeight: "100%",
        fontFamily: "DM Sans, sans-serif",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* HEADER */}
      <div style={headerStyles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img
            src={HOTEL_LOGO}
            alt="Ocean Stay"
            style={headerStyles.logoImage}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 className="app-page-title">Ocean Stay</h1>
            <span className="app-page-subtitle" style={{ marginTop: "5px" }}>Maldives</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            className="app-page-address"
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
              lineHeight: "1",
              whiteSpace: "nowrap",
            }}
          >
            Reservations Manager
          </span>
          <FaListUl style={{ fontSize: "20px", color: "#3b82f6", opacity: 0.9 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {/* TODAY / MTD / YTD */}
          <div
            style={{
              display: "inline-flex",
              gap: 6,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 999,
              padding: 6,
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {["TODAY", "MTD", "YTD"].map((m) => {
              const active = kpiMode === m;
              return (
                <button
                  key={m}
                  onClick={() => setKpiMode(m)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontWeight: 900,
                    fontSize: 12,
                    letterSpacing: "0.4px",
                    color: active ? "#0f172a" : "#64748b",
                    background: active ? "#e0f2fe" : "transparent",
                    boxShadow: active ? "0 6px 14px rgba(14,165,233,0.18)" : "none",
                  }}
                  title={m}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {kpiMode !== "TODAY" && (
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: -2 }}>
              {headerKpis.rangeStart} → {headerKpis.rangeEnd} • {headerKpis.rangeNights} night(s)
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowSearchModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                color: "#475569",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              }}
            >
              <FaSearch /> Advanced Search
            </button>

            <button
              onClick={() => onNewReservation?.()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "#3b82f6",
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(59,130,246,0.22)",
              }}
            >
              <FaPlus /> New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Alert: check-in coming (today or next 3 days) */}
      {upcomingCheckIns.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            marginBottom: 16,
            borderRadius: 12,
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #f59e0b",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)",
          }}
          role="alert"
        >
          <FaRegCalendarCheck style={{ fontSize: 22, color: "#b45309", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#92400e", fontSize: 14 }}>
              {upcomingCheckIns.length} reservation{upcomingCheckIns.length !== 1 ? "s" : ""} with check-in in the next 3 days
            </strong>
            <div style={{ marginTop: 4, fontSize: 12, color: "#78350f" }}>
              {upcomingCheckIns
                .slice(0, 5)
                .map((r) => {
                  const ci = r?.stay?.checkIn ?? r?.checkIn;
                  const ciYMD = ci ? String(ci).slice(0, 10) : "";
                  const guest = [getGuestFirstName(r), getGuestLastName(r)].filter(Boolean).join(" ") || "Guest";
                  const room = getRoomNumber(r) ?? "—";
                  return `${guest} (Room ${room}) — ${ciYMD}`;
                })
                .join(" · ")}
              {upcomingCheckIns.length > 5 && ` · +${upcomingCheckIns.length - 5} more`}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={headerStyles.statsBar}>
        <div style={headerStyles.statCard("#0d9488")}>
          <div>
            <span style={headerStyles.statLabel}>{headerKpis.mode === "TODAY" ? "Total Rooms Sold" : "Room Nights Sold"}</span>
            <span style={headerStyles.statValue}>
              {headerKpis.mode === "TODAY" ? headerKpis.roomsSoldToday : Math.round(headerKpis.soldRoomNights)}
            </span>
          </div>
          <div style={{ ...headerStyles.pill("#ccfbf1"), color: "#0d9488" }}>
            <FaBed size={20} />
          </div>
        </div>

        <div style={headerStyles.statCard("#14b8a6")}>
          <div>
            <span style={headerStyles.statLabel}>
              {headerKpis.mode === "TODAY" ? "Total Rooms Available" : "Room Nights Available"}
            </span>
            <span style={{ ...headerStyles.statValue, color: "#14b8a6" }}>
              {headerKpis.mode === "TODAY" ? headerKpis.roomsAvailableToday : Math.round(headerKpis.availableRoomNights)}
            </span>
          </div>
          <div style={{ ...headerStyles.pill("#f0fdfa"), color: "#14b8a6" }}>
            <FaDoorOpen size={20} />
          </div>
        </div>

        <div style={headerStyles.statCard("#10b981")}>
          <div>
            <span style={headerStyles.statLabel}>OCC</span>
            <span style={{ ...headerStyles.statValue, color: "#10b981" }}>
              {(headerKpis.mode === "TODAY" ? headerKpis.occPctToday : headerKpis.occPctRange).toFixed(1)}%
            </span>
            {headerKpis.mode !== "TODAY" && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Based on room nights
              </div>
            )}
          </div>
          <div style={{ ...headerStyles.pill("#ecfdf5"), color: "#10b981" }}>
            <FaChartPie size={20} />
          </div>
        </div>

        <div style={headerStyles.statCard("#f59e0b")}>
          <div>
            <span style={headerStyles.statLabel}>Future On The Book</span>
            <span style={{ ...headerStyles.statValue, color: "#b45309" }}>{Math.round(headerKpis.futureRoomNights)}</span>
            <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
              Room Nights · {headerKpis.futureResCount} booking(s)
            </div>
          </div>
          <div style={{ ...headerStyles.pill("#fffbeb"), color: "#f59e0b" }}>
            <FaLayerGroup size={20} />
          </div>
        </div>
      </div>

      {/* Filter Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTER_TABS.map((tab) => (
          <FilterCard
            key={tab}
            active={statusFilter === tab}
            icon={tabIcon(tab)}
            label={tab}
            count={tabCounts?.[tab] ?? 0}
            onClick={() => setStatusFilter(tab)}
            color={tabColor(tab)}
          />
        ))}
      </div>

      {/* Table: no horizontal scrollbar; vertical scroll only */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0",
          overflowX: "hidden",
          overflowY: "auto",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          maxHeight: "calc(100vh - 280px)",
          WebkitOverflowScrolling: "touch",
        }}
        className="table-wrapper-mobile"
      >
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
          <thead style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderBottom: "2px solid #e2e8f0" }}>
            <tr
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
              }}
            >
              <TH icon={<FaUser size={14} />} label="Guest" title="Guest Info" />
              <th
                style={{
                  padding: "10px 12px",
                  paddingLeft: "16px",
                  textAlign: "center",
                  color: "#1e293b",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  whiteSpace: "nowrap",
                  verticalAlign: "middle",
                  borderBottom: "2px solid #e2e8f0",
                }}
                title="Room"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#64748b", display: "inline-flex", opacity: 0.8 }}><FaDoorOpen size={14} /></span>
                  <span style={{ color: "#334155" }}>Room</span>
                </span>
              </th>
              <TH icon={<FaGlobeAmericas size={14} />} label="Channel" title="Booking channel" center />
              <TH icon={<FaCreditCard size={14} />} label="Pay" title="Payment method" center />
              <TH icon={<FaTag size={14} />} label="Sts" title="Status" center />
              <TH icon={<FaSignInAlt size={14} />} label="C/In" title="Check-in Date" right />
              <TH icon={<FaSignOutAlt size={14} />} label="C/Out" title="Check-out Date" right />
              <TH icon={<FaMoon size={14} />} label="RN" title="Total Room Nights" center />
              <TH icon={<FaUsers size={14} />} label="Pax" title="Number of Pax" center />
              <TH icon={<FaUtensils size={14} />} label="F&B" title="Meal Plan (BO/BB/HB/FB)" center />

              <TH icon={<FaTag size={14} />} label="Rate" title="Room rate per night (excl. F&B and tax)" right />

              <TH icon={<FaBed size={14} />} label="Room $" title="Room revenue (excl. tax)" right />
              <TH icon={<FaUtensils size={14} />} label="F&B $" title="F&B revenue (excl. tax)" right />
              <TH icon={<FaCoins size={14} />} label="Total $" title="Room + F&B revenue (excl. tax)" right />
              <TH icon={<FaBolt size={14} />} label="Act" title="Actions" center />
            </tr>
          </thead>

          <tbody>
            {filteredReservations.length ? (
              filteredReservations.map((r, i) => {
                const nights = calcRoomNights(r);
                const pax = calcPax(r);
                const roomRev = calcRoomRevenue(r);
                const fnbRev = calcFnbRevenue(r);
                // Total = room revenue + F&B revenue (pre-tax, no tax included)
                const totalRev = roomRev + fnbRev;
                // Rate = room rate only per night (excl. F&B packages and tax)
                const avgRate = nights > 0 ? roomRev / nights : 0;

                const first = getGuestFirstName(r);
                const last = getGuestLastName(r);
                const roomNo = getRoomNumber(r);

                const ci = r?.stay?.checkIn ?? r?.checkIn;
                const co = r?.stay?.checkOut ?? r?.checkOut;
                const ciYMD = ci ? String(ci).slice(0, 10) : "";
                const coYMD = co ? String(co).slice(0, 10) : "";

                return (
                  <tr
                    key={r?.id || i}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "all 0.2s ease",
                      cursor: isEditLocked(r) ? "default" : "pointer",
                      background: i % 2 === 0 ? "#ffffff" : "#fafbfc",
                    }}
                    onClick={(e) => {
                      if (!isEditLocked(r)) {
                        onEditReservation?.(r);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditLocked(r)) {
                        e.currentTarget.style.background = "#f0f9ff";
                        e.currentTarget.style.boxShadow = "inset 4px 0 0 #3b82f6";
                        e.currentTarget.style.transform = "scale(1.001)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = i % 2 === 0 ? "#ffffff" : "#fafbfc";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <td style={{ padding: "8px 10px", verticalAlign: "middle", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "0.85rem",
                            flexShrink: 0,
                            boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
                          }}
                        >
                          {(String(first || "G").charAt(0) || "G").toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem" }}>
                            {first} {last}
                          </div>
                          <small style={{ color: "#94a3b8", fontSize: "0.68rem", whiteSpace: "nowrap", fontWeight: "500" }}>
                            ID: {String(r?.id || "").substring(0, 8)}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "8px 10px", paddingLeft: "16px", verticalAlign: "middle", textAlign: "center" }}>
                      <span
                        style={{
                          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          color: "#1e40af",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          whiteSpace: "nowrap",
                          fontSize: "0.8rem",
                          border: "1px solid #93c5fd",
                          boxShadow: "0 1px 2px rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <FaBed size={11} /> {roomNo}
                      </span>
                    </td>

                    <td style={{ ...tdStrongCenter, fontSize: "0.8rem" }}>{channelDisplayLabel(getChannel(r) || "Direct booking")}</td>
                    <td style={{ ...tdStrongCenter, fontSize: "0.8rem" }}>{normPayment(getPaymentMethod(r))}</td>

                    <td style={{ ...tdStrongCenter, padding: "8px 10px" }}>
                      <span
                        className={statusPillClass(r?.status)}
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          textTransform: "capitalize",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        {statusDisplayLabel(r?.status)}
                      </span>
                    </td>

                    <td style={{ ...tdStrongRight, fontSize: "0.8rem" }}>{ciYMD || "—"}</td>
                    <td style={{ ...tdStrongRight, fontSize: "0.8rem" }}>{coYMD || "—"}</td>

                    <td style={{ ...tdStrongCenter, fontSize: "0.8rem" }}>{nights || "—"}</td>
                    <td style={{ ...tdStrongCenter, fontSize: "0.8rem" }}>{pax || "—"}</td>

                    <td style={{ ...tdStrongCenter, fontSize: "0.8rem" }}>{String(r?.mealPlan ?? "BO").toUpperCase()}</td>

                    <td style={{ ...tdStrongMoney, fontSize: "0.8rem" }}>{formatMoney(avgRate)}</td>

                    <td style={{ ...tdStrongMoney, fontSize: "0.8rem" }}>{Number.isFinite(roomRev) ? formatMoney(roomRev) : "—"}</td>
                    <td style={{ ...tdStrongMoney, fontSize: "0.8rem" }}>{Number.isFinite(fnbRev) ? formatMoney(fnbRev) : "—"}</td>
                    <td style={{ ...tdStrongMoney, fontSize: "0.8rem" }}>{Number.isFinite(totalRev) ? formatMoney(totalRev) : "—"}</td>

                    <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isEditLocked(r)) return;
                            onEditReservation?.(r);
                          }}
                          disabled={isEditLocked(r)}
                          style={{
                            ...iconBtn("#64748b"),
                            opacity: isEditLocked(r) ? 0.45 : 1,
                            cursor: isEditLocked(r) ? "not-allowed" : "pointer",
                          }}
                          onMouseEnter={(e) => {
                            if (!isEditLocked(r)) {
                              e.currentTarget.style.background = "#f1f5f9";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.transform = "scale(1.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          title={isClosedReservation(r) ? "Month Closed" : isCheckedOutReservation(r) ? "Checked Out" : "Edit"}
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInvoice?.(r);
                          }}
                          style={iconBtn("#3b82f6")}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#eff6ff";
                            e.currentTarget.style.borderColor = "#93c5fd";
                            e.currentTarget.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          title="Invoice"
                        >
                          <FaFileInvoiceDollar />
                        </button>

                        {isBooked(r?.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!onDeleteReservation) {
                                alert("Delete is not wired yet. Please pass onDeleteReservation from App.jsx.");
                                return;
                              }
                              if (isClosedReservation(r)) {
                                alert("Month Closed — this reservation cannot be deleted.");
                                return;
                              }
                              const ok = window.confirm(
                                `Delete this BOOKED reservation?\n\nGuest: ${first || ""} ${last || ""}\nRoom: ${roomNo || ""}`
                              );
                              if (!ok) return;
                              onDeleteReservation(r);
                            }}
                            disabled={isEditLocked(r)}
                            style={{
                              ...iconBtn("#ef4444"),
                              borderColor: "#fee2e2",
                              opacity: isEditLocked(r) ? 0.45 : 1,
                              cursor: isEditLocked(r) ? "not-allowed" : "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (!isEditLocked(r)) {
                                e.currentTarget.style.background = "#fef2f2";
                                e.currentTarget.style.borderColor = "#fecaca";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.borderColor = "#fee2e2";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                            title={isClosedReservation(r) ? "Month Closed" : "Delete (Booked only)"}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={15} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b", verticalAlign: "middle", background: "#fafbfc" }}>
                  <div style={{ 
                    marginBottom: 16, 
                    fontSize: "3rem", 
                    opacity: 0.4,
                    color: "#94a3b8"
                  }}>
                    <FaSearch />
                  </div>
                  <div style={{ 
                    fontSize: "1rem", 
                    fontWeight: "600", 
                    color: "#475569",
                    marginBottom: 8
                  }}>
                    No reservations found
                  </div>
                  <div style={{ 
                    fontSize: "0.85rem", 
                    color: "#94a3b8"
                  }}>
                    Try adjusting your filters or search criteria
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSearchModal && (
        <SearchModal filters={searchFilters} setFilters={setSearchFilters} onClose={() => setShowSearchModal(false)} />
      )}
    </div>
  );
}

const tdStrong = {
  padding: "8px 10px",
  fontWeight: "500",
  color: "#1e293b",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  fontSize: "0.8rem",
};

const tdStrongRight = { ...tdStrong, textAlign: "right" };
const tdStrongCenter = { ...tdStrong, textAlign: "center" };
const tdStrongMoney = {
  ...tdStrong,
  textAlign: "right",
  fontFeatureSettings: '"tnum" 1',
};

const iconBtn = (color) => ({
  background: "white",
  border: "1px solid #e2e8f0",
  color,
  width: 32,
  height: 32,
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "0.85rem",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
});
