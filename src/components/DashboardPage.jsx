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
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from "chart.js";
import { Line, Doughnut, Bar, Pie } from "react-chartjs-2";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { storeLoad } from "../utils/helpers";
import { getOOSRoomsCountOnDate } from "../utils/oosHelpers";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Tooltip, Legend, Filler
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

// Country coordinates for world map markers
const countryCoordinates = {
  "Italy": [12.5674, 41.8719],
  "China": [104.1954, 35.8617],
  "Russia": [105.3188, 61.5240],
  "Germany": [10.4515, 51.1657],
  "USA": [-95.7129, 37.0902]
};

// Market segments with colors
const marketSegments = {
  "Italy": { value: 45, color: "#3b82f6", name: "Italy" }, // Blue
  "China": { value: 30, color: "#ef4444", name: "China" }, // Red
  "Russia": { value: 25, color: "#10b981", name: "Russia" }, // Green
  "Germany": { value: 20, color: "#f59e0b", name: "Germany" }, // Orange/Yellow
  "USA": { value: 10, color: "#a855f7", name: "USA" } // Purple
};

// Country to segment mapping (ISO 3166-1 alpha-3 codes)
const countryToSegment = {
  // Italy segment (Blue)
  "ITA": "Italy", "FRA": "Italy", "ESP": "Italy", "PRT": "Italy", "GRC": "Italy",
  "ALB": "Italy", "MKD": "Italy", "MNE": "Italy", "BIH": "Italy", "HRV": "Italy",
  "SVN": "Italy", "AUT": "Italy", "CHE": "Italy",
  
  // China segment (Red)
  "CHN": "China", "IND": "China", "JPN": "China", "KOR": "China", "IDN": "China",
  "PHL": "China", "THA": "China", "VNM": "China", "MYS": "China", "SGP": "China",
  "USA": "USA", "CAN": "USA", "MEX": "USA", "GBR": "USA", "AUS": "USA", "NZL": "USA",
  "ZAF": "USA",
  
  // Russia segment (Green)
  "RUS": "Russia", "UKR": "Russia", "BLR": "Russia", "KAZ": "Russia", "UZB": "Russia",
  "KGZ": "Russia", "TJK": "Russia", "TKM": "Russia", "MDA": "Russia", "GEO": "Russia",
  "ARM": "Russia", "AZE": "Russia", "MNG": "Russia",
  
  // Germany segment (Orange/Yellow)
  "DEU": "Germany", "POL": "Germany", "CZE": "Germany", "SVK": "Germany", "HUN": "Germany",
  "ROU": "Germany", "BGR": "Germany", "TUR": "Germany", "IRN": "Germany", "SAU": "Germany",
  "IRQ": "Germany", "EGY": "Germany", "SDN": "Germany", "ETH": "Germany", "KEN": "Germany",
  "TZA": "Germany", "NGA": "Germany", "GHA": "Germany", "MAR": "Germany", "DZA": "Germany",
  
  // USA segment (Purple)
  "ARG": "USA", "CHL": "USA", "URY": "USA", "PRY": "USA", "BOL": "USA"
};

// Market data with coordinates for hitpoints
const marketData = [
  { name: "Italy", value: 45, coordinates: countryCoordinates["Italy"], color: marketSegments["Italy"].color },
  { name: "China", value: 30, coordinates: countryCoordinates["China"], color: marketSegments["China"].color },
  { name: "Russia", value: 25, coordinates: countryCoordinates["Russia"], color: marketSegments["Russia"].color },
  { name: "Germany", value: 20, coordinates: countryCoordinates["Germany"], color: marketSegments["Germany"].color },
  { name: "USA", value: 10, coordinates: countryCoordinates["USA"], color: marketSegments["USA"].color }
];

// World map URL - using the official react-simple-maps repository URL
const geoUrl = "https://raw.githubusercontent.com/zcreativelabs/react-simple-maps/master/topojson-maps/world-110m.json";

// Helper function to get segment for a country
const getCountrySegment = (geo) => {
  const isoCode = geo.properties.ISO_A3 || geo.properties.ISO_A2;
  return countryToSegment[isoCode] || null;
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
    const todayDate = new Date();
    todayDate.setHours(23, 59, 59, 999);
    const reportEndDate = endDate > todayDate ? todayDate : endDate;

    const arrivals = reservationsArr.filter(r => r.stay?.checkIn === todayStr && r.status !== "Cancelled").length;
    const departures = reservationsArr.filter(r => r.stay?.checkOut === todayStr && r.status !== "Cancelled").length;
    const inHouseCount = reservationsArr.filter(r => r.status === "In House").length;
    
    // Use OOS periods instead of just physical status
    const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
    const todayOOSCount = getOOSRoomsCountOnDate(todayStr, oosPeriods);
    
    const availableRooms = Math.max(0, roomsArr.length - inHouseCount - todayOOSCount);

    // Only count revenue for reservations that have checked in (not Booked or Cancelled)
    // Include reservations that checked in before or during the period and are still checked in
    const checkedInRes = reservationsArr.filter(r => {
      const status = (r.status || "").toLowerCase();
      const isCheckedIn = status === "checked-in" || status === "checked in" || 
                         status === "checked-out" || status === "checked out" || 
                         status === "in house";
      if (!isCheckedIn) return false;
      
      const ci = r?.stay?.checkIn;
      const co = r?.stay?.checkOut;
      if (!ci || !co) return false;
      
      // Include if reservation overlaps with the report period (check-in before end, check-out after start)
      const checkInDate = new Date(String(ci).slice(0, 10) + "T12:00:00");
      const checkOutDate = new Date(String(co).slice(0, 10) + "T12:00:00");
      return checkInDate <= reportEndDate && checkOutDate >= startDate;
    });
    
    const currentRes = checkedInRes;
    const totalTax = currentRes.reduce((sum, r) => sum + Number(r.pricing?.taxAmount ?? r.pricing?.tax ?? 0), 0);
    const totalServiceCharge = currentRes.reduce((sum, r) => sum + Number(r.pricing?.serviceAmount ?? r.pricing?.serviceCharge ?? 0), 0);
    const totalCityTax = currentRes.reduce((sum, r) => sum + Number(r.pricing?.cityTaxAmount ?? r.pricing?.cityTax ?? 0), 0);

    const calcNights = (ci, co) => {
      const a = new Date(String(ci || "").slice(0, 10) + "T12:00:00").getTime();
      const b = new Date(String(co || "").slice(0, 10) + "T12:00:00").getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
      return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
    };

    // Calculate room revenue day by day from check-in onwards
    const roomRev = currentRes.reduce((sum, r) => {
      const ci = String(r?.stay?.checkIn || "").slice(0, 10);
      const co = String(r?.stay?.checkOut || "").slice(0, 10);
      if (!ci || !co) return sum;
      
      // Only count nights from check-in day onwards
      const checkInDate = new Date(ci + "T12:00:00");
      const checkOutDate = new Date(co + "T12:00:00");
      
      // Count nights from check-in to check-out, but only within report period
      const calcStartDate = checkInDate > startDate ? checkInDate : startDate;
      const calcEndDate = checkOutDate < reportEndDate ? checkOutDate : reportEndDate;
      
      if (calcStartDate >= calcEndDate) return sum;
      
      const nightsInPeriod = Math.max(0, Math.ceil((calcEndDate - calcStartDate) / (1000 * 60 * 60 * 24)));
      const totalNights = calcNights(ci, co);
      if (totalNights === 0) return sum;
      
      const p = r?.pricing || {};
      let totalRevenue = 0;
      const v1 = Number(p.roomRevenue);
      if (Number.isFinite(v1)) {
        totalRevenue = v1;
      } else {
        const v2 = Number(p.roomSubtotal);
        if (Number.isFinite(v2)) {
          totalRevenue = v2;
        } else {
          const nightly = Array.isArray(p.nightly) ? p.nightly : [];
          if (nightly.length) {
            totalRevenue = nightly.reduce((a, x) => a + Number(x?.baseRate ?? x?.rate ?? 0), 0);
          } else {
            totalRevenue = Number(p.total || 0);
          }
        }
      }
      
      // Calculate per-night revenue and multiply by nights in period
      const perNightRevenue = totalRevenue / totalNights;
      return sum + (perNightRevenue * nightsInPeriod);
    }, 0);

    const roomNightsSold = currentRes.reduce((sum, r) => {
      const ci = String(r?.stay?.checkIn || "").slice(0, 10);
      const co = String(r?.stay?.checkOut || "").slice(0, 10);
      if (!ci || !co) return sum;
      
      // Only count nights from check-in day onwards
      const checkInDate = new Date(ci + "T12:00:00");
      const checkOutDate = new Date(co + "T12:00:00");
      
      const calcStartDate = checkInDate > startDate ? checkInDate : startDate;
      const calcEndDate = checkOutDate < reportEndDate ? checkOutDate : reportEndDate;
      
      if (calcStartDate >= calcEndDate) return sum;
      
      const nightsInPeriod = Math.max(0, Math.ceil((calcEndDate - calcStartDate) / (1000 * 60 * 60 * 24)));
      return sum + nightsInPeriod;
    }, 0);
    const totalExp = expensesArr.filter(e => filterByDate(e.date || e.expense_date)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const getExtra = (cat) => extraRevenuesArr.filter(x => x.type === cat && filterByDate(x.date || x.createdAt)).reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const revData = { "Room Revenue": roomRev, "F&B Revenue": getExtra("F&B"), "Spa Revenue": getExtra("Spa"), "Activities": getExtra("Activities"), "Laundry": getExtra("Laundry"), "Services": getExtra("Services") };
    const totalRev = Object.values(revData).reduce((a, b) => a + b, 0);
    
    const getExpVal = (cat) => expensesArr.filter(e => e.category === cat && filterByDate(e.date || e.expense_date)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expData = { "Salary": getExpVal("Salary"), "Maintenance": getExpVal("Maintenance"), "Utilities": getExpVal("Utilities"), "Marketing": getExpVal("Marketing"), "F&B Cost": getExpVal("F&B"), "General": getExpVal("General") };

    const totalRooms = Math.max(1, roomsArr.length);
    const occ = (roomNightsSold / (totalRooms * totalDays)) * 100;
    const adr = roomNightsSold > 0 ? roomRev / roomNightsSold : 0;
    const revpar = roomRev / (totalRooms * totalDays);

    // Calculate top nationalities based on arrivals (check-ins)
    const arrivalsReservations = reservationsArr.filter(r => {
      const checkIn = r?.stay?.checkIn;
      if (!checkIn) return false;
      if (r.status === "Cancelled") return false;
      return filterByDate(checkIn);
    });

    const nationalityCounts = {};
    arrivalsReservations.forEach(r => {
      const nationality = r?.guest?.nationality || "Unknown";
      nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1;
    });

    // Get top 10 nationalities sorted by count
    const topNationalities = Object.entries(nationalityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count, code: getCountryCode(name) }));

    // Calculate percentages
    const totalArrivals = arrivalsReservations.length;
    const topNationalitiesData = topNationalities.map(item => ({
      ...item,
      percentage: totalArrivals > 0 ? Math.round((item.count / totalArrivals) * 100) : 0
    }));

    return { 
        revData, expData, totalRev, totalExp, gop: totalRev - totalExp, 
        totalTax, totalServiceCharge, totalCityTax,
        arrivals, departures, availableRooms, maintenanceRooms: todayOOSCount, inHouseCount,
        occ, adr, revpar, roomNightsSold,
        topNationalitiesData
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
    <div style={{ 
      padding: "30px", 
      background: "#f8fafc", 
      minHeight: "100vh",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>
      
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

        {/* Top Nationalities Chart - Replaces Global Market Reach */}
        <div style={{ gridColumn: "span 6", ...cardStyle, padding: "24px", overflow: "hidden" }}>
          <h3 style={sectionTitle}><FaGlobe color={theme.primary} /> Top Nationalities (Based on Arrivals)</h3>
          {kpi.topNationalitiesData && kpi.topNationalitiesData.length > 0 ? (
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "0px",
              height: "320px",
              width: "100%",
              maxWidth: "100%",
              position: "relative"
            }}>
              {/* Pie Chart */}
              <div style={{ 
                position: "relative", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                overflow: "hidden"
              }}>
                <Pie
                  data={{
                    labels: kpi.topNationalitiesData.map(item => item.name),
                    datasets: [{
                      data: kpi.topNationalitiesData.map(item => item.count),
                      backgroundColor: kpi.topNationalitiesData.map((_, idx) => {
                        const colors = [
                          "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#a855f7", 
                          "#f43f5e", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6",
                          "#ec4899", "#06b6d4"
                        ];
                        return colors[idx % colors.length];
                      }),
                      borderColor: "#ffffff",
                      borderWidth: 2,
                      offset: kpi.topNationalitiesData.map(() => 8),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 1,
                    layout: {
                      padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                      }
                    },
                    plugins: {
                      legend: { 
                        display: false 
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const item = kpi.topNationalitiesData[context.dataIndex];
                            return `${item.name}: ${item.count} arrivals (${item.percentage}%)`;
                          }
                        },
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        padding: 10,
                        titleFont: { size: 14, weight: "bold" },
                        bodyFont: { size: 12 }
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000
                    }
                  }}
                  plugins={[{
                    id: 'percentageLabels',
                    afterDraw: (chart) => {
                      const ctx = chart.ctx;
                      chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                          const item = kpi.topNationalitiesData[index];
                          if (!item) return;
                          
                          const percentage = item.percentage;
                          
                          // Get position - use the center of the arc
                          const position = element.tooltipPosition();
                          
                          // Draw percentage label with shadow for 3D effect
                          ctx.save();
                          
                          // Shadow for depth
                          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
                          ctx.shadowBlur = 4;
                          ctx.shadowOffsetX = 1;
                          ctx.shadowOffsetY = 1;
                          
                          // White text
                          ctx.fillStyle = "#ffffff";
                          ctx.font = "bold 12px Arial";
                          ctx.textAlign = "center";
                          ctx.textBaseline = "middle";
                          ctx.fillText(percentage + "%", position.x, position.y);
                          
                          ctx.restore();
                        });
                      });
                    }
                  }]}
                />
              </div>

              {/* Nationalities Grid with Flags - No Borders */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                overflowY: "auto",
                paddingRight: "0px",
                paddingLeft: "16px",
                maxHeight: "320px",
                width: "auto",
                justifyContent: "center",
                alignItems: "flex-start"
              }}>
                {kpi.topNationalitiesData.map((item, idx) => {
                  const colors = [
                    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#a855f7", 
                    "#f43f5e", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6",
                    "#ec4899", "#06b6d4"
                  ];
                  const color = colors[idx % colors.length];
                  
                  return (
                    <div 
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 5px 5px 6px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${color}15`;
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {/* Country Flag */}
                      <span 
                        className={`fi fi-${item.code || 'un'}`}
                        style={{
                          fontSize: "18px",
                          borderRadius: "3px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          flexShrink: 0
                        }}
                      ></span>
                      
                      {/* Country Name */}
                      <div style={{ minWidth: 0, maxWidth: "90px" }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: "#0f172a", 
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {item.name}
                        </div>
                        <div style={{ 
                          fontSize: "9px", 
                          color: "#64748b",
                          marginTop: "1px"
                        }}>
                          {item.count} {item.count === 1 ? 'arrival' : 'arrivals'}
                        </div>
                      </div>
                      
                      {/* Percentage */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "10px",
                          boxShadow: `0 2px 6px ${color}60`
                        }}>
                          {item.percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: "320px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSub, fontSize: "14px" }}>
              No arrivals data available for the selected period
            </div>
          )}
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
const getDoughnutData = (data, colors) => ({ labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: colors, borderWidth: 0 }] });