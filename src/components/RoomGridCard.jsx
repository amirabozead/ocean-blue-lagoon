import React from "react";
import { FaUser, FaClock, FaBed, FaChevronDown, FaBan, FaBroom } from "react-icons/fa";

export default function RoomGridCard({ room, onStatusChange, onClick }) {
  // تفكيك البيانات من الـ room
  const { isOccupied, roomStatus, roomNumber, roomType, currentReservation } = room;

  // ==========================================
  // 1. تحديد الألوان والنصوص
  // ==========================================
  
  let badgeText = "";
  let badgeColor = "";
  let headerBg = "";
  let headerTxt = "";
  let borderColor = "";

  const getStatusColor = (st) => {
    switch (st) {
      case "Clean": return "#0ea5e9"; 
      case "Dirty": return "#d97706"; 
      case "OutOfOrder": return "#dc2626"; 
      default: return "#cbd5e1";
    }
  };

  if (isOccupied) {
    badgeText = "Occupied";
    badgeColor = "#1e40af"; 
    headerBg = "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)";
    headerTxt = "white";
    borderColor = "#1e40af";

  } else {
    if (roomStatus === "Clean") {
      badgeText = "Available";
      badgeColor = "#0ea5e9"; 
      headerBg = "#f0f9ff";   
      headerTxt = "#0c4a6e";  
      borderColor = "#0ea5e9"; 

    } else if (roomStatus === "OutOfOrder") {
      badgeText = "OOS";
      badgeColor = "#dc2626"; 
      headerBg = "#fef2f2";   
      headerTxt = "#991b1b";  
      borderColor = "#dc2626"; 

    } else {
      badgeText = "Need to Clean";
      badgeColor = "#d97706"; 
      headerBg = "#fffbeb";
      headerTxt = "#92400e";
      borderColor = "#d97706";
    }
  }

  return (
    <div 
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05)", 
        border: `2px solid ${borderColor}`,
        borderBottom: `4px solid ${borderColor}`,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transform: "translateY(0)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = "0 15px 25px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05)";
      }}
    >
      {/* HEADER SECTION */}
      <div style={{ padding: "15px 20px", background: headerBg, color: headerTxt, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${borderColor}20` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "0.5px" }}>{roomNumber}</h3>
          <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", opacity: 0.8 }}>{roomType}</span>
        </div>
        
        <div style={{
          background: badgeColor,
          color: "white",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: "1px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
        }}>
          {badgeText}
        </div>
      </div>

      {/* BODY SECTION */}
      <div style={{ padding: "20px", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {isOccupied ? (
          <div style={{ animation: "fadeIn 0.5s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "50%", color: "#3b82f6" }}><FaUser size={12}/></div>
              <div>
                <span style={{ display: "block", fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Guest Name</span>
                <span style={{ fontWeight: "bold", color: "#1e293b", fontSize: "14px" }}>
                  {currentReservation?.guest?.firstName} {currentReservation?.guest?.lastName}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
               <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "50%", color: "#0ea5e9" }}><FaClock size={12}/></div>
               <div>
                <span style={{ display: "block", fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Stay Dates</span>
                <span style={{ fontSize: "12px", color: "#334155", fontWeight: "500" }}>
                  {currentReservation?.stay?.checkIn} ➝ {currentReservation?.stay?.checkOut}
                </span>
               </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", opacity: 0.7 }}>
            {roomStatus === "OutOfOrder" ? (
                <>
                    <FaBan size={32} color="#dc2626" />
                    <p style={{ margin: "5px 0 0", fontSize: "12px", fontWeight: "bold", color: "#dc2626" }}>Under Maintenance</p>
                </>
            ) : roomStatus === "Dirty" ? (
                <>
                    <FaBroom size={32} color="#d97706" />
                    <p style={{ margin: "5px 0 0", fontSize: "12px", fontWeight: "bold", color: "#d97706" }}>Cleaning Required</p>
                </>
            ) : (
                <>
                    <FaBed size={32} color="#0ea5e9" />
                    <p style={{ margin: "5px 0 0", fontSize: "13px", fontWeight: "bold", color: "#0ea5e9" }}>Vacant</p>
                </>
            )}
          </div>
        )}
      </div>

      {/* FOOTER - STATUS DROPDOWN */}
      <div 
        style={{ padding: "10px 15px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
        onClick={(e) => e.stopPropagation()} 
      >
        <div style={{ position: "relative", width: "100%" }}>
          <select
            value={roomStatus}
            onChange={(e) => onStatusChange(roomNumber, e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              paddingLeft: "35px",
              paddingRight: "30px", 
              appearance: "none",
              borderRadius: "8px",
              border: `1px solid ${getStatusColor(roomStatus)}`,
              background: "white",
              color: "#334155",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
          >
            <option value="Clean">✨ Clean</option>
            <option value="Dirty">🧹 Dirty</option>
            <option value="OutOfOrder">🔧 Out of Order</option>
          </select>
          
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64748b" }}>
            <FaChevronDown size={10} />
          </div>

          <div style={{ 
            position: "absolute", 
            left: "12px", 
            top: "50%", 
            transform: "translateY(-50%)", 
            width: "10px", 
            height: "10px", 
            borderRadius: "50%", 
            background: getStatusColor(roomStatus), 
            boxShadow: `0 0 5px ${getStatusColor(roomStatus)}`
          }}></div>
        </div>
      </div>
    </div>
  );
}