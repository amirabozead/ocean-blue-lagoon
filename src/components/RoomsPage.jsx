import React, { useState, useMemo, useEffect } from "react";
import { FaThLarge, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaBed, FaLayerGroup, FaBroom, FaBan, FaDoorOpen, FaTools } from "react-icons/fa"; 
import { BASE_ROOMS } from "../data/constants";
import RoomGridCard from "./RoomGridCard";
import OOSManagementModal from "./OOSManagementModal";
import { isDateBetween, storeLoad } from "../utils/helpers";
import { isRoomOOSOnDate, getOOSRoomsCountOnDate } from "../utils/oosHelpers";

const HOTEL_LOGO = "/logo.png"; 

export default function RoomsPage({ 
  reservations = [], // 🔥 (هام) قيمة افتراضية لمنع الخطأ
  roomPhysicalStatus = {}, 
  updateRoomStatus, 
  onEditReservation, 
  onAddReservation,
  setSelectedRoom,
  oosPeriods = [],
  onAddOOSPeriod,
  onUpdateOOSPeriod,
  onDeleteOOSPeriod,
  onRefreshOOS,
  onRoomsMount,
}) {
  const [viewMode, setViewMode] = useState("grid");
  const [showOOSModal, setShowOOSModal] = useState(false);

  // Two-way sync: when Rooms page is shown, fetch latest OOS from Supabase (web + local stay in sync)
  useEffect(() => {
    if (onRoomsMount) onRoomsMount();
  }, []);

  // When OOS modal opens, refresh again so list is up to date
  useEffect(() => {
    if (showOOSModal && onRefreshOOS) onRefreshOOS();
  }, [showOOSModal, onRefreshOOS]);

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
      // Room card status: if room is in an OOS period today, show OOS; otherwise use physical status (Clean/Dirty)
      const isOOSToday = isRoomOOSOnDate(room.roomNumber, today, oosPeriods);
      const physicalStatus = roomPhysicalStatus?.[room.roomNumber] || "Clean";
      const roomStatus = isOOSToday ? "OutOfOrder" : physicalStatus;
      return {
        ...room,
        currentReservation: activeRes,
        roomStatus,
        isOccupied: !!activeRes
      };
    });
  }, [reservations, roomPhysicalStatus, oosPeriods]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayOOSCount = getOOSRoomsCountOnDate(today, oosPeriods);
    
    return {
        total: roomsWithData.length,
        available: roomsWithData.filter(r => {
          if (r.isOccupied) return false;
          if (r.roomStatus !== "Clean") return false;
          // Check if room is OOS today (from OOS periods)
          const isOOS = isRoomOOSOnDate(r.roomNumber, today, oosPeriods);
          return !isOOS;
        }).length,
        // عدد الغرف التي تحتاج Cleaning (حالة Dirty)
        housekeeping: roomsWithData.filter(r => r.roomStatus === "Dirty").length,
        clean: roomsWithData.filter(r => r.roomStatus === "Clean").length,
        oos: todayOOSCount // Count from OOS periods, not just physical status
    };
  }, [roomsWithData, oosPeriods]);

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
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ background: "white", padding: "5px", borderRadius: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", gap: "5px", border: "1px solid #e2e8f0" }}>
              <button onClick={() => setViewMode("grid")} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: viewMode === "grid" ? "#3b82f6" : "transparent", color: viewMode === "grid" ? "white" : "#64748b" }}>
                  <FaThLarge /> Grid
              </button>
              <button onClick={() => setViewMode("timeline")} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: viewMode === "timeline" ? "#3b82f6" : "transparent", color: viewMode === "timeline" ? "white" : "#64748b" }}>
                  <FaCalendarAlt /> Calendar
              </button>
          </div>
          <button 
            onClick={() => setShowOOSModal(true)}
            style={{ 
              padding: "8px 16px", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer", 
              fontWeight: "bold", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              fontSize: "12px", 
              background: "#dc2626",
              color: "white",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
            }}
          >
            <FaTools /> Manage OOS
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
          roomPhysicalStatus={roomPhysicalStatus}
          oosPeriods={oosPeriods}
          onAdd={onAddReservation}
          onEdit={(resId) => {
             const idx = reservations.findIndex(r => r.id === resId);
             if(idx !== -1) onEditReservation(idx);
          }}
        />
      )}

      {/* OOS Management Modal */}
      {showOOSModal && (
        <OOSManagementModal
          onClose={() => setShowOOSModal(false)}
          oosPeriods={oosPeriods}
          reservations={reservations}
          onAdd={onAddOOSPeriod}
          onUpdate={onUpdateOOSPeriod}
          onDelete={onDeleteOOSPeriod}
        />
      )}
    </div>
  );
}

// =======================
// Timeline Component (Dual Dropdowns: Year & Month)
// =======================
function RoomTimelineView({ rooms, reservations, roomPhysicalStatus = {}, oosPeriods = [], onAdd, onEdit }) {
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
      
      {/* Legend */}
      <div style={{ 
        display: "flex", 
        gap: "20px", 
        marginBottom: "15px", 
        padding: "12px", 
        background: "#f8fafc", 
        borderRadius: "8px",
        flexWrap: "wrap",
        fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "20px", height: "12px", background: "#3b82f6", borderRadius: "3px" }}></div>
          <span style={{ color: "#64748b" }}>Booked</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "20px", height: "12px", background: "#10b981", borderRadius: "3px" }}></div>
          <span style={{ color: "#64748b" }}>Checked-in / In House</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FaTools size={14} color="#dc2626" />
          <span style={{ color: "#64748b" }}>Out of Service</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "12px", height: "12px", background: "#d97706", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px" }}>🧹</div>
          <span style={{ color: "#64748b" }}>Dirty</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", opacity: 0.5 }}></div>
          <span style={{ color: "#64748b" }}>Clean / Available</span>
        </div>
      </div>
      
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
                // Find reservation for this day (all statuses, not just "Booked")
                const res = safeReservations.find(r => {
                  const rStatus = String(r?.status || "").toLowerCase();
                  const isActiveStatus = 
                    rStatus === "booked" || 
                    rStatus === "confirmed" || 
                    rStatus === "checked-in" || 
                    rStatus === "checked in" ||
                    rStatus === "in house";
                  
                  return (
                    isActiveStatus &&
                    String(r.room?.roomNumber ?? r.roomNumber ?? "") === String(room.roomNumber) &&
                    isDateBetween(day, r.stay?.checkIn ?? r.checkIn, r.stay?.checkOut ?? r.checkOut)
                  );
                });
                
                // Check if room is OOS on this day
                const isOOS = isRoomOOSOnDate(room.roomNumber, day, oosPeriods);
                
                // Check if this is a checkout date for this room
                const isCheckoutDate = safeReservations.some(r => {
                  const rStatus = String(r?.status || "").toLowerCase();
                  const isActiveStatus = 
                    rStatus === "booked" || 
                    rStatus === "confirmed" || 
                    rStatus === "checked-in" || 
                    rStatus === "checked in" ||
                    rStatus === "in house" ||
                    rStatus === "checked-out" ||
                    rStatus === "checked out";
                  
                  if (!isActiveStatus) return false;
                  
                  const roomMatch = String(r.room?.roomNumber ?? r.roomNumber ?? "") === String(room.roomNumber);
                  const checkoutDate = r.stay?.checkOut ?? r.checkOut;
                  
                  return roomMatch && checkoutDate === day;
                });
                
                // Check if this is today (for manually changed status)
                const today = new Date().toISOString().split("T")[0];
                const isToday = day === today;
                
                // Get room physical status - only show on checkout date or today
                const physicalStatus = roomPhysicalStatus?.[room.roomNumber] || "Clean";
                const showCleanStatus = (isCheckoutDate || isToday) && !res && !isOOS;
                const isDirty = showCleanStatus && physicalStatus === "Dirty";
                const isClean = showCleanStatus && physicalStatus === "Clean";
                
                // Determine reservation status
                const resStatus = res ? String(res.status || "Booked").toLowerCase() : null;
                const isCheckedIn = resStatus === "checked-in" || resStatus === "checked in" || resStatus === "in house";
                const isBooked = resStatus === "booked" || resStatus === "confirmed";
                
                const isStart = res && (res.stay?.checkIn ?? res.checkIn) === day;
                const isEnd = res && (res.stay?.checkOut ?? res.checkOut) === day;
                
                // Build cell content and styling
                let cellContent = null;
                let cellBg = "transparent";
                let borderColor = "#f1f5f9";
                
                // Priority: OOS > Reservation > Clean Status
                if (isOOS) {
                  // OOS: Tools icon indicator (highest priority) - matches Manage OOS button
                  cellContent = (
                    <div style={{
                      height: "100%",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative"
                    }} title="Out of Service">
                      <FaTools 
                        size={18} 
                        style={{ 
                          color: "#dc2626",
                          opacity: 0.9
                        }} 
                      />
                    </div>
                  );
                  cellBg = "#fef2f2";
                  borderColor = "#fecaca";
                } else if (res) {
                  // Reservation: Color based on status
                  let barColor = "#3b82f6"; // Default blue for Booked
                  let barBg = "#dbeafe";
                  
                  if (isCheckedIn) {
                    barColor = "#10b981"; // Green for Checked-in/In House
                    barBg = "#d1fae5";
                  } else if (isBooked) {
                    barColor = "#3b82f6"; // Blue for Booked
                    barBg = "#dbeafe";
                  }
                  
                  const reservationBarStyle = {
                    height: "25px",
                    background: barColor,
                    width: "100%",
                    marginTop: "12px",
                    opacity: 0.9,
                    borderRadius: "4px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isStart ? "flex-start" : "center",
                    paddingLeft: isStart ? "6px" : "0",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "white",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                  };
                  
                  if (isStart) {
                    reservationBarStyle.borderRadius = "4px 0 0 4px";
                    reservationBarStyle.marginLeft = "5px";
                    reservationBarStyle.width = "calc(100% - 5px)";
                    cellContent = (
                      <div style={reservationBarStyle} title={`${res.guest?.firstName || ""} ${res.guest?.lastName || ""} - ${res.status}`}>
                        {res.guest?.lastName || "Guest"}
                      </div>
                    );
                  } else if (isEnd) {
                    reservationBarStyle.borderRadius = "0 4px 4px 0";
                    reservationBarStyle.marginRight = "5px";
                    reservationBarStyle.width = "calc(100% - 5px)";
                    cellContent = <div style={reservationBarStyle} title={res.status}></div>;
                  } else {
                    cellContent = <div style={reservationBarStyle} title={res.status}></div>;
                  }
                  
                  cellBg = barBg;
                  borderColor = barColor;
                } else if (isDirty) {
                  // Dirty status: Orange/yellow indicator
                  cellContent = (
                    <div style={{
                      height: "20px",
                      width: "20px",
                      marginTop: "15px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      background: "#d97706",
                      borderRadius: "50%",
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "8px",
                      color: "white",
                      fontWeight: "bold"
                    }} title="Dirty - Needs Cleaning">🧹</div>
                  );
                  cellBg = "#fffbeb";
                  borderColor = "#fde68a";
                } else if (isClean) {
                  // Clean status: Subtle green indicator
                  cellContent = (
                    <div style={{
                      height: "8px",
                      width: "8px",
                      marginTop: "21px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      background: "#10b981",
                      borderRadius: "50%",
                      opacity: 0.5
                    }} title="Clean - Available"></div>
                  );
                  cellBg = "#f0fdf4";
                }

                return (
                  <td 
                    key={day} 
                    style={{ 
                      padding: 0, 
                      height: "50px", 
                      borderRight: `1px solid ${borderColor}`, 
                      cursor: isOOS ? "not-allowed" : "pointer", 
                      position: "relative",
                      background: cellBg,
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => {
                        if (res) onEdit(res.id);
                        else if (!isOOS) onAdd(room.roomNumber);
                    }}
                    onMouseEnter={(e) => {
                      if (!isOOS && !res) {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isOOS && !res) {
                        e.currentTarget.style.background = cellBg;
                        e.currentTarget.style.borderColor = borderColor;
                      }
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