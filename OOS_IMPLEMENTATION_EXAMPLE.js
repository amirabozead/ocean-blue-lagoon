/**
 * OOS ROOMS IMPLEMENTATION EXAMPLES
 * 
 * This file contains example code snippets showing how to implement
 * date-range-based OOS (Out of Service) room management.
 * 
 * Copy relevant sections into your actual component files.
 */

// ==========================================
// 1. HELPER FUNCTIONS (oosHelpers.js)
// ==========================================

/**
 * Check if a room is OOS on a specific date
 */
export function isRoomOOSOnDate(roomNumber, date, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return false;
  
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const roomStr = String(roomNumber).trim();
  
  return oosPeriods.some(period => {
    const periodRoom = String(period.roomNumber || period.room).trim();
    return (
      periodRoom === roomStr &&
      dateStr >= period.startDate &&
      dateStr < period.endDate // End date is exclusive
    );
  });
}

/**
 * Check if a room is OOS during a date range
 */
export function isRoomOOSDuringPeriod(roomNumber, startDate, endDate, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return false;
  
  const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
  const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
  const roomStr = String(roomNumber).trim();
  
  return oosPeriods.some(period => {
    const periodRoom = String(period.roomNumber || period.room).trim();
    if (periodRoom !== roomStr) return false;
    
    // Check for overlap: period overlaps if start < endDate AND end > startDate
    return period.startDate < endStr && period.endDate > startStr;
  });
}

/**
 * Get count of OOS rooms on a specific date
 */
export function getOOSRoomsCountOnDate(date, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return 0;
  
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const oosRooms = new Set();
  
  oosPeriods.forEach(period => {
    if (dateStr >= period.startDate && dateStr < period.endDate) {
      oosRooms.add(String(period.roomNumber || period.room).trim());
    }
  });
  
  return oosRooms.size;
}

/**
 * Get OOS periods for a specific room
 */
export function getOOSPeriodsForRoom(roomNumber, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return [];
  
  const roomStr = String(roomNumber).trim();
  return oosPeriods.filter(period => 
    String(period.roomNumber || period.room).trim() === roomStr
  );
}

/**
 * Get all OOS periods active on a date
 */
export function getActiveOOSPeriodsOnDate(date, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return [];
  
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return oosPeriods.filter(period => 
    dateStr >= period.startDate && dateStr < period.endDate
  );
}

/**
 * Validate OOS period (check for conflicts with reservations)
 */
export function validateOOSPeriod(roomNumber, startDate, endDate, reservations, existingPeriods = []) {
  const errors = [];
  const roomStr = String(roomNumber).trim();
  
  // Check date validity
  if (startDate >= endDate) {
    errors.push("Start date must be before end date");
  }
  
  // Check for overlapping OOS periods for same room
  const overlapping = existingPeriods.filter(period => {
    const periodRoom = String(period.roomNumber || period.room).trim();
    if (periodRoom !== roomStr) return false;
    
    // Check for overlap
    return period.startDate < endDate && period.endDate > startDate;
  });
  
  if (overlapping.length > 0) {
    errors.push(`Room ${roomNumber} already has OOS period(s) during this date range`);
  }
  
  // Check for conflicting reservations
  if (reservations && Array.isArray(reservations)) {
    const conflicting = reservations.filter(res => {
      const resRoom = String(res?.room?.roomNumber ?? res?.roomNumber ?? "").trim();
      if (resRoom !== roomStr) return false;
      
      const resStatus = String(res?.status || "").toLowerCase();
      const isActive = resStatus === "booked" || 
                       resStatus === "confirmed" || 
                       resStatus === "checked-in" ||
                       resStatus === "in house";
      
      if (!isActive) return false;
      
      const resCheckIn = res?.stay?.checkIn || res?.checkIn;
      const resCheckOut = res?.stay?.checkOut || res?.checkOut;
      
      if (!resCheckIn || !resCheckOut) return false;
      
      // Check for overlap
      return resCheckIn < endDate && resCheckOut > startDate;
    });
    
    if (conflicting.length > 0) {
      errors.push(`Room ${roomNumber} has active reservation(s) during this period`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==========================================
// 2. STATE MANAGEMENT (app.jsx)
// ==========================================

/*
// Add to app.jsx state section:

// OOS Periods State
const [oosPeriods, setOOSPeriods] = useState(() => {
  return storeLoad("ocean_oos_periods_v1", []) || [];
});

const addOOSPeriod = (period) => {
  const newPeriod = {
    id: period.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    roomNumber: String(period.roomNumber).trim(),
    startDate: period.startDate,
    endDate: period.endDate,
    reason: period.reason || "",
    createdAt: period.createdAt || new Date().toISOString()
  };
  
  const updated = [...oosPeriods, newPeriod];
  setOOSPeriods(updated);
  storeSave("ocean_oos_periods_v1", updated);
  
  // Sync with Supabase if enabled
  if (supabase && supabaseEnabled) {
    // Add sync logic here
  }
};

const updateOOSPeriod = (id, updates) => {
  const updated = oosPeriods.map(p => 
    p.id === id ? { ...p, ...updates } : p
  );
  setOOSPeriods(updated);
  storeSave("ocean_oos_periods_v1", updated);
};

const deleteOOSPeriod = (id) => {
  const updated = oosPeriods.filter(p => p.id !== id);
  setOOSPeriods(updated);
  storeSave("ocean_oos_periods_v1", updated);
};
*/

// ==========================================
// 3. AVAILABILITY CALCULATION (ReportsPage.jsx)
// ==========================================

/*
// Replace existing OOS calculation in ReportsPage.jsx:

import { getOOSRoomsCountOnDate } from "../utils/oosHelpers";

// Inside the useMemo for report calculations:
const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];

// Calculate OOS nights count for the date range
let oosNightsCount = 0;
nightDays.forEach((day) => {
  const oosCount = getOOSRoomsCountOnDate(day, oosPeriods);
  oosNightsCount += oosCount;
});

// Update theoretical capacity calculation
const theoreticalCapacity = nightDays.length * totalRooms;
const netAvailableRooms = Math.max(0, theoreticalCapacity - oosNightsCount - occupiedNightsCount);
*/

// ==========================================
// 4. ROOM FILTERING (ReservationModal.jsx)
// ==========================================

/*
// Update roomNumbersForType in ReservationModal.jsx:

import { isRoomOOSDuringPeriod } from "../utils/oosHelpers";

const roomNumbersForType = useMemo(() => {
  const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
  
  return BASE_ROOMS.filter((r) => {
    if (r.roomType !== roomType) return false;
    if (mode === "edit" && initialData?.room?.roomNumber === r.roomNumber) return true;
    
    // Check physical status
    const currentStatus = roomPhysicalStatus?.[r.roomNumber] || "Clean";
    if (["Dirty", "House Use", "Out of Service"].includes(currentStatus)) return false;
    
    // Check if room is OOS during check-in/check-out period
    if (checkIn && checkOut) {
      const isOOS = isRoomOOSDuringPeriod(r.roomNumber, checkIn, checkOut, oosPeriods);
      if (isOOS) return false;
    }
    
    return true;
  }).map((r) => r.roomNumber);
}, [roomType, roomPhysicalStatus, mode, initialData, checkIn, checkOut, oosPeriods]);
*/

// ==========================================
// 5. STATS CALCULATION (RoomsPage.jsx)
// ==========================================

/*
// Update stats calculation in RoomsPage.jsx:

import { getOOSRoomsCountOnDate } from "../utils/oosHelpers";

const stats = useMemo(() => {
  const today = new Date().toISOString().split("T")[0];
  const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
  const todayOOSCount = getOOSRoomsCountOnDate(today, oosPeriods);
  
  return {
    total: roomsWithData.length,
    available: roomsWithData.filter(r => {
      if (r.isOccupied) return false;
      if (r.roomStatus !== "Clean") return false;
      // Check if room is OOS today
      const isOOS = isRoomOOSOnDate(r.roomNumber, today, oosPeriods);
      return !isOOS;
    }).length,
    housekeeping: roomsWithData.filter(r => r.roomStatus === "Dirty").length,
    clean: roomsWithData.filter(r => r.roomStatus === "Clean").length,
    oos: todayOOSCount // Count from OOS periods, not just physical status
  };
}, [roomsWithData]);
*/

// ==========================================
// 6. TIMELINE VISUALIZATION (RoomsPage.jsx - Timeline)
// ==========================================

/*
// Add OOS visualization to RoomTimelineView:

import { isRoomOOSOnDate } from "../utils/oosHelpers";

// Inside the days.map() loop in RoomTimelineView:
{days.map(day => {
  const res = safeReservations.find(r => 
    r.status === "Booked" && 
    String(r.room.roomNumber) === String(room.roomNumber) &&
    isDateBetween(day, r.stay.checkIn, r.stay.checkOut)
  );
  
  // Check if room is OOS on this day
  const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
  const isOOS = isRoomOOSOnDate(room.roomNumber, day, oosPeriods);
  
  const isStart = res && res.stay.checkIn === day;
  const isEnd = res && res.stay.checkOut === day;
  
  let cellContent = null;
  let cellBg = "transparent";
  
  if (isOOS) {
    // Show OOS indicator (red striped pattern)
    cellContent = (
      <div style={{
        height: "25px",
        width: "100%",
        marginTop: "12px",
        background: "repeating-linear-gradient(45deg, #dc2626, #dc2626 5px, #fca5a5 5px, #fca5a5 10px)",
        opacity: 0.7,
        borderRadius: "4px"
      }} title="Out of Service" />
    );
    cellBg = "#fef2f2";
  } else if (res) {
    // Show reservation bar
    if(isStart) cellContent = <div style={{...barStyle, borderRadius: "4px 0 0 4px", marginLeft: "5px"}} title={res.guest?.lastName}></div>;
    else if(isEnd) cellContent = <div style={{...barStyle, borderRadius: "0 4px 4px 0", marginRight: "5px"}}></div>;
    else cellContent = <div style={barStyle}></div>;
  }

  return (
    <td 
      key={day} 
      style={{ 
        padding: 0, 
        height: "50px", 
        borderRight: "1px solid #f1f5f9", 
        cursor: "pointer", 
        position: "relative",
        background: cellBg
      }}
      onClick={() => {
        if (res) onEdit(res.id);
        else if (!isOOS) onAdd(room.roomNumber);
      }} 
    >
      {cellContent}
    </td>
  );
})}
*/

// ==========================================
// 7. OOS MANAGEMENT MODAL STRUCTURE
// ==========================================

/*
// Basic structure for OOSManagementModal.jsx:

import React, { useState, useMemo } from "react";
import { BASE_ROOMS } from "../data/constants";
import { validateOOSPeriod } from "../utils/oosHelpers";

export default function OOSManagementModal({ 
  onClose, 
  oosPeriods, 
  reservations,
  onAdd,
  onUpdate,
  onDelete 
}) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState([]);

  const handleAdd = () => {
    const validation = validateOOSPeriod(
      selectedRoom,
      startDate,
      endDate,
      reservations,
      oosPeriods
    );
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    onAdd({
      roomNumber: selectedRoom,
      startDate,
      endDate,
      reason
    });
    
    // Reset form
    setSelectedRoom("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setErrors([]);
  };

  return (
    <div style={{ /* Modal styles */ }}>
      <h2>Manage Out of Service Periods</h2>
      
      {/* Add Form */}
      <div>
        <label>Room:</label>
        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
          <option value="">Select Room</option>
          {BASE_ROOMS.map(r => (
            <option key={r.roomNumber} value={r.roomNumber}>
              Room {r.roomNumber} - {r.roomType}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label>Start Date:</label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
        />
      </div>
      
      <div>
        <label>End Date:</label>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
      </div>
      
      <div>
        <label>Reason:</label>
        <input 
          type="text" 
          value={reason} 
          onChange={(e) => setReason(e.target.value)} 
          placeholder="e.g., Plumbing maintenance"
        />
      </div>
      
      {errors.length > 0 && (
        <div style={{ color: "red" }}>
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}
      
      <button onClick={handleAdd}>Add OOS Period</button>
      
      {/* List of existing periods */}
      <div>
        <h3>Active OOS Periods</h3>
        {oosPeriods.map(period => (
          <div key={period.id}>
            Room {period.roomNumber}: {period.startDate} to {period.endDate}
            {period.reason && ` (${period.reason})`}
            <button onClick={() => onDelete(period.id)}>Delete</button>
          </div>
        ))}
      </div>
      
      <button onClick={onClose}>Close</button>
    </div>
  );
}
*/
