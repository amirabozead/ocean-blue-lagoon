import React, { useState, useMemo } from "react";
import { FaThLarge, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaBed, FaLayerGroup, FaBroom, FaBan, FaDoorOpen } from "react-icons/fa"; 
import { BASE_ROOMS } from "../data/constants";
import RoomGridCard from "./RoomGridCard";
import { isDateBetween } from "../utils/helpers";

const HOTEL_LOGO = "/logo.png"; 

export default function RoomsPage({ 
  reservations = [], // 🔥 (هام) قيمة افتراضية لمنع الخطأ
  roomPhysicalStatus = {}, 
  updateRoomStatus, 
  onEditReservation, 
  onAddReservation,
  setSelectedRoom 
}) {
  const [viewMode, setViewMode] = useState("grid");

  // معالجة البيانات
  const roomsWithData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    // 🔥 حماية إضافية
    const safeReservations = Array.isArray(reservations) ? reservations : [];

    return BASE_ROOMS.map((room) => {
      const activeRes = safeReservations.find((r) => {
        const st = String(r?.status || "").trim().toLowerCase();
        const isOccStatus =
          st === "booked" ||
          st === "confirmed" ||
          st === "in house" ||
          st === "checked in" ||
          (st.includes("check") && st.includes("in")) ||
          (st.includes("in") && st.includes("house"));

        const rRoomNo = String(r?.room?.roomNumber ?? r?.roomNumber ?? "").trim();
        const roomNo = String(room.roomNumber).trim();

        return (
          isOccStatus &&
          rRoomNo === roomNo &&
          isDateBetween(today, r?.stay?.checkIn, r?.stay?.checkOut)
        );
      });
      return {
        ...room,
        currentReservation: activeRes,
        roomStatus: roomPhysicalStatus?.[room.roomNumber] || "Clean",
        isOccupied: !!activeRes
      };
    });
  }, [reservations, roomPhysicalStatus]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    return {
        total: roomsWithData.length,
        available: roomsWithData.filter(r => !r.isOccupied && r.roomStatus === "Clean").length,
        // عدد الغرف التي تحتاج Cleaning (حالة Dirty)
        housekeeping: roomsWithData.filter(r => r.roomStatus === "Dirty").length,
        clean: roomsWithData.filter(r => r.roomStatus === "Clean").length,
        oos: roomsWithData.filter(r => r.roomStatus === "OutOfOrder").length
    };
  }, [roomsWithData]);

  // Styles
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
    statsBar: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "20px",
        marginBottom: "30px"
    },
    statCard: (color, bg) => ({
        background: "white",
        borderRadius: "12px",
        padding: "15px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
        borderLeft: `5px solid ${color}`,
        border: "1px solid #f1f5f9"
    })
  };

  return (
    <div style={{ padding: "30px", background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
      
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
           <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", fontFamily: "'Playfair Display', serif", fontStyle: "italic", lineHeight: "1" }}>Rooms Manager</span>
           <FaBed style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        <div style={{ background: "white", padding: "5px", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", gap: "5px", border: "1px solid #e2e8f0" }}>
            <button onClick={() => setViewMode("grid")} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: viewMode === "grid" ? "#3b82f6" : "transparent", color: viewMode === "grid" ? "white" : "#64748b" }}>
                <FaThLarge /> Grid
            </button>
            <button onClick={() => setViewMode("timeline")} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: viewMode === "timeline" ? "#3b82f6" : "transparent", color: viewMode === "timeline" ? "white" : "#64748b" }}>
                <FaCalendarAlt /> Calendar
            </button>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={headerStyles.statsBar}>
          <div style={headerStyles.statCard("#6366f1", "#eef2ff")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Total Rooms</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#1e293b" }}>{stats.total}</span></div>
              <div style={{ background: "#eef2ff", padding: "10px", borderRadius: "50%", color: "#6366f1" }}><FaLayerGroup size={20} /></div>
          </div>
          <div style={headerStyles.statCard("#0ea5e9", "#f0f9ff")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Available</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#0ea5e9" }}>{stats.available}</span></div>
              <div style={{ background: "#f0f9ff", padding: "10px", borderRadius: "50%", color: "#0ea5e9" }}><FaDoorOpen size={20} /></div>
          </div>

          {/* ✅ Housekeeping بدل Total Clean */}
          <div style={headerStyles.statCard("#d97706", "#fffbeb")}>
              <div>
                <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>
                  Housekeeping
                </span>
                <span style={{ fontSize: "24px", fontWeight: "900", color: "#d97706" }}>
                  {stats.housekeeping}
                </span>
              </div>
              <div style={{ background: "#fffbeb", padding: "10px", borderRadius: "50%", color: "#d97706" }}>
                <FaBroom size={20} />
              </div>
          </div>

          <div style={headerStyles.statCard("#dc2626", "#fef2f2")}>
              <div><span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Out of Order</span><span style={{ fontSize: "24px", fontWeight: "900", color: "#dc2626" }}>{stats.oos}</span></div>
              <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "50%", color: "#dc2626" }}><FaBan size={20} /></div>
          </div>
      </div>

      {/* GRID / TIMELINE */}
      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px" }}>
          {roomsWithData.map((room) => (
            <RoomGridCard
              key={room.roomNumber}
              room={room}
              onStatusChange={updateRoomStatus}
              onClick={() => {
                if (room.isOccupied) setSelectedRoom(room);
                else onAddReservation(room.roomNumber);
              }}
            />
          ))}
        </div>
      ) : (
        <RoomTimelineView 
          rooms={BASE_ROOMS} 
          reservations={reservations} 
          onAdd={onAddReservation}
          onEdit={(resId) => {
             const idx = reservations.findIndex(r => r.id === resId);
             if(idx !== -1) onEditReservation(idx);
          }}
        />
      )}
    </div>
  );
}

// =======================
// Timeline Component (Dual Dropdowns: Year & Month)
// =======================
function RoomTimelineView({ rooms, reservations, onAdd, onEdit }) {
  const [startDate, setStartDate] = useState(new Date());

  // 1. توليد قائمة السنوات (مثلاً من 3 سنوات سابقة إلى 3 سنوات قادمة)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; 
    const endYear = currentYear + 3;
    const list = [];
    for (let i = startYear; i <= endYear; i++) list.push(i);
    return list;
  }, []);

  // 2. قائمة الشهور
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // 3. دوال التغيير
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    const d = new Date(startDate);
    d.setFullYear(newYear);
    setStartDate(d);
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    const d = new Date(startDate);
    d.setMonth(newMonth);
    // ضبط اليوم على 1 لتجنب مشاكل نهايات الأشهر
    d.setDate(1); 
    setStartDate(d);
  };

  const shiftDate = (daysCount) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + daysCount);
    setStartDate(d);
  };
  
  // توليد أيام الجدول بناءً على التاريخ المختار
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [startDate]);

  const safeReservations = Array.isArray(reservations) ? reservations : [];

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflowX: "auto" }}>
      
      {/* Header with Dual Selectors */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
         
         {/* Navigation Buttons */}
         <button onClick={() => shiftDate(-7)} style={btnStyle}><FaChevronLeft/> Prev Week</button>
         
         {/* 🔥 Dual Dropdowns Container */}
         <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
             
             {/* Month Select */}
             <div style={{ position: "relative" }}>
                 <select 
                    value={startDate.getMonth()} 
                    onChange={handleMonthChange}
                    style={selectStyle}
                 >
                    {months.map((m, index) => (
                        <option key={index} value={index}>{m}</option>
                    ))}
                 </select>
                 <FaCalendarAlt style={iconStyle} />
             </div>

             {/* Year Select */}
             <div style={{ position: "relative" }}>
                 <select 
                    value={startDate.getFullYear()} 
                    onChange={handleYearChange}
                    style={{ ...selectStyle, minWidth: "100px" }} // أصغر قليلاً للسنة
                 >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                 </select>
                 <span style={{...iconStyle, fontSize: "12px", fontWeight:"bold"}}>Y</span>
             </div>

         </div>

         <button onClick={() => shiftDate(7)} style={btnStyle}>Next Week <FaChevronRight/></button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: "100px", position: "sticky", left: 0, zIndex: 10 }}>Room</th>
            {days.map(d => {
              const dateObj = new Date(d);
              const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6; 
              return (
                <th key={d} style={{ ...thStyle, background: isWeekend ? "#f1f5f9" : "white", color: isWeekend ? "#ef4444" : "#64748b" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase" }}>{dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>{dateObj.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.roomNumber} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px", fontWeight: "bold", color: "#1e293b", position: "sticky", left: 0, background: "white", borderRight: "1px solid #e2e8f0" }}>
                {room.roomNumber}
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "normal" }}>{room.roomType}</div>
              </td>

              {days.map(day => {
                const res = safeReservations.find(r => 
                  r.status === "Booked" && 
                  String(r.room.roomNumber) === String(room.roomNumber) &&
                  isDateBetween(day, r.stay.checkIn, r.stay.checkOut)
                );
                
                const isStart = res && res.stay.checkIn === day;
                const isEnd = res && res.stay.checkOut === day;
                
                let cellContent = null;
                if (res) {
                    if(isStart) cellContent = <div style={{...barStyle, borderRadius: "4px 0 0 4px", marginLeft: "5px"}} title={res.guest?.lastName}></div>;
                    else if(isEnd) cellContent = <div style={{...barStyle, borderRadius: "0 4px 4px 0", marginRight: "5px"}}></div>;
                    else cellContent = <div style={barStyle}></div>;
                }

                return (
                  <td 
                    key={day} 
                    style={{ padding: 0, height: "50px", borderRight: "1px solid #f1f5f9", cursor: "pointer", position: "relative" }}
                    onClick={() => {
                        if (res) onEdit(res.id);
                        else onAdd(room.roomNumber);
                    }} 
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Styles Update
const btnStyle = { background: "#f1f5f9", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "bold", color: "#475569" };
const thStyle = { padding: "10px", textAlign: "center", borderBottom: "2px solid #e2e8f0", background: "white" };
const barStyle = { height: "25px", background: "#3b82f6", width: "100%", marginTop: "12px", opacity: 0.8 };

const selectStyle = {
    padding: "8px 30px 8px 12px", 
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#334155",
    outline: "none",
    cursor: "pointer",
    background: "white",
    appearance: "none", 
    minWidth: "140px"
};

const iconStyle = {
    position: "absolute", 
    right: "10px", 
    top: "50%", 
    transform: "translateY(-50%)", 
    color: "#64748b", 
    pointerEvents: "none", 
    fontSize: "14px"
};