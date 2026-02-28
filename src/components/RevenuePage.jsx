import React, { useMemo, useState } from "react";
import {
  FaFilter,
  FaPlus,
  FaTimes,
  FaChartPie,
  FaMoneyBillWave,
  FaUtensils,
  FaBed,
  FaTshirt,
  FaSpa,
  FaUmbrellaBeach,
  FaConciergeBell,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaTag,
  FaAlignLeft,
  FaDollarSign,
} from "react-icons/fa";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { roundTo2 } from "../utils/helpers";

const HOTEL_LOGO = "/logo.png";

// === Timezone-safe date helpers (Africa/Cairo) ===
const TZ = "Africa/Cairo";
const toYMD = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
};
const addDaysYMD = (ymdStr, days) => {
  const [y, m, dd] = String(ymdStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toYMD(dt);
};
const buildDateRangeInclusive = (startYMD, endYMD) => {
  const days = [];
  let cur = startYMD;
  while (cur <= endYMD) {
    days.push(cur);
    cur = addDaysYMD(cur, 1);
  }
  return days;
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const makeId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `rev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

// ✅ Removed "Other" completely
const TYPE_OPTIONS = ["F&B", "Laundry", "Spa", "Activities", "Services"];

// ✅ Normalize any old "Other/Other Revenue/unknown" to Services
const normalizeType = (type) => {
  const t = String(type || "").trim();
  if (!t) return "Services";
  if (TYPE_OPTIONS.includes(t)) return t;
  return "Services";
};

const NiceTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0]?.value ?? 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
        borderRadius: 14,
        padding: "10px 12px",
        color: "#0f172a",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>
        Day: <span style={{ color: "#0f172a" }}>{label}</span>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Revenue</div>
        <div style={{ fontSize: 16, fontWeight: 950 }}>${fmtMoney(v)}</div>
      </div>
    </div>
  );
};

const TrendDot = ({ cx, cy, payload, isMax, isMin }) => {
  if (cx == null || cy == null) return null;

  const val = Number(payload?.amount || 0);
  const showPulse = (isMax || isMin) && val > 0;

  const base = (
    <circle
      cx={cx}
      cy={cy}
      r={showPulse ? 5 : 3.5}
      fill={isMax ? "#b45309" : isMin ? "#f97316" : "#b45309"}
      fillOpacity={showPulse ? 1 : 0.85}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );

  if (!showPulse) return base;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={isMax ? "rgba(37,99,235,0.16)" : "rgba(249,115,22,0.18)"}
        className="revPulse"
      />
      {base}
    </g>
  );
};

export default function RevenuePage({ data = [], reservations = [], onUpdate }) {
  const todayYMD = toYMD(new Date());

  // Filter
  const [timeFilter, setTimeFilter] = useState("MTD"); // TODAY | MTD | YTD
  const [rangeFrom, setRangeFrom] = useState(() => {
    const now = new Date();
    return toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [rangeTo, setRangeTo] = useState(todayYMD);

  const applyPreset = (preset) => {
    const now = new Date();
    const today = toYMD(now);

    if (preset === "TODAY") {
      setTimeFilter("TODAY");
      setRangeFrom(today);
      setRangeTo(today);
      return;
    }
    if (preset === "MTD") {
      setTimeFilter("MTD");
      const from = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      setRangeFrom(from);
      setRangeTo(today);
      return;
    }
    if (preset === "YTD") {
      setTimeFilter("YTD");
      const from = toYMD(new Date(now.getFullYear(), 0, 1));
      setRangeFrom(from);
      setRangeTo(today);
      return;
    }
  };

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    date: todayYMD,
    type: "Services",
    description: "",
    amount: "",
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormError("");
    setForm({
      date: todayYMD,
      type: "Services",
      description: "",
      amount: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item?.id || null);
    setFormError("");
    setForm({
      date: item?.date ? toYMD(item.date) : todayYMD,
      type: normalizeType(item?.type),
      description: item?.description || "",
      amount: item?.amount === 0 || item?.amount ? String(item.amount) : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormError("");
  };

  const safeData = Array.isArray(data) ? data : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  // --- Header styles (RoomsPage theme) ---
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
      marginBottom: "16px",
      border: "1px solid rgba(180, 83, 9, 0.22)",
    },
    logoImage: {
      width: "72px",
      height: "72px",
      objectFit: "cover",
      borderRadius: "50%",
      border: "3px solid rgba(180, 83, 9, 0.35)",
      boxShadow: "0 6px 16px rgba(120, 53, 15, 0.15)",
    },
  };

  const { dashboardData, chartData, pieData } = useMemo(() => {
    // ✅ Use From/To from state
    let startDate = String(rangeFrom || todayYMD);
    let endDate = String(rangeTo || todayYMD);

    if (endDate < startDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }

    const dateRange = buildDateRangeInclusive(startDate, endDate);
    const timelineMap = {};
    dateRange.forEach((d) => (timelineMap[d] = 0));

    // ===== Rooms accrual =====
    let roomRevenue = 0;
    let roomNightsSold = 0;

    safeReservations.forEach((r) => {
      if (!r || r.status === "Cancelled") return;

      const status = (r.status || "").toLowerCase();
      // Only count revenue for reservations that have checked in (not Booked)
      const isCheckedIn = status === "checked-in" || status === "checked in" || 
                         status === "checked-out" || status === "checked out" || 
                         status === "in house";
      
      if (!isCheckedIn) return; // Skip Booked reservations

      const ciRaw = r?.stay?.checkIn;
      const coRaw = r?.stay?.checkOut;
      if (!ciRaw || !coRaw) return;

      const ci = toYMD(ciRaw);
      const co = toYMD(coRaw);

      // Only count revenue from check-in day onwards (day >= ci)
      // checkOut exclusive
      const stayDates = [];
      let cur = ci;
      while (cur < co) {
        stayDates.push(cur);
        cur = addDaysYMD(cur, 1);
      }
      const stayNights = Math.max(1, stayDates.length);

      const totalAmount = Number(r?.pricing?.subtotal ?? r?.totalPrice ?? 0);
      const perNight = totalAmount / stayNights;

      stayDates.forEach((day) => {
        // Only count from check-in day onwards and within report period
        if (day >= ci && day >= startDate && day <= endDate) {
          roomRevenue += perNight;
          roomNightsSold += 1;
          if (timelineMap[day] !== undefined) timelineMap[day] += perNight;
        }
      });
    });

    // ===== Manual in period =====
    const manualTransactions = safeData
      .map((x) => ({ ...x, type: normalizeType(x?.type) }))
      .filter((item) => {
        if (!item?.date) return false;
        const d = toYMD(item.date);
        return d >= startDate && d <= endDate;
      });

    const manualTotal = roundTo2(manualTransactions.reduce((sum, i) => sum + Number(i?.amount || 0), 0));

    const calcManual = (type) =>
      roundTo2(
        manualTransactions
          .filter((i) => i?.type === type)
          .reduce((sum, i) => sum + Number(i?.amount || 0), 0)
      );

    const revenue = {
      rooms: roundTo2(roomRevenue),
      fb: calcManual("F&B"),
      laundry: calcManual("Laundry"),
      spa: calcManual("Spa"),
      activities: calcManual("Activities"),
      services: calcManual("Services"),
    };

    const totalRevenue = roundTo2(roomRevenue + manualTotal);

    const chartData = Object.keys(timelineMap)
      .map((date) => ({
        name: date.slice(5),
        amount: timelineMap[date],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const pieData = [
      { name: "Rooms", value: revenue.rooms, color: "#3b82f6" },
      { name: "F&B", value: revenue.fb, color: "#10b981" },
      { name: "Laundry", value: revenue.laundry, color: "#f97316" },
      { name: "Spa", value: revenue.spa, color: "#a855f7" },
      { name: "Activities", value: revenue.activities, color: "#ef4444" },
      { name: "Services", value: revenue.services, color: "#64748b" },
    ];

    return {
      dashboardData: {
        revenue,
        totalRevenue,
        roomNightsSold,
        filteredList: manualTransactions,
        startDate,
        endDate,
      },
      chartData,
      pieData,
    };
  }, [safeData, safeReservations, rangeFrom, rangeTo, todayYMD]);

  const saveForm = () => {
    setFormError("");

    const date = String(form.date || "").trim();
    const type = normalizeType(form.type);
    const description = String(form.description || "").trim();
    const amountNum = Number(String(form.amount || "").replace(/,/g, ""));

    if (!date) return setFormError("Please select a date.");
    if (!type) return setFormError("Please select a revenue type.");
    if (!Number.isFinite(amountNum) || amountNum <= 0)
      return setFormError("Amount must be a valid number greater than 0.");

    const payload = {
      id: editingId || makeId(),
      date, // YYYY-MM-DD
      type,
      description,
      amount: amountNum,
    };

    const next = editingId ? safeData.map((x) => (x.id === editingId ? payload : x)) : [payload, ...safeData];

    if (onUpdate) onUpdate(next);
    closeModal();
  };

  const handleDelete = (id) => {
    if (!onUpdate) return;
    if (!id) return;
    if (window.confirm("Delete this transaction?")) {
      onUpdate(safeData.filter((i) => i.id !== id));
    }
  };

  // --- Styles ---
  const pageStyles = {
    padding: "0",
    fontFamily: "DM Sans, sans-serif",
    minHeight: "100%",
  };

  const sectionCard = {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    marginBottom: "16px",
  };

  // KPI grid (no scrollbar)
  const kpiGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: 14,
  };

  const statCardBase = {
    backgroundColor: "white",
    padding: "12px",
    borderRadius: "14px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
    border: "1px solid rgba(15,23,42,0.08)",
    minHeight: 78,
  };

  const iconBadge = (bg, color) => ({
    background: bg,
    padding: 7,
    borderRadius: 10,
    color,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const thStyles = {
    textAlign: "left",
    padding: "12px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "uppercase",
  };
  const tdStyles = {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "middle",
  };

  const btnIcon = (variant) => {
    const base = {
      border: "1px solid #e2e8f0",
      background: "white",
      padding: "7px 10px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
    };
    if (variant === "edit") return { ...base, color: "#b45309" };
    if (variant === "del") return { ...base, color: "#ef4444" };
    return base;
  };

  // ✅ Date Range Bar (same background as header)
  const rangeBar = {
    background: "linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)",
    border: "1px solid #bae6fd",
    borderRadius: "14px",
    padding: "12px 16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  };

  const rangeInput = (disabled) => ({
    width: 160,
    padding: "9px 10px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: disabled ? "#f0fdfa" : "white",
    color: disabled ? "#94a3b8" : "#0f172a",
    fontSize: 12,
    fontWeight: 800,
    outline: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  });

  const labelSm = {
    fontSize: 11,
    fontWeight: 900,
    color: "#64748b",
    textTransform: "uppercase",
  };

  // Modal styles
  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 14,
  };

  const modal = {
    width: 620,
    maxWidth: "96vw",
    background: "white",
    borderRadius: 18,
    boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
    border: "1px solid rgba(15,23,42,0.10)",
    overflow: "hidden",
  };

  const modalHeader = {
    padding: "16px 16px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%)",
    borderBottom: "1px solid #e2e8f0",
  };

  const modalBody = { padding: 16 };

  const fieldGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  };

  const fieldLabel = {
    fontSize: 12,
    color: "#475569",
    fontWeight: 900,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const input = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    outline: "none",
    fontSize: 14,
    color: "#0f172a",
    background: "white",
  };

  const textarea = { ...input, minHeight: 92, resize: "vertical" };

  const modalFooter = {
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
  };

  const primaryBtn = {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "linear-gradient(135deg, #b45309, #92400e)",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 6px 20px rgba(120, 53, 15, 0.25)",
  };

  const ghostBtn = {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "white",
    color: "#0f172a",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div style={pageStyles}>
      {/* HEADER */}
      <div style={headerStyles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img
            src={HOTEL_LOGO}
            alt="Ocean Blue Lagoon"
            style={headerStyles.logoImage}
            onError={(e) => (e.target.style.display = "none")}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 className="app-page-title">Ocean Blue Lagoon</h1>
            <span className="app-page-subtitle" style={{ marginTop: "5px" }}>Maldives</span>
          </div>
        </div>

        {/* Center title */}
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
              fontSize: "22px",
              fontWeight: "600",
              color: "#0f172a",
              lineHeight: "1",
            }}
          >
            Revenue Center
          </span>
          <FaMoneyBillWave style={{ fontSize: "20px", color: "#b45309", opacity: 0.95 }} />
        </div>

        {/* Right controls (same height as RoomsPage) */}
        <div
          style={{
            background: "white",
            padding: "5px",
            borderRadius: "12px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            display: "flex",
            gap: "5px",
            border: "1px solid #e2e8f0",
            alignItems: "center",
          }}
        >
          {["TODAY", "MTD", "YTD"].map((k) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              style={{
                padding: "8px 12px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                background: timeFilter === k ? "#b45309" : "transparent",
                color: timeFilter === k ? "white" : "#54716e",
              }}
            >
              {k}
            </button>
          ))}

          <div style={{ width: 1, height: 26, background: "#e2e8f0", margin: "0 6px" }} />

          <button
            onClick={openAddModal}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              background: "linear-gradient(135deg, #b45309, #92400e)",
              color: "white",
            }}
          >
            <FaPlus /> Add Revenue
          </button>
        </div>
      </div>

      {/* ✅ Date Range Bar (same background as header) */}
      <div style={rangeBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 900, fontSize: 12 }}>
          <FaCalendarAlt /> Date Range
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelSm}>From</span>
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              disabled={timeFilter === "TODAY"}
              style={rangeInput(timeFilter === "TODAY")}
            />
          </div>

          <div style={{ marginTop: 18, color: "#94a3b8", fontWeight: 900 }}>—</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelSm}>To</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              disabled={timeFilter === "TODAY"}
              style={rangeInput(timeFilter === "TODAY")}
            />
          </div>
        </div>

        <div style={{ color: "#64748b", fontSize: 12 }}>
          Showing: <b style={{ color: "#0f172a" }}>{dashboardData.startDate}</b> →{" "}
          <b style={{ color: "#0f172a" }}>{dashboardData.endDate}</b>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={kpiGrid}>
        <div
          style={{
            ...statCardBase,
            border: "1px solid rgba(37,99,235,0.22)",
            background: "linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>
              Total Revenue
            </span>
            <span style={iconBadge("#ffedd5", "#b45309")}>
              <FaMoneyBillWave size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.totalRevenue)}
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(59,130,246,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>
              Room Revenue
            </span>
            <span style={iconBadge("#eff6ff", "#3b82f6")}>
              <FaBed size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.rooms)}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Nights: <b style={{ color: "#0f172a" }}>{Number(dashboardData.roomNightsSold || 0).toLocaleString()}</b>
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(16,185,129,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>F&B</span>
            <span style={iconBadge("#ecfdf5", "#10b981")}>
              <FaUtensils size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.fb)}
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(249,115,22,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>
              Laundry
            </span>
            <span style={iconBadge("#fff7ed", "#f97316")}>
              <FaTshirt size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.laundry)}
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(168,85,247,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>Spa</span>
            <span style={iconBadge("#faf5ff", "#a855f7")}>
              <FaSpa size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.spa)}
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(239,68,68,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>
              Activities
            </span>
            <span style={iconBadge("#fef2f2", "#ef4444")}>
              <FaUmbrellaBeach size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.activities)}
          </div>
        </div>

        <div style={{ ...statCardBase, border: "1px solid rgba(100,116,139,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 900 }}>
              Services
            </span>
            <span style={iconBadge("#f1f5f9", "#64748b")}>
              <FaConciergeBell size={14} />
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", marginTop: 8 }}>
            ${fmtMoney(dashboardData.revenue.services)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={sectionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FaMoneyBillWave />
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Revenue Trend</div>
            <div style={{ color: "#64748b", marginLeft: "auto", fontSize: 12 }}>
              {dashboardData.startDate} → {dashboardData.endDate}
            </div>
          </div>

          {/* ✅ ONLY GRAPH UPDATED HERE */}
          <div style={{ width: "100%", height: 260 }}>
            {/* Graph-only CSS */}
            <style>{`
              .revPulse {
                transform-origin: center;
                animation: revPulse 1.6s ease-in-out infinite;
              }
              @keyframes revPulse {
                0%   { transform: scale(0.65); opacity: 0.15; }
                45%  { transform: scale(1.0);  opacity: 0.35; }
                100% { transform: scale(1.25); opacity: 0.00; }
              }
            `}</style>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 18, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.28} />
                    <stop offset="75%" stopColor="#b45309" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="name"
                  tickMargin={8}
                  tick={{ fontSize: 11, fontWeight: 800, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: 11, fontWeight: 800, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => {
                    const n = Number(v || 0);
                    if (n >= 1000) return `${Math.round(n / 1000)}k`;
                    return String(Math.round(n));
                  }}
                />

                <Tooltip content={<NiceTooltip />} />

                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#b45309"
                  strokeWidth={3}
                  fill="url(#revFill)"
                  dot={(props) => {
                    const amounts = chartData.map((d) => Number(d.amount || 0));
                    const max = amounts.length ? Math.max(...amounts) : 0;
                    const min = amounts.length ? Math.min(...amounts) : 0;
                    const val = Number(props?.payload?.amount || 0);

                    const isMax = val === max && max > 0;
                    const isMin = val === min && max > 0;

                    return <TrendDot {...props} isMax={isMax} isMin={isMin} />;
                  }}
                  activeDot={{ r: 7, stroke: "#ffffff", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FaChartPie />
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Revenue Mix</div>
          </div>

          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={sectionCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <FaFilter />
          <div style={{ fontWeight: 900, color: "#0f172a" }}>Manual Revenue Transactions</div>
          <div style={{ color: "#64748b", marginLeft: "auto", fontSize: 12 }}>
            {dashboardData.filteredList.length} items
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyles}>Date</th>
              <th style={thStyles}>Type</th>
              <th style={thStyles}>Description</th>
              <th style={thStyles}>Amount</th>
              <th style={{ ...thStyles, width: 190 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.filteredList.length === 0 ? (
              <tr>
                <td style={tdStyles} colSpan={5}>
                  No manual revenue transactions found in this period.
                </td>
              </tr>
            ) : (
              dashboardData.filteredList.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={tdStyles}>{toYMD(item.date)}</td>
                  <td style={tdStyles}>{normalizeType(item.type)}</td>
                  <td style={tdStyles}>{item.description || "-"}</td>
                  <td style={{ ...tdStyles, fontWeight: 900 }}>${fmtMoney(item.amount)}</td>
                  <td style={tdStyles}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={btnIcon("edit")} onClick={() => openEditModal(item)} title="Edit">
                        <FaEdit /> Edit
                      </button>
                      <button style={btnIcon("del")} onClick={() => handleDelete(item.id)} title="Delete">
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={overlay} onMouseDown={closeModal}>
          <div style={modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontWeight: 950, color: "#0f172a", fontSize: 16 }}>
                  {editingId ? "Edit Revenue Transaction" : "Add Revenue Transaction"}
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  Fill the details below then save.
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#334155",
                }}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div style={modalBody}>
              <div style={fieldGrid}>
                <div>
                  <div style={fieldLabel}>
                    <FaCalendarAlt /> Date
                  </div>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    style={input}
                  />
                </div>

                <div>
                  <div style={fieldLabel}>
                    <FaTag /> Type
                  </div>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    style={input}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={fieldLabel}>
                    <FaDollarSign /> Amount
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    style={input}
                    placeholder="e.g. 250"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={fieldLabel}>
                    <FaAlignLeft /> Description
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    style={textarea}
                    placeholder="Optional notes…"
                  />
                </div>

                {formError ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      background: "#fef2f2",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#991b1b",
                      padding: "10px 12px",
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {formError}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={modalFooter}>
              <button style={ghostBtn} onClick={closeModal}>
                Cancel
              </button>
              <button style={primaryBtn} onClick={saveForm}>
                <FaMoneyBillWave /> {editingId ? "Save Changes" : "Add Revenue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
