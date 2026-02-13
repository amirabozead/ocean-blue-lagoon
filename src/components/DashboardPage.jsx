import React, { useMemo, useState } from "react";
// استيراد المكتبات (تأكد من وجودها في مشروعك)
import 'flag-icons/css/flag-icons.min.css';
import {
  FaChartLine, FaMoneyBillWave, FaBed, FaPercent, FaCalendarAlt, 
  FaReceipt, FaTools, FaLightbulb, FaAdn, FaWallet, FaSuitcaseRolling, 
  FaUtensils, FaTshirt, FaSpa, FaUmbrellaBeach, FaConciergeBell,
  FaDoorOpen, FaWalking, FaPlaneDeparture, FaCheckCircle, FaRobot, FaGlobe
} from "react-icons/fa";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
  RadialLinearScale 
} from "chart.js";
import { Line, PolarArea, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Tooltip, Legend, Filler, RadialLinearScale
);

const HOTEL_LOGO = "/logo.png"; 

// --- الثوابت والألوان (كما في الملف الأصلي) ---
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
  border: "#e2e8f0"
};

const iconMap = {
  "Room Revenue": <FaBed />,
  "F&B Revenue": <FaUtensils />,
  "Spa Revenue": <FaSpa />,
  "Activities": <FaUmbrellaBeach />,
  "Laundry": <FaTshirt />,
  "Services": <FaConciergeBell />,
  "Salary": <FaWallet />,
  "Maintenance": <FaTools />,
  "Utilities": <FaLightbulb />,
  "Marketing": <FaAdn />,
  "F&B Cost": <FaUtensils />,
  "General": <FaSuitcaseRolling />
};

const getCountryCode = (countryName) => {
  const map = {
    "Italy": "it", "China": "cn", "Russia": "ru", "Germany": "de", "USA": "us", 
    "France": "fr", "Egypt": "eg", "Maldives": "mv",
    "United Kingdom": "gb", "Saudi Arabia": "sa", "UAE": "ae"
  };
  return map[countryName] || "un"; 
};

// --- المكون الرئيسي ---
export default function DashboardPage({ reservations = [], rooms = [], expenses = [], extraRevenues = [] }) {
  // Ensure we always work with arrays (App may pass objects/maps during cloud sync)
  const reservationsArr = (() => {
    const v = reservations;
    if (Array.isArray(v)) return v;
    if (!v) return [];
    if (v instanceof Map) return Array.from(v.values());
    if (typeof v === "object") return Object.values(v);
    return [];
  })();
  const roomsArr = (() => {
    const v = rooms;
    if (Array.isArray(v)) return v;
    if (!v) return [];
    if (v instanceof Map) return Array.from(v.values());
    if (typeof v === "object") return Object.values(v);
    return [];
  })();
  const expensesArr = (() => {
    const v = expenses;
    if (Array.isArray(v)) return v;
    if (!v) return [];
    if (v instanceof Map) return Array.from(v.values());
    if (typeof v === "object") return Object.values(v);
    return [];
  })();
  const extraRevenuesArr = (() => {
    const v = extraRevenues;
    if (Array.isArray(v)) return v;
    if (!v) return [];
    if (v instanceof Map) return Array.from(v.values());
    if (typeof v === "object") return Object.values(v);
    return [];
  })();

  const [period, setPeriod] = useState("TODAY"); // Default
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const kpi = useMemo(() => {
    let startDate = new Date();
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (period === "CUSTOM") {
        startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
    } 
    else if (period === "MONTH") {
        const [y, m] = selectedMonth.split('-');
        startDate = new Date(y, m - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(y, m, 0);
        endDate.setHours(23, 59, 59, 999);
    }
    else if (period === "MTD") {
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
    } 
    else if (period === "YTD") {
        startDate = new Date(new Date().getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
    } 
    else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const filterByDate = (d) => { const date = new Date(d); return date >= startDate && date <= endDate; };
    const todayStr = new Date().toISOString().split('T')[0];

    const arrivals = reservationsArr.filter(r => r.stay?.checkIn === todayStr && r.status !== "Cancelled").length;
    const departures = reservationsArr.filter(r => r.stay?.checkOut === todayStr && r.status !== "Cancelled").length;
    const inHouseCount = reservationsArr.filter(r => r.status === "In House").length;
    const maintenanceRooms = roomsArr.filter(room => room.status === "Maintenance" || room.status === "Out of Order" || room.status === "OutOfOrder").length;
    const availableRooms = Math.max(0, roomsArr.length - inHouseCount - maintenanceRooms);

    const currentRes = reservationsArr.filter(r => r.status !== "Cancelled" && filterByDate(r.stay?.checkIn));
    const totalTax = currentRes.reduce((sum, r) => sum + Number(r.pricing?.tax || 0), 0);
    const totalServiceCharge = currentRes.reduce((sum, r) => sum + Number(r.pricing?.serviceCharge || 0), 0);
    const totalCityTax = currentRes.reduce((sum, r) => sum + Number(r.pricing?.cityTax || 0), 0);

    const calcNights = (ci, co) => {
      const a = new Date(String(ci || "").slice(0, 10) + "T12:00:00").getTime();
      const b = new Date(String(co || "").slice(0, 10) + "T12:00:00").getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
      return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
    };

    const roomRev = currentRes.reduce((sum, r) => {
      const p = r?.pricing || {};
      const v1 = Number(p.roomRevenue);
      if (Number.isFinite(v1)) return sum + v1;
      const v2 = Number(p.roomSubtotal);
      if (Number.isFinite(v2)) return sum + v2;
      const nightly = Array.isArray(p.nightly) ? p.nightly : [];
      if (nightly.length) {
        const nSum = nightly.reduce((a, x) => a + Number(x?.baseRate ?? x?.rate ?? 0), 0);
        return sum + (Number.isFinite(nSum) ? nSum : 0);
      }
      return sum + Number(p.total || 0);
    }, 0);

    const roomNightsSold = currentRes.reduce((sum, r) => sum + calcNights(r?.stay?.checkIn, r?.stay?.checkOut), 0);
    const totalExp = expensesArr.filter(e => filterByDate(e.date)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const getExtra = (cat) => extraRevenuesArr.filter(x => x.type === cat && filterByDate(x.date || x.createdAt)).reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const revData = { "Room Revenue": roomRev, "F&B Revenue": getExtra("F&B"), "Spa Revenue": getExtra("Spa"), "Activities": getExtra("Activities"), "Laundry": getExtra("Laundry"), "Services": getExtra("Services") };
    const totalRev = Object.values(revData).reduce((a, b) => a + b, 0);
    
    const getExpVal = (cat) => expensesArr.filter(e => e.category === cat && filterByDate(e.date)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expData = { "Salary": getExpVal("Salary"), "Maintenance": getExpVal("Maintenance"), "Utilities": getExpVal("Utilities"), "Marketing": getExpVal("Marketing"), "F&B Cost": getExpVal("F&B"), "General": getExpVal("General") };

    const totalRooms = Math.max(1, roomsArr.length);
    const occ = (roomNightsSold / (totalRooms * totalDays)) * 100;
    const adr = roomNightsSold > 0 ? roomRev / roomNightsSold : 0;
    const revpar = roomRev / (totalRooms * totalDays);

    return { 
        revData, expData, totalRev, totalExp, gop: totalRev - totalExp, 
        totalTax, totalServiceCharge, totalCityTax,
        arrivals, departures, availableRooms, maintenanceRooms, inHouseCount,
        occ, adr, revpar, roomNightsSold
    };
  }, [reservations, rooms, expenses, extraRevenuesArr, period, customStart, customEnd, selectedMonth]);

  // --- Styles for Header ---
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
        marginBottom: "25px",
        border: "1px solid #bae6fd",
        minHeight: "100px" // لضمان ارتفاع مناسب
    },
    logoImage: {
        width: "80px",
        height: "80px",
        objectFit: "cover",
        borderRadius: "50%",
        border: "3px solid #e0f2fe", 
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
    },
    // تصميم الكبسولة للأزرار
    pillContainer: {
        background: "#fff",
        padding: "4px",
        borderRadius: "50px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        display: "flex",
        gap: "4px",
        border: "1px solid #e2e8f0"
    },
    pillButton: (active) => ({
        padding: "8px 16px",
        borderRadius: "50px",
        border: "none",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "12px",
        transition: "0.2s",
        background: active ? "#0ea5e9" : "transparent",
        color: active ? "#ffffff" : "#64748b"
    }),
    // حاوية الجزء الأيمن (الأزرار + التاريخ تحتها)
    rightSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end", // محاذاة لليمين
        gap: "10px", // مسافة بين الأزرار والتاريخ
        zIndex: 2 // لضمان ظهورها فوق أي شيء
    },
    dateRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(255,255,255,0.8)",
        padding: "5px 10px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0"
    },
    dateInput: {
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "4px 8px",
        fontSize: "12px",
        outline: "none",
        color: "#334155"
    }
  };

  return (
    <div style={{ padding: "30px", background: "#f8fafc", minHeight: "100vh" }}>
      
      {/* HEADER (نفس هيكلية الملف الأصلي مع تعديل الترتيب العمودي لليمين) */}
      <div style={headerStyles.headerCard}>
        
        {/* Left: Logo & Hotel Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Blue Lagoon" style={headerStyles.logoImage} onError={(e) => e.target.style.display='none'} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "36px", fontFamily: "'Brush Script MT', cursive", letterSpacing: "1px", fontWeight: "normal", lineHeight: "1" }}>Ocean Blue Lagoon</h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>Maldives Resort</span>
          </div>
        </div>

        {/* Center: Intelligence Center (Absolute) */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", fontFamily: "'Playfair Display', serif", fontStyle: "italic", lineHeight: "1" }}>Intelligence Center</span>
           <FaChartLine style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        {/* Right: Controls (Buttons ABOVE, Inputs BELOW) */}
        <div style={headerStyles.rightSection}>
            
            {/* 1. Toggle Buttons (Pill Shape) */}
            <div style={headerStyles.pillContainer}>
                {["TODAY", "MTD", "YTD", "MONTH", "CUSTOM"].map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPeriod(p)} 
                    style={headerStyles.pillButton(period === p)}
                  >
                    {p}
                  </button>
                ))}
            </div>

            {/* 2. Date Inputs (Stacked Below) */}
            {(period === "CUSTOM" || period === "MONTH") && (
                <div style={headerStyles.dateRow}>
                    {period === "CUSTOM" && (
                        <>
                             <span style={{fontSize:"11px", fontWeight:"bold", color:"#94a3b8"}}>From</span>
                             <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={headerStyles.dateInput} />
                             <span style={{fontSize:"11px", fontWeight:"bold", color:"#94a3b8"}}>To</span>
                             <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={headerStyles.dateInput} />
                        </>
                    )}
                    {period === "MONTH" && (
                        <>
                             <span style={{fontSize:"11px", fontWeight:"bold", color:"#94a3b8"}}>Month</span>
                             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={headerStyles.dateInput} />
                        </>
                    )}
                </div>
            )}
        </div>

      </div>
      {/* --- End Header --- */}

      {/* KPI Row (7 Cards) */}
      <div style={kpiRowStyle}>
        <StatCard icon={<FaMoneyBillWave />} label="Revenue" value={`$${kpi.totalRev.toLocaleString()}`} color={theme.primary} />
        <StatCard icon={<FaReceipt />} label="Expenses" value={`$${kpi.totalExp.toLocaleString()}`} color={theme.danger} />
        <StatCard icon={<FaChartLine />} label="GOP Profit" value={`$${kpi.gop.toLocaleString()}`} color={theme.success} />
        <StatCard icon={<FaMoneyBillWave />} label="ADR" value={`$${kpi.adr.toFixed(0)}`} color={theme.warning} />
        <StatCard icon={<FaDoorOpen />} label="Rooms Sold" value={kpi.roomNightsSold} color={theme.secondary} />
        <StatCard icon={<FaPercent />} label="Occupancy" value={`${kpi.occ.toFixed(1)}%`} color={theme.success} />
        <StatCard icon={<FaSuitcaseRolling />} label="RevPAR" value={`$${kpi.revpar.toFixed(0)}`} color="#a855f7" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
        
        {/* Trend Chart */}
        <div style={{ gridColumn: "span 6", ...cardStyle, padding: "24px" }}>
          <h3 style={sectionTitle}>Financial Performance Trend</h3>
          <div style={{ height: "320px" }}>
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>
        
        {/* Daily Operations */}
        <div style={{ gridColumn: "span 3", ...cardStyle, padding: "24px" }}>
          <h3 style={sectionTitle}>Daily Operations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <OpItem icon={<FaWalking />} label="Arrivals" value={kpi.arrivals} color={theme.primary} />
            <OpItem icon={<FaPlaneDeparture />} label="Departures" value={kpi.departures} color={theme.warning} />
            <OpItem icon={<FaDoorOpen />} label="Available" value={kpi.availableRooms} color={theme.success} />
            <OpItem icon={<FaTools />} label="Repair" value={kpi.maintenanceRooms} color={theme.danger} />
            <OpItem icon={<FaCheckCircle />} label="In-House" value={kpi.inHouseCount} color={theme.secondary} />
          </div>
        </div>

        {/* AI Intelligence (Taxes Only - English) */}
        <div style={{ gridColumn: "span 3", ...cardStyle, padding: "24px", background: `linear-gradient(135deg, #fff 0%, ${theme.bg} 100%)` }}>
          <h3 style={sectionTitle}><FaRobot color={theme.primary} /> Intelligence Data</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
             <OpItem icon={<FaReceipt />} label="Total Tax" value={`$${kpi.totalTax.toLocaleString()}`} color={theme.warning} />
             <OpItem icon={<FaConciergeBell />} label="Service Charge" value={`$${kpi.totalServiceCharge.toLocaleString()}`} color={theme.success} />
             <OpItem icon={<FaGlobe />} label="City Tax" value={`$${kpi.totalCityTax.toLocaleString()}`} color={theme.primary} />
          </div>
        </div>

        {/* Global Market Reach */}
        <div style={{ gridColumn: "span 6", ...cardStyle, padding: "24px" }}>
          <h3 style={sectionTitle}><FaGlobe color={theme.secondary} /> Global Market Reach</h3>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <div style={{ flex: "1.2", height: "260px" }}>
                <PolarArea data={marketPolarData} options={polarOptions} />
            </div>
            <div style={{ flex: "1" }}>
                <DataGrid data={{"Italy": 45, "China": 30, "Russia": 25, "Germany": 20, "USA": 10}} />
            </div>
          </div>
        </div>

        {/* Financial Mixes */}
        <div style={{ gridColumn: "span 3", ...cardStyle, padding: "24px" }}>
          <h3 style={sectionTitle}>Revenue Mix</h3>
          <div style={{ height: "140px", position: "relative" }}>
            <Doughnut data={getDoughnutData(kpi.revData, ["#0ea5e9", "#10b981", "#a855f7", "#f43f5e", "#f97316", "#64748b"])} options={doughnutOptions} />
          </div>
          <div style={{ marginTop: "20px" }}>
             <IconDataGrid data={kpi.revData} colors={["#0ea5e9", "#10b981", "#a855f7", "#f43f5e", "#f97316", "#64748b"]} />
          </div>
        </div>

        <div style={{ gridColumn: "span 3", ...cardStyle, padding: "24px", borderTop: `4px solid ${theme.danger}` }}>
          <h3 style={sectionTitle}>Expense Mix</h3>
          <div style={{ height: "140px", position: "relative" }}>
            <Doughnut data={getDoughnutData(kpi.expData, ["#6366f1", "#f59e0b", "#eab308", "#0ea5e9", "#10b981", "#94a3b8"])} options={doughnutOptions} />
          </div>
          <div style={{ marginTop: "20px" }}>
             <IconDataGrid data={kpi.expData} colors={["#6366f1", "#f59e0b", "#eab308", "#0ea5e9", "#10b981", "#94a3b8"]} />
          </div>
        </div>

      </div>
    </div>
  );
}

// --- المكونات المساعدة ---

function DataGrid({ data }) {
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <tbody>
                {Object.entries(data).map(([country, val]) => (
                    <tr key={country} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 0", color: theme.textMain, fontWeight: "700", whiteSpace: "nowrap" }}>
                            <span className={`fi fi-${getCountryCode(country)}`} style={{ marginRight: "10px", borderRadius: "2px", fontSize: "14px" }}></span>
                            {country}
                        </td>
                        <td style={{ padding: "8px 0", textAlign: "right", fontWeight: "900", color: theme.primary }}>{val}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function IconDataGrid({ data, colors }) {
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
                {Object.entries(data).map(([key, val], i) => (
                    <tr key={key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "6px 0", color: theme.textMain, fontWeight: "700" }}>
                            <span style={{ color: colors[i], marginRight: "8px" }}>{iconMap[key]}</span>
                            {key.split(' ')[0]}
                        </td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "900" }}>${val.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function OpItem({ icon, label, value, color }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "14px", border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: "700", color: theme.textMain }}>
                <span style={{ color: color, fontSize: "16px" }}>{icon}</span> {label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: "900", color: theme.textMain }}>{value}</div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
      <div style={{ background: "#fff", borderRadius: "16px", border: `1px solid ${theme.border}`, padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: `${color}15`, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "10px" }}>{icon}</div>
        <div style={{ fontSize: "11px", color: theme.textSub, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ fontSize: "20px", fontWeight: "900", color: theme.textMain, marginTop: "4px" }}>{value}</div>
      </div>
    );
}

// --- Charts & Helpers ---
const kpiRowStyle = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "16px", marginBottom: "30px" };
const cardStyle = { background: "#fff", borderRadius: "20px", border: `1px solid ${theme.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" };
const sectionTitle = { fontSize: "16px", fontWeight: "900", color: theme.textMain, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" };
const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const doughnutOptions = { cutout: "75%", plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false };
const trendChartData = { labels: ["W1", "W2", "W3", "W4"], datasets: [{ label: 'Rev', data: [4000, 5500, 4800, 7000], borderColor: theme.primary, borderWidth: 3, fill: true, backgroundColor: "rgba(14, 165, 233, 0.08)", tension: 0.4 }] };
const marketPolarData = { labels: ["Italy", "China", "Russia", "Germany", "USA"], datasets: [{ data: [45, 30, 25, 20, 10], backgroundColor: ["rgba(14, 165, 233, 0.8)", "rgba(99, 102, 241, 0.8)", "rgba(16, 185, 129, 0.8)", "rgba(245, 158, 11, 0.8)", "rgba(244, 63, 94, 0.8)"], borderWidth: 2, borderColor: "#ffffff" }] };
const polarOptions = { responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: "#f1f5f9" } } }, plugins: { legend: { display: false } } };
const getDoughnutData = (data, colors) => ({ labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: colors, borderWidth: 0 }] });