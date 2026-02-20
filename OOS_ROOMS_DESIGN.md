# Out of Service (OOS) Rooms with Date Range - Design & Implementation Guide

## 📋 Overview
This document outlines the design and implementation approach for managing OOS rooms with date ranges, allowing temporary maintenance periods that automatically deduct from available room inventory during specific date ranges.

---

## 🎯 Requirements

1. **Enter OOS periods** with:
   - Room number(s) - single or multiple rooms
   - Start date (when OOS begins)
   - End date (when OOS ends)
   - Optional: Reason/notes

2. **Automatic deduction** from total available rooms during the OOS period

3. **Visualization** of OOS periods on calendar/timeline views

4. **Availability calculation** that considers:
   - Current reservations
   - OOS periods (date-range based)
   - Physical room status (Clean/Dirty)

---

## 📊 Data Structure Design

### Option 1: Array of OOS Periods (Recommended)
```javascript
// Storage key: "ocean_oos_periods_v1"
[
  {
    id: "uuid-123",
    roomNumber: "5",
    startDate: "2026-02-20",
    endDate: "2026-02-25",
    reason: "Plumbing maintenance",
    createdAt: "2026-02-19T10:00:00Z"
  },
  {
    id: "uuid-456",
    roomNumber: "12",
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    reason: "Renovation",
    createdAt: "2026-02-18T14:30:00Z"
  }
]
```

### Option 2: Nested Object Structure
```javascript
// Storage key: "ocean_oos_periods_v1"
{
  "5": [
    {
      id: "uuid-123",
      startDate: "2026-02-20",
      endDate: "2026-02-25",
      reason: "Plumbing maintenance"
    }
  ],
  "12": [
    {
      id: "uuid-456",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      reason: "Renovation"
    }
  ]
}
```

**Recommendation**: Use Option 1 (array) for easier querying and filtering.

---

## 🎨 UI Components Needed

### 1. OOS Management Modal
**Location**: New button in RoomsPage header or sidebar

**Features**:
- Room selector (single or multiple rooms)
- Date range picker (start date + end date)
- Reason/notes text field
- List of existing OOS periods
- Edit/Delete functionality
- Visual calendar showing OOS periods

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│  Out of Service Management              │
├─────────────────────────────────────────┤
│                                         │
│  Add New OOS Period:                    │
│  ┌───────────────────────────────────┐  │
│  │ Room(s): [Select ▼]              │  │
│  │ Start Date: [2026-02-20] 📅      │  │
│  │ End Date:   [2026-02-25] 📅      │  │
│  │ Reason:     [___________]        │  │
│  │            [Add Period]           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Active OOS Periods:                    │
│  ┌───────────────────────────────────┐  │
│  │ Room 5: Feb 20-25 (Plumbing)     │  │
│  │        [Edit] [Delete]            │  │
│  │ Room 12: Mar 1-5 (Renovation)    │  │
│  │         [Edit] [Delete]           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2. Calendar/Timeline Visualization
**Enhancement**: Add OOS periods to the existing timeline view

**Visual Representation**:
- Red bars/overlays on OOS dates
- Different from reservation bars (maybe striped pattern)
- Tooltip showing reason when hovering

---

## 🔧 Implementation Logic

### Helper Functions Needed

```javascript
// Check if a room is OOS on a specific date
function isRoomOOSOnDate(roomNumber, date, oosPeriods) {
  const dateStr = date.toISOString().split('T')[0];
  return oosPeriods.some(period => 
    period.roomNumber === String(roomNumber) &&
    dateStr >= period.startDate &&
    dateStr < period.endDate // Note: endDate is exclusive
  );
}

// Get OOS rooms count for a specific date
function getOOSRoomsCountOnDate(date, oosPeriods) {
  const dateStr = date.toISOString().split('T')[0];
  const oosRooms = new Set();
  oosPeriods.forEach(period => {
    if (dateStr >= period.startDate && dateStr < period.endDate) {
      oosRooms.add(period.roomNumber);
    }
  });
  return oosRooms.size;
}

// Get available rooms for a date range
function getAvailableRoomsForRange(startDate, endDate, totalRooms, reservations, oosPeriods) {
  const nights = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate < end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const oosCount = getOOSRoomsCountOnDate(dateStr, oosPeriods);
    const occupiedCount = getOccupiedRoomsCount(dateStr, reservations);
    const available = Math.max(0, totalRooms - oosCount - occupiedCount);
    nights.push({ date: dateStr, available, oosCount, occupiedCount });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return nights;
}
```

### Updated Availability Calculation

**In ReportsPage.jsx**:
```javascript
// Replace current OOS calculation:
const roomPhysicalStatus = storeLoad("ocean_room_physical_v1", {}) || {};
const oosRoomsCount = Object.values(roomPhysicalStatus).filter((v) => {
  const s = String(v || "");
  return /out/i.test(s) && /(order|service)/i.test(s);
}).length;

// With date-range aware calculation:
const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
const oosNightsCount = nightDays.reduce((sum, day) => {
  return sum + getOOSRoomsCountOnDate(day, oosPeriods);
}, 0);

const theoreticalCapacity = nightDays.length * totalRooms;
const netAvailableRooms = Math.max(0, theoreticalCapacity - oosNightsCount - occupiedNightsCount);
```

**In ReservationsPage.jsx**:
```javascript
// Update headerKpis calculation:
const oosPeriods = storeLoad("ocean_oos_periods_v1", []) || [];
const todayOOSCount = getOOSRoomsCountOnDate(today, oosPeriods);
const totalRooms = Math.max(0, totalRoomsBase - todayOOSCount);
```

**In ReservationModal.jsx**:
```javascript
// Filter out OOS rooms when selecting available rooms:
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
      const isOOSDuringStay = isRoomOOSDuringPeriod(
        r.roomNumber, 
        checkIn, 
        checkOut, 
        oosPeriods
      );
      if (isOOSDuringStay) return false;
    }
    
    return true;
  }).map((r) => r.roomNumber);
}, [roomType, roomPhysicalStatus, mode, initialData, checkIn, checkOut]);
```

---

## 📁 Files to Create/Modify

### New Files:
1. `src/components/OOSManagementModal.jsx` - Main OOS management UI
2. `src/utils/oosHelpers.js` - Helper functions for OOS calculations

### Files to Modify:
1. `src/app.jsx` - Add OOS periods state management
2. `src/components/RoomsPage.jsx` - Add OOS button, update stats
3. `src/components/ReportsPage.jsx` - Update availability calculations
4. `src/components/ReservationsPage.jsx` - Update KPI calculations
5. `src/components/ReservationModal.jsx` - Filter OOS rooms from selection
6. `src/components/RoomsPage.jsx` (Timeline view) - Visualize OOS periods

---

## 🎯 Step-by-Step Implementation Plan

### Phase 1: Data Structure & Storage
1. ✅ Create `oosHelpers.js` with helper functions
2. ✅ Add OOS periods state in `app.jsx`
3. ✅ Create localStorage persistence

### Phase 2: UI Components
1. ✅ Create `OOSManagementModal.jsx`
2. ✅ Add "Manage OOS" button to RoomsPage
3. ✅ Implement add/edit/delete functionality

### Phase 3: Integration
1. ✅ Update availability calculations in ReportsPage
2. ✅ Update availability calculations in ReservationsPage
3. ✅ Filter OOS rooms in ReservationModal
4. ✅ Update RoomsPage stats display

### Phase 4: Visualization
1. ✅ Add OOS visualization to Timeline view
2. ✅ Add OOS indicators to RoomGridCard
3. ✅ Add tooltips and hover effects

### Phase 5: Validation & Edge Cases
1. ✅ Prevent overlapping OOS periods for same room
2. ✅ Prevent OOS periods that conflict with existing reservations
3. ✅ Auto-cleanup expired OOS periods (optional)
4. ✅ Validation for date ranges (start < end)

---

## 💡 Additional Features (Future Enhancements)

1. **Bulk OOS Entry**: Select multiple rooms at once
2. **Recurring OOS**: Weekly/monthly maintenance windows
3. **OOS Templates**: Save common OOS reasons
4. **OOS Reports**: Track maintenance history
5. **Notifications**: Alert when OOS period is about to start/end
6. **Room Type OOS**: Mark entire room types as OOS
7. **Partial Day OOS**: Morning/afternoon OOS periods

---

## 🔍 Example Use Cases

### Use Case 1: Single Room Maintenance
- Room 5 needs plumbing work from Feb 20-25
- System automatically reduces available rooms by 1 during this period
- Room 5 cannot be booked during this period

### Use Case 2: Multiple Rooms Renovation
- Rooms 10, 11, 12 under renovation from Mar 1-10
- System reduces available rooms by 3 during this period
- All three rooms show OOS status on calendar

### Use Case 3: Availability Check
- User checks availability for Feb 22-24
- System shows: Total 17 rooms, 1 OOS (Room 5), 3 occupied = 13 available

---

## 📝 Notes

- **Date Range**: End date should be exclusive (like check-out dates)
- **Conflicts**: System should warn if OOS period conflicts with existing reservation
- **Migration**: Existing "OutOfOrder" status can be converted to OOS periods (optional)
- **Performance**: For large date ranges, consider indexing OOS periods by date

---

## ✅ Success Criteria

1. ✅ Can add OOS periods with date ranges
2. ✅ OOS rooms are excluded from availability calculations
3. ✅ OOS periods are visible on calendar/timeline
4. ✅ OOS rooms cannot be booked during OOS period
5. ✅ Reports accurately reflect reduced availability
6. ✅ System handles overlapping periods correctly
