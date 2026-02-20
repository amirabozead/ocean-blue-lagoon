import React, { useState, useMemo } from "react";
import { FaTimes, FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaBed, FaExclamationTriangle } from "react-icons/fa";
import { BASE_ROOMS } from "../data/constants";
import { validateOOSPeriod } from "../utils/oosHelpers";

export default function OOSManagementModal({ 
  onClose, 
  oosPeriods = [], 
  reservations = [],
  onAdd,
  onUpdate,
  onDelete 
}) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Sort OOS periods by start date (newest first)
  const sortedPeriods = useMemo(() => {
    return [...oosPeriods].sort((a, b) => {
      if (b.startDate !== a.startDate) return b.startDate.localeCompare(a.startDate);
      return String(b.roomNumber).localeCompare(String(a.roomNumber));
    });
  }, [oosPeriods]);

  // Get room info for display
  const getRoomInfo = (roomNumber) => {
    const room = BASE_ROOMS.find(r => String(r.roomNumber) === String(roomNumber));
    return room ? `${room.roomNumber} - ${room.roomType}` : `Room ${roomNumber}`;
  };

  const handleAdd = () => {
    if (!selectedRoom || !startDate || !endDate) {
      setErrors(["Please fill in all required fields"]);
      return;
    }

    const validation = validateOOSPeriod(
      selectedRoom,
      startDate,
      endDate,
      reservations,
      oosPeriods,
      editingId
    );
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    if (editingId) {
      // Update existing period
      onUpdate(editingId, {
        roomNumber: selectedRoom,
        startDate,
        endDate,
        reason: reason.trim()
      });
    } else {
      // Add new period
      onAdd({
        roomNumber: selectedRoom,
        startDate,
        endDate,
        reason: reason.trim()
      });
    }
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setSelectedRoom("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setErrors([]);
    setEditingId(null);
  };

  const handleEdit = (period) => {
    setSelectedRoom(String(period.roomNumber));
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setReason(period.reason || "");
    setErrors([]);
    setEditingId(period.id);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this OOS period?")) {
      onDelete(id);
    }
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  };

  const contentStyle = {
    background: "white",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  };

  const headerStyle = {
    background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
    color: "white",
    padding: "20px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const formSectionStyle = {
    padding: "25px 30px",
    borderBottom: "1px solid #e2e8f0"
  };

  const listSectionStyle = {
    padding: "25px 30px",
    overflowY: "auto",
    flex: 1
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
              <FaBed style={{ marginRight: "10px", display: "inline" }} />
              Manage Out of Service Periods
            </h2>
            <p style={{ margin: "5px 0 0", fontSize: "14px", opacity: 0.9 }}>
              Set rooms as unavailable for specific date ranges
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px"
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Add/Edit Form */}
        <div style={formSectionStyle}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: "#1e293b" }}>
            {editingId ? "Edit OOS Period" : "Add New OOS Period"}
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold", color: "#475569" }}>
                Room <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select Room</option>
                {BASE_ROOMS.map(r => (
                  <option key={r.roomNumber} value={r.roomNumber}>
                    Room {r.roomNumber} - {r.roomType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold", color: "#475569" }}>
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Plumbing maintenance"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold", color: "#475569" }}>
                <FaCalendarAlt style={{ marginRight: "5px", display: "inline" }} />
                Start Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold", color: "#475569" }}>
                <FaCalendarAlt style={{ marginRight: "5px", display: "inline" }} />
                End Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "15px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626", marginBottom: "8px" }}>
                <FaExclamationTriangle />
                <strong>Validation Errors:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#991b1b" }}>
                {errors.map((err, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleAdd}
              style={{
                background: editingId ? "#3b82f6" : "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FaPlus /> {editingId ? "Update Period" : "Add Period"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* List of Existing Periods */}
        <div style={listSectionStyle}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: "#1e293b" }}>
            Active OOS Periods ({sortedPeriods.length})
          </h3>
          
          {sortedPeriods.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px",
              color: "#94a3b8",
              fontSize: "14px"
            }}>
              No OOS periods defined yet. Add one above to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sortedPeriods.map(period => {
                const isExpired = period.endDate < new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={period.id}
                    style={{
                      background: isExpired ? "#f8fafc" : "#fef2f2",
                      border: `1px solid ${isExpired ? "#e2e8f0" : "#fecaca"}`,
                      borderRadius: "8px",
                      padding: "15px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                        <strong style={{ fontSize: "16px", color: "#1e293b" }}>
                          {getRoomInfo(period.roomNumber)}
                        </strong>
                        {isExpired && (
                          <span style={{
                            background: "#94a3b8",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}>
                            Expired
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "5px" }}>
                        <FaCalendarAlt style={{ marginRight: "5px", display: "inline" }} />
                        {period.startDate} to {period.endDate}
                      </div>
                      {period.reason && (
                        <div style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
                          {period.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleEdit(period)}
                        style={{
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px"
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(period.id)}
                        style={{
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px"
                        }}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
