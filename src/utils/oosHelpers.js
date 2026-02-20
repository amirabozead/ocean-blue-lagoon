/**
 * OOS (Out of Service) Room Helper Functions
 * Functions for managing and querying OOS periods with date ranges
 */

/**
 * Check if a room is OOS on a specific date
 * @param {string|number} roomNumber - Room number
 * @param {string|Date} date - Date to check (YYYY-MM-DD string or Date object)
 * @param {Array} oosPeriods - Array of OOS period objects
 * @returns {boolean}
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
 * @param {string|number} roomNumber - Room number
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Array} oosPeriods - Array of OOS period objects
 * @returns {boolean}
 */
export function isRoomOOSDuringPeriod(roomNumber, startDate, endDate, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return false;
  if (!startDate || !endDate) return false;
  
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
 * @param {string|Date} date - Date to check
 * @param {Array} oosPeriods - Array of OOS period objects
 * @returns {number}
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
 * @param {string|number} roomNumber - Room number
 * @param {Array} oosPeriods - Array of OOS period objects
 * @returns {Array}
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
 * @param {string|Date} date - Date to check
 * @param {Array} oosPeriods - Array of OOS period objects
 * @returns {Array}
 */
export function getActiveOOSPeriodsOnDate(date, oosPeriods) {
  if (!oosPeriods || !Array.isArray(oosPeriods)) return [];
  
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return oosPeriods.filter(period => 
    dateStr >= period.startDate && dateStr < period.endDate
  );
}

/**
 * Validate OOS period (check for conflicts with reservations and overlapping periods)
 * @param {string|number} roomNumber - Room number
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Array} reservations - Array of reservation objects
 * @param {Array} existingPeriods - Existing OOS periods (to check for overlaps)
 * @param {string} excludeId - ID to exclude from overlap check (for editing)
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateOOSPeriod(roomNumber, startDate, endDate, reservations, existingPeriods = [], excludeId = null) {
  const errors = [];
  const roomStr = String(roomNumber).trim();
  
  // Check date validity
  if (!startDate || !endDate) {
    errors.push("Start date and end date are required");
  } else if (startDate >= endDate) {
    errors.push("Start date must be before end date");
  }
  
  // Check for overlapping OOS periods for same room
  const overlapping = existingPeriods.filter(period => {
    if (excludeId && period.id === excludeId) return false; // Exclude current period when editing
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
                       resStatus === "checked in" ||
                       resStatus === "in house";
      
      if (!isActive) return false;
      
      const resCheckIn = res?.stay?.checkIn || res?.checkIn;
      const resCheckOut = res?.stay?.checkOut || res?.checkOut;
      
      if (!resCheckIn || !resCheckOut) return false;
      
      // Check for overlap
      return resCheckIn < endDate && resCheckOut > startDate;
    });
    
    if (conflicting.length > 0) {
      const conflictInfo = conflicting.map(r => {
        const guest = r?.guest?.lastName || r?.guest?.firstName || "Guest";
        return `Guest: ${guest} (${r?.stay?.checkIn} to ${r?.stay?.checkOut})`;
      }).join(", ");
      errors.push(`Room ${roomNumber} has active reservation(s) during this period: ${conflictInfo}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
