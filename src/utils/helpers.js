// src/utils/helpers.js

/* ================= DATE HELPERS ================= */
import { APP_PAGES, ROLE_DEFAULT_PAGES } from "../data/constants";
export const toMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const ymd = (d) => {
  const x = toMidnight(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const parseYMD = (s) => {
  if (!s) return null;
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return isNaN(dt) ? null : dt;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

export const overlapsRange = (checkInStr, checkOutStr, from, to) => {
  const ci = parseYMD(checkInStr);
  const co = parseYMD(checkOutStr);
  if (!ci || !co) return false;
  return ci < to && co > from; 
};

export const toDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const isSameDay = (a, b) => {
  const A = startOfDay(a);
  const B = startOfDay(b);
  return A.getTime() === B.getTime();
};

export const calcNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const inD = toDate(checkIn);
  const outD = toDate(checkOut);
  if (!inD || !outD) return 0;
  const diff = startOfDay(outD) - startOfDay(inD);
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
};

export const rangesOverlap = (aIn, aOut, bIn, bOut) => {
  const A1 = toDate(aIn);
  const A2 = toDate(aOut);
  const B1 = toDate(bIn);
  const B2 = toDate(bOut);
  if (!A1 || !A2 || !B1 || !B2) return false;
  if (A1 >= A2 || B1 >= B2) return false;
  return A1 < B2 && B1 < A2;
};

export const isoNow = () => new Date().toISOString();

/* ================= MONEY & FORMATTING ================= */
export const money = (n) => {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "$0";
  return `$${x.toLocaleString("en-US")}`;
};

export const storeMoney = (n) => {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0.00";
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const pct = (n) => {
  const x = Number(n || 0);
  return `${Math.max(0, Math.min(100, Math.round(x)))}%`;
};

/* ================= MISC HELPERS ================= */
export const uid = (prefix = "id") => {
  try {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random()}`;
};

export const storeUid = (prefix = "id") => `${prefix}_${uid()}`;

export const isActiveStatus = (status) => status === "Booked" || status === "Checked-in";

/* ================= LOCAL STORAGE SAFE HELPERS ================= */
export const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const storeLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const storeSave = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};
// ضيف دول في آخر الملف خالص
export const fmtDayLabel = (d) => {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export const fmtMonthLabel = (d) => {
  return d.toLocaleDateString("en-GB", { month: "short" });
};
/* ================= UI HELPERS (New) ================= */
export const statusPillClass = (status) => {
  if (status === "Checked-in") return "pill pill--green";
  if (status === "Checked-out") return "pill pill--indigo";
  if (status === "Cancelled") return "pill pill--red";
  return "pill pill--amber";
};

export const roomBadgeClass = (roomStatus) => {
  if (roomStatus === "Occupied") return "pill pill--green";
  if (roomStatus === "Reserved") return "pill pill--amber";
  return "pill pill--slate";
};

export const roomCardClass = (roomStatus) => {
  if (roomStatus === "Occupied") return "roomInvCard roomInvCard--occupied";
  if (roomStatus === "Reserved") return "roomInvCard roomInvCard--reserved";
  return "roomInvCard roomInvCard--vacant";
};

export const headerGradientClass = (kind) => {
  if (kind === "indigo") return "panelHeader panelHeader--indigo";
  if (kind === "emerald") return "panelHeader panelHeader--emerald";
  if (kind === "amber") return "panelHeader panelHeader--amber";
  return "panelHeader panelHeader--slate";
};

/* ================= DAILY RATE HELPERS ================= */
export const rateCoversDay = (rate, dayStr) => {
  if (!rate?.from || !rate?.to) return false;
  return dayStr >= rate.from && dayStr < rate.to;
};

export const rateCanEdit = (rate) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return !!rate?.from && rate.from >= todayStr;
};

/* ================= ROOM STATUS HELPERS ================= */
export const isOOSPhysical = (v) => {
  const s = String(v || "").trim().toLowerCase();
  return s === "out of service" || s === "oos" || s === "maintenance" || s === "out-of-service";
};

export const normalizePhysicalStatus = (v) => (isOOSPhysical(v) ? "Out of Service" : String(v || "").trim() || "Clean");
/* ================= SECURITY HELPERS ================= */
export const secCanAccessPage = (user, pageKey) => {
  if (!user) return false;
  const allow = Array.isArray(user.allowedPages) ? user.allowedPages : [];
  return allow.includes(pageKey);
};

export const secDefaultPagesForRole = (role) => {
  return ROLE_DEFAULT_PAGES[role] || ROLE_DEFAULT_PAGES["viewer"];
};

export const secSeedUsers = () => {
  return [
    { id: storeUid("u"), username: "admin", pin: "1234", allowedPages: APP_PAGES.map((p) => p.key) },
    { id: storeUid("u"), username: "accountant", pin: "1111", allowedPages: ["dashboard", "expenses", "reports"] },
    { id: storeUid("u"), username: "frontoffice", pin: "2222", allowedPages: ["dashboard", "reservations", "rooms", "dailyRate"] },
    { id: storeUid("u"), username: "store", pin: "3333", allowedPages: ["dashboard", "store"] },
  ];
};
// دالة لحساب تسعير الليالي (مطلوبة في app.jsx)
export function computeSplitPricingSnapshot({
  roomType,
  checkIn,
  checkOut,
  dailyRates,
  taxRate,
  serviceCharge,
  mealPlan,
  pax
}) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  
  // حساب عدد الليالي
  const diffTime = Math.abs(end - start);
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (!roomType || !checkIn || !checkOut || nights <= 0) {
    return { ok: false, nightly: [], breakdown: [], subtotal: 0, taxAmount: 0, serviceAmount: 0, total: 0, avgNightly: 0 };
  }

  const calculatedNightly = [];
  const missingDates = [];

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const nightStr = d.toISOString().slice(0, 10);
    const rateMatch = (dailyRates || []).find(r => 
        r.roomType === roomType && nightStr >= r.from && nightStr < r.to
    );

    if (!rateMatch) {
        missingDates.push(nightStr);
        continue;
    }

    const base = Number(rateMatch.rate || 0);
    const pkg = rateMatch.packages || {};
    const mp = String(mealPlan || "BO").toUpperCase();
    let addon = 0;
    
    if (mp === "BB") addon = Number(pkg.BB || 0);
    else if (mp === "HB") addon = Number(pkg.HB || 0);
    else if (mp === "FB") addon = Number(pkg.FB || 0);

    const totalPax = Math.max(1, Number(pax || 1));
    const totalAddon = addon * totalPax;

    calculatedNightly.push({
        date: nightStr,
        rate: base + totalAddon,
        baseRate: base,
        packageAddon: totalAddon,
        mealPlan: mp
    });
  }

  if (missingDates.length > 0) {
      return { ok: false, missing: missingDates, nightly: [], breakdown: [], subtotal: 0, total: 0 };
  }

  const subtotal = calculatedNightly.reduce((acc, curr) => acc + curr.rate, 0);
  const tr = Number(taxRate || 0);
  const sc = Number(serviceCharge || 0);
  
  const taxAmount = subtotal * (tr / 100);
  const serviceAmount = subtotal * (sc / 100);
  
  // ملاحظة: ضريبة المدينة يتم حسابها في app.jsx منفصلة، هنا نرجع الإجمالي بدونها كما يتوقع الكود
  const total = subtotal + taxAmount + serviceAmount;

  const breakdownMap = {};
  calculatedNightly.forEach(n => {
      const r = n.rate;
      breakdownMap[r] = (breakdownMap[r] || 0) + 1;
  });
  const breakdown = Object.entries(breakdownMap).map(([rate, count]) => ({
      rate: Number(rate),
      count,
      amount: Number(rate) * count
  })).sort((a, b) => b.rate - a.rate);

  return {
      ok: true,
      nightly: calculatedNightly,
      breakdown,
      subtotal,
      taxAmount,
      serviceAmount,
      total,
      avgNightly: nights > 0 ? subtotal / nights : 0
  };
}
// ================= EXPENSES HELPERS =================

export const expTodayStr = () => {
  return new Date().toISOString().slice(0, 10);
};

export const expStartOfMonthStr = () => {
  const d = new Date();
  // أول يوم في الشهر الحالي
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  // ضبط التوقيت لتفادي مشاكل المنطقة الزمنية (اختياري، هنا نستخدم UTC string simple)
  const offset = start.getTimezoneOffset() * 60000; 
  return new Date(start.getTime() - offset).toISOString().slice(0, 10);
};

export const expStartOfYearStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
};

export const expNormalizeYMD = (v) => {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v).slice(0, 10);
};

export const expInInclusiveRange = (dateStr, fromStr, toStr) => {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  // لو fromStr فاضي نعتبره متاح من البداية، ولو toStr فاضي نعتبره متاح للنهاية
  if (fromStr && d < fromStr) return false;
  if (toStr && d > toStr) return false;
  return true;
};

// دالة لحفظ المصاريف في LocalStorage (اختيارية لو مش موجودة)
export const expSave = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Save failed", e);
  }
};
// 👇 أضف هذا الكود في نهاية ملف helpers.js 👇

export const isDateBetween = (date, start, end) => {
  if (!date || !start || !end) return false;
  const d = new Date(date).setHours(0,0,0,0);
  const s = new Date(start).setHours(0,0,0,0);
  const e = new Date(end).setHours(0,0,0,0);
  return d >= s && d <= e;
};