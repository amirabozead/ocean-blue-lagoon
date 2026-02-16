import React, { useState, useMemo, useCallback } from "react";
import 'flag-icons/css/flag-icons.min.css';
import { 
  FaDollarSign, FaChartLine, FaBed, FaWallet, FaReceipt, FaCreditCard,
  FaCalendarAlt, FaHotel, FaGlobeAmericas, 
  FaUtensils, FaTshirt, FaSpa, FaSnowboarding, FaConciergeBell,
  FaBolt, FaTools, FaBroom, FaBullhorn, FaUsers, FaBoxOpen,
  FaCalendarCheck, FaHome, FaDoorOpen, FaPercentage, FaTags, FaGem, FaArrowDown, FaTimes,
  FaCoins, FaGlobe, FaUniversity
} from "react-icons/fa";
import { ymd, parseYMD, calcNights, storeLoad, roundTo2 } from "../utils/helpers";
import { BOOKING_CHANNELS, PAYMENT_METHODS } from "../data/constants";

// --- Constants ---
const HOTEL_LOGO = "/logo.png"; 

const fmtNum = (num) => (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (num) => (num || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMoney = (num) => `$${fmtNum(num)}`;

// Get country code for flag icons
const getCountryCode = (countryName) => {
  if (!countryName) return "un";
  const name = String(countryName).trim();
  const map = {
    "Italy": "it", "China": "cn", "Russia": "ru", "Germany": "de", 
    "USA": "us", "United States": "us", "US": "us",
    "France": "fr", "Egypt": "eg", "Maldives": "mv",
    "United Kingdom": "gb", "UK": "gb", "Britain": "gb",
    "Saudi Arabia": "sa", "UAE": "ae", "United Arab Emirates": "ae",
    "Spain": "es", "Netherlands": "nl", "Belgium": "be",
    "Switzerland": "ch", "Austria": "at", "Sweden": "se",
    "Norway": "no", "Denmark": "dk", "Finland": "fi",
    "Poland": "pl", "Czech Republic": "cz", "Greece": "gr",
    "Turkey": "tr", "India": "in", "Japan": "jp",
    "South Korea": "kr", "Australia": "au", "New Zealand": "nz",
    "Canada": "ca", "Brazil": "br", "Argentina": "ar",
    "Mexico": "mx", "South Africa": "za", "Thailand": "th",
    "Singapore": "sg", "Malaysia": "my", "Indonesia": "id",
    "Philippines": "ph", "Vietnam": "vn", "Qatar": "qa",
    "Kuwait": "kw", "Oman": "om", "Bahrain": "bh",
    "Jordan": "jo", "Lebanon": "lb", "Israel": "il"
  };
  // Try exact match first
  if (map[name]) return map[name];
  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  for (const [key, code] of Object.entries(map)) {
    if (key.toLowerCase() === lowerName) return code;
  }
  // Try partial match
  for (const [key, code] of Object.entries(map)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return code;
    }
  }
  return "un"; // Unknown/United Nations
};

const REVENUE_CATS = [
  { key: "F&B", label: "F&B", icon: <FaUtensils />, color: "#f59e0b" },
  { key: "Laundry", label: "Laundry", icon: <FaTshirt />, color: "#3b82f6" },
  { key: "Spa", label: "Spa", icon: <FaSpa />, color: "#ec4899" },
  { key: "Activities", label: "Activities", icon: <FaSnowboarding />, color: "#8b5cf6" },
  { key: "Services", label: "Services", icon: <FaConciergeBell />, color: "#10b981" },
];

const EXPENSE_CATS = [
  { key: "Salaries", label: "Salaries & Wages", icon: <FaUsers />, color: "#ef4444" },
  { key: "Utilities", label: "Utilities (Elec/Water)", icon: <FaBolt />, color: "#f59e0b" },
  { key: "Maintenance", label: "Maintenance", icon: <FaTools />, color: "#64748b" },
  { key: "Supplies", label: "Supplies & Amenities", icon: <FaBoxOpen />, color: "#8b5cf6" },
  { key: "Marketing", label: "Marketing", icon: <FaBullhorn />, color: "#3b82f6" },
  { key: "Housekeeping", label: "Housekeeping", icon: <FaBroom />, color: "#10b981" },
];

// --- Components ---
const ModernKpi = ({ label, value, icon, color, trend }) => (
  <div className="kpi-card-modern">
    <div className="icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
      {icon}
    </div>
    <div className="kpi-content">
      <span className="kpi-label">{label}</span>
      <h3 className="kpi-value">{value}</h3>
      {trend && <span className="kpi-trend" style={{ color: trend > 0 ? "#10b981" : "#ef4444" }}>
        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
      </span>}
    </div>
  </div>
);

export default function ReportsPage({ reservations, expenses, extraRevenues, totalRooms = 18 }) {
  
  // --- Logic ---
  const expDateKey = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v.slice(0, 10);
    if (v instanceof Date) return ymd(v);
    return String(v).slice(0, 10);
  };

  const expAmount = (v) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const [period, setPeriod] = useState("MTD"); 
  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: ymd(now),
    };
  });
  
  // New State for Modal
  const [selectedMonthDetails, setSelectedMonthDetails] = useState(null);

  const [plYear] = useState(new Date().getFullYear());
  const __now = new Date();
  const plMonth = String(__now.getMonth() + 1).padStart(2, "0");

  const cleanReservations = useMemo(() => {
    return (reservations || []).filter(r => r && r.stay && r.status !== "Cancelled");
  }, [reservations]);

  const computeMetricsForRange = useCallback((fromStr, toStr) => {
    if (!fromStr || !toStr) {
      const channelZero = {};
      BOOKING_CHANNELS.forEach((c) => (channelZero[c] = 0));
      const paymentZero = {};
      PAYMENT_METHODS.forEach((p) => (paymentZero[p] = 0));
      return { 
        revenue: 0, roomRevenue: 0, 
        revenueBreakdown: {}, expenseBreakdown: {},
        tax: 0, service: 0, cityTax: 0, totalTaxes: 0, expenses: 0, net: 0, 
        occupancy: 0, adr: 0, roomsAvailable: 0, roomsSold: 0, 
        channelRevenue: channelZero,
        paymentRevenue: paymentZero,
      };
    }

    const nightDays = [];
    let curr = parseYMD(fromStr);
    const last = parseYMD(toStr);

    if (!curr || !last) return { revenue: 0 };

    while (curr <= last) {
      nightDays.push(ymd(curr));
      curr.setDate(curr.getDate() + 1);
    }

    let revenue = 0, roomRevenue = 0;
    let sumTax = 0, sumService = 0, sumCityTax = 0, occupiedNightsCount = 0;
    let oosNightsCount = 0;

    const revenueBreakdown = {};
    REVENUE_CATS.forEach(c => revenueBreakdown[c.key] = 0);
    revenueBreakdown["Services"] = 0;

    const expenseBreakdown = {};
    EXPENSE_CATS.forEach(c => expenseBreakdown[c.key] = 0);
    expenseBreakdown["Other"] = 0;


    const channelRevenue = {};
    BOOKING_CHANNELS.forEach((c) => (channelRevenue[c] = 0));
    const paymentRevenue = {};
    PAYMENT_METHODS.forEach((p) => (paymentRevenue[p] = 0));
    const normalizeChannel = (src) => {
      const s = String(src || "").trim().toLowerCase();
      if (s.includes("booking")) return "Booking.com";
      if (s.includes("airbnb")) return "Airbnb";
      if (s.includes("agoda")) return "Agoda";
      return "Direct booking";
    };
    const normalizePayment = (pm) => {
      const p = String(pm || "Cash").trim();
      if (/credit\s*card|card/i.test(p)) return "Credit Card";
      return "Cash";
    };

    // 🔒 Physical OOS rooms reduce available capacity (independent of reservations)
    const roomPhysicalStatus = storeLoad("ocean_room_physical_v1", {}) || {};
    const oosRoomsCount = Object.values(roomPhysicalStatus).filter((v) => {
      const s = String(v || "");
      return /out/i.test(s) && /(order|service)/i.test(s);
    }).length;


    cleanReservations.forEach((r) => {
      const ci = r.stay.checkIn;
      const co = r.stay.checkOut;
      const status = (r.status || "Booked").toLowerCase();
      const stayNights = Math.max(1, calcNights(ci, co) || 0);
      
      // Only count revenue for reservations that have checked in (not Booked or Cancelled)
      const isCheckedIn = status === "checked-in" || status === "checked in" || 
                         status === "checked-out" || status === "checked out" || 
                         status === "in house";
      
      // Skip if not checked in or if Out of Service
      if (!isCheckedIn || status === "out of service") {
        if (status === "out of service") {
          nightDays.forEach((day) => {
            if (day >= ci && day < co) {
              oosNightsCount += 1;
            }
          });
        }
        return; // Skip revenue calculation for Booked/Cancelled/Out of Service
      }
      
      nightDays.forEach((day) => {
        // Only count revenue from check-in day onwards (day >= ci)
        if (day >= ci && day < co) {
          const ratio = 1 / stayNights;
          const perNightRevenue = Number(r.pricing?.subtotal || r.room?.roomRate || 0) * ratio;
          
          revenue += perNightRevenue;
          roomRevenue += perNightRevenue; 

          // Tax calculation: use full amounts, not per-night allocation
          const taxAmt = Number(r.pricing?.taxAmount ?? r.pricing?.tax ?? 0);
          const serviceAmt = Number(r.pricing?.serviceAmount ?? r.pricing?.serviceCharge ?? r.pricing?.service ?? 0);
          const cityTaxAmt = Number(r.pricing?.cityTaxAmount ?? r.pricing?.cityTax ?? 0);
          
          // Only count taxes for nights within the date range (proportional allocation)
          sumTax += (taxAmt * ratio);
          sumService += (serviceAmt * ratio);
          sumCityTax += (cityTaxAmt * ratio);
          
          const ch = normalizeChannel(r.channel || r.source);
          const pm = normalizePayment(r.paymentMethod);
          if (channelRevenue[ch] !== undefined) channelRevenue[ch] += perNightRevenue;
          if (paymentRevenue[pm] !== undefined) paymentRevenue[pm] += perNightRevenue;
          occupiedNightsCount += 1;
        }
      });
    });

    if (extraRevenues && extraRevenues.length > 0) {
      extraRevenues.forEach(item => {
        const d = (item.date || item.revenue_date || "").toString().slice(0, 10);
        if (!d || d < fromStr || d > toStr) return;
        const amt = Number(item.amount || 0);
        revenue += amt;
        const cat = (item.type || item.category || "Services").toString().trim();
        const matchedKey = REVENUE_CATS.find(c => c.key.toLowerCase() === cat.toLowerCase())?.key || "Services";
        if (revenueBreakdown[matchedKey] !== undefined) revenueBreakdown[matchedKey] += amt;
        else revenueBreakdown["Services"] += amt;
      });
    }

    const fromKey = expDateKey(fromStr);
    const toKey = expDateKey(toStr);
    let expensesTotal = 0;

    (expenses || []).forEach((e) => {
        const d = expDateKey(e?.date);
        if (d && d >= fromKey && d <= toKey) {
            const amt = expAmount(e?.amount);
            expensesTotal += amt;
            const cat = e.category || "Other";
            const matchedKey = EXPENSE_CATS.find(c => c.key.toLowerCase() === cat.toLowerCase())?.key;
            if (matchedKey) expenseBreakdown[matchedKey] += amt;
            else expenseBreakdown["Other"] += amt;
        }
    });

    const theoreticalCapacity = nightDays.length * Math.max(0, (totalRooms - oosRoomsCount));
    const netAvailableRooms = Math.max(0, theoreticalCapacity - oosNightsCount);

    // Calculate total taxes from unrounded sums to avoid rounding discrepancies
    const totalTaxesUnrounded = sumTax + sumService + sumCityTax;
    
    return {
      revenue: roundTo2(revenue),
      roomRevenue: roundTo2(roomRevenue),
      revenueBreakdown,
      expenseBreakdown,
      tax: roundTo2(sumTax),
      service: roundTo2(sumService),
      cityTax: roundTo2(sumCityTax),
      totalTaxes: roundTo2(totalTaxesUnrounded), // Store pre-calculated total
      expenses: roundTo2(expensesTotal),
      net: roundTo2(revenue - expensesTotal),
      occupancy: netAvailableRooms > 0 ? occupiedNightsCount / netAvailableRooms : 0,
      adr: occupiedNightsCount > 0 ? roundTo2(revenue / occupiedNightsCount) : 0,
      roomsAvailable: netAvailableRooms,
      roomsSold: occupiedNightsCount,
      channelRevenue: Object.fromEntries(Object.entries(channelRevenue).map(([k, v]) => [k, roundTo2(v)])),
      paymentRevenue: Object.fromEntries(Object.entries(paymentRevenue).map(([k, v]) => [k, roundTo2(v)])),
    };
  }, [cleanReservations, expenses, extraRevenues, totalRooms]);

  const computedRange = useMemo(() => {
    const now = new Date();
    const today = ymd(now);
    if (period === "TODAY") return { from: today, to: today };
    if (period === "MTD") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    if (period === "YTD") return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: today };
    return range;
  }, [period, range]);

  const metrics = useMemo(() => computeMetricsForRange(computedRange.from, computedRange.to), [computedRange, computeMetricsForRange]);

  // Calculate total taxes from rounded components to ensure display consistency
  // This ensures the displayed total exactly matches the sum of displayed individual components
  const totalTaxes = (metrics.cityTax || 0) + (metrics.service || 0) + (metrics.tax || 0);

  // Calculate top 10 nationalities based on arrivals in the selected period
  const topNationalities = useMemo(() => {
    const arrivalsReservations = cleanReservations.filter(r => {
      const checkIn = r?.stay?.checkIn;
      if (!checkIn) return false;
      if (r.status === "Cancelled") return false;
      const checkInDate = String(checkIn).slice(0, 10);
      return checkInDate >= computedRange.from && checkInDate <= computedRange.to;
    });

    const nationalityCounts = {};
    arrivalsReservations.forEach(r => {
      const nationality = r?.guest?.nationality || "Unknown";
      nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1;
    });

    // Get top 10 nationalities sorted by count
    const top = Object.entries(nationalityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ 
        name, 
        count,
        code: getCountryCode(name)
      }));

    const totalArrivals = arrivalsReservations.length;
    return top.map(item => ({
      ...item,
      percentage: totalArrivals > 0 ? Math.round((item.count / totalArrivals) * 100) : 0
    }));
  }, [cleanReservations, computedRange]);

  // Calculate cash balance (cash revenue - cash expenses)
  const cashBalance = useMemo(() => {
    const cashRevenue = metrics.paymentRevenue?.["Cash"] || 0;
    
    // Calculate cash expenses (expenses paid in cash)
    // For now, we'll assume a percentage or use a simple calculation
    // You might want to track payment method for expenses separately
    // For this implementation, we'll calculate based on cash revenue percentage
    const totalRevenue = metrics.revenue || 1;
    const cashRevenuePercentage = totalRevenue > 0 ? cashRevenue / totalRevenue : 0;
    const cashExpenses = (metrics.expenses || 0) * cashRevenuePercentage;
    
    return roundTo2(cashRevenue - cashExpenses);
  }, [metrics]);

  // Calculate bank balance (cash + credit card revenue only, no expenses)
  const bankBalance = useMemo(() => {
    // Bank balance includes only revenue from cash and credit card (no expenses deducted)
    const cashRevenue = metrics.paymentRevenue?.["Cash"] || 0;
    const creditCardRevenue = metrics.paymentRevenue?.["Credit Card"] || 0;
    return roundTo2(cashRevenue + creditCardRevenue);
  }, [metrics]);
  const taxPcts = useMemo(() => {
      if (totalTaxes === 0) return { city: 0, service: 0, vat: 0 };
      return {
          city: (metrics.cityTax / totalTaxes) * 100,
          service: (metrics.service / totalTaxes) * 100,
          vat: (metrics.tax / totalTaxes) * 100
      }
  }, [totalTaxes, metrics]);

  const plMonthly = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, "0");
      const f = `${plYear}-${mStr}-01`;
      const t = ymd(new Date(plYear, i + 1, 0)); 
      return { month: mStr, monthName: new Date(plYear, i).toLocaleString("default", { month: "long" }), ...computeMetricsForRange(f, t) };
    });
  }, [plYear, computeMetricsForRange]);

  // --- Total Year Calculation ---
  const yearTotals = useMemo(() => {
    const acc = { 
        revenue: 0, expenses: 0, net: 0, 
        roomsAvailable: 0, roomsSold: 0,
        roomRevenue: 0,
        tax: 0, service: 0, cityTax: 0, totalTaxes: 0,
        channelRevenue: {},
        paymentRevenue: {},
        revenueBreakdown: {}, expenseBreakdown: {}
    };
    
    // Init breakdowns
    REVENUE_CATS.forEach(c => acc.revenueBreakdown[c.key] = 0);
    acc.revenueBreakdown["Services"] = 0;
    EXPENSE_CATS.forEach(c => acc.expenseBreakdown[c.key] = 0);
    acc.expenseBreakdown["Other"] = 0;
    
    // Init channel and payment revenue
    BOOKING_CHANNELS.forEach(c => acc.channelRevenue[c] = 0);
    PAYMENT_METHODS.forEach(p => acc.paymentRevenue[p] = 0);

    plMonthly.forEach(m => {
        acc.revenue += m.revenue || 0;
        acc.expenses += m.expenses || 0;
        acc.net += m.net || 0;
        acc.roomsAvailable += m.roomsAvailable || 0;
        acc.roomsSold += m.roomsSold || 0;
        acc.roomRevenue += m.roomRevenue || 0;
        
        // Sum taxes from each month
        acc.tax += m.tax || 0;
        acc.service += m.service || 0;
        acc.cityTax += m.cityTax || 0;
        
        // Sum channel revenue
        if (m.channelRevenue) {
            Object.keys(m.channelRevenue).forEach(ch => {
                if (acc.channelRevenue[ch] !== undefined) {
                    acc.channelRevenue[ch] += (m.channelRevenue[ch] || 0);
                }
            });
        }
        
        // Sum payment revenue
        if (m.paymentRevenue) {
            Object.keys(m.paymentRevenue).forEach(pm => {
                if (acc.paymentRevenue[pm] !== undefined) {
                    acc.paymentRevenue[pm] += (m.paymentRevenue[pm] || 0);
                }
            });
        }
        
        Object.keys(m.revenueBreakdown || {}).forEach(k => {
            acc.revenueBreakdown[k] = (acc.revenueBreakdown[k] || 0) + (m.revenueBreakdown[k] || 0);
        });
        Object.keys(m.expenseBreakdown || {}).forEach(k => {
            acc.expenseBreakdown[k] = (acc.expenseBreakdown[k] || 0) + (m.expenseBreakdown[k] || 0);
        });
    });

    // Calculate total taxes
    acc.totalTaxes = acc.tax + acc.service + acc.cityTax;
    
    // Round all values
    acc.tax = roundTo2(acc.tax);
    acc.service = roundTo2(acc.service);
    acc.cityTax = roundTo2(acc.cityTax);
    acc.totalTaxes = roundTo2(acc.totalTaxes);
    
    // Round channel and payment revenue
    Object.keys(acc.channelRevenue).forEach(k => {
        acc.channelRevenue[k] = roundTo2(acc.channelRevenue[k]);
    });
    Object.keys(acc.paymentRevenue).forEach(k => {
        acc.paymentRevenue[k] = roundTo2(acc.paymentRevenue[k]);
    });

    const occupancy = acc.roomsAvailable > 0 ? acc.roomsSold / acc.roomsAvailable : 0;
    const adr = acc.roomsSold > 0 ? acc.revenue / acc.roomsSold : 0;
    
    return { 
        monthName: "Full Year Total",
        ...acc,
        occupancy,
        adr
    };
  }, [plMonthly]);

  // --- Styles from RoomsPage ---
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
        marginBottom: "20px",
        border: "1px solid #bae6fd" 
    },
    logoImage: {
        width: "80px",
        height: "80px",
        objectFit: "cover",
        borderRadius: "50%",
        border: "3px solid #e0f2fe", 
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
    }
  };

  // --- Modal Renderer ---
  const renderMonthDetailModal = () => {
    if (!selectedMonthDetails) return null;
    const m = selectedMonthDetails;
    
    // Calculate additional metrics
    const revPar = m.roomsAvailable > 0 ? (m.revenue / m.roomsAvailable) : 0;
    const monthTotalTaxes = (m.cityTax || 0) + (m.service || 0) + (m.tax || 0);
    const monthTaxPcts = monthTotalTaxes > 0 ? {
      city: (m.cityTax / monthTotalTaxes) * 100,
      service: (m.service / monthTotalTaxes) * 100,
      vat: (m.tax / monthTotalTaxes) * 100
    } : { city: 0, service: 0, vat: 0 };

    // Calculate cash balance for the month
    const monthCashRevenue = m.paymentRevenue?.["Cash"] || 0;
    const monthTotalRevenue = m.revenue || 1;
    const monthCashRevenuePercentage = monthTotalRevenue > 0 ? monthCashRevenue / monthTotalRevenue : 0;
    const monthCashExpenses = (m.expenses || 0) * monthCashRevenuePercentage;
    const monthCashBalance = roundTo2(monthCashRevenue - monthCashExpenses);

    // Calculate bank balance for the month (cash + credit card, no expenses)
    const monthCreditCardRevenue = m.paymentRevenue?.["Credit Card"] || 0;
    const monthBankBalance = roundTo2(monthCashRevenue + monthCreditCardRevenue);

    // Calculate top 10 nationalities for the selected month
    let monthStart, monthEnd;
    if (m.monthName === "Full Year Total") {
      // For full year, use the entire year
      monthStart = `${plYear}-01-01`;
      monthEnd = `${plYear}-12-31`;
    } else {
      // For specific month
      monthStart = `${plYear}-${m.month}-01`;
      monthEnd = ymd(new Date(plYear, parseInt(m.month), 0));
    }

    const arrivalsReservations = cleanReservations.filter(r => {
      const checkIn = r?.stay?.checkIn;
      if (!checkIn) return false;
      if (r.status === "Cancelled") return false;
      const checkInDate = String(checkIn).slice(0, 10);
      return checkInDate >= monthStart && checkInDate <= monthEnd;
    });

    const nationalityCounts = {};
    arrivalsReservations.forEach(r => {
      const nationality = r?.guest?.nationality || "Unknown";
      nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1;
    });

    const top = Object.entries(nationalityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ 
        name, 
        count,
        code: getCountryCode(name)
      }));

    const totalArrivals = arrivalsReservations.length;
    const monthTopNationalities = top.map(item => ({
      ...item,
      percentage: totalArrivals > 0 ? Math.round((item.count / totalArrivals) * 100) : 0
    }));

    return (
        <div className="modal-overlay" onClick={() => setSelectedMonthDetails(null)}>
            <div className="modal-content" style={{maxWidth: '900px', width: '90%', maxHeight: '85vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 style={{margin:0}}>{m.monthName} {m.monthName === "Full Year Total" ? "" : plYear}</h2>
                        <span style={{fontSize: 13, color: '#64748b'}}>Complete Hotel Performance & Financial Details</span>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedMonthDetails(null)}><FaTimes /></button>
                </div>
                
                <div className="modal-body" style={{padding: '24px'}}>
                    {/* Summary Banner */}
                    <div className="summary-banner" style={{marginBottom: '24px'}}>
                         <div className="sb-item">
                            <span>Total Revenue</span>
                            <strong style={{color:'#6366f1', fontSize: '20px'}}>{fmtMoney(m.revenue)}</strong>
                         </div>
                         <div className="sb-item">
                            <span>Total Expenses</span>
                            <strong style={{color:'#ef4444', fontSize: '20px'}}>{fmtMoney(m.expenses)}</strong>
                         </div>
                         <div className="sb-item">
                            <span>Net Profit</span>
                            <strong style={{color: m.net>=0 ? '#10b981' : '#ef4444', fontSize: '20px'}}>{fmtMoney(m.net)}</strong>
                         </div>
                    </div>

                    {/* Key Performance Indicators */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                        <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '8px'}}>Occupancy Rate</div>
                            <div style={{fontSize: '24px', fontWeight: 800, color: '#0f172a'}}>{Math.round(m.occupancy * 100)}%</div>
                        </div>
                        <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '8px'}}>Average Daily Rate (ADR)</div>
                            <div style={{fontSize: '24px', fontWeight: 800, color: '#0f172a'}}>{fmtMoney(m.adr)}</div>
                        </div>
                        <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '8px'}}>Revenue per Available Room</div>
                            <div style={{fontSize: '24px', fontWeight: 800, color: '#10b981'}}>{fmtMoney(revPar)}</div>
                        </div>
                        <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '8px'}}>Rooms Available</div>
                            <div style={{fontSize: '24px', fontWeight: 800, color: '#64748b'}}>{fmtInt(m.roomsAvailable)}</div>
                        </div>
                        <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '8px'}}>Rooms Sold</div>
                            <div style={{fontSize: '24px', fontWeight: 800, color: '#6366f1'}}>{fmtInt(m.roomsSold)}</div>
                        </div>
                    </div>

                    {/* Revenue & Expense Breakdown */}
                    <div className="breakdown-columns" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px'}}>
                        {/* Revenue Column */}
                        <div className="bd-col" style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <h4 className="bd-title" style={{color:'#6366f1', marginBottom: '16px', fontSize: '16px', fontWeight: 700}}>
                                <FaChartLine style={{marginRight: '8px'}} /> Revenue Breakdown
                            </h4>
                            <div className="bd-list">
                                <div className="bd-row" style={{padding: '12px 0', borderBottom: '1px solid #e2e8f0'}}>
                                    <span style={{fontWeight: 600}}>Room Revenue</span>
                                    <strong style={{fontSize: '16px'}}>{fmtMoney(m.roomRevenue)}</strong>
                                </div>
                                {REVENUE_CATS.map(cat => (
                                    <div className="bd-row" key={cat.key} style={{padding: '10px 0', borderBottom: '1px solid #f1f5f9'}}>
                                        <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <span style={{color: cat.color}}>{cat.icon}</span>
                                            {cat.label}
                                        </span>
                                        <span style={{fontWeight: 600}}>{fmtMoney(m.revenueBreakdown?.[cat.key] || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Expense Column */}
                        <div className="bd-col" style={{background: '#fef2f2', padding: '20px', borderRadius: '12px', border: '1px solid #fee2e2'}}>
                            <h4 className="bd-title" style={{color:'#ef4444', marginBottom: '16px', fontSize: '16px', fontWeight: 700}}>
                                <FaWallet style={{marginRight: '8px'}} /> Expense Breakdown
                            </h4>
                            <div className="bd-list">
                                {EXPENSE_CATS.map(cat => (
                                    <div className="bd-row" key={cat.key} style={{padding: '10px 0', borderBottom: '1px solid #fee2e2'}}>
                                        <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <span style={{color: cat.color}}>{cat.icon}</span>
                                            {cat.label}
                                        </span>
                                        <span style={{fontWeight: 600, color: '#ef4444'}}>{fmtMoney(m.expenseBreakdown?.[cat.key] || 0)}</span>
                                    </div>
                                ))}
                                <div className="bd-row" style={{padding: '10px 0'}}>
                                    <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <span style={{color: '#94a3b8'}}><FaChartLine /></span>
                                        Other
                                    </span>
                                    <span style={{fontWeight: 600, color: '#ef4444'}}>{fmtMoney(m.expenseBreakdown?.["Other"] || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax Breakdown */}
                    <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px'}}>
                        <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <FaReceipt /> Tax Breakdown
                            <span style={{marginLeft: 'auto', fontSize: '14px', fontWeight: 800, color: '#0f172a'}}>{fmtMoney(monthTotalTaxes)}</span>
                        </h4>
                        <div style={{display: 'flex', gap: '8px', marginBottom: '16px', height: '12px', borderRadius: '6px', overflow: 'hidden'}}>
                            <div style={{width: `${monthTaxPcts.city}%`, background: '#3b82f6', height: '100%'}}></div>
                            <div style={{width: `${monthTaxPcts.service}%`, background: '#f59e0b', height: '100%'}}></div>
                            <div style={{width: `${monthTaxPcts.vat}%`, background: '#10b981', height: '100%'}}></div>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px'}}>
                                    <span style={{width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6'}}></span>
                                    <span style={{fontSize: '13px', color: '#475569', fontWeight: 600}}>City Tax</span>
                                </div>
                                <div style={{fontSize: '18px', fontWeight: 800, color: '#0f172a'}}>{fmtMoney(m.cityTax || 0)}</div>
                                <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>{Math.round(monthTaxPcts.city)}%</div>
                            </div>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px'}}>
                                    <span style={{width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b'}}></span>
                                    <span style={{fontSize: '13px', color: '#475569', fontWeight: 600}}>Service Charge</span>
                                </div>
                                <div style={{fontSize: '18px', fontWeight: 800, color: '#0f172a'}}>{fmtMoney(m.service || 0)}</div>
                                <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>{Math.round(monthTaxPcts.service)}%</div>
                            </div>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px'}}>
                                    <span style={{width: '10px', height: '10px', borderRadius: '50%', background: '#10b981'}}></span>
                                    <span style={{fontSize: '13px', color: '#475569', fontWeight: 600}}>GST / VAT</span>
                                </div>
                                <div style={{fontSize: '18px', fontWeight: 800, color: '#0f172a'}}>{fmtMoney(m.tax || 0)}</div>
                                <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>{Math.round(monthTaxPcts.vat)}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Channels & Payment Methods */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px'}}>
                        {/* Channels */}
                        <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <FaGlobeAmericas /> Booking Channels
                            </h4>
                            <div>
                                {BOOKING_CHANNELS.map((ch) => {
                                    const val = m.channelRevenue?.[ch] ?? 0;
                                    const color = ch === "Booking.com" ? "#003580" : ch === "Airbnb" ? "#ff385c" : ch === "Agoda" ? "#ed1c24" : "#10b981";
                                    const icon = ch === "Booking.com" ? <FaCalendarCheck style={{ color }} /> : ch === "Airbnb" ? <FaHome style={{ color }} /> : ch === "Agoda" ? <FaGlobeAmericas style={{ color }} /> : <FaDoorOpen style={{ color }} />;
                                    const pct = m.revenue > 0 ? (val / m.revenue) * 100 : 0;
                                    return (
                                        <div key={ch} style={{marginBottom: '12px'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                                                <span style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#475569'}}>
                                                    {icon} {ch}
                                                </span>
                                                <span style={{fontWeight: 700, color: '#0f172a'}}>{fmtMoney(val)}</span>
                                            </div>
                                            <div style={{height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden'}}>
                                                <div style={{width: `${pct}%`, height: '100%', background: color, borderRadius: '4px'}}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <FaCreditCard /> Payment Methods
                            </h4>
                            <div>
                                {PAYMENT_METHODS.map((pm) => {
                                    const val = m.paymentRevenue?.[pm] ?? 0;
                                    const color = pm === "Cash" ? "#10b981" : "#3b82f6";
                                    const pct = m.revenue > 0 ? (val / m.revenue) * 100 : 0;
                                    return (
                                        <div key={pm} style={{marginBottom: '12px'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                                                <span style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#475569'}}>
                                                    <FaWallet style={{ color }} /> {pm}
                                                </span>
                                                <span style={{fontWeight: 700, color: '#0f172a'}}>{fmtMoney(val)}</span>
                                            </div>
                                            <div style={{height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden'}}>
                                                <div style={{width: `${pct}%`, height: '100%', background: color, borderRadius: '4px'}}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Top 10 Nationalities */}
                    <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px'}}>
                        <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <FaGlobe /> Top 10 Nationalities
                        </h4>
                        <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                            {monthTopNationalities && monthTopNationalities.length > 0 ? (
                                monthTopNationalities.map((item, idx) => (
                                    <div key={item.name} style={{
                                        padding: '12px 0', 
                                        borderBottom: idx < monthTopNationalities.length - 1 ? '1px solid #e2e8f0' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                                            <span 
                                                className={`fi fi-${item.code || 'un'}`}
                                                style={{
                                                    fontSize: '24px',
                                                    borderRadius: '4px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                            ></span>
                                            <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                                                <span style={{fontWeight: 600, color: '#0f172a', fontSize: '14px'}}>{item.name}</span>
                                                <span style={{fontSize: '12px', color: '#64748b'}}>{item.count} {item.count === 1 ? 'arrival' : 'arrivals'}</span>
                                            </div>
                                        </div>
                                        <div style={{textAlign: 'right'}}>
                                            <div style={{fontWeight: 700, color: '#6366f1', fontSize: '16px'}}>{item.percentage}%</div>
                                            <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>#{idx + 1}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px'}}>
                                    No nationality data available for this period
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cash Balance & Bank Balance */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px'}}>
                        {/* Cash Balance */}
                        <div style={{background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0'}}>
                            <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <FaCoins /> Cash Balance
                            </h4>
                            <div style={{textAlign: 'center', marginBottom: '16px'}}>
                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: 800,
                                    color: monthCashBalance >= 0 ? '#10b981' : '#ef4444',
                                    marginBottom: '8px',
                                    fontFamily: 'monospace'
                                }}>
                                    {fmtMoney(monthCashBalance)}
                                </div>
                                <div style={{fontSize: '12px', color: '#64748b'}}>
                                    Cash Revenue - Cash Expenses
                                </div>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                paddingTop: '16px',
                                borderTop: '1px solid #bbf7d0'
                            }}>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Revenue</div>
                                    <div style={{fontSize: '16px', fontWeight: 700, color: '#10b981'}}>
                                        {fmtMoney(monthCashRevenue)}
                                    </div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Expenses</div>
                                    <div style={{fontSize: '16px', fontWeight: 700, color: '#ef4444'}}>
                                        {fmtMoney(monthCashExpenses)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bank Balance */}
                        <div style={{background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe'}}>
                            <h4 style={{color: '#0f172a', marginBottom: '16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <FaUniversity /> Bank Balance
                            </h4>
                            <div style={{textAlign: 'center', marginBottom: '16px'}}>
                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: 800,
                                    color: '#6366f1',
                                    marginBottom: '8px',
                                    fontFamily: 'monospace'
                                }}>
                                    {fmtMoney(monthBankBalance)}
                                </div>
                                <div style={{fontSize: '12px', color: '#64748b'}}>
                                    Cash + Credit Card Revenue
                                </div>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                paddingTop: '16px',
                                borderTop: '1px solid #bfdbfe'
                            }}>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Revenue</div>
                                    <div style={{fontSize: '16px', fontWeight: 700, color: '#10b981'}}>
                                        {fmtMoney(monthCashRevenue)}
                                    </div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Credit Card Revenue</div>
                                    <div style={{fontSize: '16px', fontWeight: 700, color: '#3b82f6'}}>
                                        {fmtMoney(monthCreditCardRevenue)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
  };

  // --- JSX ---
  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <div style={headerStyles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Blue Lagoon" style={headerStyles.logoImage} onError={(e) => e.target.style.display='none'} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "36px", fontFamily: "'Brush Script MT', cursive", letterSpacing: "1px", fontWeight: "normal", lineHeight: "1" }}>Ocean Blue Lagoon</h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>Maldives Resort</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", fontFamily: "'Playfair Display', serif", fontStyle: "italic", lineHeight: "1" }}>Financial Reports</span>
           <FaChartLine style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        <div style={{ background: "white", padding: "8px 16px", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></span>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>Live Sync: Cairo</span>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar-glass">
        <div className="filter-group">
          <FaCalendarAlt className="filter-icon" />
          {["TODAY", "MTD", "YTD", "CUSTOM"].map((p) => (
            <button key={p} className={`filter-btn ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
        {period === "CUSTOM" && (
          <div className="custom-date-picker">
            <input type="date" className="filter-input" value={range.from} onChange={(e) => setRange(p => ({...p, from: e.target.value}))} />
            <span className="separator">to</span>
            <input type="date" className="filter-input" value={range.to} onChange={(e) => setRange(p => ({...p, to: e.target.value}))} />
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <ModernKpi label="Total Revenue" value={fmtMoney(metrics.revenue)} icon={<FaDollarSign />} color="#6366f1" />
        <ModernKpi label="Net Profit" value={fmtMoney(metrics.net)} icon={<FaChartLine />} color="#10b981" />
        <ModernKpi label="Expenses" value={fmtMoney(metrics.expenses)} icon={<FaWallet />} color="#ef4444" />
        <ModernKpi label="Occupancy Rate" value={`${Math.round(metrics.occupancy * 100)}%`} icon={<FaBed />} color="#f59e0b" />
      </div>

      {/* Details Grid (4 Columns) */}
      <div className="details-grid-4">
        {/* Tax Breakdown */}
        <div className="card-panel tax-card-v2">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 15}}>
            <h4 className="panel-title" style={{margin:0}}><FaReceipt /> Tax Breakdown</h4>
            <div className="tax-total-badge">{fmtMoney(totalTaxes)}</div>
          </div>
          <div className="tax-vis-bar">
             <div className="vis-segment" style={{width: `${taxPcts.city}%`, background: '#3b82f6'}}></div>
             <div className="vis-segment" style={{width: `${taxPcts.service}%`, background: '#f59e0b'}}></div>
             <div className="vis-segment" style={{width: `${taxPcts.vat}%`, background: '#10b981'}}></div>
          </div>
          <div className="panel-list" style={{marginTop: 15}}>
            <div className="list-item tax-item">
                <div className="tax-label">
                    <span className="dot-indicator" style={{background:'#3b82f6'}}></span>
                    <span>City Tax</span>
                </div>
                <div style={{textAlign:'right'}}>
                    <strong>{fmtMoney(metrics.cityTax)}</strong>
                    <div className="tax-pct-sub">{Math.round(taxPcts.city)}%</div>
                </div>
            </div>
            <div className="list-item tax-item">
                <div className="tax-label">
                    <span className="dot-indicator" style={{background:'#f59e0b'}}></span>
                    <span>Service Charge</span>
                </div>
                <div style={{textAlign:'right'}}>
                    <strong>{fmtMoney(metrics.service)}</strong>
                    <div className="tax-pct-sub">{Math.round(taxPcts.service)}%</div>
                </div>
            </div>
            <div className="list-item tax-item">
                <div className="tax-label">
                    <span className="dot-indicator" style={{background:'#10b981'}}></span>
                    <span>GST / VAT</span>
                </div>
                <div style={{textAlign:'right'}}>
                    <strong>{fmtMoney(metrics.tax)}</strong>
                    <div className="tax-pct-sub">{Math.round(taxPcts.vat)}%</div>
                </div>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="card-panel">
          <h4 className="panel-title"><FaGlobeAmericas /> Channels</h4>
          <div className="panel-list">
            {BOOKING_CHANNELS.map((ch) => {
              const val = metrics.channelRevenue?.[ch] ?? 0;
              const color = ch === "Booking.com" ? "#003580" : ch === "Airbnb" ? "#ff385c" : ch === "Agoda" ? "#ed1c24" : "#10b981";
              const icon = ch === "Booking.com" ? <FaCalendarCheck style={{ color }} /> : ch === "Airbnb" ? <FaHome style={{ color }} /> : ch === "Agoda" ? <FaGlobeAmericas style={{ color }} /> : <FaDoorOpen style={{ color }} />;
              return (
                <div key={ch} className="channel-row">
                  <div className="row-head">
                    <span className="ch-name">{icon} {ch}</span>
                    <small>{fmtMoney(val)}</small>
                  </div>
                  <div className="progress-bg"><div className="progress-fill" style={{ width: '100%', backgroundColor: color, opacity: val > 0 ? 1 : 0.2 }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment method */}
        <div className="card-panel">
          <h4 className="panel-title"><FaCreditCard /> Payment method</h4>
          <div className="panel-list">
            {PAYMENT_METHODS.map((pm) => {
              const val = metrics.paymentRevenue?.[pm] ?? 0;
              const color = pm === "Cash" ? "#10b981" : "#3b82f6";
              return (
                <div key={pm} className="channel-row">
                  <div className="row-head">
                    <span className="ch-name"><FaWallet style={{ color }} /> {pm}</span>
                    <small>{fmtMoney(val)}</small>
                  </div>
                  <div className="progress-bg"><div className="progress-fill" style={{ width: '100%', backgroundColor: color, opacity: val > 0 ? 1 : 0.2 }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="card-panel">
            <h4 className="panel-title"><FaChartLine /> Revenue Sources</h4>
            <div className="panel-list scrollable-list">
                <div className="list-item">
                    <div style={{display:'flex', alignItems:'center', gap: 8}}>
                        <div className="icon-tiny" style={{background: '#6366f1'}}><FaBed style={{color:'white'}}/></div>
                        <span>Room Revenue</span>
                    </div>
                    <strong>{fmtMoney(metrics.roomRevenue)}</strong>
                </div>
                {REVENUE_CATS.map(cat => (
                    <div className="list-item" key={cat.key}>
                        <div style={{display:'flex', alignItems:'center', gap: 8}}>
                            <div className="icon-tiny" style={{background: cat.color}}>{React.cloneElement(cat.icon, {style:{color:'white'}})}</div>
                            <span>{cat.label}</span>
                        </div>
                        <strong>{fmtMoney(metrics.revenueBreakdown?.[cat.key])}</strong>
                    </div>
                ))}
            </div>
        </div>

        {/* Expenses */}
        <div className="card-panel">
            <h4 className="panel-title"><FaWallet /> Expenses</h4>
            <div className="panel-list scrollable-list">
                {EXPENSE_CATS.map(cat => (
                    <div className="list-item" key={cat.key}>
                        <div style={{display:'flex', alignItems:'center', gap: 8}}>
                            <div className="icon-tiny" style={{background: cat.color}}>{React.cloneElement(cat.icon, {style:{color:'white'}})}</div>
                            <span>{cat.label}</span>
                        </div>
                        <strong style={{color: '#ef4444'}}>{metrics.expenseBreakdown?.[cat.key] > 0 ? `-${fmtMoney(metrics.expenseBreakdown?.[cat.key])}` : '$0.00'}</strong>
                    </div>
                ))}
                <div className="list-item">
                    <div style={{display:'flex', alignItems:'center', gap: 8}}>
                         <div className="icon-tiny" style={{background: '#94a3b8'}}><FaChartLine style={{color:'white'}}/></div>
                         <span>Other</span>
                    </div>
                    <strong style={{color: '#ef4444'}}>{metrics.expenseBreakdown?.["Other"] > 0 ? `-${fmtMoney(metrics.expenseBreakdown?.["Other"])}` : '$0.00'}</strong>
                </div>
            </div>
        </div>

        {/* Top 10 Nationalities */}
        <div className="card-panel">
            <h4 className="panel-title"><FaGlobe /> Top 10 Nationalities</h4>
            <div className="panel-list scrollable-list" style={{maxHeight: '400px', overflowY: 'auto'}}>
                {topNationalities && topNationalities.length > 0 ? (
                    topNationalities.map((item, idx) => (
                        <div className="list-item" key={item.name} style={{padding: '12px 0', borderBottom: idx < topNationalities.length - 1 ? '1px solid #f1f5f9' : 'none'}}>
                            <div style={{display:'flex', alignItems:'center', gap: 12, width: '100%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                                    <span 
                                        className={`fi fi-${item.code || 'un'}`}
                                        style={{
                                            fontSize: '24px',
                                            borderRadius: '4px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    ></span>
                                    <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                                        <span style={{fontWeight: 600, color: '#0f172a', fontSize: '14px'}}>{item.name}</span>
                                        <span style={{fontSize: '12px', color: '#64748b'}}>{item.count} {item.count === 1 ? 'arrival' : 'arrivals'}</span>
                                    </div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontWeight: 700, color: '#6366f1', fontSize: '16px'}}>{item.percentage}%</div>
                                    <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>#{idx + 1}</div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px'}}>
                        No nationality data available
                    </div>
                )}
            </div>
        </div>

        {/* Cash Balance */}
        <div className="card-panel">
            <h4 className="panel-title"><FaCoins /> Cash Balance</h4>
            <div style={{padding: '20px', textAlign: 'center'}}>
                <div style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    color: cashBalance >= 0 ? '#10b981' : '#ef4444',
                    marginBottom: '8px',
                    fontFamily: 'monospace'
                }}>
                    {fmtMoney(cashBalance)}
                </div>
                <div style={{fontSize: '13px', color: '#64748b', marginBottom: '16px'}}>
                    Cash Revenue - Cash Expenses
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <div style={{textAlign: 'left'}}>
                        <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Revenue</div>
                        <div style={{fontSize: '18px', fontWeight: 700, color: '#10b981'}}>
                            {fmtMoney(metrics.paymentRevenue?.["Cash"] || 0)}
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Expenses</div>
                        <div style={{fontSize: '18px', fontWeight: 700, color: '#ef4444'}}>
                            {fmtMoney((metrics.expenses || 0) * ((metrics.paymentRevenue?.["Cash"] || 0) / (metrics.revenue || 1)))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Bank Balance */}
        <div className="card-panel">
            <h4 className="panel-title"><FaUniversity /> Bank Balance</h4>
            <div style={{padding: '20px', textAlign: 'center'}}>
                <div style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    color: '#6366f1',
                    marginBottom: '8px',
                    fontFamily: 'monospace'
                }}>
                    {fmtMoney(bankBalance)}
                </div>
                <div style={{fontSize: '13px', color: '#64748b', marginBottom: '16px'}}>
                    Cash + Credit Card Revenue
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <div style={{textAlign: 'left'}}>
                        <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Cash Revenue</div>
                        <div style={{fontSize: '18px', fontWeight: 700, color: '#10b981'}}>
                            {fmtMoney(metrics.paymentRevenue?.["Cash"] || 0)}
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}}>Credit Card Revenue</div>
                        <div style={{fontSize: '18px', fontWeight: 700, color: '#3b82f6'}}>
                            {fmtMoney(metrics.paymentRevenue?.["Credit Card"] || 0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* === COMPREHENSIVE TABLE === */}
      <div className="table-container-modern">
        <div className="table-header">
          <h3>Full Performance Report {plYear} <span style={{fontSize: 12, fontWeight: 400, color: '#94a3b8'}}>(Click row for details)</span></h3>
        </div>
        <div className="table-wrapper">
            <table className="modern-table">
            <thead>
                <tr>
                <th style={{width: '14%'}}>
                    <div className="th-content"><FaCalendarAlt /> Month</div>
                </th>
                <th style={{width: '12%', textAlign:'right'}}>
                    <div className="th-content right"><FaDollarSign /> Revenue</div>
                </th>
                <th style={{width: '12%', textAlign:'right'}}>
                    <div className="th-content right"><FaArrowDown /> Exp</div>
                </th>
                <th style={{width: '12%', textAlign:'right'}}>
                    <div className="th-content right"><FaChartLine /> Net</div>
                </th>
                <th style={{width: '8%', textAlign:'center'}}>
                    <div className="th-content center"><FaDoorOpen /> Avail</div>
                </th>
                <th style={{width: '8%', textAlign:'center'}}>
                    <div className="th-content center"><FaBed /> Sold</div>
                </th>
                <th style={{width: '8%', textAlign:'center'}}>
                    <div className="th-content center"><FaPercentage /> Occ</div>
                </th>
                <th style={{width: '13%', textAlign:'right'}}>
                    <div className="th-content right"><FaTags /> ADR</div>
                </th>
                <th style={{width: '13%', textAlign:'right'}}>
                    <div className="th-content right"><FaGem /> RevPAR</div>
                </th>
                </tr>
            </thead>
            <tbody>
                {plMonthly.map((m) => {
                    const revPar = m.roomsAvailable > 0 ? (m.revenue / m.roomsAvailable) : 0;
                    return (
                        <tr 
                            key={m.month} 
                            className={`table-row ${m.month === plMonth ? "current-month-row" : ""}`}
                            onClick={() => setSelectedMonthDetails(m)}
                            style={{cursor: 'pointer'}}
                        >
                            <td className="month-name">
                                {m.monthName.slice(0, 3)}
                                {m.month === plMonth && <span className="tag-current">Now</span>}
                            </td>
                            
                            <td style={{textAlign:'right', fontWeight: 600, color: '#0f172a'}}>{fmtMoney(m.revenue)}</td>
                            <td style={{textAlign:'right', color: '#ef4444'}}>-{fmtMoney(m.expenses)}</td>
                            <td style={{textAlign:'right'}}>
                               <span style={{color: m.net >= 0 ? '#10b981' : '#ef4444', fontWeight: 700}}>
                                 {fmtMoney(m.net)}
                               </span>
                            </td>

                            <td style={{textAlign:'center', color: '#64748b'}}>{fmtInt(m.roomsAvailable)}</td>
                            <td style={{textAlign:'center', color: '#6366f1', fontWeight: 700}}>{fmtInt(m.roomsSold)}</td>
                            <td style={{textAlign:'center'}}>
                                <span className={`status-badge ${m.occupancy >= 0.7 ? 'plus' : m.occupancy >= 0.4 ? 'mid' : 'minus'}`} style={{background: 'transparent', border: '1px solid #e2e8f0'}}>
                                    {Math.round(m.occupancy * 100)}%
                                </span>
                            </td>
                            
                            <td style={{textAlign:'right', color: '#0f172a'}}>{fmtMoney(m.adr)}</td>
                            <td style={{textAlign:'right', fontWeight: 800, color: '#10b981'}}>{fmtMoney(revPar)}</td>
                        </tr>
                    );
                })}

                {/* --- TOTAL YEAR ROW --- */}
                <tr 
                    className="table-row total-row" 
                    onClick={() => setSelectedMonthDetails(yearTotals)}
                    style={{cursor: 'pointer', backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0'}}
                >
                    <td className="month-name" style={{fontSize: 14, fontWeight: 800, color: '#0f172a'}}>TOTAL</td>
                    
                    <td style={{textAlign:'right', fontWeight: 900, color: '#0f172a', fontSize: 13}}>{fmtMoney(yearTotals.revenue)}</td>
                    <td style={{textAlign:'right', color: '#ef4444', fontWeight: 800, fontSize: 13}}>-{fmtMoney(yearTotals.expenses)}</td>
                    <td style={{textAlign:'right'}}>
                        <span style={{color: yearTotals.net >= 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: 13}}>
                            {fmtMoney(yearTotals.net)}
                        </span>
                    </td>

                    <td style={{textAlign:'center', color: '#64748b', fontWeight: 700}}>{fmtInt(yearTotals.roomsAvailable)}</td>
                    <td style={{textAlign:'center', color: '#6366f1', fontWeight: 900}}>{fmtInt(yearTotals.roomsSold)}</td>
                    <td style={{textAlign:'center'}}>
                        <span className={`status-badge ${yearTotals.occupancy >= 0.7 ? 'plus' : yearTotals.occupancy >= 0.4 ? 'mid' : 'minus'}`} style={{background: 'white', border: '1px solid #cbd5e1'}}>
                            {Math.round(yearTotals.occupancy * 100)}%
                        </span>
                    </td>
                    
                    <td style={{textAlign:'right', color: '#0f172a', fontWeight: 700}}>{fmtMoney(yearTotals.adr)}</td>
                    <td style={{textAlign:'right', fontWeight: 900, color: '#10b981', fontSize: 13}}>{fmtMoney(yearTotals.roomsAvailable > 0 ? yearTotals.revenue / yearTotals.roomsAvailable : 0)}</td>
                </tr>

            </tbody>
            </table>
        </div>
      </div>

      {renderMonthDetailModal()}

      {/* CSS Styles */}
      <style>{`
        .dashboard-container {
          padding: 30px;
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #334155;
        }

        /* Filter */
        .filter-bar-glass {
          background: white; padding: 10px 20px; border-radius: 16px;
          display: flex; flex-wrap: wrap; gap: 20px; align-items: center;
          margin-bottom: 25px; border: 1px solid #e2e8f0;
        }
        .filter-group { display: flex; align-items: center; gap: 5px; }
        .filter-btn {
          padding: 8px 16px; border-radius: 10px; border: none; background: transparent;
          color: #64748b; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .filter-btn:hover { background: #f8fafc; }
        .filter-btn.active { background: #eff6ff; color: #2563eb; }
        .custom-date-picker { display: flex; align-items: center; gap: 10px; padding-left: 15px; border-left: 1px solid #e2e8f0; }
        .filter-input { border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; color: #475569; font-size: 13px; }

        /* Grid */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px; margin-bottom: 25px;
        }
        .kpi-card-modern {
          background: white; padding: 20px; border-radius: 18px;
          display: flex; align-items: center; gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #f1f5f9;
        }
        .icon-wrapper { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
        .kpi-content { display: flex; flex-direction: column; }
        .kpi-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { margin: 4px 0 0 0; font-size: 20px; font-weight: 800; color: #0f172a; }

        .details-grid-4 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 25px;
        }
        .card-panel {
            background: white; padding: 20px; border-radius: 18px; border: 1px solid #f1f5f9;
            display: flex; flex-direction: column;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02); height: 100%;
        }
        .panel-title { margin: 0 0 15px 0; font-size: 14px; color: #1e293b; display: flex; align-items: center; gap: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .panel-list { display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .list-item {
            display: flex; justify-content: space-between; align-items: center;
            padding-bottom: 8px; border-bottom: 1px solid #f8fafc; font-size: 13px; font-weight: 500;
        }
        .list-item:last-child { border-bottom: none; }
        .icon-tiny { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; font-size: 12px; }
        .channel-row { margin-bottom: 10px; }
        .row-head { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; font-weight: 600; }
        .ch-name { display: flex; align-items: center; gap: 6px; }
        .progress-bg { height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; }

        .tax-card-v2 .tax-total-badge {
            background: #f1f5f9; color: #0f172a; font-weight: 800; 
            padding: 6px 12px; border-radius: 8px; font-size: 16px;
        }
        .tax-vis-bar {
            height: 12px; width: 100%; display: flex; border-radius: 6px; overflow: hidden; margin-bottom: 10px;
        }
        .vis-segment { height: 100%; }
        .tax-item { padding: 12px 0; }
        .tax-label { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; font-weight: 600; }
        .dot-indicator { width: 10px; height: 10px; border-radius: 50%; }
        .tax-pct-sub { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 2px; }


        /* --- TABLE STYLES --- */
        .table-container-modern {
          background: white; border-radius: 20px; overflow: hidden;
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;
        }
        .table-header { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; background: #fff; }
        .table-header h3 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 700; }
        
        .table-wrapper { 
            overflow-x: auto; 
            max-height: 500px;
            -ms-overflow-style: none; scrollbar-width: none;
        }
        .table-wrapper::-webkit-scrollbar { display: none; }

        .modern-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .modern-table th {
          position: sticky; top: 0; z-index: 10;
          background: #f8fafc; padding: 14px 15px; 
          border-bottom: 2px solid #e2e8f0;
        }
        
        .th-content {
            display: flex; align-items: center; gap: 6px;
            font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; color: #64748b;
        }
        .th-content.right { justify-content: flex-end; }
        .th-content.center { justify-content: center; }

        .modern-table td { 
            padding: 16px 15px; border-bottom: 1px solid #f1f5f9; 
            color: #334155; font-size: 13px; font-weight: 500; vertical-align: middle;
        }

        .table-row { transition: background-color 0.15s ease; }
        .table-row:hover { background-color: #f8fafc; }
        
        .month-name { font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .tag-current { background: #6366f1; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
        .val-cell { font-family: 'Segoe UI', sans-serif; }

        .status-badge { 
            padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;
            font-family: 'Segoe UI', sans-serif;
        }
        .status-badge.plus { background: #dcfce7; color: #166534; }
        .status-badge.mid { background: #fff7ed; color: #c2410c; }
        .status-badge.minus { background: #fee2e2; color: #991b1b; }
        
        .current-month-row { background-color: #eff6ff; border-left: 3px solid #6366f1; }
        
        .total-row:hover { background-color: #f1f5f9 !important; }

        /* --- MODAL STYLES --- */
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
            z-index: 1000; display: flex; justify-content: center; align-items: center;
        }
        .modal-content {
            background: white; padding: 25px; width: 90%; max-width: 650px;
            border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
        .close-btn { background: transparent; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
        .close-btn:hover { color: #ef4444; }

        .summary-banner {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
            background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0;
        }
        .sb-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .sb-item span { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .sb-item strong { font-size: 18px; }

        .breakdown-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .bd-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
        .bd-list { display: flex; flex-direction: column; gap: 12px; }
        .bd-row { display: flex; justify-content: space-between; font-size: 13px; color: #334155; }
        .bd-row span:last-child { font-weight: 600; }
      `}</style>
    </div>
  );
}