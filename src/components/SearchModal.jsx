import React, { useMemo } from "react";
import { 
  FaTimes, FaTrash, FaSearch, FaFilter, 
  FaCalendarAlt, FaUser, FaCreditCard, FaDoorOpen, FaMoneyBillWave, FaInfoCircle, FaGlobeAmericas 
} from "react-icons/fa";

// استيراد الثوابت (Status List + Payment Methods + Rooms)
import { BASE_ROOMS, PAYMENT_METHODS, STATUS_LIST, BOOKING_CHANNELS } from "../data/constants"; 

export default function SearchModal({ filters, setFilters, onClose }) {
  const f = filters || {};

  // استخراج أرقام الغرف المتاحة
  const availableRooms = useMemo(() => {
    return BASE_ROOMS.map(r => r.roomNumber).sort((a, b) => a - b);
  }, []);

  // حساب عدد الفلاتر النشطة
  const activeCount = useMemo(() => {
    const keys = [
      "firstName", "lastName", "checkInFrom", "checkInTo", 
      "checkOutFrom", "checkOutTo", "rateMin", "rateMax", "roomNumber"
    ];
    let c = 0;
    keys.forEach((k) => { if (String(f[k] || "").trim()) c += 1; });
    if (f.paymentMethod && f.paymentMethod !== "All") c += 1;
    if (f.channel && f.channel !== "All") c += 1;
    if (f.status && f.status !== "All") c += 1;
    return c;
  }, [f]);

  const set = (key, val) => setFilters((p) => ({ ...(p || {}), [key]: val }));

  const reset = () => {
    setFilters({
      firstName: "", lastName: "", checkInFrom: "", checkInTo: "",
      checkOutFrom: "", checkOutTo: "", rateMin: "", rateMax: "",
      roomNumber: "", paymentMethod: "All", channel: "All", status: "All",
    });
  };

  return (
    <>
      <style>{`
        .ocean-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 1000; padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        .ocean-modal-card {
          background: #ffffff; width: 95%; max-width: 900px;
          border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
          display: flex; flex-direction: column; overflow: hidden;
          animation: modalFadeIn 0.3s ease-out;
        }
        @keyframes modalFadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .ocean-modal-header {
          padding: 20px 30px; background: #fff; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .ocean-modal-body { padding: 30px; overflow-y: auto; max-height: 80vh; }
        
        .ocean-grid-search { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        
        .ocean-section { margin-bottom: 20px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; }
        .section-label { display: flex; align-items: center; gap: 8px; color: #1e293b; font-weight: 700; margin-bottom: 15px; font-size: 0.85rem; text-transform: uppercase; }
        
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
        .field input, .field select { 
          padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; 
          font-size: 0.9rem; transition: all 0.2s; color: #1e293b; 
        }
        .field input:focus, .field select:focus { border-color: #0ea5e9; outline: none; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        
        .filter-badge {
          background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 700; border: 1px solid #bae6fd;
        }

        .ocean-modal-footer { padding: 20px 30px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; }
        
        .ocean-btn-primary { background: #0ea5e9; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }
        .ocean-btn-primary:hover { background: #0284c7; }
        
        .ocean-btn-danger { background: #fff; border: 1.5px solid #fee2e2; color: #ef4444; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .ocean-btn-danger:hover { background: #fef2f2; border-color: #ef4444; }
      `}</style>

      <div className="ocean-modal-overlay" onMouseDown={onClose}>
        <div className="ocean-modal-card" onMouseDown={(e) => e.stopPropagation()}>
          
          <div className="ocean-modal-header">
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{background:'#f0f9ff', padding:'10px', borderRadius:'10px', color:'#0ea5e9'}}>
                <FaSearch size={18} />
              </div>
              <div>
                <h2 style={{margin:0, fontSize: '1.2rem', color: '#0f172a'}}>Advanced Search</h2>
                <div style={{fontSize: '0.8rem', color: '#64748b'}}>Ocean Blue Lagoon | Filter Database</div>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              {activeCount > 0 && <span className="filter-badge">{activeCount} Active</span>}
              <button onClick={onClose} style={{background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', color: '#cbd5e1'}}><FaTimes /></button>
            </div>
          </div>

          <div className="ocean-modal-body">
            
            <div className="ocean-section">
              <h4 className="section-label"><FaUser color="#0ea5e9"/> Guest, Room & Payment</h4>
              <div className="ocean-grid-search">
                <div className="field">
                  <label>First Name</label>
                  <input placeholder="e.g. Amir" value={f.firstName || ""} onChange={(e) => set("firstName", e.target.value)} />
                </div>
                <div className="field">
                  <label>Last Name</label>
                  <input placeholder="e.g. Abouzeid" value={f.lastName || ""} onChange={(e) => set("lastName", e.target.value)} />
                </div>
                
                <div className="field">
                  <label><span style={{display:'flex', alignItems:'center', gap:'5px'}}><FaDoorOpen size={10}/> Room Number</span></label>
                  <select value={f.roomNumber || ""} onChange={(e) => set("roomNumber", e.target.value)}>
                    <option value="">All Rooms</option>
                    {availableRooms.map((r) => (
                      <option key={r} value={r}>Room {r}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label><span style={{display:'flex', alignItems:'center', gap:'5px'}}><FaInfoCircle size={10}/> Booking Status</span></label>
                  <select value={f.status || "All"} onChange={(e) => set("status", e.target.value)} style={{fontWeight: 'bold', color: f.status && f.status !== "All" ? '#0284c7' : '#1e293b'}}>
                    <option value="All">All Statuses</option>
                    {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div className="field">
                  <label><span style={{display:'flex', alignItems:'center', gap:'5px'}}><FaGlobeAmericas size={10}/> Channel</span></label>
                  <select value={f.channel || "All"} onChange={(e) => set("channel", e.target.value)}>
                    <option value="All">All Channels</option>
                    {BOOKING_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label><span style={{display:'flex', alignItems:'center', gap:'5px'}}><FaCreditCard size={10}/> Payment Method</span></label>
                  <select value={f.paymentMethod || "All"} onChange={(e) => set("paymentMethod", e.target.value)}>
                    <option value="All">All Methods</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                
                <div className="field">
                    <label>Rate Range ($)</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input type="number" placeholder="Min" value={f.rateMin || ""} onChange={(e) => set("rateMin", e.target.value)} style={{width: '50%'}} />
                        <input type="number" placeholder="Max" value={f.rateMax || ""} onChange={(e) => set("rateMax", e.target.value)} style={{width: '50%'}} />
                    </div>
                </div>

              </div>
            </div>

            <div className="ocean-section">
              <h4 className="section-label"><FaCalendarAlt color="#0ea5e9"/> Date Filters</h4>
              <div className="ocean-grid-search">
                <div className="field">
                  <label>Check-in From</label>
                  <input type="date" value={f.checkInFrom || ""} onChange={(e) => set("checkInFrom", e.target.value)} />
                </div>
                <div className="field">
                  <label>Check-in To</label>
                  <input type="date" value={f.checkInTo || ""} onChange={(e) => set("checkInTo", e.target.value)} />
                </div>

                <div className="field" style={{marginTop:'10px'}}>
                  <label>Check-out From</label>
                  <input type="date" value={f.checkOutFrom || ""} onChange={(e) => set("checkOutFrom", e.target.value)} />
                </div>
                <div className="field" style={{marginTop:'10px'}}>
                  <label>Check-out To</label>
                  <input type="date" value={f.checkOutTo || ""} onChange={(e) => set("checkOutTo", e.target.value)} />
                </div>
              </div>
            </div>

          </div>

          <div className="ocean-modal-footer">
            <button className="ocean-btn-danger" onClick={reset}>
              <FaTrash /> Clear Filters
            </button>
            <button className="ocean-btn-primary" onClick={onClose}>
              <FaFilter /> Apply Search
            </button>
          </div>

        </div>
      </div>
    </>
  );
}