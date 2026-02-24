import React, { useMemo, useState } from "react";
import {
  FaChartPie,
  FaCalendarAlt,
  FaBed,
  FaDollarSign,
  FaStore,
  FaMoneyBillWave,
  FaChartBar,
  FaChartLine,
  FaCog,
  FaLock,
  FaUnlock,
  FaSignOutAlt, // ✅ تم إضافة أيقونة الخروج
} from "react-icons/fa";
import { secCanAccessPage } from "../utils/helpers";

const HOTEL_LOGO = "/logo.png";

export default function Sidebar({ page, setPage, currentUser, mobileNavOpen, setMobileNavOpen, onLogout }) {
  const [isLocked, setIsLocked] = useState(false);

  const sidebarStyle = useMemo(
    () => ({
      background: "linear-gradient(180deg, #0b6a8a 0%, #084e68 100%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: "100vh",
      overflow: "hidden",
    }),
    []
  );

  const handleNav = (nextPage) => {
    if (isLocked) return;
    setPage(nextPage);
    // Close mobile menu on navigation
    if (setMobileNavOpen) setMobileNavOpen(false);
  };

  return (
    <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`} style={sidebarStyle}>
      {/* === Brand === */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src={HOTEL_LOGO}
          alt="Ocean Blue Lagoon"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid rgba(255,255,255,0.28)",
            boxShadow: "0 12px 22px rgba(0,0,0,0.22)",
            background: "rgba(255,255,255,0.06)",
          }}
          onError={(e) => (e.target.style.display = "none")}
        />

        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <div
            style={{
              fontSize: 30,
              fontFamily: "'Brush Script MT', cursive",
              letterSpacing: "0.6px",
              fontWeight: "normal",
              color: "#ffffff",
              textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            Ocean Blue Lagoon
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontFamily: "'Brush Script MT', cursive",
              color: "rgba(255,255,255,0.78)",
              letterSpacing: "0.4px",
              whiteSpace: "nowrap",
            }}
          >
            Maldives Resort
          </div>
        </div>
      </div>

      {/* === Menu === */}
      <nav
        className="menu"
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          flex: "1 1 auto",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {secCanAccessPage(currentUser, "dashboard") && (
          <SidebarItem
            icon={<FaChartPie />}
            label="Dashboard"
            active={page === "dashboard"}
            locked={isLocked}
            onClick={() => handleNav("dashboard")}
          />
        )}

        {secCanAccessPage(currentUser, "reservations") && (
          <SidebarItem
            icon={<FaCalendarAlt />}
            label="Reservations"
            active={page === "reservations"}
            locked={isLocked}
            onClick={() => handleNav("reservations")}
          />
        )}

        {secCanAccessPage(currentUser, "rooms") && (
          <SidebarItem
            icon={<FaBed />}
            label="Rooms"
            active={page === "rooms"}
            locked={isLocked}
            onClick={() => handleNav("rooms")}
          />
        )}

        {secCanAccessPage(currentUser, "revenue") && (
          <SidebarItem
            icon={<FaMoneyBillWave />}
            label="Revenue Center"
            active={page === "revenue"}
            locked={isLocked}
            onClick={() => handleNav("revenue")}
          />
        )}

        {secCanAccessPage(currentUser, "dailyRate") && (
          <SidebarItem
            icon={<FaChartLine />}
            label="Rate Analysis"
            active={page === "dailyRate"}
            locked={isLocked}
            onClick={() => handleNav("dailyRate")}
          />
        )}

        {secCanAccessPage(currentUser, "store") && (
          <SidebarItem
            icon={<FaStore />}
            label="Store"
            active={page === "store"}
            locked={isLocked}
            onClick={() => handleNav("store")}
          />
        )}

        {secCanAccessPage(currentUser, "expenses") && (
          <SidebarItem
            icon={<FaMoneyBillWave />}
            label="Expenses"
            active={page === "expenses"}
            locked={isLocked}
            onClick={() => handleNav("expenses")}
          />
        )}

        {secCanAccessPage(currentUser, "reports") && (
          <SidebarItem
            icon={<FaChartBar />}
            label="Reports"
            active={page === "reports"}
            locked={isLocked}
            onClick={() => handleNav("reports")}
          />
        )}

        {secCanAccessPage(currentUser, "settings") && (
          <SidebarItem
            icon={<FaCog />}
            label="Settings"
            active={page === "settings"}
            locked={isLocked}
            onClick={() => handleNav("settings")}
          />
        )}
      </nav>

      {/* === Bottom User Card (Compact Layout) === */}
      {currentUser && (
        <div style={{ padding: "12px 12px 16px" }}>
          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 16px 26px rgba(0,0,0,0.22)",
              backdropFilter: "blur(6px)",
            }}
          >
            {/* الصف العلوي: بيانات المستخدم (يسار) + الأزرار (يمين) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              
              {/* قسم بيانات المستخدم */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 40, 
                    height: 40,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 950,
                    color: "#0f172a",
                    background: "rgba(255,255,255,0.90)",
                    boxShadow: "0 8px 14px rgba(0,0,0,0.15)",
                    flexShrink: 0,
                    fontSize: 16,
                  }}
                >
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>

                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 950,
                      color: "#fff",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentUser.name || "Admin"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.78)" }}>
                    {currentUser.role || "Manager"}
                  </span>
                </div>
              </div>

              {/* قسم الأزرار: القفل + الخروج بجانب بعض */}
              <div style={{ display: "flex", gap: 6 }}> 
                
                {/* 1. زر القفل */}
                <button
                  onClick={() => setIsLocked((v) => !v)}
                  title={isLocked ? "Unlock Navigation" : "Lock Navigation"}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 14,
                    transition: "0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                >
                  {isLocked ? <FaLock /> : <FaUnlock />}
                </button>

                {/* 2. زر الخروج (مدمج) */}
                <button
                  onClick={onLogout}
                  title="Logout"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(255, 80, 80, 0.4)", // حدود حمراء خفيفة
                    background: "rgba(255, 80, 80, 0.15)", // خلفية حمراء شفافة
                    color: "#ffcccc",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 15,
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 60, 60, 0.8)";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 80, 80, 0.15)";
                    e.currentTarget.style.color = "#ffcccc";
                    e.currentTarget.style.borderColor = "rgba(255, 80, 80, 0.4)";
                  }}
                >
                  <FaSignOutAlt />
                </button>
              </div>
            </div>

            {/* Navigation status row */}
            <div
              style={{
                marginTop: 10,
                borderRadius: 10,
                padding: "8px 10px",
                background: "rgba(0,0,0,0.14)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>Navigation</span>
              <span style={{ fontSize: 13, fontWeight: 950, color: "#fff", opacity: 0.9 }}>
                {isLocked ? "Locked" : "Unlocked"}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick, locked }) {
  return (
    <button
      className={`menu-item ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={locked}
      title={locked ? "Navigation is locked" : label}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        border: "none",
        cursor: locked ? "not-allowed" : "pointer",
        background: active ? "rgba(255,255,255,0.16)" : "transparent",
        color: "#fff",
        borderRadius: 16,
        margin: "3px 12px",
        fontWeight: 500,
        textAlign: "left",
        boxShadow: active ? "0 14px 26px rgba(0,0,0,0.18)" : "none",
        outline: "none",
        opacity: locked ? 0.75 : 1,
      }}
    >
      <span style={{ opacity: active ? 1 : 0.92, fontSize: 22, display: "inline-flex" }}>{icon}</span>

      <span
        style={{
          fontSize: 20,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          letterSpacing: 0.1,
        }}
      >
        {label}
      </span>
    </button>
  );
}