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
/** Booking channels (source of reservation) */
export const BOOKING_CHANNELS = ["Booking.com", "Airbnb", "Agoda", "Direct booking"];
/** Payment methods for reservations */
export const PAYMENT_METHODS = ["Cash", "Credit Card"];
export const ROOM_TYPES = ["Standard Double Room"];

// Store Keys
export const LS_STORE_ITEMS = "oceanstay_store_items_v1";
export const LS_STORE_MOVES = "oceanstay_store_moves_v1";
export const LS_STORE_SUPPLIERS = "oceanstay_store_suppliers_v1";
export const EXP_LS_EXPENSES = "ocean_expenses_v1";

// Security & Config
export const SEC_LS_USERS = "ocean_security_users_v1";
export const SEC_LS_SESSION = "ocean_security_session_v1";
export const SB_LS_CFG = "ocean_supabase_cfg_v1";

// قائمة الـ 5 غرف
export const BASE_ROOMS = [
  // Rooms 1-5: Standard Double Room
  { roomNumber: "1", roomType: "Standard Double Room" },
  { roomNumber: "2", roomType: "Standard Double Room" },
  { roomNumber: "3", roomType: "Standard Double Room" },
  { roomNumber: "4", roomType: "Standard Double Room" },
  { roomNumber: "5", roomType: "Standard Double Room" },
];

export const BASE_ROOM_SET = new Set(BASE_ROOMS.map((r) => String(r.roomNumber).trim()));

export const APP_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reservations", label: "Reservations" },
  { key: "rooms", label: "Rooms" },
  { key: "dailyRate", label: "Rate Analysis" },
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