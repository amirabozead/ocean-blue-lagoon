import React from "react";
import { FaTimes, FaPrint, FaFileInvoiceDollar, FaCalendarAlt, FaUser, FaDoorOpen } from "react-icons/fa";
import { calcNights, money, storeLoad, roundTo2 } from "../utils/helpers";

export default function InvoiceModal({ reservation, onClose }) {
  // --- الحسابات المالية ---
  const nights = calcNights(reservation.stay?.checkIn, reservation.stay?.checkOut);
  const s = storeLoad("ocean_settings_v1", null);
  const taxRate = Number(s?.taxRate ?? 17);
  const serviceCharge = Number(s?.serviceCharge ?? 10);
  const cityTaxFixed = Number(s?.cityTax ?? 0);
  const closedThrough = String(s?.closedThrough || "2026-01-31");
  const isClosed = (() => {
    const co = String(reservation?.stay?.checkOut || "");
    return !!(closedThrough && co && co <= closedThrough);
  })();
  const pax = Number(reservation?.pax ?? reservation?.guestCount ?? reservation?.pricing?.pax ?? 1);

  const p = reservation?.pricing || {};
  const nightlyArr = Array.isArray(p.nightly) ? p.nightly : [];
  const mealPlanLabel = (() => {
    const mp = String(reservation?.mealPlan ?? "BO").toUpperCase();
    if (mp === "BB") return "Bed & Breakfast (BB)";
    if (mp === "HB") return "Half Board (HB)";
    if (mp === "FB") return "Full Board (FB)";
    return "Meal Plan";
  })();

  const roomSubtotal = Number(
    p.roomSubtotal ?? p.roomBase ?? p.roomTotal ??
    (nightlyArr.length ? nightlyArr.reduce((sum, x) => sum + Number(x.baseRate ?? x.rate ?? 0), 0) : nights * Number(reservation?.room?.roomRate || 0))
  );
  const packageSubtotal = Number(
    p.packageSubtotal ?? p.mealBase ??
    (nightlyArr.length
      ? nightlyArr.reduce((sum, x) => {
          const rate = Number(x?.rate ?? 0);
          const base = Number(x?.baseRate ?? x?.rate ?? 0);
          return sum + Math.max(0, rate - base);
        }, 0)
      : 0)
  );
  const baseSubtotal = roundTo2(Number(p.subtotal ?? (roomSubtotal + packageSubtotal)));
  const taxAmount = Number(isClosed ? (p.taxAmount || 0) : (p.taxAmount ?? roundTo2(baseSubtotal * (taxRate / 100))));
  const serviceAmount = Number(isClosed ? (p.serviceAmount || 0) : (p.serviceAmount ?? roundTo2(baseSubtotal * (serviceCharge / 100))));
  const cityTaxAmount = Number(isClosed ? (p.cityTaxAmount || 0) : (p.cityTaxAmount ?? roundTo2(pax * cityTaxFixed * nights)));
  const invoiceTotal = Number(isClosed ? (p.total || 0) : (p.total ?? roundTo2(baseSubtotal + taxAmount + serviceAmount + cityTaxAmount)));

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        .ocean-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(6px); display: flex; align-items: center;
          justify-content: center; z-index: 2000; padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        .ocean-invoice-card {
          background: #ffffff; width: 100%; max-width: 800px;
          border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
          display: flex; flex-direction: column; overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Header */
        .invoice-header {
          padding: 25px 30px; background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
          border-bottom: 1px solid #e2e8f0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .hotel-brand { display: flex; align-items: center; gap: 20px; }
        .hotel-brand .invoice-logo {
          width: 80px; height: 80px; object-fit: cover; border-radius: 50%;
          border: 3px solid #e0f2fe; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex-shrink: 0;
        }
        .hotel-brand-text { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .hotel-brand-text .invoice-hotel-name {
          margin: 0; color: #0f172a; font-size: 36px; font-family: 'Brush Script MT', cursive;
          letter-spacing: 1px; font-weight: normal; line-height: 1;
        }
        .hotel-brand-text .invoice-hotel-sub {
          font-size: 22px; font-family: 'Brush Script MT', cursive; color: #64748b; margin-top: 5px;
        }
        .invoice-badge {
          background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 8px;
          font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;
        }

        /* Body */
        .invoice-body { padding: 30px; overflow-y: auto; max-height: 80vh; }

        /* Guest Info Grid */
        .guest-grid { 
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; 
          background: #fff; padding: 18px; border: 1px solid #f1f5f9; border-radius: 12px;
          margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
        .info-value { font-size: 0.9rem; color: #1e293b; font-weight: 600; display: flex; align-items: center; gap: 6px; }

        /* Table Styling */
        .ocean-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .ocean-table th { 
          text-align: left; padding: 10px 0; color: #64748b; font-size: 0.75rem; 
          text-transform: uppercase; border-bottom: 2px solid #e2e8f0; 
        }
        .ocean-table td { 
          padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.9rem; 
        }
        .ocean-table tr:last-child td { border-bottom: none; }
        .text-right { text-align: right; }

        /* Total Summary Box - (تم التعديل هنا) */
        .total-box {
          background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 18px;
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 10px;
        }
        .total-label { font-size: 1rem; font-weight: 700; color: #0369a1; }
        /* تم تصغير الخط من 1.8rem إلى 1.4rem وتقليل الـ weight */
        .total-amount { font-size: 1.4rem; font-weight: 700; color: #0284c7; }

        /* Footer */
        .invoice-footer {
          padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0;
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn-print { 
          background: #0f172a; color: white; border: none; padding: 10px 20px; 
          border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; 
        }
        .btn-close { 
          background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 20px; 
          border-radius: 8px; font-weight: 600; cursor: pointer; 
        }

        /* Print styles */
        @media print {
          .ocean-modal-overlay { position: absolute; background: white; padding: 0; }
          .ocean-invoice-card { box-shadow: none; max-width: 100%; }
          .invoice-footer, .btn-close { display: none; }
          .hotel-brand .invoice-logo { width: 64px; height: 64px; }
          .hotel-brand-text .invoice-hotel-name { font-size: 28px; }
          .hotel-brand-text .invoice-hotel-sub { font-size: 18px; }
        }
      `}</style>

      <div className="ocean-modal-overlay">
        <div className="ocean-invoice-card">
          
          {/* Header */}
          <div className="invoice-header">
            <div className="hotel-brand">
              <img src="/logo.png" alt="Ocean Blue Lagoon" className="invoice-logo" />
              <div className="hotel-brand-text">
                <h1 className="invoice-hotel-name">Ocean Blue Lagoon</h1>
                <span className="invoice-hotel-sub">Maldives Resort</span>
              </div>
            </div>
            <div className="invoice-badge">
              <FaFileInvoiceDollar /> INVOICE #{String(reservation.id).substring(0, 6).toUpperCase()}
            </div>
          </div>

          {/* Body */}
          <div className="invoice-body">
            
            {/* Guest & Stay Details Grid */}
            <div className="guest-grid">
              <div className="info-item">
                <span className="info-label">Guest Name</span>
                <span className="info-value"><FaUser size={11} color="#0ea5e9"/> {reservation.guest?.firstName} {reservation.guest?.lastName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Room Info</span>
                <span className="info-value"><FaDoorOpen size={11} color="#0ea5e9"/> Room {reservation.room?.roomNumber}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Stay Duration</span>
                <span className="info-value"><FaCalendarAlt size={11} color="#0ea5e9"/> {nights} Nights</span>
              </div>
              <div className="info-item">
                <span className="info-label">Check-In</span>
                <span className="info-value">{reservation.stay?.checkIn}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Check-Out</span>
                <span className="info-value">{reservation.stay?.checkOut}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Pax</span>
                <span className="info-value">{pax} Guests</span>
              </div>
              <div className="info-item">
                <span className="info-label">Meal Plan</span>
                <span className="info-value">{mealPlanLabel}</span>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '0.95rem' }}>Charges Breakdown</h4>
              <table className="ocean-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Room Charges ({nights} nights)</td>
                    <td className="text-right">{money(roomSubtotal)}</td>
                  </tr>
                  {packageSubtotal > 0 && (
                    <tr>
                      <td>Meal Plan ({String(reservation?.mealPlan ?? "BO").toUpperCase()})</td>
                      <td className="text-right">{money(packageSubtotal)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Service Charge ({serviceCharge}%)</td>
                    <td className="text-right">{money(serviceAmount)}</td>
                  </tr>
                  <tr>
                    <td>GST ({taxRate}%)</td>
                    <td className="text-right">{money(taxAmount)}</td>
                  </tr>
                  {cityTaxAmount > 0 && (
                    <tr>
                      <td>Green Tax (City Tax)</td>
                      <td className="text-right">{money(cityTaxAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Section (المعدل) */}
            <div className="total-box">
              <span className="total-label">Grand Total</span>
              <span className="total-amount">{money(invoiceTotal)}</span>
            </div>

          </div>

          {/* Footer */}
          <div className="invoice-footer">
            <button className="btn-close" onClick={onClose}>
              <FaTimes /> Close
            </button>
            <button className="btn-print" onClick={handlePrint}>
              <FaPrint /> Print Invoice
            </button>
          </div>

        </div>
      </div>
    </>
  );
}