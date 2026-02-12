import React, { useState } from "react";
import { 
  FaTimes, FaEdit, FaUserCircle, FaCalendarAlt, 
  FaSignOutAlt, FaBed, FaCheckCircle, FaBroom, FaTools, FaConciergeBell 
} from "react-icons/fa";
import { calcNights } from "../utils/helpers";

export default function RoomDetailsModal({ room, onClose, onEditReservation, onUpdateStatus }) {
  const cr = room.currentReservation;
  const guestName = cr ? `${cr.guest?.firstName || ""} ${cr.guest?.lastName || ""}` : "—";
  const checkIn = cr?.stay?.checkIn || "—";
  const checkOut = cr?.stay?.checkOut || "—";
  const nights = calcNights(checkIn, checkOut);

  const [currentStatus, setCurrentStatus] = useState(room.roomStatus || "Clean");
  const ROOM_STATUSES = ["Clean", "Dirty", "Occupied", "House Use", "Out of Service"];

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    if (onUpdateStatus) onUpdateStatus(room.roomNumber, newStatus);
  };

  // دالة لتحديد الثيم (الألوان والأيقونات) بناءً على الحالة
  const getStatusTheme = (s) => {
    switch (s) {
      case "Clean": return {
        gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", // Vibrant Green
        icon: <FaCheckCircle size={45} />,
        text: "Ready for Guest",
        accent: "#10b981"
      };
      case "Dirty": return {
        gradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", // Vibrant Red
        icon: <FaBroom size={45} />,
        text: "Needs Cleaning",
        accent: "#ef4444"
      };
      case "Out of Service": return {
        gradient: "linear-gradient(135deg, #475569 0%, #1e293b 100%)", // Deep Grey
        icon: <FaTools size={45} />,
        text: "Maintenance / OOS",
        accent: "#475569"
      };
      case "Occupied": return {
        gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", // Vibrant Blue
        icon: <FaUserCircle size={45} />,
        text: "Currently Occupied",
        accent: "#3b82f6"
      };
      default: return {
          gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
          icon: <FaBed size={45}/>,
          text: s,
          accent: "#64748b"
      };
    }
  };

  const theme = getStatusTheme(currentStatus);

  return (
    <>
      <style>{`
        .ocean-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 2000; padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        .ocean-room-panel {
          background: #ffffff; width: 100%; max-width: 500px;
          border-radius: 24px; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5);
          display: flex; flex-direction: column; overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* Close Button Header (Transparent) */
        .top-bar {
            position: absolute; top: 15px; right: 15px; z-index: 10;
        }
        .close-icon-btn {
            background: rgba(255,255,255,0.2); border: none; width: 35px; height: 35px;
            border-radius: 50%; display: flex; align-items: center; justifyContent: center;
            color: white; font-size: 1.1rem; cursor: pointer; transition: background 0.2s;
            backdrop-filter: blur(5px);
        }
        .close-icon-btn:hover { background: rgba(255,255,255,0.4); }

        /* HERO SECTION (The "Vibrant" Part) */
        .hero-header {
          padding: 40px 30px; color: white;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          position: relative;
        }
        .room-big-num { font-size: 2.5rem; font-weight: 900; letter-spacing: -1px; line-height: 1; margin-bottom: 5px; }
        .room-cat-hero { font-size: 0.9rem; opacity: 0.9; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        .status-hero-indicator { display: flex; align-items: center; gap: 15px; margin-top: 10px; }
        .status-hero-text { font-size: 1.4rem; font-weight: 700; }

        /* BODY & CONTENT */
        .panel-body { padding: 30px; }

        /* DROPDOWN AREA */
        .status-action-area {
            margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 16px;
            border: 1px solid #f1f5f9;
        }
        .status-label { display: flex; align-items: center; gap: 8px; color: #64748b; font-weight: 700; margin-bottom: 12px; font-size: 0.8rem; text-transform: uppercase; }
        .status-select-modern {
          width: 100%; padding: 14px 18px; border-radius: 12px;
          border: 2px solid #e2e8f0; font-size: 1rem; font-weight: 700;
          color: #1e293b; background-color: #fff; cursor: pointer; transition: all 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231e293b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.2em;
        }
        .status-select-modern:focus { border-color: ${theme.accent}; box-shadow: 0 0 0 4px ${theme.accent}20; outline: none; }

        /* GUEST INFO (Big & Bold) */
        .guest-hero-details { text-align: center; }
        .guest-name-hero { font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 10px 0 5px; }
        .guest-sub-hero { font-size: 0.95rem; color: #64748b; font-weight: 600; }
        .dates-hero-flex { display: flex; justify-content: center; gap: 30px; margin-top: 25px; }
        .date-hero-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .date-hero-label { font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 5px; }
        .date-hero-val { font-size: 1.1rem; font-weight: 700; color: #334155; }

        /* FOOTER */
        .panel-footer {
          padding: 20px 30px; background: #fff; border-top: 1px solid #f1f5f9;
          display: flex; justify-content: center;
        }
        .btn-manage-hero { 
          background: #0f172a; color: white; border: none; padding: 16px 40px; 
          border-radius: 14px; font-weight: 700; cursor: pointer; 
          display: flex; align-items: center; gap: 10px; font-size: 1rem;
          box-shadow: 0 10px 20px -10px rgba(15, 23, 42, 0.5); transition: all 0.2s;
        }
        .btn-manage-hero:hover { transform: translateY(-3px); box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.6); }
      `}</style>

      <div className="ocean-modal-overlay" onClick={onClose}>
        <div className="ocean-room-panel" onClick={(e) => e.stopPropagation()}>
          
          {/* Top Close Button */}
          <div className="top-bar">
            <button className="close-icon-btn" onClick={onClose}><FaTimes /></button>
          </div>

          {/* VIBRANT HERO HEADER (Changes Color) */}
          <div className="hero-header" style={{ background: theme.gradient }}>
            <div className="room-big-num">Room {room.roomNumber}</div>
            <div className="room-cat-hero">{room.roomType}</div>
            <div className="status-hero-indicator">
              {theme.icon}
              <div className="status-hero-text">{theme.text}</div>
            </div>
          </div>

          {/* Body */}
          <div className="panel-body">
            
            {/* Status Change Dropdown */}
            <div className="status-action-area">
              <label className="status-label"><FaConciergeBell /> Update Status</label>
              <select 
                className="status-select-modern" 
                value={currentStatus} 
                onChange={handleStatusChange}
                style={{ color: theme.accent }}
              >
                {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Reservation Details (Big & Bold) */}
            {cr ? (
              <div className="guest-hero-details">
                <FaUserCircle size={50} color={theme.accent} style={{opacity: 0.8}} />
                <h3 className="guest-name-hero">{guestName}</h3>
                <div className="guest-sub-hero">{nights} Nights Stay</div>

                <div className="dates-hero-flex">
                  <div className="date-hero-item">
                    <span className="date-hero-label"><FaCalendarAlt /> Check-In</span>
                    <span className="date-hero-val">{checkIn}</span>
                  </div>
                  <div className="date-hero-item">
                    <span className="date-hero-label"><FaSignOutAlt /> Check-Out</span>
                    <span className="date-hero-val">{checkOut}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                <FaBed size={60} style={{ marginBottom: '15px', opacity: 0.2 }} />
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#64748b' }}>Room is Vacant</h4>
                <p style={{ margin: '5px 0 0' }}>Ready for new guests.</p>
              </div>
            )}
          </div>

          {/* Footer (Action Button) */}
          {cr && (
            <div className="panel-footer">
              <button 
                className="btn-manage-hero" 
                onClick={() => onEditReservation(room.currentReservationIndex)}
              >
                <FaEdit /> Manage Reservation
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}