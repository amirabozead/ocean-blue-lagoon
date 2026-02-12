import React, { useState, useMemo } from "react";
import { FaCalendarAlt, FaTrash, FaEdit, FaPlus, FaSave, FaUtensils, FaBed, FaFilter, FaTags } from "react-icons/fa";
import { ROOM_TYPES } from "../data/constants"; 
import { money, uid, toDate, startOfDay, rateCoversDay } from "../utils/helpers";

// 🔥 تأكد من وجود الصورة في مجلد public باسم logo.png
const HOTEL_LOGO = "/logo.png"; 

export default function DailyRatePage({ dailyRates, setDailyRates }) {
  // 1. States
  const [rateForm, setRateForm] = useState({
    roomType: "Standard Double Room",
    from: "",
    to: "",
    rate: "",
    pkgBB: "",
    pkgHB: "",
    pkgFB: "",
  });
  
  const [editingRateId, setEditingRateId] = useState(null); 
  const [previewType, setPreviewType] = useState("Standard Double Room");
  const [previewStart, setPreviewStart] = useState(() => new Date().toISOString().slice(0, 10));

  // Filter States
  const [filterRoom, setFilterRoom] = useState("All");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // 2. Logic
  const previewDays = useMemo(() => {
    const start = toDate(previewStart) || new Date();
    const s = startOfDay(start);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().slice(0, 10);
      
      const safeRates = Array.isArray(dailyRates) ? dailyRates : [];
      const match = safeRates.find((r) => r.roomType === previewType && rateCoversDay(r, dayStr));
      
      return {
        date: dayStr,
        label: d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }),
        rate: match ? match.rate : null,
        status: match ? "Set" : "Empty",
      };
    });
  }, [previewStart, previewType, dailyRates]);

  const filteredRates = useMemo(() => {
    return (dailyRates || []).filter(r => {
      if (filterRoom !== "All" && r.roomType !== filterRoom) return false;
      const rateDate = new Date(r.from);
      if (filterMonth !== "All" && (rateDate.getMonth() + 1) !== Number(filterMonth)) return false;
      if (filterYear !== "All" && rateDate.getFullYear() !== Number(filterYear)) return false;
      return true;
    });
  }, [dailyRates, filterRoom, filterMonth, filterYear]);

  // 3. Actions
  const saveRate = () => {
    const { roomType, from, to, rate, pkgBB, pkgHB, pkgFB } = rateForm;
    if (!roomType || !from || !to || !rate) return alert("Please fill in all required fields.");

    const payload = {
      id: editingRateId || uid(),
      roomType,
      from,
      to,
      rate: Number(rate),
      packages: {
        BB: Number(pkgBB || 0),
        HB: Number(pkgHB || 0),
        FB: Number(pkgFB || 0),
      },
      updatedAt: new Date().toISOString(),
    };

    if (editingRateId) {
      setDailyRates((prev) => prev.map((r) => (r.id === editingRateId ? payload : r)));
    } else {
      setDailyRates((prev) => [payload, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (r) => {
    setEditingRateId(r.id);
    setRateForm({
      roomType: r.roomType,
      from: r.from,
      to: r.to,
      rate: r.rate,
      pkgBB: r.packages?.BB || "",
      pkgHB: r.packages?.HB || "",
      pkgFB: r.packages?.FB || "",
    });
  };

  const resetForm = () => {
    setRateForm({ roomType: "Standard Double Room", from: "", to: "", rate: "", pkgBB: "", pkgHB: "", pkgFB: "" });
    setEditingRateId(null);
  };

  // 4. Styles
  const styles = {
    container: { padding: "30px", background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" },
    
    headerCard: { 
        position: "relative", 
        background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)", 
        padding: "20px 30px", 
        borderRadius: "16px", 
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px", 
        border: "1px solid #bae6fd" 
    },
    
    grid: { display: "grid", gridTemplateColumns: "380px 1fr", gap: "30px" },
    card: { background: "white", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", overflow: "hidden", border: "1px solid #f1f5f9" },
    cardHeader: { background: editingRateId ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)", padding: "20px", color: "white", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
    cardBody: { padding: "25px" },
    inputGroup: { marginBottom: "15px" },
    label: { display: "block", fontSize: "12px", color: "#64748b", fontWeight: "bold", marginBottom: "5px", textTransform: "uppercase" },
    input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "14px", outline: "none", transition: "0.3s" },
    selectInput: { width: "100%", maxWidth: "280px", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "14px", outline: "none", fontWeight: "600", color: "#334155", cursor: "pointer" },
    previewSelect: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", fontSize: "13px", color: "#475569", cursor: "pointer", maxWidth: "200px" },
    rateInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "none", background: "transparent", fontSize: "18px", fontWeight: "bold", color: "#0369a1", outline: "none" },
    pkgInput: { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "normal", color: "#334155", fontSize: "14px", backgroundColor: "#ffffff", outline: "none", transition: "border-color 0.3s" },
    btnPrimary: { width: "100%", padding: "15px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", marginTop: "15px", boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)" },
    previewContainer: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px", marginTop: "15px" },
    previewBox: (isActive) => ({ background: isActive ? "#eff6ff" : "#f8fafc", border: isActive ? "2px solid #3b82f6" : "1px solid #e2e8f0", borderRadius: "12px", padding: "15px", textAlign: "center" }),
    filterBar: { padding: "15px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "10px", alignItems: "center" },
    filterInput: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#334155", outline: "none", background: "white", cursor: "pointer" },
    
    // Logo Style
    logoImage: {
        width: "80px",
        height: "80px",
        objectFit: "cover",
        borderRadius: "50%",
        border: "3px solid #e0f2fe", 
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerCard}>
        {/* Left Side: Logo & Hotel Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Blue Lagoon" style={styles.logoImage} onError={(e) => e.target.style.display='none'} />
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "36px", fontFamily: "'Brush Script MT', cursive", letterSpacing: "1px", fontWeight: "normal", lineHeight: "1" }}>
              Ocean Blue Lagoon
            </h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>
              Maldives Resort
            </span>
          </div>
        </div>

        {/* 🔥 Center Title & Icon: Side by Side (Row) */}
        <div style={{ 
          position: "absolute", 
          left: "50%", 
          transform: "translateX(-50%)", 
          display: "flex",          // جعلنا العناصر بجانب بعضها
          alignItems: "center",     // محاذاة عمودية
          gap: "10px"               // مسافة بين الكلمة والأيقونة
        }}>
           <span style={{ 
             fontSize: "24px", 
             fontWeight: "bold", 
             color: "#1e293b", 
             fontFamily: "'Playfair Display', serif", 
             fontStyle: "italic",
             textShadow: "0px 2px 4px rgba(0,0,0,0.1)",
             lineHeight: "1"
           }}>
             Rates Manager
           </span>
           {/* 🔥 The Icon is now NEXT to the text */}
           <FaTags style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        {/* Right Side: Total Records */}
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#0ea5e9", textTransform: "uppercase" }}>Total Records</span>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a" }}>{dailyRates?.length || 0}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Editor Form */}
        <div style={{ height: "fit-content" }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              {editingRateId ? <FaEdit /> : <FaPlus />} 
              {editingRateId ? "Update Rate" : "Add New Rate"}
            </div>
            <div style={styles.cardBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}><FaBed style={{marginRight:5}}/> Room Type</label>
                <select style={styles.selectInput} value={rateForm.roomType} onChange={(e) => setRateForm({...rateForm, roomType: e.target.value})}>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div><label style={styles.label}>From</label><input type="date" style={styles.input} value={rateForm.from} onChange={(e) => setRateForm({...rateForm, from: e.target.value})} /></div>
                <div><label style={styles.label}>To</label><input type="date" style={styles.input} value={rateForm.to} onChange={(e) => setRateForm({...rateForm, to: e.target.value})} /></div>
              </div>

              <div style={{ background: "#f0f9ff", padding: "12px", borderRadius: "12px", border: "1px solid #bae6fd", marginBottom: "20px" }}>
                <label style={{ ...styles.label, color: "#0284c7" }}>Nightly Rate ($)</label>
                <input type="number" placeholder="0.00" style={styles.rateInput} value={rateForm.rate} onChange={(e) => setRateForm({...rateForm, rate: e.target.value})} />
              </div>

              <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" }}><FaUtensils size={10}/> Food Package Rates (Add-on)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "3px", textAlign:"center" }}>BB</span>
                    <input type="number" placeholder="0" style={styles.pkgInput} value={rateForm.pkgBB} onChange={(e) => setRateForm({...rateForm, pkgBB: e.target.value})} />
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "3px", textAlign:"center" }}>HB</span>
                    <input type="number" placeholder="0" style={styles.pkgInput} value={rateForm.pkgHB} onChange={(e) => setRateForm({...rateForm, pkgHB: e.target.value})} />
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "3px", textAlign:"center" }}>FB</span>
                    <input type="number" placeholder="0" style={styles.pkgInput} value={rateForm.pkgFB} onChange={(e) => setRateForm({...rateForm, pkgFB: e.target.value})} />
                  </div>
                </div>
              </div>

              <button style={styles.btnPrimary} onClick={saveRate}>
                <FaSave style={{ marginRight: "8px" }}/>
                {editingRateId ? "Update Rate" : "Save Rate"}
              </button>
              
              {editingRateId && (
                <button onClick={resetForm} style={{ width: "100%", padding: "10px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", marginTop: "10px" }}>Cancel</button>
              )}
            </div>
          </div>
        </div>

        {/* Preview & List */}
        <div>
          <div style={{ ...styles.card, marginBottom: "30px" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#334155" }}><FaCalendarAlt color="#3b82f6"/> Availability Pulse (7 Days)</h3>
              <select style={styles.previewSelect} value={previewType} onChange={(e) => setPreviewType(e.target.value)}>
                 {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={styles.previewContainer}>
                {previewDays.map((d) => (
                  <div key={d.date} style={styles.previewBox(d.status === "Set")}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>{d.label.split(' ')[0]}</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", margin: "5px 0", color: "#1e293b" }}>{d.label.split(' ')[1]}</div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: d.status === "Set" ? "#2563eb" : "#cbd5e1" }}>
                      {d.rate ? `$${d.rate}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, color: "#334155" }}>Active Rates</h3>
            </div>
            
            {/* Filter Bar */}
            <div style={styles.filterBar}>
               <FaFilter color="#94a3b8" />
               <select style={styles.filterInput} value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
                 <option value="All">All Rooms</option>
                 {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
               </select>

               <select style={styles.filterInput} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                 <option value="All">All Months</option>
                 {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                   <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', {month: 'short'})}</option>
                 ))}
               </select>

               <select style={styles.filterInput} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                 <option value="All">All Years</option>
                 {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <div style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>
                 Found: {filteredRates.length}
               </div>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", padding: "10px" }}>
              {filteredRates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No rates found matching filters.</div>
              ) : (
                filteredRates.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", marginBottom: "10px", background: "white", border: "1px solid #f1f5f9", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                      <div style={{ height: "40px", width: "4px", background: r.roomType.includes("Standard") ? "#06b6d4" : "#8b5cf6", borderRadius: "2px" }}></div>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#1e293b" }}>{r.roomType}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{r.from} ➔ {r.to}</div>
                        <div style={{ fontSize: "14px", color: "#64748b", marginTop: "5px", fontWeight: "normal" }}>
                          Add-ons: BB ${r.packages?.BB || 0} • HB ${r.packages?.HB || 0} • FB ${r.packages?.FB || 0}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>${r.rate}</span>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => handleEdit(r)} style={{ background: "#eff6ff", color: "#3b82f6", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" }}><FaEdit /></button>
                        <button onClick={() => setDailyRates(prev => prev.filter(x => x.id !== r.id))} style={{ background: "#fef2f2", color: "#ef4444", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" }}><FaTrash /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}