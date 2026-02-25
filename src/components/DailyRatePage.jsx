import React, { useState, useMemo } from "react";
import { FaChartLine } from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ROOM_TYPES, BOOKING_CHANNELS } from "../data/constants";
import { toDate, calcNights, ymd } from "../utils/helpers";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const HOTEL_LOGO = "/logo.png";

// Project theme (aligned with Dashboard & Reports)
const theme = {
  primary: "#0ea5e9",
  secondary: "#6366f1",
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  bg: "#f8fafc",
  textMain: "#1e293b",
  textSub: "#64748b",
  card: "#ffffff",
  border: "#e2e8f0",
  ocean: "#0b6a8a",
  oceanDark: "#084e68",
};

export default function DailyRatePage({ reservations = [] }) {
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  const now = new Date();
  const todayStr = ymd(now);
  const [periodPreset, setPeriodPreset] = useState("mtd");
  const [analysisYear, setAnalysisYear] = useState(now.getFullYear());
  const [analysisMonth, setAnalysisMonth] = useState("All");
  const [analysisDate, setAnalysisDate] = useState("");

  const getPeriodBounds = () => {
    if (periodPreset === "today") {
      return { periodFromStr: todayStr, periodToStr: todayStr };
    }
    if (periodPreset === "mtd") {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      return { periodFromStr: `${y}-${String(m).padStart(2, "0")}-01`, periodToStr: todayStr };
    }
    if (periodPreset === "ytd") {
      const y = now.getFullYear();
      return { periodFromStr: `${y}-01-01`, periodToStr: todayStr };
    }
    if (analysisDate) {
      const d = analysisDate.slice(0, 10);
      return { periodFromStr: d, periodToStr: d };
    }
    if (analysisMonth !== "All" && Number(analysisMonth) >= 1 && Number(analysisMonth) <= 12) {
      const y = Number(analysisYear) || now.getFullYear();
      const m = Number(analysisMonth);
      const periodFromStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0);
      return { periodFromStr, periodToStr: ymd(lastDay) };
    }
    const y = Number(analysisYear) || now.getFullYear();
    return { periodFromStr: `${y}-01-01`, periodToStr: `${y}-12-31` };
  };

  const resAnalysis = useMemo(() => {
    const { periodFromStr, periodToStr } = getPeriodBounds();
    const periodFrom = toDate(periodFromStr);
    const periodTo = toDate(periodToStr);
    if (!periodFrom || !periodTo) return { revenue: 0, reservationsCount: 0, nightsInPeriod: 0, adr: 0, byRoomType: {}, periodFromStr, periodToStr };

    const periodToExclusive = new Date(periodTo);
    periodToExclusive.setDate(periodToExclusive.getDate() + 1);

    let revenue = 0;
    let nightsInPeriod = 0;
    const byRoomType = {};

    const addToRoom = (roomType, rev, nights) => {
      const rt = roomType || "Other";
      if (!byRoomType[rt]) byRoomType[rt] = { revenue: 0, nights: 0 };
      byRoomType[rt].revenue += rev;
      byRoomType[rt].nights += nights;
    };

    // Room revenue = room only (roomSubtotal/roomBase). Only count checked-in/checked-out (same as Reports).
    const isCountedStatus = (s) => {
      const t = (s || "").toLowerCase();
      return t === "checked-in" || t === "checked in" || t === "checked-out" || t === "checked out" || t === "in house";
    };
    safeReservations.forEach((r) => {
      const status = (r.status || "").toLowerCase();
      if (status === "cancelled") return;
      if (!isCountedStatus(r.status)) return;
      const ci = r.stay?.checkIn ?? r.checkIn;
      const co = r.stay?.checkOut ?? r.checkOut;
      if (!ci || !co) return;
      const ciD = toDate(ci);
      const coD = toDate(co);
      if (!ciD || !coD) return;
      if (ciD >= periodToExclusive || coD <= periodFrom) return;

      const stayNights = Math.max(1, calcNights(ci, co));
      const roomType = r.room?.roomType ?? r.roomType ?? "Other";
      const totalStayRoomRevenue = Number(r.pricing?.roomSubtotal ?? r.pricing?.roomBase ?? r.pricing?.subtotal ?? 0);
      if (!Number.isFinite(totalStayRoomRevenue) || totalStayRoomRevenue < 0) return;

      let countNights = 0;
      for (let d = new Date(Math.max(ciD.getTime(), periodFrom.getTime())); d < coD && d < periodToExclusive; d.setDate(d.getDate() + 1)) {
        const dayStr = ymd(d);
        if (dayStr >= periodFromStr && dayStr <= periodToStr) countNights += 1;
      }
      if (countNights <= 0) return;

      const allocatedRevenue = totalStayRoomRevenue * (countNights / stayNights);
      revenue += allocatedRevenue;
      nightsInPeriod += countNights;
      addToRoom(roomType, allocatedRevenue, countNights);
    });

    Object.keys(byRoomType).forEach((rt) => {
      const row = byRoomType[rt];
      row.adr = row.nights > 0 ? row.revenue / row.nights : 0;
    });

    const adr = nightsInPeriod > 0 ? revenue / nightsInPeriod : 0;
    const reservationsInPeriod = safeReservations.filter((r) => {
      if ((r.status || "").toLowerCase() === "cancelled") return false;
      if (!isCountedStatus(r.status)) return false;
      const ci = r.stay?.checkIn ?? r.checkIn;
      const co = r.stay?.checkOut ?? r.checkOut;
      if (!ci || !co) return false;
      const ciD = toDate(ci);
      const coD = toDate(co);
      if (!ciD || !coD) return false;
      return ciD < periodToExclusive && coD > periodFrom;
    }).length;

    return { revenue, reservationsCount: reservationsInPeriod, nightsInPeriod, adr, byRoomType, periodFromStr, periodToStr };
  }, [safeReservations, periodPreset, analysisYear, analysisMonth, analysisDate, now, todayStr]);

  // Room type × Channel: RN and rate (ADR) per channel for same period
  const byRoomTypeByChannel = useMemo(() => {
    const { periodFromStr, periodToStr } = getPeriodBounds();
    const periodFrom = toDate(periodFromStr);
    const periodTo = toDate(periodToStr);
    const out = {};
    const ensure = (rt, ch) => {
      if (!out[rt]) out[rt] = {};
      if (!out[rt][ch]) out[rt][ch] = { nights: 0, revenue: 0, rates: [] };
      return out[rt][ch];
    };

    if (!periodFrom || !periodTo) return out;
    const periodToExclusive = new Date(periodTo);
    periodToExclusive.setDate(periodToExclusive.getDate() + 1);
    const isCountedStatus = (s) => {
      const t = (s || "").toLowerCase();
      return t === "checked-in" || t === "checked in" || t === "checked-out" || t === "checked out" || t === "in house";
    };

    safeReservations.forEach((r) => {
      const status = (r.status || "").toLowerCase();
      if (status === "cancelled") return;
      if (!isCountedStatus(r.status)) return;
      const ci = r.stay?.checkIn ?? r.checkIn;
      const co = r.stay?.checkOut ?? r.checkOut;
      if (!ci || !co) return;
      const ciD = toDate(ci);
      const coD = toDate(co);
      if (!ciD || !coD) return;
      if (ciD >= periodToExclusive || coD <= periodFrom) return;

      const stayNights = Math.max(1, calcNights(ci, co));
      const roomType = r.room?.roomType ?? r.roomType ?? "Other";
      const chRaw = (r.channel ?? r.source ?? "Direct booking").trim() || "Direct booking";
      const channel = BOOKING_CHANNELS.find((c) => c.toLowerCase() === chRaw.toLowerCase()) || chRaw;
      const totalStayRoomRevenue = Number(r.pricing?.roomSubtotal ?? r.pricing?.roomBase ?? r.pricing?.subtotal ?? 0);
      if (!Number.isFinite(totalStayRoomRevenue) || totalStayRoomRevenue < 0) return;

      let countNights = 0;
      for (let d = new Date(Math.max(ciD.getTime(), periodFrom.getTime())); d < coD && d < periodToExclusive; d.setDate(d.getDate() + 1)) {
        const dayStr = ymd(d);
        if (dayStr >= periodFromStr && dayStr <= periodToStr) countNights += 1;
      }
      if (countNights <= 0) return;

      const stayRate = totalStayRoomRevenue / stayNights;
      const allocatedRevenue = totalStayRoomRevenue * (countNights / stayNights);
      const cell = ensure(roomType, channel);
      cell.nights += countNights;
      cell.revenue += allocatedRevenue;
      cell.rates.push(stayRate);
    });

    Object.keys(out).forEach((rt) => {
      Object.keys(out[rt]).forEach((ch) => {
        const c = out[rt][ch];
        c.adr = c.nights > 0 ? c.revenue / c.nights : 0;
        c.min = c.rates.length ? Math.min(...c.rates) : 0;
        c.max = c.rates.length ? Math.max(...c.rates) : 0;
      });
    });
    return out;
  }, [safeReservations, periodPreset, analysisYear, analysisMonth, analysisDate, now, todayStr]);

  // Chart data: room type comparison by revenue (line with markers)
  const roomTypeChartData = useMemo(() => {
    const byRoom = resAnalysis.byRoomType;
    const roomTypes = [...ROOM_TYPES, ...Object.keys(byRoom).filter((rt) => !ROOM_TYPES.includes(rt))];
    const labels = roomTypes.filter((rt) => byRoom[rt] && byRoom[rt].nights > 0);
    const revenueData = labels.map((rt) => (byRoom[rt]?.revenue ?? 0));
    const colors = [theme.primary, theme.success, theme.secondary, theme.warning, theme.ocean];
    return {
      labels,
      datasets: [
        {
          label: "Revenue ($)",
          data: revenueData,
          backgroundColor: labels.map((_, i) => colors[i % colors.length] + "33"),
          borderColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: labels.map((_, i) => colors[i % colors.length]),
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [resAnalysis.byRoomType]);

  const roomTypeChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y;
              const num = Number(value);
              if (!Number.isFinite(num)) return "";
              return `Revenue: $${num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#475569", font: { size: 11 } },
        },
      },
    }),
    []
  );

  // Channel-level summary (aggregated from room type × channel matrix)
  const channelSummary = useMemo(() => {
    const out = {};
    BOOKING_CHANNELS.forEach((ch) => {
      out[ch] = { revenue: 0, nights: 0, adr: 0 };
    });
    Object.keys(byRoomTypeByChannel).forEach((rt) => {
      const row = byRoomTypeByChannel[rt] || {};
      Object.keys(row).forEach((ch) => {
        const cell = row[ch];
        if (!cell) return;
        if (!out[ch]) out[ch] = { revenue: 0, nights: 0, adr: 0 };
        out[ch].revenue += cell.revenue || 0;
        out[ch].nights += cell.nights || 0;
      });
    });
    Object.keys(out).forEach((ch) => {
      const row = out[ch];
      if (!row) return;
      row.adr = row.nights > 0 ? row.revenue / row.nights : 0;
    });
    return out;
  }, [byRoomTypeByChannel]);

  // Channel productivity chart (revenue by channel)
  const channelChartData = useMemo(() => {
    const labels = BOOKING_CHANNELS;
    const colors = [theme.primary, theme.success, theme.secondary, theme.warning, theme.ocean];
    const revenueData = labels.map((ch) => (channelSummary[ch]?.revenue ?? 0));
    return {
      labels,
      datasets: [
        {
          label: "Revenue ($)",
          data: revenueData,
          backgroundColor: labels.map((_, i) => colors[i % colors.length] + "33"),
          borderColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: labels.map((_, i) => colors[i % colors.length]),
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [channelSummary]);

  const channelChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y ?? ctx.parsed.x;
              const num = Number(value);
              if (!Number.isFinite(num)) return "";
              return `Revenue: $${num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#475569", font: { size: 11 } },
        },
      },
    }),
    []
  );

  const styles = {
    container: {
      padding: "0",
      minHeight: "100%",
      fontFamily: "DM Sans, sans-serif",
      boxSizing: "border-box",
    },
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
      marginBottom: "24px",
      border: "1px solid rgba(20, 184, 166, 0.2)",
      minHeight: "96px",
    },
    logoImage: {
      width: "72px",
      height: "72px",
      objectFit: "cover",
      borderRadius: "50%",
      border: "3px solid rgba(20, 184, 166, 0.35)",
      boxShadow: "0 6px 16px rgba(13, 148, 136, 0.15)",
    },
    card: {
      background: theme.card,
      borderRadius: "20px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
      overflow: "hidden",
      border: `1px solid ${theme.border}`,
    },
    cardHeader: {
      padding: "18px 24px",
      color: "white",
      fontWeight: "bold",
      fontSize: "15px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    kpiCard: (color) => ({
      background: theme.card,
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      border: `1px solid ${theme.border}`,
      borderLeft: `4px solid ${color}`,
    }),
    label: { display: "block", fontSize: "11px", color: theme.textSub, fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase" },
    filterInput: {
      padding: "8px 12px",
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      fontSize: "13px",
      color: theme.textMain,
      outline: "none",
      background: theme.card,
      cursor: "pointer",
    },
    pillContainer: {
      background: theme.card,
      padding: "4px",
      borderRadius: "50px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      display: "flex",
      gap: "4px",
      border: `1px solid ${theme.border}`,
    },
    pillButton: (active) => ({
      padding: "8px 16px",
      borderRadius: "50px",
      border: "none",
      fontWeight: "600",
      fontSize: "12px",
      cursor: "pointer",
      textTransform: "uppercase",
      transition: "0.2s",
      background: active ? theme.primary : "transparent",
      color: active ? "#ffffff" : theme.textSub,
    }),
    tableHead: {
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      borderBottom: `2px solid ${theme.border}`,
    },
    sectionTitle: { fontSize: "14px", fontWeight: "700", color: theme.textMain, marginBottom: "12px" },
  };

  const fmt = (n) => {
    if (n == null || Number.isNaN(n)) return "—";
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Stay" style={styles.logoImage} onError={(e) => (e.target.style.display = "none")} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 className="app-page-title">Ocean Stay</h1>
            <span className="app-page-subtitle" style={{ marginTop: "5px" }}>Maldives</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="app-page-address" style={{ fontSize: "24px", fontWeight: "bold", color: theme.textMain, textShadow: "0 2px 4px rgba(0,0,0,0.08)", lineHeight: "1" }}>
            Rate Analysis
          </span>
          <FaChartLine style={{ fontSize: "22px", color: theme.primary, opacity: 0.95 }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: theme.primary, textTransform: "uppercase" }}>Reservations</span>
          <span style={{ fontSize: "28px", fontWeight: "900", color: theme.textMain }}>{safeReservations.length}</span>
        </div>
      </div>

      <div style={{ ...styles.card, marginBottom: "24px" }}>
        <div style={{ ...styles.cardHeader, background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
          <FaChartLine /> Rate analysis from reservations
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: theme.textSub }}>
            Room revenue = room only (excl. F&B). Only checked-in / checked-out reservations are counted (same as Reports).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "16px" }}>
              <span style={{ ...styles.label, marginBottom: "4px", marginRight: "4px" }}>Period</span>
              <div style={styles.pillContainer}>
                {(["today", "mtd", "ytd", "custom"]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPeriodPreset(preset);
                      if (preset === "today") setAnalysisDate(todayStr);
                    }}
                    style={styles.pillButton(periodPreset === preset)}
                  >
                    {preset === "mtd" ? "MTD" : preset === "ytd" ? "YTD" : preset === "today" ? "Today" : "Custom"}
                  </button>
                ))}
              </div>
            </div>
            {periodPreset === "custom" && (
              <>
                <div>
                  <span style={{ ...styles.label, marginBottom: "4px" }}>Year</span>
                  <select style={styles.filterInput} value={analysisYear} onChange={(e) => setAnalysisYear(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ ...styles.label, marginBottom: "4px" }}>Month</span>
                  <select style={styles.filterInput} value={analysisMonth} onChange={(e) => setAnalysisMonth(e.target.value)}>
                    <option value="All">All months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString("en", { month: "long" })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ ...styles.label, marginBottom: "4px" }}>Date (optional)</span>
                  <input
                    type="date"
                    style={{ ...styles.filterInput, minWidth: "160px" }}
                    value={analysisDate}
                    onChange={(e) => setAnalysisDate(e.target.value.slice(0, 10))}
                  />
                </div>
              </>
            )}
            <div style={{ marginLeft: periodPreset === "custom" ? "0" : "auto", alignSelf: "flex-end", fontSize: "12px", color: theme.textSub, fontWeight: "600" }}>
              Period: {resAnalysis.periodFromStr}
              {resAnalysis.periodFromStr !== resAnalysis.periodToStr ? ` → ${resAnalysis.periodToStr}` : ""}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <div style={styles.kpiCard(theme.primary)}>
              <span style={styles.label}>Room revenue (period)</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: theme.textMain }}>{fmt(resAnalysis.revenue)}</div>
            </div>
            <div style={styles.kpiCard(theme.secondary)}>
              <span style={styles.label}>Reservations</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: theme.textMain }}>{resAnalysis.reservationsCount}</div>
            </div>
            <div style={styles.kpiCard(theme.success)}>
              <span style={styles.label}>Nights (period)</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: theme.textMain }}>{resAnalysis.nightsInPeriod}</div>
            </div>
            <div style={styles.kpiCard(theme.warning)}>
              <span style={styles.label}>ADR</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: theme.textMain }}>{fmt(resAnalysis.adr)}</div>
            </div>
          </div>

          <div>
            <h4 style={{ ...styles.sectionTitle, margin: "0 0 12px 0" }}>By room type & by channel (from reservations in period)</h4>
            {/* Row 1: two tables side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(240px, 1fr))", gap: "24px", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "12px", color: theme.textSub, fontWeight: "600", marginBottom: "8px" }}>By room type</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={styles.tableHead}>
                      <th style={{ textAlign: "left", padding: "12px 10px", color: theme.textSub, fontWeight: "600" }}>Room type</th>
                      <th style={{ textAlign: "right", padding: "12px 10px", color: theme.textSub, fontWeight: "600" }}>Revenue</th>
                      <th style={{ textAlign: "right", padding: "12px 10px", color: theme.textSub, fontWeight: "600" }}>Nights</th>
                      <th style={{ textAlign: "right", padding: "12px 10px", color: theme.textSub, fontWeight: "600" }}>ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROOM_TYPES.map((rt) => {
                      const row = resAnalysis.byRoomType[rt];
                      if (!row || row.nights === 0) return <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: "10px 8px", color: theme.textSub }}>{rt}</td><td colSpan={3} style={{ padding: "10px 8px", color: theme.textSub, textAlign: "right" }}>—</td></tr>;
                      return (
                        <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: "10px 8px", fontWeight: "600", color: theme.textMain }}>{rt}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", color: theme.success, fontWeight: "600" }}>{fmt(row.revenue)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", color: theme.textMain }}>{row.nights}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "600", color: theme.primary }}>{fmt(row.adr)}</td>
                        </tr>
                      );
                    })}
                    {Object.keys(resAnalysis.byRoomType).filter((rt) => !ROOM_TYPES.includes(rt)).map((rt) => {
                      const row = resAnalysis.byRoomType[rt];
                      return (
                        <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: "10px 8px", fontWeight: "600", color: theme.textMain }}>{rt}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", color: theme.success, fontWeight: "600" }}>{fmt(row.revenue)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", color: theme.textMain }}>{row.nights}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "600", color: theme.primary }}>{fmt(row.adr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: theme.textSub, fontWeight: "600", marginBottom: "8px" }}>By channel</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={styles.tableHead}>
                      <th style={{ textAlign: "left", padding: "10px 10px", color: theme.textSub, fontWeight: "600" }}>Channel</th>
                      <th style={{ textAlign: "right", padding: "10px 10px", color: theme.textSub, fontWeight: "600" }}>Revenue</th>
                      <th style={{ textAlign: "right", padding: "10px 10px", color: theme.textSub, fontWeight: "600" }}>Nights</th>
                      <th style={{ textAlign: "right", padding: "10px 10px", color: theme.textSub, fontWeight: "600" }}>ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BOOKING_CHANNELS.map((ch) => {
                      const row = channelSummary[ch] || { revenue: 0, nights: 0, adr: 0 };
                      const hasData = row.nights > 0 || row.revenue > 0;
                      return (
                        <tr key={ch} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: "8px 8px", fontWeight: "600", color: theme.textMain }}>{ch}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: theme.success, fontWeight: "600" }}>
                            {hasData ? fmt(row.revenue) : "—"}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: theme.textMain }}>
                            {hasData ? row.nights : "—"}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: "600", color: theme.primary }}>
                            {hasData ? fmt(row.adr) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Row 2: two graphs side by side under the tables */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(240px, 1fr))", gap: "24px", marginTop: "24px", alignItems: "stretch" }}>
              <div style={{ background: theme.bg, borderRadius: "12px", padding: "16px", border: `1px solid ${theme.border}`, minHeight: "260px" }}>
                <div style={{ fontSize: "12px", color: theme.textSub, fontWeight: "600", marginBottom: "8px" }}>Room type comparison</div>
                {roomTypeChartData.labels.length > 0 ? (
                  <div style={{ height: "240px" }}>
                    <Line data={roomTypeChartData} options={roomTypeChartOptions} />
                  </div>
                ) : (
                  <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSub, fontSize: "13px" }}>
                    No room data in period
                  </div>
                )}
              </div>
              <div style={{ background: theme.bg, borderRadius: "12px", padding: "16px", border: `1px solid ${theme.border}`, minHeight: "260px" }}>
                <div style={{ fontSize: "12px", color: theme.textSub, fontWeight: "600", marginBottom: "8px" }}>Channel productivity</div>
                {BOOKING_CHANNELS.some((ch) => (channelSummary[ch]?.revenue ?? 0) > 0) ? (
                  <div style={{ height: "240px" }}>
                    <Line data={channelChartData} options={channelChartOptions} />
                  </div>
                ) : (
                  <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSub, fontSize: "13px" }}>
                    No channel data in period
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room type × Channel: RN, ADR, Total revenue (ocean theme) */}
      <div style={{ ...styles.card, marginBottom: "24px" }}>
        <div style={{ ...styles.cardHeader, background: `linear-gradient(135deg, ${theme.ocean} 0%, ${theme.oceanDark} 100%)` }}>
          <FaChartLine /> Room type × Channel — RN, ADR, Total revenue
        </div>
        <div style={{ padding: "20px 24px", overflowX: "auto" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: theme.textSub }}>
            Room nights (RN), average daily rate (ADR), and total room revenue per room type and booking channel for the selected period.
          </p>
          <table style={{ width: "100%", minWidth: "700px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: theme.textSub, fontWeight: "600", position: "sticky", left: 0, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>Room type</th>
                {BOOKING_CHANNELS.map((ch) => (
                  <th key={ch} colSpan={3} style={{ padding: "10px 12px", color: theme.oceanDark, fontWeight: "600", textAlign: "center", borderLeft: `1px solid ${theme.border}` }}>
                    {ch}
                  </th>
                ))}
              </tr>
              <tr style={styles.tableHead}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: theme.textSub, fontWeight: "600", fontSize: "11px", position: "sticky", left: 0, background: theme.bg }}></th>
                {BOOKING_CHANNELS.map((ch) => (
                  <React.Fragment key={ch}>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right", borderLeft: `1px solid ${theme.border}` }}>RN</th>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right" }}>ADR</th>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right" }}>Revenue</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROOM_TYPES.map((rt) => (
                <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: "600", color: theme.textMain, position: "sticky", left: 0, background: theme.card }}>{rt}</td>
                  {BOOKING_CHANNELS.map((ch) => {
                    const cell = byRoomTypeByChannel[rt]?.[ch];
                    const nights = cell?.nights ?? 0;
                    const adr = cell?.adr ?? 0;
                    const revenue = cell?.revenue ?? 0;
                    return (
                      <React.Fragment key={ch}>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.textMain, borderLeft: `1px solid ${theme.border}` }}>{nights}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "600", color: theme.primary }}>{nights > 0 ? fmt(adr) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.success, fontWeight: "600" }}>{nights > 0 ? fmt(revenue) : "—"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {Object.keys(byRoomTypeByChannel).filter((rt) => !ROOM_TYPES.includes(rt)).map((rt) => (
                <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: "600", color: theme.textMain, position: "sticky", left: 0, background: theme.card }}>{rt}</td>
                  {BOOKING_CHANNELS.map((ch) => {
                    const cell = byRoomTypeByChannel[rt]?.[ch];
                    const nights = cell?.nights ?? 0;
                    const adr = cell?.adr ?? 0;
                    const revenue = cell?.revenue ?? 0;
                    return (
                      <React.Fragment key={ch}>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.textMain, borderLeft: `1px solid ${theme.border}` }}>{nights}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "600", color: theme.primary }}>{nights > 0 ? fmt(adr) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.success, fontWeight: "600" }}>{nights > 0 ? fmt(revenue) : "—"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room type × Channel: RN, Min / Avg / Max rate (secondary theme) */}
      <div style={{ ...styles.card, marginBottom: "24px" }}>
        <div style={{ ...styles.cardHeader, background: "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)" }}>
          <FaChartLine /> Room type × Channel — RN, Min / Avg / Max rate by channel
        </div>
        <div style={{ padding: "20px 24px", overflowX: "auto" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: theme.textSub }}>
            For the selected period, each room type shows room nights (RN) and minimum, average, and maximum rate per booking channel.
          </p>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: theme.textSub, fontWeight: "600", position: "sticky", left: 0, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>Room type</th>
                {BOOKING_CHANNELS.map((ch) => (
                  <th key={ch} colSpan={4} style={{ padding: "10px 12px", color: "#0f766e", fontWeight: "600", textAlign: "center", borderLeft: `1px solid ${theme.border}` }}>
                    {ch}
                  </th>
                ))}
              </tr>
              <tr style={styles.tableHead}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: theme.textSub, fontWeight: "600", fontSize: "11px", position: "sticky", left: 0, background: theme.bg }}></th>
                {BOOKING_CHANNELS.map((ch) => (
                  <React.Fragment key={ch}>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right", borderLeft: `1px solid ${theme.border}` }}>RN</th>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right" }}>Min</th>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right" }}>Avg</th>
                    <th style={{ padding: "8px 6px", color: theme.textSub, fontWeight: "600", fontSize: "11px", textAlign: "right" }}>Max</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROOM_TYPES.map((rt) => (
                <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: "600", color: theme.textMain, position: "sticky", left: 0, background: theme.card }}>{rt}</td>
                  {BOOKING_CHANNELS.map((ch) => {
                    const cell = byRoomTypeByChannel[rt]?.[ch];
                    const nights = cell?.nights ?? 0;
                    const min = cell?.min ?? 0;
                    const adr = cell?.adr ?? 0;
                    const max = cell?.max ?? 0;
                    return (
                      <React.Fragment key={ch}>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.textMain, borderLeft: `1px solid ${theme.border}` }}>{nights}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.success, fontSize: "12px" }}>{nights > 0 ? fmt(min) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "600", color: theme.secondary }}>{nights > 0 ? fmt(adr) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.danger, fontSize: "12px" }}>{nights > 0 ? fmt(max) : "—"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {Object.keys(byRoomTypeByChannel).filter((rt) => !ROOM_TYPES.includes(rt)).map((rt) => (
                <tr key={rt} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: "600", color: theme.textMain, position: "sticky", left: 0, background: theme.card }}>{rt}</td>
                  {BOOKING_CHANNELS.map((ch) => {
                    const cell = byRoomTypeByChannel[rt]?.[ch];
                    const nights = cell?.nights ?? 0;
                    const min = cell?.min ?? 0;
                    const adr = cell?.adr ?? 0;
                    const max = cell?.max ?? 0;
                    return (
                      <React.Fragment key={ch}>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.textMain, borderLeft: `1px solid ${theme.border}` }}>{nights}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.success, fontSize: "12px" }}>{nights > 0 ? fmt(min) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "600", color: theme.secondary }}>{nights > 0 ? fmt(adr) : "—"}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", color: theme.danger, fontSize: "12px" }}>{nights > 0 ? fmt(max) : "—"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
