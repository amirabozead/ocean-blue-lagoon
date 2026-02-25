import React, { useState, useMemo } from "react";
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaStore, 
  FaBoxOpen, FaExchangeAlt, FaTruckLoading, FaDollarSign, FaExclamationTriangle,
  FaBoxes, FaClipboardList, FaPhone, FaEnvelope, FaHistory, FaArrowRight, FaArrowLeft
} from "react-icons/fa";

// تأكد من المسارات دي عندك
import { money, uid, isoNow, roundTo2 } from "../utils/helpers"; 

const HOTEL_LOGO = "/logo.png"; 

export default function StorePage({ items, setItems, moves, setMoves, suppliers, setSuppliers }) {
  const [view, setView] = useState("items"); // items | moves | suppliers
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sup, setSup] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);

  const [itemModal, setItemModal] = useState({ open: false, mode: "add", item: null });
  const [moveModal, setMoveModal] = useState({ open: false, type: "IN" });
  const [supModal, setSupModal] = useState(false);

  // --- LOGIC ---
  const categories = useMemo(() => {
    const s = new Set((items || []).map((it) => (it.category || "").trim()).filter(Boolean));
    return ["All", ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [items]);

  const supplierNames = useMemo(() => {
    const s = new Set((suppliers || []).map((x) => (x.name || "").trim()).filter(Boolean));
    return ["All", ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [suppliers]);

  const filtered = useMemo(() => {
    const norm = (q || "").trim().toLowerCase();
    return (items || []).filter((it) => {
      const name = (it.name || "").toLowerCase();
      const sku = (it.sku || "").toLowerCase();
      const okQ = !norm || name.includes(norm) || sku.includes(norm);
      const okC = cat === "All" || (it.category || "") === cat;
      const okS = sup === "All" || (it.supplier || "") === sup;
      const stock = Number(it.stock || 0);
      const min = Number(it.minStock || 0);
      const okL = !lowOnly || stock <= min;
      return okQ && okC && okS && okL;
    });
  }, [items, q, cat, sup, lowOnly]);

  const kpis = useMemo(() => {
    const list = items || [];
    const totalItems = list.length;
    const totalUnits = list.reduce((a, it) => a + Number(it.stock || 0), 0);
    const invValue = roundTo2(list.reduce((a, it) => a + Number(it.stock || 0) * Number(it.cost || 0), 0));
    const lowCount = list.filter((it) => Number(it.stock || 0) <= Number(it.minStock || 0)).length;
    return { totalItems, totalUnits, invValue, lowCount };
  }, [items]);

  const recentMoves = useMemo(() => {
    return [...(moves || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 6);
  }, [moves]);

  // Handlers
  const openAdd = () => setItemModal({ open: true, mode: "add", item: null });
  const openEdit = (it) => setItemModal({ open: true, mode: "edit", item: it });
  const closeItemModal = () => setItemModal({ open: false, mode: "add", item: null });

  const saveItem = (payload) => {
    if (!payload?.name?.trim()) return;
    if (itemModal.mode === "edit" && itemModal.item) {
      const id = itemModal.item.id;
      const next = (items || []).map((x) =>
        x.id === id ? { ...x, ...payload, updatedAt: isoNow() } : x
      );
      setItems(next);
    } else {
      const nu = {
        id: uid("itm"),
        createdAt: isoNow(),
        updatedAt: isoNow(),
        stock: 0,
        minStock: 0,
        unit: "pcs",
        ...payload,
      };
      setItems([nu, ...(items || [])]);
    }
    closeItemModal();
  };

  const deleteItem = (id) => {
    if (!id) return;
    if (!window.confirm("Delete this item permanently?")) return;
    setItems((items || []).filter((x) => x.id !== id));
    setMoves((moves || []).filter((m) => m.itemId !== id));
  };

  const applyMove = ({ itemId, type, qty, note, ref }) => {
    const qn = Number(qty || 0);
    if (!itemId || !qn || qn <= 0) return;
    const t = type || "IN";
    const nextItems = (items || []).map((it) => {
      if (it.id !== itemId) return it;
      const cur = Number(it.stock || 0);
      const after = t === "IN" ? cur + qn : t === "OUT" ? Math.max(0, cur - qn) : t === "ADJ" ? qn : cur;
      return { ...it, stock: after, updatedAt: isoNow() };
    });
    setItems(nextItems);
    const mv = {
      id: uid("mv"),
      itemId,
      type: t,
      qty: qn,
      note: note || "",
      ref: ref || "",
      at: isoNow(),
    };
    setMoves([mv, ...(moves || [])]);
  };

  // --- STYLES ---
  const styles = {
    page: { padding: "0", minHeight: "100%", fontFamily: "DM Sans, sans-serif" },
    
    // Header (Updated to match RoomsPage exactly - No Bold)
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
        marginBottom: "30px",
        border: "1px solid #bae6fd" 
    },
    logoImage: {
        width: "80px", height: "80px", objectFit: "cover", borderRadius: "50%",
        border: "3px solid #e0f2fe", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
    },
    headerTitleBox: { display: "flex", flexDirection: "column", alignItems: "center" },
    
    // 🔥 التعديل هنا: إضافة fontWeight: "normal" عشان الخط ميبقاش سميك
    hotelName: { 
        margin: 0, 
        color: "var(--text)", 
        fontSize: "36px", 
        fontFamily: "'Dancing Script', cursive", 
        letterSpacing: "0.6px", 
        lineHeight: "1",
        fontWeight: 600
    },
    subTitle: { 
        fontSize: "20px", 
        fontFamily: "'Dancing Script', cursive", 
        fontWeight: 600,
        color: "var(--muted)", 
        marginTop: "5px" 
    },
    
    centerBadge: { 
        position: "absolute", left: "50%", transform: "translateX(-50%)", 
        display: "flex", alignItems: "center", gap: "10px" 
    },
    pageTitle: { fontSize: "24px", fontWeight: "bold", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", fontStyle: "normal", letterSpacing: "0.2px" },
    
    // Nav Buttons
    navBox: { background: "white", padding: "5px", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", gap: "5px", border: "1px solid #e2e8f0" },
    navBtn: (active) => ({
        padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", 
        fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "white" : "var(--muted)",
        transition: "all 0.2s"
    }),

    // Stats Bar
    statsBar: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "30px" },
    statCard: (color, bg) => ({
        background: "white", borderRadius: "12px", padding: "15px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 6px rgba(0,0,0,0.02)", borderLeft: `5px solid ${color}`, border: "1px solid #f1f5f9"
    }),
    statIcon: (color, bg) => ({ background: bg, padding: "10px", borderRadius: "50%", color: color, display:"flex", alignItems:"center", justifyContent:"center" }),

    // Layout
    gridContainer: { display: "grid", gridTemplateColumns: "3fr 1fr", gap: "25px" },
    panel: { background: "white", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: "1px solid #f1f5f9", overflow: "hidden" },
    
    // Filter Bar
    filterBar: {
      padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", background: "#fff"
    },
    input: { padding: "10px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", minWidth: "220px", background: "#f8fafc" },
    select: { padding: "10px 30px 10px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", background: "white", cursor: "pointer" },
    
    // Table
    tableHeader: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px", background: "#f1f5f9", padding: "15px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
    tableRow: (low) => ({ 
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px", padding: "16px 20px", 
        borderBottom: "1px solid #f8fafc", alignItems: "center", fontSize: "14px", color: "#334155",
        background: low ? "#fef2f2" : "white", transition: "all 0.2s", cursor: "default"
    }),
    
    // Sidebar
    sideTitle: { fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "15px", display:"flex", alignItems:"center", gap:"8px" },
    actionBtn: { width: "100%", padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px", fontSize: "14px", transition: "transform 0.1s" },
    
    // Buttons
    btnPrimary: { background: "var(--primary)", color: "white", padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(180, 83, 9, 0.25)" },
  };

  return (
    <div style={styles.page}>
      
      {/* === HEADER === */}
      <div style={styles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Logo" style={styles.logoImage} onError={(e) => e.target.style.display='none'} />
          <div style={styles.headerTitleBox}>
            <h1 style={styles.hotelName}>Ocean Stay</h1>
            <span style={styles.subTitle}>Maldives</span>
          </div>
        </div>

        <div style={styles.centerBadge}>
           <span style={styles.pageTitle}>Store Manager</span>
           <FaStore style={{ fontSize: "22px", color: "var(--primary)", opacity: 0.9 }} />
        </div>
        
        <div style={styles.navBox}>
            <button onClick={() => setView("items")} style={styles.navBtn(view === "items")}>
                <FaBoxOpen /> Inventory
            </button>
            <button onClick={() => setView("moves")} style={styles.navBtn(view === "moves")}>
                <FaExchangeAlt /> Movements
            </button>
            <button onClick={() => setView("suppliers")} style={styles.navBtn(view === "suppliers")}>
                <FaTruckLoading /> Suppliers
            </button>
        </div>
      </div>

      {/* === STATS BAR === */}
      <div style={styles.statsBar}>
          <div style={styles.statCard("#6366f1", "#eef2ff")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Total SKUs</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#1e293b" }}>{kpis.totalItems}</span></div>
              <div style={styles.statIcon("#6366f1", "#eef2ff")}><FaBoxes size={20} /></div>
          </div>
          <div style={styles.statCard("#10b981", "#ecfdf5")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Total Value</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#10b981" }}>{money(kpis.invValue)}</span></div>
              <div style={styles.statIcon("#10b981", "#ecfdf5")}><FaDollarSign size={20} /></div>
          </div>
          <div style={styles.statCard(kpis.lowCount > 0 ? "#dc2626" : "#f59e0b", kpis.lowCount > 0 ? "#fef2f2" : "#fffbeb")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Low Stock</span><span style={{ fontSize: "24px", fontWeight: "900", color: kpis.lowCount > 0 ? "#dc2626" : "#f59e0b" }}>{kpis.lowCount}</span></div>
              <div style={styles.statIcon(kpis.lowCount > 0 ? "#dc2626" : "#f59e0b", kpis.lowCount > 0 ? "#fef2f2" : "#fffbeb")}><FaExclamationTriangle size={20} /></div>
          </div>
          <div style={styles.statCard("#0ea5e9", "#f0f9ff")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Suppliers</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#0ea5e9" }}>{supplierNames.length - 1}</span></div>
              <div style={styles.statIcon("#0ea5e9", "#f0f9ff")}><FaTruckLoading size={20} /></div>
          </div>
      </div>

      {/* === MAIN CONTENT === */}
      <div style={styles.gridContainer}>
        
        {/* Left Column: Data Views */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* --- ITEMS VIEW --- */}
            {view === "items" && (
                <div style={styles.panel}>
                    {/* Filters Toolbar */}
                    <div style={styles.filterBar}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            <input 
                               style={{ ...styles.input, width: "100%", paddingLeft: "38px" }} 
                               placeholder="Search by name, SKU..." 
                               value={q} onChange={(e) => setQ(e.target.value)} 
                            />
                        </div>
                        <select style={styles.select} value={cat} onChange={(e) => setCat(e.target.value)}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select style={styles.select} value={sup} onChange={(e) => setSup(e.target.value)}>
                            {supplierNames.map(s => <option key={s} value={s}>{s === "All" ? "All Suppliers" : s}</option>)}
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#334155", cursor: "pointer", background: "#f1f5f9", padding: "8px 12px", borderRadius: "8px" }}>
                            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                            <span style={{ fontWeight: "600" }}>Low stock</span>
                        </label>
                        <button style={styles.btnPrimary} onClick={openAdd}><FaPlus /> New Item</button>
                    </div>

                    {/* Table */}
                    <div style={styles.tableHeader}>
                        <div>Item / SKU</div>
                        <div>Category</div>
                        <div>Supplier</div>
                        <div style={{textAlign: "center"}}>Stock</div>
                        <div style={{textAlign: "right"}}>Unit Cost</div>
                        <div style={{textAlign: "right"}}>Total Value</div>
                        <div style={{textAlign: "center"}}>Actions</div>
                    </div>
                    
                    {(filtered || []).length === 0 ? (
                        <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
                            <FaBoxOpen size={50} style={{ opacity: 0.2, marginBottom: "15px" }} />
                            <p style={{ fontSize: "16px" }}>No inventory items found.</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                            {filtered.map((it) => {
                                const stock = Number(it.stock || 0);
                                const min = Number(it.minStock || 0);
                                const isLow = stock <= min;
                                return (
                                    <div key={it.id} style={styles.tableRow(isLow)} className="hover-row">
                                        <div>
                                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{it.name}</div>
                                            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>{it.sku}</div>
                                        </div>
                                        <div><span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>{it.category || "General"}</span></div>
                                        <div style={{ fontSize: "13px" }}>{it.supplier || "—"}</div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontWeight: "800", color: isLow ? "#dc2626" : "#10b981", fontSize: "15px" }}>{stock}</div>
                                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{it.unit}</div>
                                        </div>
                                        <div style={{ textAlign: "right", fontFamily: "monospace", color: "#475569" }}>{money(it.cost)}</div>
                                        <div style={{ textAlign: "right", fontWeight: "700", color: "#334155" }}>{money(stock * it.cost)}</div>
                                        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                                            <button onClick={() => openEdit(it)} style={{ border: "none", background: "none", color: "#3b82f6", cursor: "pointer" }} title="Edit"><FaEdit size={16} /></button>
                                            <button onClick={() => deleteItem(it.id)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }} title="Delete"><FaTrash size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- MOVEMENTS VIEW --- */}
            {view === "moves" && (
                <div style={{ ...styles.panel, padding: "30px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", alignItems: "center" }}>
                        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <FaHistory style={{ color: "#3b82f6" }} /> Movement History
                        </h2>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => setMoveModal({ open: true, type: "IN" })} style={{...styles.btnPrimary, background: "#10b981"}}><FaArrowLeft /> Stock In</button>
                            <button onClick={() => setMoveModal({ open: true, type: "OUT" })} style={{...styles.btnPrimary, background: "#ef4444"}}><FaArrowRight /> Stock Out</button>
                        </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                        {moves.sort((a,b) => b.at.localeCompare(a.at)).map((m, idx) => {
                            const item = items.find(i => i.id === m.itemId);
                            const isIn = m.type === "IN";
                            return (
                                <div key={m.id} style={{ display: "flex", gap: "20px", paddingBottom: "25px", position: "relative" }}>
                                    {/* Timeline Line */}
                                    {idx !== moves.length - 1 && <div style={{ position: "absolute", left: "24px", top: "40px", bottom: "0", width: "2px", background: "#e2e8f0" }}></div>}
                                    
                                    {/* Icon */}
                                    <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: isIn ? "#ecfdf5" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: isIn ? "#10b981" : "#ef4444", border: `1px solid ${isIn ? "#d1fae5" : "#fee2e2"}`, zIndex: 1 }}>
                                        {isIn ? <FaPlus /> : <FaArrowRight />}
                                    </div>
                                    
                                    {/* Content */}
                                    <div style={{ flex: 1, background: "#f8fafc", padding: "15px 20px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                            <span style={{ fontWeight: "700", color: "#334155", fontSize: "16px" }}>{item?.name || "Unknown Item"}</span>
                                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{new Date(m.at).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#475569" }}>
                                            <span style={{ fontWeight: "bold", color: isIn ? "#10b981" : "#ef4444" }}>
                                                {isIn ? "+" : "-"}{m.qty} {item?.unit}
                                            </span>
                                            {m.note && <span>• {m.note}</span>}
                                            {m.ref && <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}>REF: {m.ref}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- SUPPLIERS VIEW --- */}
            {view === "suppliers" && (
                <div style={{ ...styles.panel, padding: "30px", background: "#f8fafc", border: "none", boxShadow: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
                        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>Trusted Suppliers</h2>
                        <button style={styles.btnPrimary} onClick={() => setSupModal(true)}><FaPlus /> Manage List</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                        {suppliers.map(s => (
                            <div key={s.id} style={{ background: "white", borderRadius: "16px", padding: "25px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "15px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>{s.name}</h3>
                                        <span style={{ fontSize: "12px", color: "#3b82f6", background: "#eff6ff", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>Vendor</span>
                                    </div>
                                    <div style={{ width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><FaTruckLoading /></div>
                                </div>
                                <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#475569" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FaPhone style={{ color: "#94a3b8" }} /> {s.phone || "N/A"}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FaEnvelope style={{ color: "#94a3b8" }} /> {s.email || "N/A"}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* === RIGHT SIDEBAR === */}
        <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
            
            {/* Quick Actions */}
            <div style={styles.panel}>
                <div style={{ padding: "20px", background: "#0c4a6e", color: "white" }}>
                    <div style={styles.sideTitle}><FaClipboardList style={{color: "#38bdf8"}} /> Quick Actions</div>
                    <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>Manage inventory flow</p>
                </div>
                <div style={{ padding: "20px" }}>
                    <button style={{ ...styles.actionBtn, background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd" }} onClick={() => setMoveModal({ open: true, type: "IN" })}>
                        <FaPlus /> Record Stock In
                    </button>
                    <button style={{ ...styles.actionBtn, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }} onClick={() => setMoveModal({ open: true, type: "OUT" })}>
                        <FaArrowRight /> Record Stock Out
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.panel}>
                <div style={{ padding: "15px 20px", borderBottom: "1px solid #f1f5f9", background: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
                    <FaHistory style={{ color: "#94a3b8" }} />
                    <span style={{ fontWeight: "700", color: "#334155", fontSize: "13px", textTransform: "uppercase" }}>Recent Activity</span>
                </div>
                <div>
                    {recentMoves.length === 0 ? <p style={{ padding: "20px", color: "#94a3b8", fontSize: "13px", textAlign: "center" }}>No activity yet.</p> : (
                        recentMoves.map((m, i) => (
                            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: i !== recentMoves.length -1 ? "1px solid #f8fafc" : "none", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>{(items.find(x=>x.id===m.itemId)?.name || "Item")}</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(m.at).toLocaleDateString()}</div>
                                </div>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: m.type==="IN" ? "#10b981" : "#ef4444", background: m.type==="IN"?"#ecfdf5":"#fef2f2", padding: "2px 8px", borderRadius: "6px" }}>
                                    {m.type==="IN"?"+":"-"}{m.qty}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Tip Card */}
            <div style={{ background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)", borderRadius: "16px", padding: "20px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                 <div style={{ fontSize: "24px", marginBottom: "10px" }}>💡</div>
                 <p style={{ margin: 0, fontSize: "13px", color: "#1e40af", lineHeight: "1.5" }}>
                    Tip: Set <strong>Min Stock</strong> levels for your items to see alerts in the stats bar automatically.
                 </p>
            </div>

        </div>

      </div>

      {/* MODALS */}
      {itemModal.open && <StoreItemModal mode={itemModal.mode} item={itemModal.item} suppliers={suppliers} onClose={closeItemModal} onSave={saveItem} />}
      {moveModal.open && <StockMoveModal type={moveModal.type} presetItemId={moveModal.itemId} items={items} onClose={() => setMoveModal({ open: false, type: "IN" })} onApply={(p) => { applyMove(p); setMoveModal({ open: false }); }} />}
      {supModal && <SuppliersModal suppliers={suppliers} onClose={() => setSupModal(false)} onChange={setSuppliers} />}
    </div>
  );
}

// ================= INTERNAL COMPONENTS =================

const modalStyle = {
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    box: { background: "white", borderRadius: "20px", padding: "30px", width: "500px", maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid #f1f5f9", animation: "fadeIn 0.2s ease-out" },
    title: { fontSize: "22px", fontWeight: "800", color: "#1e293b", marginBottom: "5px" },
    label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "8px" },
    input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc", transition: "border 0.2s" },
    btnPrimary: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.4)" },
    btnSec: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "#f1f5f9", color: "#475569", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }
};

function StoreItemModal({ mode, item, suppliers, onClose, onSave }) {
  const [form, setForm] = useState({ 
    name: item?.name||"", sku: item?.sku||"", category: item?.category||"", 
    unit: item?.unit||"pcs", supplier: item?.supplier||"", cost: item?.cost||"", minStock: item?.minStock||0 
  });
  const h = (f, v) => setForm(p => ({...p, [f]: v}));
  
  return (
    <div style={modalStyle.overlay}>
      <div style={modalStyle.box}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
                <div style={modalStyle.title}>{mode === "edit" ? "Edit Item" : "New Item"}</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>Fill in the details below</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#cbd5e1" }}><FaTimes /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div><label style={modalStyle.label}>Item Name</label><input style={modalStyle.input} value={form.name} onChange={e=>h("name", e.target.value)} autoFocus /></div>
            <div><label style={modalStyle.label}>SKU / Code</label><input style={modalStyle.input} value={form.sku} onChange={e=>h("sku", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div><label style={modalStyle.label}>Category</label><input style={modalStyle.input} value={form.category} onChange={e=>h("category", e.target.value)} list="cats" /></div>
            <div><label style={modalStyle.label}>Unit</label><input style={modalStyle.input} value={form.unit} onChange={e=>h("unit", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div><label style={modalStyle.label}>Supplier</label>
                <select style={modalStyle.input} value={form.supplier} onChange={e=>h("supplier", e.target.value)}>
                    <option value="">— Select —</option>
                    {(suppliers||[]).map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>
            <div><label style={modalStyle.label}>Unit Cost</label><input type="number" style={modalStyle.input} value={form.cost} onChange={e=>h("cost", e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: "30px" }}><label style={modalStyle.label}>Min Stock Alert Level</label><input type="number" style={modalStyle.input} value={form.minStock} onChange={e=>h("minStock", e.target.value)} /></div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
            <button onClick={onClose} style={modalStyle.btnSec}>Cancel</button>
            <button onClick={() => onSave({...form, cost: Number(form.cost), minStock: Number(form.minStock)})} style={modalStyle.btnPrimary}>Save Item</button>
        </div>
      </div>
    </div>
  );
}

function StockMoveModal({ type, presetItemId, items, onClose, onApply }) {
  const [itemId, setItemId] = useState(presetItemId || (items?.[0]?.id || ""));
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  return (
    <div style={modalStyle.overlay}>
      <div style={{ ...modalStyle.box, width: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ width: "60px", height: "60px", background: type === "IN" ? "#ecfdf5" : "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px", color: type === "IN" ? "#10b981" : "#ef4444", fontSize: "24px" }}>
                {type === "IN" ? <FaPlus /> : <FaArrowRight />}
            </div>
            <div style={modalStyle.title}>{type === "IN" ? "Stock In" : "Stock Out"}</div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>Record a new movement</div>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
            <label style={modalStyle.label}>Select Item</label>
            <select style={modalStyle.input} value={itemId} onChange={e=>setItemId(e.target.value)}>
                {(items||[]).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
        </div>
        <div style={{ marginBottom: "15px" }}>
            <label style={modalStyle.label}>Quantity</label>
            <input type="number" style={{...modalStyle.input, fontSize: "18px", fontWeight: "bold"}} value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" autoFocus />
        </div>
        <div style={{ marginBottom: "25px" }}>
            <label style={modalStyle.label}>Note / Reference</label>
            <input style={modalStyle.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. PO-123" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <button onClick={onClose} style={modalStyle.btnSec}>Cancel</button>
            <button onClick={() => onApply({ itemId, type, qty, note })} disabled={!qty} style={{...modalStyle.btnPrimary, background: type==="OUT"?"#ef4444":"#10b981", boxShadow: "none"}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function SuppliersModal({ suppliers, onClose, onChange }) {
  const [list, setList] = useState(suppliers || []);
  const add = () => setList([{ id: uid("sup"), name: "New Supplier", phone: "", email: "" }, ...list]);
  const update = (id, f, v) => setList(list.map(s => s.id === id ? { ...s, [f]: v } : s));
  
  return (
    <div style={modalStyle.overlay}>
      <div style={{ ...modalStyle.box, width: "700px" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
            <div style={modalStyle.title}>Manage Suppliers</div>
            <button onClick={() => { onChange(list); onClose(); }} style={modalStyle.btnPrimary}>Done & Save</button>
         </div>
         <button onClick={add} style={{ width: "100%", padding: "15px", background: "#f0f9ff", color: "#0ea5e9", border: "2px dashed #bae6fd", borderRadius: "12px", marginBottom: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>+ Add New Supplier</button>
         <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
            {list.map(s => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: "15px", marginBottom: "15px", alignItems: "center", background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <input style={{...modalStyle.input, background: "white"}} value={s.name} onChange={e=>update(s.id, "name", e.target.value)} placeholder="Supplier Name" />
                    <input style={{...modalStyle.input, background: "white"}} value={s.phone} onChange={e=>update(s.id, "phone", e.target.value)} placeholder="Phone" />
                    <input style={{...modalStyle.input, background: "white"}} value={s.email} onChange={e=>update(s.id, "email", e.target.value)} placeholder="Email" />
                    <button onClick={()=>setList(list.filter(x=>x.id!==s.id))} style={{ color: "#ef4444", background: "white", width: "40px", height: "40px", borderRadius: "8px", border: "1px solid #fee2e2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FaTrash /></button>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
}