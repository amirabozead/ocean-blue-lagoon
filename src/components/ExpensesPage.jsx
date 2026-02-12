import React, { useState, useMemo, useEffect } from "react";
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, 
  FaMoneyBillWave, FaReceipt, FaChartPie, FaCalendarAlt, FaFilter, 
  FaCalendarDay, FaCalendarCheck, FaChartBar, FaAngleDown, FaAngleUp,
  FaWallet // Added icon for header
} from "react-icons/fa";

import { 
  storeMoney, uid, expStartOfMonthStr, expTodayStr, expStartOfYearStr, 
  expInInclusiveRange 
} from "../utils/helpers";
import { EXP_LS_EXPENSES, EXP_DEFAULT_CATEGORIES } from "../data/constants";

const HOTEL_LOGO = "/logo.png"; 

export default function ExpensesPage({ paymentMethods, expenses, setExpenses, supabase, supabaseEnabled }) {
  
  // --- States for Toggles ---
  const [showStats, setShowStats] = useState(true); 
  const [showFilters, setShowFilters] = useState(false); 

  // --- Logic Same as Before ---
  const persist = (next) => {
    setExpenses(next); 
    try { localStorage.setItem(EXP_LS_EXPENSES, JSON.stringify(next)); } catch {}

    (async () => {
      try {
        if (supabase && supabaseEnabled) {
          const now = new Date().toISOString();
          await supabase.from("ocean_expenses").upsert({
            id: "master_list",
            data: next,
            updated_at: now,
          });
        }
      } catch (e) {
        console.error("Sync Error:", e);
      }
    })();
  };

  const [period, setPeriod] = useState("MTD");
  const [range, setRange] = useState({ 
    from: typeof expStartOfMonthStr === 'function' ? expStartOfMonthStr() : new Date().toISOString().slice(0, 8) + "01", 
    to: typeof expTodayStr === 'function' ? expTodayStr() : new Date().toISOString().slice(0, 10) 
  });
  
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [method, setMethod] = useState("All");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const categories = useMemo(() => {
    const s = new Set(EXP_DEFAULT_CATEGORIES || ["General", "F&B", "Maintenance", "Utilities", "Salary", "Marketing"]);
    (expenses || []).forEach((e) => {
      const c = String(e.category || "").trim();
      if (c) s.add(c);
    });
    return ["All", ...Array.from(s).sort()];
  }, [expenses]);

  const computedRange = useMemo(() => {
    const today = typeof expTodayStr === 'function' ? expTodayStr() : new Date().toISOString().slice(0, 10);
    const startMonth = typeof expStartOfMonthStr === 'function' ? expStartOfMonthStr() : today.slice(0, 8) + "01";
    const startYear = typeof expStartOfYearStr === 'function' ? expStartOfYearStr() : today.slice(0, 4) + "-01-01";

    if (period === "TODAY") return { from: today, to: today };
    if (period === "MTD") return { from: startMonth, to: today };
    if (period === "YTD") return { from: startYear, to: today };
    return { from: range.from || "", to: range.to || "" };
  }, [period, range]);

  const extraStats = useMemo(() => {
    const todayStr = typeof expTodayStr === 'function' ? expTodayStr() : new Date().toISOString().slice(0, 10);
    const startYearStr = typeof expStartOfYearStr === 'function' ? expStartOfYearStr() : todayStr.slice(0, 4) + "-01-01";

    let todaySum = 0;
    let ytdSum = 0;

    (expenses || []).forEach((e) => {
      const val = Number(e.amount || 0);
      const d = e.date || "";
      if (d === todayStr) todaySum += val;
      if (d >= startYearStr && d <= todayStr) ytdSum += val;
    });

    return { today: todaySum, ytd: ytdSum };
  }, [expenses]);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return (expenses || [])
      .filter((e) => {
        if (typeof expInInclusiveRange === 'function') {
            return expInInclusiveRange(e.date, computedRange.from, computedRange.to);
        }
        return e.date >= computedRange.from && e.date <= computedRange.to;
      })
      .filter((e) => (cat === "All" ? true : String(e.category || "") === cat))
      .filter((e) => (method === "All" ? true : String(e.method || "") === method))
      .filter((e) => {
        if (!nq) return true;
        const hay = `${e.date} ${e.category} ${e.vendor} ${e.description} ${e.method} ${e.ref}`.toLowerCase();
        return hay.includes(nq);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
  }, [expenses, q, cat, method, computedRange]);

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = filtered.length;
    
    const byCat = new Map();
    filtered.forEach((e) => {
      const c = e.category || "Other";
      byCat.set(c, (byCat.get(c) || 0) + Number(e.amount || 0));
    });
    const topCats = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, count, topCats };
  }, [filtered]);

  const editing = useMemo(() => (expenses || []).find((x) => x.id === editingId) || null, [expenses, editingId]);

  function remove(id) {
    if(!window.confirm("Delete this expense?")) return;
    persist(expenses.filter((e) => e.id !== id));
  }

  function upsert(payload) {
    const now = Date.now();
    const clean = {
      ...payload,
      id: payload.id || uid("exp"),
      amount: Number(payload.amount || 0),
      updatedAt: now,
    };

    if (editingId) {
      persist(expenses.map((e) => (e.id === editingId ? clean : e)));
    } else {
      persist([{ ...clean, createdAt: now }, ...expenses]);
    }
    setOpen(false);
    setEditingId(null);
  }

  // --- New Header Styles (Consistent with RoomsPage) ---
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
    },
    actionBtn: {
        background: "#3b82f6",
        color: "white",
        border: "none",
        padding: "10px 20px",
        borderRadius: "10px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)"
    }
  };

  // --- Styles Injection ---
  const styles = `
    .expenses-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; padding: 30px; background: #f8fafc; min-height: 100vh; }
    
    /* Toolbar Actions */
    .toolbar-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; background: white; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .period-group { display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
    .period-btn { border: none; background: transparent; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; }
    .period-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    .toggle-group { display: flex; gap: 8px; }
    .toggle-btn { display: flex; align-items: center; gap: 6px; border: 1px solid #e2e8f0; background: white; color: #64748b; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s; }
    .toggle-btn:hover { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
    .toggle-btn.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }

    /* Filters Section (Collapsible) */
    .filters-section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; animation: slideDown 0.2s ease-out; }
    .filters-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .search-box { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .search-input { width: 100%; padding: 10px 10px 10px 36px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; transition: border-color 0.2s; }
    .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .filter-select { padding: 10px 30px 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: white; color: #334155; cursor: pointer; outline: none; }
    
    /* Stats Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; animation: fadeIn 0.3s ease-out; }
    .stat-card { background: white; padding: 1.25rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: flex; align-items: flex-start; justify-content: space-between; }
    .stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
    .stat-info h3 { margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-info p { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
    .stat-sub { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

    /* Custom Date Range */
    .custom-date-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; color: #64748b; font-size: 0.9rem; }
    .date-input-styled { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; }

    /* Table & General */
    .table-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .pro-table { width: 100%; border-collapse: collapse; }
    .pro-table th { background: #f8fafc; text-align: left; padding: 1rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .pro-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.95rem; vertical-align: middle; }
    .pro-table tr:hover td { background-color: #f8fafc; }
    .cat-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #e0f2fe; color: #0284c7; }
    .cat-badge.salary { background: #dcfce7; color: #166534; }
    .cat-badge.fb { background: #ffedd5; color: #9a3412; }
    .amount-cell { font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #0f172a; text-align: right; }
    .actions-cell { display: flex; gap: 8px; justifyContent: center; }
    .action-btn { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 6px; font-size: 1rem; transition: color 0.2s; }
    .action-btn:hover { color: #3b82f6; }
    .action-btn.del:hover { color: #ef4444; }

    /* Animations */
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Modal Styles (Injected) */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 16px; width: 100%; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
    .modal-body { padding: 1.5rem; }
    .form-grid { display: grid; gap: 1.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
    .form-input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; box-sizing: border-box; }
    .form-input:focus { border-color: #3b82f6; }
    .btn-save { padding: 0.75rem 2rem; border: none; background: #3b82f6; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-cancel { padding: 0.75rem 1.5rem; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 600; }
  `;

  return (
    <div className="expenses-container">
      <style>{styles}</style>
      
      {/* HEADER (UPDATED TO MATCH ROOMS PAGE) */}
      <div style={headerStyles.headerCard}>
        {/* Left: Logo & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Blue Lagoon" style={headerStyles.logoImage} onError={(e) => e.target.style.display='none'} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "36px", fontFamily: "'Brush Script MT', cursive", letterSpacing: "1px", fontWeight: "normal", lineHeight: "1" }}>Ocean Blue Lagoon</h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>Maldives Resort</span>
          </div>
        </div>

        {/* Center: Page Title */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", fontFamily: "'Playfair Display', serif", fontStyle: "italic", lineHeight: "1" }}>Expenses Manager</span>
           <FaWallet style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        {/* Right: Add Button */}
        <div>
            <button 
                style={headerStyles.actionBtn} 
                onClick={() => { setEditingId(null); setOpen(true); }}
            >
                <FaPlus /> Add Expense
            </button>
        </div>
      </div>

      <div style={{ padding: "0 20px 40px" }}>
        
        {/* Main Toolbar: Period + Toggles */}
        <div className="toolbar-actions">
          {/* Period Selectors (Left) */}
          <div className="period-group">
            {["TODAY", "MTD", "YTD", "CUSTOM"].map((p) => (
              <button 
                key={p} 
                className={`period-btn ${period === p ? "active" : ""}`} 
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Action Toggles (Right) */}
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${showStats ? "active" : ""}`} 
              onClick={() => setShowStats(!showStats)}
              title="Toggle Statistics"
            >
              <FaChartBar /> Stats {showStats ? <FaAngleUp size={12}/> : <FaAngleDown size={12}/>}
            </button>
            
            <button 
              className={`toggle-btn ${showFilters ? "active" : ""}`} 
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle Search Filters"
            >
              <FaSearch /> Search {showFilters ? <FaAngleUp size={12}/> : <FaAngleDown size={12}/>}
            </button>
          </div>
        </div>

        {/* Collapsible Statistics Section */}
        {showStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <h3>Today</h3>
                <p>{storeMoney(extraStats.today)}</p>
              </div>
              <div className="stat-icon" style={{ background: "#f0fdf4", color: "#15803d" }}>
                <FaCalendarDay />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h3>YTD Total</h3>
                <p>{storeMoney(extraStats.ytd)}</p>
              </div>
              <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                <FaCalendarCheck />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h3>Total ({period})</h3>
                <p>{storeMoney(stats.total)}</p>
              </div>
              <div className="stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                <FaMoneyBillWave />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h3>Count</h3>
                <p>{stats.count}</p>
              </div>
              <div className="stat-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <FaReceipt />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h3>Top Spend</h3>
                <div className="stat-sub">
                  {stats.topCats.length === 0 ? "No Data" : stats.topCats.map(([c, v]) => c).join(", ")}
                </div>
              </div>
              <div className="stat-icon" style={{ background: "#fff7ed", color: "#f97316" }}>
                <FaChartPie />
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Search & Filters Section */}
        {showFilters && (
          <div className="filters-section">
            <div className="filters-row">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  className="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search vendor, desc, ref..."
                  autoFocus
                />
              </div>

              <select className="filter-select" value={cat} onChange={(e) => setCat(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
              </select>

              <select className="filter-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="All">All Methods</option>
                {(paymentMethods || ["Cash", "Card"]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <button
                className="toggle-btn"
                style={{ background: "#f1f5f9", border: "none" }}
                onClick={() => { setQ(""); setCat("All"); setMethod("All"); }}
              >
                 Reset
              </button>
            </div>

            {/* Custom Date Range (Only visible if Custom Period is selected AND Search is open) */}
            {period === "CUSTOM" && (
              <div className="custom-date-row">
                <FaCalendarAlt />
                <span>Custom Range:</span>
                <input className="date-input-styled" type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))} />
                <span>to</span>
                <input className="date-input-styled" type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))} />
              </div>
            )}
          </div>
        )}

        {/* Table Section */}
        <div className="table-container">
          <table className="pro-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Method</th>
                <th>Ref</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                      <FaSearch style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }} />
                      <p>No expenses found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{e.date}</td>
                    <td>
                      <span className={`cat-badge ${e.category === 'Salary' ? 'salary' : e.category === 'F&B' ? 'fb' : ''}`}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.vendor || "—"}</td>
                    <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b" }}>
                      {e.description || "—"}
                    </td>
                    <td className="amount-cell">
                      {storeMoney(e.amount)}
                    </td>
                    <td>{e.method}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{e.ref || "—"}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn edit" onClick={() => { setEditingId(e.id); setOpen(true); }} title="Edit">
                          <FaEdit />
                        </button>
                        <button className="action-btn del" onClick={() => remove(e.id)} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <ExpenseModal title={editingId ? "Edit Expense" : "Add Expense"} onClose={() => { setOpen(false); setEditingId(null); }}>
          <ExpenseForm
            expense={editing}
            paymentMethods={paymentMethods}
            categories={categories.filter((c) => c !== "All")}
            onCancel={() => { setOpen(false); setEditingId(null); }}
            onSave={upsert}
          />
        </ExpenseModal>
      )}
    </div>
  );
}

// === Internal Components (Same as before) ===

function ExpenseModal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{title}</div>
          <button style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "1.2rem", cursor: "pointer" }} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ExpenseForm({ expense, paymentMethods, categories, onCancel, onSave }) {
  const today = typeof expTodayStr === 'function' ? expTodayStr() : new Date().toISOString().slice(0, 10);
  
  const [date, setDate] = useState(expense?.date || today);
  const [category, setCategory] = useState(expense?.category || (categories?.[0] || "General"));
  const [vendor, setVendor] = useState(expense?.vendor || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : "");
  const [method, setMethod] = useState(expense?.method || (paymentMethods?.[0] || "Cash"));
  const [ref, setRef] = useState(expense?.ref || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = typeof expTodayStr === 'function' ? expTodayStr() : new Date().toISOString().slice(0, 10);
    setDate(expense?.date || t);
    setCategory(expense?.category || (categories?.[0] || "General"));
    setVendor(expense?.vendor || "");
    setDescription(expense?.description || "");
    setAmount(expense?.amount != null ? String(expense.amount) : "");
    setMethod(expense?.method || (paymentMethods?.[0] || "Cash"));
    setRef(expense?.ref || "");
    setErr("");
  }, [expense?.id, categories, paymentMethods]);

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    const cleanDate = String(date || "").slice(0, 10);
    const cleanCat = String(category || "").trim();
    const cleanMethod = String(method || "").trim();
    const n = parseFloat(String(amount || "").replace(/,/g, ""));

    if (!cleanDate) return setErr("Please select a date.");
    if (!cleanCat) return setErr("Please select a category.");
    if (!cleanMethod) return setErr("Please select a payment method.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Amount must be a positive number.");

    onSave({
      ...(expense || {}),
      date: cleanDate,
      category: cleanCat,
      vendor: vendor.trim(),
      description: description.trim(),
      amount: n,
      method: cleanMethod,
      ref: ref.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="form-grid">
      {err && (
        <div style={{ padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "0.9rem" }}>
          {err}
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>Date</label>
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {(categories || ["General"]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Vendor</label>
          <input className="form-input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Amazon, Office Supplies" />
        </div>
        <div className="form-group">
          <label>Amount</label>
          <input className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{ fontFamily: "monospace", fontWeight: "bold" }} />
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the expense" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Payment Method</label>
          <select className="form-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {(paymentMethods || ["Cash", "Card"]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Reference No.</label>
          <input className="form-input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="#INV-12345" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-save">{expense ? "Update Expense" : "Save Expense"}</button>
      </div>
    </form>
  );
}