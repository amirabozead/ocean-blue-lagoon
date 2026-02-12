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
} from "react-icons/fa";
import { FILTER_TABS, BASE_ROOMS } from "../data/constants";
import { statusPillClass, isDateBetween, storeLoad } from "../utils/helpers";
import SearchModal from "./SearchModal";

const HOTEL_LOGO = "/logo.png";

const TH = ({ icon, label, title, center }) => (
  <th
    style={{
      padding: "14px 16px",
      textAlign: center ? "center" : "left",
      color: "#475569",
      fontSize: "0.82rem",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      whiteSpace: "nowrap",
    }}
    title={title || label}
  >
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#94a3b8", display: "inline-flex" }}>{icon}</span>
      <span>{label}</span>
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
const statusCountsForSales = (status) => {
  const t = normStatus(status);
  return (
    t === "booked" ||
    t === "confirmed" ||
    t === "in house" ||
    t === "checked in" ||
    (t.includes("check") && t.includes("in")) ||
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

const calcRoomRevenue = (r) => {
  const direct = r?.pricing?.roomRevenue ?? r?.pricing?.roomTotal ?? r?.pricing?.roomAmount ?? r?.roomRevenue ?? null;
  if (direct !== null && direct !== undefined && String(direct) !== "") return Math.max(0, toNumber(direct, 0));

  const nightly = r?.pricing?.nightly;
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

  return Math.max(0, toNumber(r?.pricing?.total, 0));
};

const calcFnbRevenue = (r) => {
  const direct =
    r?.pricing?.fnbRevenue ??
    r?.pricing?.fnbRevenue ??
    r?.pricing?.foodBeverageRevenue ??
    r?.pricing?.foodRevenue ??
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
      if (norm(pm) !== norm(f.paymentMethod)) return false;
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
    const totalRooms = Array.isArray(BASE_ROOMS) ? BASE_ROOMS.length : 0;

    const rangeStart = kpiMode === "MTD" ? startOfMonthYMD(today) : kpiMode === "YTD" ? startOfYearYMD(today) : today;
    const rangeEndExclusive = addDays(today, 1);
    const rangeNights = diffDays(rangeStart, rangeEndExclusive);
    const totalCapacityNights = totalRooms * Math.max(1, rangeNights);

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

      if (isDateBetween(today, ci, co) && roomNo) {
        inHouseRoomSetToday.add(roomNo);
      }

      const ciYMD = String(ci || "").slice(0, 10);
      const coYMD = String(co || "").slice(0, 10);
      const overlapStart = ciYMD > rangeStart ? ciYMD : rangeStart;
      const overlapEnd = coYMD < rangeEndExclusive ? coYMD : rangeEndExclusive;
      const nights = diffDays(overlapStart, overlapEnd);
      soldRoomNights += nights;

      const tCI = new Date(ci).getTime();
      const tToday = new Date(today).getTime();
      if (Number.isFinite(tCI) && Number.isFinite(tToday) && tCI > tToday) {
        futureResCount += 1;
        futureRoomNights += calcRoomNights(r);
      }
    }

    const roomsSoldToday = inHouseRoomSetToday.size;
    const roomsAvailableToday = Math.max(0, totalRooms - roomsSoldToday);
    const occPctToday = totalRooms > 0 ? (roomsSoldToday / totalRooms) * 100 : 0;

    const capacityNightsSafe = Math.max(1, totalCapacityNights);
    const availableRoomNights = Math.max(0, capacityNightsSafe - soldRoomNights);
    const occPctRange = capacityNightsSafe > 0 ? (soldRoomNights / capacityNightsSafe) * 100 : 0;

    return {
      totalRooms,
      mode: kpiMode,
      rangeStart,
      rangeEnd: today,
      rangeNights: Math.max(1, rangeNights),
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
      background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
      padding: "20px 30px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "18px",
      border: "1px solid #bae6fd",
      gap: 14,
      flexWrap: "wrap",
    },
    logoImage: {
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "50%",
      border: "3px solid #e0f2fe",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    statsBar: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "20px",
      marginBottom: "16px",
    },
    statCard: (color) => ({
      background: "white",
      borderRadius: "12px",
      padding: "15px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
      borderLeft: `5px solid ${color}`,
      border: "1px solid #f1f5f9",
      minHeight: 78,
    }),
    statLabel: {
      display: "block",
      fontSize: "11px",
      color: "#64748b",
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    statValue: { fontSize: "24px", fontWeight: 900, color: "#0f172a" },
    pill: (bg) => ({ background: bg, padding: "10px", borderRadius: "50%" }),
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "Segoe UI, Inter, sans-serif",
      }}
    >
      {/* HEADER */}
      <div style={headerStyles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img
            src={HOTEL_LOGO}
            alt="Ocean Blue Lagoon"
            style={headerStyles.logoImage}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "36px",
                fontFamily: "'Brush Script MT', cursive",
                letterSpacing: "1px",
                fontWeight: "normal",
                lineHeight: "1",
              }}
            >
              Ocean Blue Lagoon
            </h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>
              Maldives Resort
            </span>
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
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
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

      {/* KPI Cards */}
      <div style={headerStyles.statsBar}>
        <div style={headerStyles.statCard("#6366f1")}>
          <div>
            <span style={headerStyles.statLabel}>{headerKpis.mode === "TODAY" ? "Total Rooms Sold" : "Room Nights Sold"}</span>
            <span style={headerStyles.statValue}>
              {headerKpis.mode === "TODAY" ? headerKpis.roomsSoldToday : Math.round(headerKpis.soldRoomNights)}
            </span>
          </div>
          <div style={{ ...headerStyles.pill("#eef2ff"), color: "#6366f1" }}>
            <FaBed size={20} />
          </div>
        </div>

        <div style={headerStyles.statCard("#0ea5e9")}>
          <div>
            <span style={headerStyles.statLabel}>
              {headerKpis.mode === "TODAY" ? "Total Rooms Available" : "Room Nights Available"}
            </span>
            <span style={{ ...headerStyles.statValue, color: "#0ea5e9" }}>
              {headerKpis.mode === "TODAY" ? headerKpis.roomsAvailableToday : Math.round(headerKpis.availableRoomNights)}
            </span>
          </div>
          <div style={{ ...headerStyles.pill("#f0f9ff"), color: "#0ea5e9" }}>
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

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          border: "1px solid #f1f5f9",
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
        }}
      >
        <table style={{ width: "100%", minWidth: 1250, borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <TH icon={<FaUser size={14} />} label="Guest" title="Guest Info" />
              <TH icon={<FaDoorOpen size={14} />} label="Room" title="Room" />
              <TH icon={<FaTag size={14} />} label="Sts" title="Status" />
              <TH icon={<FaSignInAlt size={14} />} label="C/In" title="Check-in Date" />
              <TH icon={<FaSignOutAlt size={14} />} label="C/Out" title="Check-out Date" />
              <TH icon={<FaMoon size={14} />} label="RN" title="Total Room Nights" />
              <TH icon={<FaUsers size={14} />} label="Pax" title="Number of Pax" />

              {/* NEW COLUMN: Rate */}
              <TH icon={<FaTag size={14} />} label="Rate" title="Avg Nightly Rate" />

              <TH icon={<FaBed size={14} />} label="Room $" title="Room Revenue" />
              <TH icon={<FaUtensils size={14} />} label="F&B $" title="Food & Beverage Revenue" />
              <TH icon={<FaCoins size={14} />} label="Total $" title="Total Revenue" />
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
                const totalRev = getTotal(r);

                // Calculate Average Rate
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
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <td style={{ padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "1.05rem",
                          }}
                        >
                          {(String(first || "G").charAt(0) || "G").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, color: "#1e293b" }}>
                            {first} {last}
                          </div>
                          <small style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                            ID: {String(r?.id || "").substring(0, 8)}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: 16 }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontWeight: 900,
                          color: "#475569",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <FaDoorOpen size={12} /> Room {roomNo}
                      </span>
                    </td>

                    <td style={{ padding: 16 }}>
                      <span
                        className={statusPillClass(r?.status)}
                        style={{
                          fontSize: "0.8rem",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontWeight: 900,
                          textTransform: "capitalize",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r?.status}
                      </span>
                    </td>

                    <td style={tdStrong}>{ciYMD || "—"}</td>
                    <td style={tdStrong}>{coYMD || "—"}</td>

                    <td style={tdStrong}>{nights || "—"}</td>
                    <td style={tdStrong}>{pax || "—"}</td>

                    {/* NEW RATE CELL */}
                    <td style={tdStrongMoney}>{formatMoney(avgRate)}</td>

                    <td style={tdStrongMoney}>{Number.isFinite(roomRev) ? formatMoney(roomRev) : "—"}</td>
                    <td style={tdStrongMoney}>{Number.isFinite(fnbRev) ? formatMoney(fnbRev) : "—"}</td>
                    <td style={tdStrongMoney}>{Number.isFinite(totalRev) ? formatMoney(totalRev) : "—"}</td>

                    <td style={{ padding: 16, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                        <button
                          onClick={() => {
                            if (isEditLocked(r)) return;
                            onEditReservation?.(r);
                          }}
                          disabled={isEditLocked(r)}
                          style={{
                            ...iconBtn("#64748b"),
                            opacity: isEditLocked(r) ? 0.45 : 1,
                            cursor: isEditLocked(r) ? "not-allowed" : "pointer",
                          }}
                          title={isClosedReservation(r) ? "Month Closed" : isCheckedOutReservation(r) ? "Checked Out" : "Edit"}
                        >
                          <FaEdit />
                        </button>

                        <button onClick={() => onInvoice?.(r)} style={iconBtn("#3b82f6")} title="Invoice">
                          <FaFileInvoiceDollar />
                        </button>

                        {isBooked(r?.status) && (
                          <button
                            onClick={() => {
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
                <td colSpan="12" style={{ padding: 50, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ marginBottom: 10, fontSize: "2rem", opacity: 0.5 }}>
                    <FaSearch />
                  </div>
                  No reservations found matching your criteria.
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
  padding: 16,
  fontWeight: 900,
  color: "#0f172a",
  whiteSpace: "nowrap",
};

const tdStrongMoney = {
  ...tdStrong,
  fontFeatureSettings: '"tnum" 1',
};

const iconBtn = (color) => ({
  background: "white",
  border: "1px solid #e2e8f0",
  color,
  width: 32,
  height: 32,
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
