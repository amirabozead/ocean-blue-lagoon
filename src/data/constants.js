// src/data/constants.js

export const LS_RES = "oceanstay_reservations";
export const LS_RES_META = "oceanstay_reservations_meta_v1";

export const NATIONALITIES = [
  "Egyptian", "Saudi", "Emirati", "American", "British", "French", "German",
  "Italian", "Spanish", "Russian", "Chinese", "Japanese", "Indian", "Pakistani",
  "Turkish", "Moroccan", "Tunisian", "Algerian", "Sudanese", "South African",
  "Canadian", "Australian",
];

export const STATUS_LIST = ["Booked", "Checked-in", "Checked-out", "Cancelled", "Out of Service"];
export const FILTER_TABS = ["All", ...STATUS_LIST];
export const PAYMENT_METHODS = ["Cash", "Card", "Booking.com", "Airbnb"];
export const ROOM_TYPES = ["Standard Double Room", "Deluxe Double Room", "Triple Family Room", "Quadruple Family Room"];

// Store Keys
export const LS_STORE_ITEMS = "oceanstay_store_items_v1";
export const LS_STORE_MOVES = "oceanstay_store_moves_v1";
export const LS_STORE_SUPPLIERS = "oceanstay_store_suppliers_v1";
export const EXP_LS_EXPENSES = "ocean_expenses_v1";

// Security & Config
export const SEC_LS_USERS = "ocean_security_users_v1";
export const SEC_LS_SESSION = "ocean_security_session_v1";
export const SB_LS_CFG = "ocean_supabase_cfg_v1";

// قائمة الـ 18 غرفة الجديدة
export const BASE_ROOMS = [
  // Rooms 1-10: Standard Double Room
  { roomNumber: "1", roomType: "Standard Double Room" },
  { roomNumber: "2", roomType: "Standard Double Room" },
  { roomNumber: "3", roomType: "Standard Double Room" },
  { roomNumber: "4", roomType: "Standard Double Room" },
  { roomNumber: "5", roomType: "Standard Double Room" },
  { roomNumber: "6", roomType: "Standard Double Room" },
  { roomNumber: "7", roomType: "Standard Double Room" },
  { roomNumber: "8", roomType: "Standard Double Room" },
  { roomNumber: "9", roomType: "Standard Double Room" },
  { roomNumber: "10", roomType: "Standard Double Room" },

  // Room 11-13: Triple Family Room
  { roomNumber: "11", roomType: "Triple Family Room" },
  { roomNumber: "12", roomType: "Triple Family Room" },
  { roomNumber: "13", roomType: "Triple Family Room" },
  
  // Room 14: Quadruple Family Room
  { roomNumber: "14", roomType: "Quadruple Family Room" },
  
  // Room 15: Deluxe Double Room
  { roomNumber: "15", roomType: "Deluxe Double Room" },
  
  // Room 16: Triple Family Room
  { roomNumber: "16", roomType: "Triple Family Room" },
  
  // Room 17: Deluxe Double Room
  { roomNumber: "17", roomType: "Deluxe Double Room" },
  
  // Room 18: Standard Double Room
  { roomNumber: "18", roomType: "Standard Double Room" },
];

export const BASE_ROOM_SET = new Set(BASE_ROOMS.map((r) => String(r.roomNumber).trim()));

export const APP_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reservations", label: "Reservations" },
  { key: "rooms", label: "Rooms" },
  { key: "dailyRate", label: "Daily Rate" },
  { key: "revenue", label: "Revenue Center" },
  { key: "store", label: "Store" },
  { key: "expenses", label: "Expenses" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

export const ROLE_DEFAULT_PAGES = {
  admin: APP_PAGES.map((p) => p.key),
  manager: ["dashboard", "reservations", "rooms", "dailyRate", "store", "expenses", "reports", "settings"],
  frontoffice: ["dashboard", "reservations", "rooms", "dailyRate"],
  accountant: ["dashboard", "expenses", "reports"],
  store: ["dashboard", "store"],
  viewer: ["dashboard", "reports"],
};

export const EXP_DEFAULT_CATEGORIES = [
  "Utilities", "Maintenance", "Housekeeping", "Laundry", "F&B", 
  "Supplies", "Salaries", "Transport", "Marketing", "Taxes & Fees", "Other",
];