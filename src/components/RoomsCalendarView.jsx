import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon
} from "lucide-react";
import { startOfDay, isSameDay, isActiveStatus } from "../utils/helpers";

export default function RoomsCalendarView({ rooms, reservations, onCellClick }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  const getReservationForDay = (roomNumber, day) => {
    const d = startOfDay(day);
    return (reservations || []).find((r) => {
      if (r.room?.roomNumber !== roomNumber) return false;
      if (!r.stay?.checkIn || !r.stay?.checkOut) return false;
      if (!isActiveStatus(r.status)) return false;

      const inDate = startOfDay(new Date(r.stay.checkIn));
      const outDate = startOfDay(new Date(r.stay.checkOut));
      // نحسب اليوم إذا كان داخل النطاق
      return d >= inDate && d < outDate;
    });
  };

  const occupancyForDay = (day) => {
    let occupied = 0;
    const d = startOfDay(day);
    rooms.forEach((room) => {
      const hasRes = getReservationForDay(room.roomNumber, day);
      if (hasRes) occupied++;
    });
    return Math.round((occupied / rooms.length) * 100);
  };

  // تنسيق الخلية
  const getCellStyle = (res, isToday, isWeekend) => {
    let style = {
      height: "45px",
      borderRight: "1px solid #f1f5f9",
      borderBottom: "1px solid #f1f5f9",
      cursor: "pointer",
      position: "relative",
      backgroundColor: isWeekend ? "#f8fafc" : "#ffffff",
    };

    if (isToday) {
      style.backgroundColor = "#eff6ff"; 
    }

    return style;
  };

  // تنسيق شريط الحجز
  const getReservationBarStyle = (status) => {
    const baseStyle = {
      position: "absolute",
      top: "6px",
      bottom: "6px",
      left: "2px",
      right: "2px",
      borderRadius: "6px",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "600",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      overflow: "hidden",
      whiteSpace: "nowrap",
      padding: "0 4px",
      // هذا السطر هو الحل السحري: يجعل النقرة تتجاوز هذا الشريط لتصل للخلية
      pointerEvents: "none" 
    };

    if (status === "Checked-in") {
      return { ...baseStyle, backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
    }
    if (status === "Booked") {
      return { ...baseStyle, backgroundColor: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" };
    }
    return { ...baseStyle, backgroundColor: "#f3f4f6", color: "#374151" };
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(year, month + offset, 1));
  };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      
      {/* Header Toolbar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ padding: "8px", background: "#f1f5f9", borderRadius: "8px" }}>
            <CalendarIcon size={20} color="#475569" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Occupancy Overview</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={() => changeMonth(-1)} 
            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: 'flex' }}
          >
            <ChevronLeft size={16} color="#64748b" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#475569" }}
          >
            Today
          </button>
          <button 
            onClick={() => changeMonth(1)} 
            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: 'flex' }}
          >
            <ChevronRight size={16} color="#64748b" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div style={{ overflowX: "auto", position: "relative" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: "1000px" }}>
          <thead>
            {/* Occupancy Row */}
            <tr>
              <th style={{ position: "sticky", left: 0, top: 0, background: "#f8fafc", zIndex: 20, width: "100px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px", fontSize: "11px", color: "#64748b", fontWeight: "600", textAlign: 'left' }}>
                OCCUPANCY
              </th>
              {days.map((day, i) => {
                 const occ = occupancyForDay(day);
                 const isHigh = occ > 80;
                 return (
                  <th key={i} style={{ minWidth: "40px", padding: "8px 0", textAlign: "center", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #f1f5f9", background: isHigh ? "#fee2e2" : "#f8fafc" }}>
                    <span style={{ fontSize: "10px", color: isHigh ? "#b91c1c" : "#64748b", fontWeight: "700" }}>{occ}%</span>
                  </th>
                 )
              })}
            </tr>

            {/* Days Row */}
            <tr>
              <th style={{ position: "sticky", left: 0, top: "35px", background: "#fff", zIndex: 20, borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px", textAlign: 'left', color: "#0f172a" }}>
                ROOM
              </th>
              {days.map((d, i) => {
                const isToday = isSameDay(d, today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={i} style={{ 
                    minWidth: "40px", 
                    padding: "10px 0", 
                    textAlign: "center", 
                    borderBottom: "2px solid #e2e8f0", 
                    borderRight: "1px solid #f1f5f9",
                    background: isToday ? "#eff6ff" : "#fff",
                    color: isToday ? "#2563eb" : (isWeekend ? "#94a3b8" : "#475569")
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>{d.getDate()}</div>
                    <div style={{ fontSize: "9px", textTransform: "uppercase", marginTop: "2px" }}>
                      {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rooms.map((room) => (
              <tr key={room.roomNumber}>
                {/* Room Column (Sticky) */}
                <td style={{ 
                  position: "sticky", 
                  left: 0, 
                  background: "#fff", 
                  zIndex: 10, 
                  borderBottom: "1px solid #e2e8f0", 
                  borderRight: "1px solid #e2e8f0",
                  padding: "0 12px"
                }}>
                  <div style={{ fontWeight: "700", color: "#334155", fontSize: "14px" }}>{room.roomNumber}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{room.roomType}</div>
                </td>

                {/* Days Cells */}
                {days.map((day, i) => {
                  const res = getReservationForDay(room.roomNumber, day);
                  const status = res?.status || null;
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <td
                      key={i}
                      style={getCellStyle(res, isToday, isWeekend)}
                      onClick={() =>
                        onCellClick({
                          reservation: res || null,
                          roomNumber: room.roomNumber,
                          date: day.toISOString().slice(0, 10),
                        })
                      }
                    >
                      {status && (
                        <div style={getReservationBarStyle(status)}>
                          {isSameDay(new Date(res.stay.checkIn), day) ? (
                             <span style={{marginLeft: 2}}>{res.guest?.firstName?.charAt(0)}. {res.guest?.lastName}</span> 
                          ) : (
                            <span style={{width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.5}}></span>
                          )}
                        </div>
                      )}
                      
                      {!status && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                           <span style={{fontSize: '10px', color: '#cbd5e1'}}>+</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}