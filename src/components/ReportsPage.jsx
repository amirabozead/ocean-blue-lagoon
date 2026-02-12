import React, { useState, useMemo, useCallback } from "react";
import { 
  FaDollarSign, FaChartLine, FaBed, FaWallet, FaReceipt, 
  FaCalendarAlt, FaHotel, FaGlobeAmericas, 
  FaUtensils, FaTshirt, FaSpa, FaSnowboarding, FaConciergeBell,
  FaBolt, FaTools, FaBroom, FaBullhorn, FaUsers, FaBoxOpen,
  FaCalendarCheck, FaHome, FaDoorOpen, FaPercentage, FaTags, FaGem, FaArrowDown, FaTimes
} from "react-icons/fa";
import { ymd, parseYMD, calcNights, storeLoad } from "../utils/helpers";

// --- Constants ---
const HOTEL_LOGO = "/logo.png"; 

const fmtNum = (num) => (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (num) => (num || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMoney = (num) => `$${fmtNum(num)}`;

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
      return { 
        revenue: 0, roomRevenue: 0, 
        revenueBreakdown: {}, expenseBreakdown: {},
        tax: 0, service: 0, cityTax: 0, expenses: 0, net: 0, 
        occupancy: 0, adr: 0, roomsAvailable: 0, roomsSold: 0, 
        payRevenue: { Cash: 0, Card: 0, "Booking.com": 0, Airbnb: 0 } 
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


    const payRevenue = { Cash: 0, Card: 0, "Booking.com": 0, Airbnb: 0 };

    // 🔒 Physical OOS rooms reduce available capacity (independent of reservations)
    const roomPhysicalStatus = storeLoad("ocean_room_physical_v1", {}) || {};
    const oosRoomsCount = Object.values(roomPhysicalStatus).filter((v) => {
      const s = String(v || "");
      return /out/i.test(s) && /(order|service)/i.test(s);
    }).length;


    cleanReservations.forEach((r) => {
      const ci = r.stay.checkIn;
      const co = r.stay.checkOut;
      const status = r.status || "Booked";
      const stayNights = Math.max(1, calcNights(ci, co) || 0);
      
      nightDays.forEach((day) => {
        if (day >= ci && day < co) {
          if (status === "Out of Service") {
            oosNightsCount += 1;
          } else {
            const ratio = 1 / stayNights;
            const perNightRevenue = Number(r.pricing?.subtotal || r.room?.roomRate || 0) * ratio;
            
            revenue += perNightRevenue;
            roomRevenue += perNightRevenue; 

            sumTax += (Number(r.pricing?.taxAmount || 0) * ratio);
            sumService += (Number(r.pricing?.serviceAmount || 0) * ratio);
            sumCityTax += (Number(r.pricing?.cityTaxAmount || 0) * ratio);
            
            const source = r.source || r.channel || ""; 
            const pm = r.paymentMethod || "Cash";

            if (source.toLowerCase().includes("booking")) {
                payRevenue["Booking.com"] += perNightRevenue;
            } else if (source.toLowerCase().includes("airbnb")) {
                payRevenue["Airbnb"] += perNightRevenue;
            } else {
                if (pm === "Card" || pm === "Credit Card") payRevenue["Card"] += perNightRevenue;
                else payRevenue["Cash"] += perNightRevenue;
            }
            occupiedNightsCount += 1;
          }
        }
      });
    });

    if (extraRevenues && extraRevenues.length > 0) {
      extraRevenues.forEach(item => {
        const d = item.date;
        if (d >= fromStr && d <= toStr) {
          const amt = Number(item.amount || 0);
          revenue += amt;
          const cat = item.category || "Services"; 
          const matchedKey = REVENUE_CATS.find(c => c.key.toLowerCase() === cat.toLowerCase())?.key || "Services";
          if (revenueBreakdown[matchedKey] !== undefined) revenueBreakdown[matchedKey] += amt;
          else revenueBreakdown["Services"] += amt;
        }
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

    return { 
      revenue, roomRevenue, revenueBreakdown, expenseBreakdown,
      tax: sumTax, service: sumService, cityTax: sumCityTax,
      expenses: expensesTotal, net: revenue - expensesTotal, 
      occupancy: netAvailableRooms > 0 ? occupiedNightsCount / netAvailableRooms : 0, 
      adr: occupiedNightsCount > 0 ? revenue / occupiedNightsCount : 0,
      roomsAvailable: netAvailableRooms, roomsSold: occupiedNightsCount, payRevenue,
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

  const totalTaxes = (metrics.cityTax || 0) + (metrics.service || 0) + (metrics.tax || 0);
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
        revenueBreakdown: {}, expenseBreakdown: {}
    };
    
    // Init breakdowns
    REVENUE_CATS.forEach(c => acc.revenueBreakdown[c.key] = 0);
    acc.revenueBreakdown["Services"] = 0;
    EXPENSE_CATS.forEach(c => acc.expenseBreakdown[c.key] = 0);
    acc.expenseBreakdown["Other"] = 0;

    plMonthly.forEach(m => {
        acc.revenue += m.revenue;
        acc.expenses += m.expenses;
        acc.net += m.net;
        acc.roomsAvailable += m.roomsAvailable;
        acc.roomsSold += m.roomsSold;
        acc.roomRevenue += m.roomRevenue;
        
        Object.keys(m.revenueBreakdown || {}).forEach(k => {
            acc.revenueBreakdown[k] = (acc.revenueBreakdown[k] || 0) + (m.revenueBreakdown[k] || 0);
        });
        Object.keys(m.expenseBreakdown || {}).forEach(k => {
            acc.expenseBreakdown[k] = (acc.expenseBreakdown[k] || 0) + (m.expenseBreakdown[k] || 0);
        });
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

    return (
        <div className="modal-overlay" onClick={() => setSelectedMonthDetails(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 style={{margin:0}}>{m.monthName} {m.monthName === "Full Year Total" ? "" : plYear}</h2>
                        <span style={{fontSize: 13, color: '#64748b'}}>Detailed Performance Breakdown</span>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedMonthDetails(null)}><FaTimes /></button>
                </div>
                
                <div className="modal-body">
                    {/* Summary Row */}
                    <div className="summary-banner">
                         <div className="sb-item">
                            <span>Revenue</span>
                            <strong style={{color:'#6366f1'}}>{fmtMoney(m.revenue)}</strong>
                         </div>
                         <div className="sb-item">
                            <span>Expenses</span>
                            <strong style={{color:'#ef4444'}}>{fmtMoney(m.expenses)}</strong>
                         </div>
                         <div className="sb-item">
                            <span>Net Profit</span>
                            <strong style={{color: m.net>=0 ? '#10b981' : '#ef4444'}}>{fmtMoney(m.net)}</strong>
                         </div>
                    </div>

                    <div className="breakdown-columns">
                        {/* Revenue Column */}
                        <div className="bd-col">
                            <h4 className="bd-title" style={{color:'#6366f1'}}>Revenue Breakdown</h4>
                            <div className="bd-list">
                                <div className="bd-row">
                                    <span>Room Revenue</span>
                                    <strong>{fmtMoney(m.roomRevenue)}</strong>
                                </div>
                                {REVENUE_CATS.map(cat => (
                                    <div className="bd-row" key={cat.key}>
                                        <span>{cat.label}</span>
                                        <span>{fmtMoney(m.revenueBreakdown?.[cat.key])}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Expense Column */}
                        <div className="bd-col">
                            <h4 className="bd-title" style={{color:'#ef4444'}}>Expense Breakdown</h4>
                            <div className="bd-list">
                                {EXPENSE_CATS.map(cat => (
                                    <div className="bd-row" key={cat.key}>
                                        <span>{cat.label}</span>
                                        <span>{fmtMoney(m.expenseBreakdown?.[cat.key])}</span>
                                    </div>
                                ))}
                                <div className="bd-row">
                                    <span>Other</span>
                                    <span>{fmtMoney(m.expenseBreakdown?.["Other"])}</span>
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
            <div className="channel-row">
                <div className="row-head">
                    <span className="ch-name"><FaCalendarCheck style={{color:'#003580'}} /> Booking.com</span>
                    <small>{fmtMoney(metrics.payRevenue?.["Booking.com"])}</small>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{width: '100%', backgroundColor: '#003580', opacity: metrics.payRevenue?.["Booking.com"] > 0 ? 1 : 0.2}}></div></div>
            </div>
            <div className="channel-row">
                <div className="row-head">
                    <span className="ch-name"><FaHome style={{color:'#ff385c'}} /> Airbnb</span>
                    <small>{fmtMoney(metrics.payRevenue?.["Airbnb"])}</small>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{width: '100%', backgroundColor: '#ff385c', opacity: metrics.payRevenue?.["Airbnb"] > 0 ? 1 : 0.2}}></div></div>
            </div>
            <div className="channel-row">
                <div className="row-head">
                    <span className="ch-name"><FaWallet style={{color:'#10b981'}} /> Cash & Card</span>
                    <small>{fmtMoney((metrics.payRevenue?.Cash || 0) + (metrics.payRevenue?.Card || 0))}</small>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{width: '100%', backgroundColor: '#10b981', opacity: (metrics.payRevenue?.Cash + metrics.payRevenue?.Card) > 0 ? 1 : 0.2}}></div></div>
            </div>
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
      <style jsx>{`
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