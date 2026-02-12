import React, { useState, useMemo, useEffect } from "react";
import { 
  FaUser, FaCalendarAlt, FaConciergeBell, FaCreditCard, 
  FaInfoCircle, FaTimes, FaCheck 
} from "react-icons/fa";
import { 
  NATIONALITIES, STATUS_LIST, PAYMENT_METHODS, ROOM_TYPES, BASE_ROOMS 
} from "../data/constants"; 
import { money, calcNights, storeLoad } from "../utils/helpers"; 

export default function ReservationModal({ 
  onClose, onSave, initialData, mode, dailyRates, roomPhysicalStatus 
}) {
  // --- States ---
  const [firstName, setFirstName] = useState(initialData?.guest?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.guest?.lastName || "");
  const [pax, setPax] = useState(Number(initialData?.pax ?? 1));
  const [nationality, setNationality] = useState(initialData?.guest?.nationality || "");
  const [mealPlan, setMealPlan] = useState(String(initialData?.mealPlan || "BO").toUpperCase());
  const [roomType, setRoomType] = useState(initialData?.room?.roomType || "Standard Double Room");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || "Cash");
  const [checkIn, setCheckIn] = useState(initialData?.stay?.checkIn || "");
  const [checkOut, setCheckOut] = useState(initialData?.stay?.checkOut || "");
  const [status, setStatus] = useState(initialData?.status || "Booked");

  // --- Logic: Room Availability ---
  const roomNumbersForType = useMemo(() => {
    return BASE_ROOMS.filter((r) => {
      if (r.roomType !== roomType) return false;
      if (mode === "edit" && initialData?.room?.roomNumber === r.roomNumber) return true;
      const currentStatus = roomPhysicalStatus?.[r.roomNumber] || "Clean";
      return !["Dirty", "House Use", "Out of Service"].includes(currentStatus);
    }).map((r) => r.roomNumber);
  }, [roomType, roomPhysicalStatus, mode, initialData]);

  const [roomNumber, setRoomNumber] = useState(() => initialData?.room?.roomNumber || roomNumbersForType[0] || "");

  useEffect(() => {
    if (!roomNumbersForType.includes(roomNumber)) setRoomNumber(roomNumbersForType[0] || "");
  }, [roomType, roomNumbersForType, roomNumber]);

  // --- Logic: Financials ---
  const nights = calcNights(checkIn, checkOut);
  const sFinance = storeLoad("ocean_settings_v1", null);
  const taxRate = Number(sFinance?.taxRate ?? 17);
  const serviceChargeRate = Number(sFinance?.serviceCharge ?? 10);
  const cityTaxFixed = Number(sFinance?.cityTax ?? 0);
  const closedThrough = String(sFinance?.closedThrough || "2026-01-31");
  const isLocked = mode === "edit" && String(initialData?.stay?.checkOut || "") && String(initialData?.stay?.checkOut || "") <= closedThrough;

  const pricing = useMemo(() => {
    if (!roomType || !checkIn || !checkOut || nights <= 0) return { ok: false };
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    let totalRoomBase = 0;
    let totalMealAddon = 0;

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const nightStr = d.toISOString().slice(0, 10);
        const rateMatch = (dailyRates || []).find(r => r.roomType === roomType && nightStr >= r.from && nightStr < r.to);
        if (!rateMatch) return { ok: false };
        
        const base = Number(rateMatch.rate || 0);
        const pkg = rateMatch.packages || {};
        let addon = Number(pkg[mealPlan] || 0);
        
        totalRoomBase += base;
        totalMealAddon += (addon * Math.max(1, pax));
    }

    const subtotal = totalRoomBase + totalMealAddon;
    const taxAmount = subtotal * (taxRate / 100);
    const serviceAmount = subtotal * (serviceChargeRate / 100);
    const cityTaxAmount = cityTaxFixed * pax * nights;
    
    return { 
        ok: true, 
        roomBase: totalRoomBase,
        mealBase: totalMealAddon,
        taxAmount, 
        serviceAmount, 
        cityTaxAmount, 
        total: subtotal + taxAmount + serviceAmount + cityTaxAmount, 
        avgNightly: subtotal / nights 
    };
  }, [roomType, checkIn, checkOut, dailyRates, mealPlan, pax, taxRate, serviceChargeRate, cityTaxFixed, nights]);

  const handleSubmit = () => {
    if (isLocked) { alert("Month Closed — this reservation cannot be edited."); return; }
    if (!pricing.ok) { alert("Error: Missing rates for selected dates!"); return; }
    onSave({
      guest: { firstName, lastName, nationality },
      pax: Number(pax), mealPlan,
      room: { roomType, roomNumber, roomRate: pricing.avgNightly },
      stay: { checkIn, checkOut }, pricing,
      status, paymentMethod
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
          background: #ffffff; width: 90%; max-width: 980px;
          border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
          display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
          animation: modalFadeIn 0.3s ease-out;
        }
        @keyframes modalFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .ocean-modal-header { padding: 20px 35px; background: #fff; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .ocean-modal-body { padding: 25px 35px; overflow-y: auto; }
        .ocean-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 30px; }
        .ocean-section { margin-bottom: 20px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; }
        .section-label { display: flex; align-items: center; gap: 10px; color: #1e293b; font-weight: 700; margin-bottom: 18px; font-size: 0.9rem; text-transform: uppercase; }
        .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; }
        .field label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
        .field input, .field select { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; }
        
        /* Folio Summary Updated */
        .ocean-price-card { 
          background: #f0f9ff; color: #0369a1; padding: 25px; border-radius: 20px; 
          border: 1px solid #bae6fd; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .price-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #bae6fd; padding-bottom: 10px; }
        .nights-pill { background: #0ea5e9; color: #fff; padding: 2px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; }
        .p-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85rem; font-weight: 500; }
        .p-total { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 2px dashed #bae6fd; }
        .total-val { font-size: 1.3rem; color: #0284c7; font-weight: 800; } /* Total size reduced */
        
        .ocean-modal-footer { padding: 20px 35px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; }
        .ocean-btn-primary { background: #0ea5e9; color: #fff; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        .ocean-btn-secondary { background: #fff; border: 1.5px solid #e2e8f0; padding: 12px 25px; border-radius: 12px; color: #64748b; font-weight: 600; cursor: pointer; }
      `}</style>

      <div className="ocean-modal-overlay">
        <div className="ocean-modal-card">
          <div className="ocean-modal-header">
            <h2 style={{margin:0, fontSize: '1.3rem', color: '#0f172a'}}>Ocean Blue Lagoon | <span style={{fontSize: '0.85rem', color: '#94a3b8', fontWeight: 300}}>Reservation</span></h2>
            <button onClick={onClose} style={{background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', color: '#cbd5e1'}}><FaTimes /></button>
          </div>

          <div className="ocean-modal-body">
            <div className="ocean-grid">
              
              <div className="ocean-col-inputs">
                <div className="ocean-section">
                  <h4 className="section-label"><FaUser size={13} color="#0ea5e9"/> Guest Information</h4>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div className="field"><label>First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                    <div className="field"><label>Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'15px'}}>
                    <div className="field"><label>Nationality</label><select value={nationality} onChange={e => setNationality(e.target.value)}>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                    <div className="field"><label>Pax</label><input type="number" value={pax} onChange={e => setPax(e.target.value)} /></div>
                  </div>
                </div>

                <div className="ocean-section">
                  <h4 className="section-label"><FaCalendarAlt size={13} color="#0ea5e9"/> Stay & Room</h4>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div className="field"><label>Check-In</label><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div>
                    <div className="field"><label>Check-Out</label><input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
                  </div>
                  <div className="field"><label>Room Category</label><select value={roomType} onChange={e => setRoomType(e.target.value)}>{ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div className="field"><label>Room No</label><select value={roomNumber} onChange={e => setRoomNumber(e.target.value)}>{roomNumbersForType.map(n => <option key={n} value={n}>Room {n}</option>)}</select></div>
                    <div className="field"><label>Meal Plan</label><select value={mealPlan} onChange={e => setMealPlan(e.target.value)}>
                      <option value="BO">Bed Only (BO)</option><option value="BB">Bed & Breakfast (BB)</option><option value="HB">Half Board (HB)</option><option value="FB">Full Board (FB)</option>
                    </select></div>
                  </div>
                </div>
              </div>

              <div className="ocean-col-summary">
                <div className="ocean-price-card">
                  <div className="price-card-header">
                    <span style={{fontSize: '0.8rem', fontWeight: 800}}><FaConciergeBell /> FOLIO SUMMARY</span>
                    {nights > 0 && <span className="nights-pill">{nights} Nights</span>}
                  </div>
                  
                  {pricing.ok ? (
                    <div className="price-list">
                      <div className="p-item"><span>Room Rate</span> <b>{money(pricing.roomBase)}</b></div>
                      <div className="p-item"><span>Meal Plan Add-on</span> <b>{money(pricing.mealBase)}</b></div>
                      <div className="p-item"><span>Service Charge ({serviceChargeRate}%)</span> <b>{money(pricing.serviceAmount)}</b></div>
                      <div className="p-item"><span>GST ({taxRate}%)</span> <b>{money(pricing.taxAmount)}</b></div>
                      {cityTaxFixed > 0 && <div className="p-item"><span>Green Tax</span> <b>{money(pricing.cityTaxAmount)}</b></div>}
                      
                      <div className="p-total">
                        <span style={{fontWeight: 700}}>Grand Total</span>
                        <span className="total-val">{money(pricing.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{textAlign:'center', padding:'20px', color:'#0369a1'}}><FaInfoCircle size={24}/><p style={{fontSize:'0.8rem', marginTop: '10px'}}>Complete details to calculate folio.</p></div>
                  )}
                </div>

                <div className="ocean-section" style={{marginTop:'20px'}}>
                  <h4 className="section-label"><FaCreditCard size={13} color="#0ea5e9"/> Settlement</h4>
                  <div className="field"><label>Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div className="field"><label>Status</label><select value={status} onChange={e => setStatus(e.target.value)} style={{background:'#f0fdf4', color:'#166534', fontWeight: 800}}>{STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
              </div>

            </div>
          </div>

          <div className="ocean-modal-footer">
            <button className="ocean-btn-secondary" onClick={onClose}>Discard</button>
            <button className="ocean-btn-primary" onClick={handleSubmit} disabled={isLocked} style={isLocked ? { opacity: 0.55, cursor: "not-allowed" } : undefined} title={isLocked ? "Month Closed" : "Confirm"}>
              <FaCheck /> Confirm Reservation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}