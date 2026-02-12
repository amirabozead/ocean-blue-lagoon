import React, { useState } from "react";
import { 
  Settings, Save, Hotel, Clock, BadgeDollarSign, 
  Cloud, Download, Trash2, Globe, ShieldCheck, 
  CheckCircle2, AlertTriangle
} from "lucide-react"; 
import { storeLoad, storeSave } from "../utils/helpers";
import SecurityManager from "./SecurityManager";

const SETTINGS_LS = "ocean_settings_v1";
const HOTEL_LOGO = "/logo.png"; 

// --- أنماط التصميم الجديدة للهيدر ---
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
      marginBottom: "30px",
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
  saveBtn: {
      background: "#3b82f6",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "10px",
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)",
      transition: "all 0.2s"
  }
};

// --- أنماط المحتوى الداخلي ---
const styles = {
  container: {
    padding: '30px',
    maxWidth: '1600px', 
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
    gap: '24px'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#ffffff'
  },
  sectionIcon: (color, bg) => ({
    color: color,
    background: bg,
    padding: '10px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }),
  cardTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#334155',
    margin: 0
  },
  cardBody: {
    padding: '24px',
    flex: 1 
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s',
    outline: 'none'
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  }
};

export default function SettingsPage({ 
  users, setUsers, currentUser, onLogout, supabase, 
  supabaseEnabled, sbCfg, setSbCfg, sbSaveCfg,
  onSettingsSaved
}) {
  const [settings, setSettings] = useState(() => {
    const defaults = {
      hotelName: "Ocean Blue Lagoon",
      currency: "USD",
      taxRate: 17,
      serviceCharge: 10,
      cityTax: 0,
      closedThrough: "2026-01-31",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      invoiceFooter: "Thank you for staying with us.",
      logoUrl: "",
    };
    const saved = storeLoad(SETTINGS_LS, null);
    if (saved && typeof saved === "object") return { ...defaults, ...saved };
    return defaults;
  });

  const [toast, setToast] = useState("");

  const save = () => {
    storeSave(SETTINGS_LS, settings);
    try { onSettingsSaved?.(); } catch {}
    setToast("Changes Saved Successfully");
    setTimeout(() => setToast(""), 3000);
  };

  const handleFocus = (e) => e.target.style.borderColor = '#3b82f6';
  const handleBlur = (e) => e.target.style.borderColor = '#cbd5e1';

  return (
    <div style={styles.container}>
      
      {/* --- HEADER --- */}
      <div style={headerStyles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={HOTEL_LOGO} alt="Ocean Blue Lagoon" style={headerStyles.logoImage} onError={(e) => e.target.style.display='none'} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "36px", fontFamily: "'Brush Script MT', cursive", letterSpacing: "1px", fontWeight: "normal", lineHeight: "1" }}>Ocean Blue Lagoon</h1>
            <span style={{ fontSize: "22px", fontFamily: "'Brush Script MT', cursive", color: "#64748b", marginTop: "5px" }}>Maldives Resort</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", fontFamily: "'Playfair Display', serif", fontStyle: "italic", lineHeight: "1" }}>System Settings</span>
           <Settings style={{ fontSize: "22px", color: "#3b82f6", opacity: 0.9 }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {toast && (
            <div style={{ 
              background: '#dcfce7', color: '#15803d', padding: '8px 16px', 
              borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '6px',
              border: '1px solid #86efac'
            }}>
              <CheckCircle2 size={16} /> {toast}
            </div>
          )}
          <button style={headerStyles.saveBtn} onClick={save}>
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>

      {/* --- GRID CONTENT --- */}
      <div style={styles.grid}>
        
        {/* 1. HOTEL PROFILE */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.sectionIcon('#3b82f6', '#eff6ff')}><Hotel size={20}/></div>
            <h3 style={styles.cardTitle}>Hotel Profile</h3>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Hotel Name</label>
              <input 
                style={styles.input} 
                value={settings.hotelName} 
                onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                onFocus={handleFocus} onBlur={handleBlur}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Logo URL</label>
              <input 
                style={styles.input} 
                placeholder="https://example.com/logo.png"
                value={settings.logoUrl} 
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                onFocus={handleFocus} onBlur={handleBlur}
              />
            </div>
            <div style={styles.row2}>
              <div>
                <label style={styles.label}>Check-in Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input 
                    type="time" 
                    style={{ ...styles.input, paddingLeft: '36px' }} 
                    value={settings.checkInTime} 
                    onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                </div>
              </div>
              <div>
                <label style={styles.label}>Check-out Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input 
                    type="time" 
                    style={{ ...styles.input, paddingLeft: '36px' }} 
                    value={settings.checkOutTime} 
                    onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FINANCIAL SETTINGS */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.sectionIcon('#10b981', '#ecfdf5')}><BadgeDollarSign size={20}/></div>
            <h3 style={styles.cardTitle}>Financial Configuration</h3>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.row2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Currency Code</label>
                <input 
                  style={{ ...styles.input, fontWeight: 'bold' }} 
                  value={settings.currency} 
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>VAT Tax (%)</label>
                <input 
                  type="number"
                  style={styles.input} 
                  value={settings.taxRate} 
                  onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
            </div>

            <div style={styles.row2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Service Charge (%)</label>
                <input 
                  type="number"
                  style={styles.input} 
                  value={settings.serviceCharge} 
                  onChange={(e) => setSettings({ ...settings, serviceCharge: Number(e.target.value) })}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>City Tax</label>
                <input 
                  type="number"
                  style={styles.input} 
                  value={settings.cityTax} 
                  onChange={(e) => setSettings({ ...settings, cityTax: Number(e.target.value) })}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
            </div>

            <div style={styles.row2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Closed Through</label>
                <input 
                  type="date"
                  style={styles.input} 
                  value={settings.closedThrough || ""}
                  onChange={(e) => setSettings({ ...settings, closedThrough: e.target.value })}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
              <div />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Invoice Footer Note</label>
              <textarea 
                rows="3"
                style={{ ...styles.input, resize: 'none', lineHeight: '1.5' }} 
                value={settings.invoiceFooter} 
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                onFocus={handleFocus} onBlur={handleBlur}
              />
            </div>
          </div>
        </div>

        {/* 3. CLOUD SYNC CARD (تم التعديل: إزالة gridColumn ليأخذ نصف العرض) */}
        <div style={{ ...styles.card, border: '2px solid #e0e7ff' }}>
          <div style={{ ...styles.cardHeader, background: '#eef2ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={styles.sectionIcon('#6366f1', '#e0e7ff')}><Cloud size={20}/></div>
              <div>
                <h3 style={{ ...styles.cardTitle, color: '#4338ca' }}>Supabase Sync</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6366f1' }}>Live Data Connection</p>
              </div>
            </div>
            <button 
              onClick={() => sbSaveCfg({ ...sbCfg, enabled: !sbCfg?.enabled }, !sbCfg?.enabled)}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                background: sbCfg?.enabled ? '#10b981' : '#cbd5e1',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              {sbCfg?.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Project URL</label>
                <div style={{ position: 'relative' }}>
                   <Globe size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                   <input 
                     style={{ ...styles.input, paddingLeft: '36px', fontFamily: 'monospace', fontSize: '13px' }} 
                     value={sbCfg?.url || ""} 
                     onChange={(e) => setSbCfg(p => ({ ...p, url: e.target.value }))}
                     placeholder="https://xxx.supabase.co"
                   />
                </div>
            </div>
            <div style={{ ...styles.inputGroup, marginBottom: 0 }}>
                <label style={styles.label}>Anon API Key</label>
                <div style={{ position: 'relative' }}>
                   <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                   <input 
                     type="password"
                     style={{ ...styles.input, paddingLeft: '36px', fontFamily: 'monospace', fontSize: '13px' }} 
                     value={sbCfg?.anon || ""} 
                     onChange={(e) => setSbCfg(p => ({ ...p, anon: e.target.value }))}
                     placeholder="your-anon-key"
                   />
                </div>
            </div>
          </div>
        </div>

        {/* 4. DANGER ZONE (تم النقل هنا بجانب الـ Supabase وإزالة gridColumn) */}
        <div style={{ ...styles.card, border: '1px solid #fecaca' }}>
          <div style={{ ...styles.cardHeader, background: '#fff1f2' }}>
            <div style={styles.sectionIcon('#e11d48', '#ffe4e6')}><AlertTriangle size={20}/></div>
            <h3 style={{ ...styles.cardTitle, color: '#9f1239' }}>Danger Zone</h3>
          </div>
          <div style={{ ...styles.cardBody, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
             <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
               Advanced actions for data management. <br/> 
               <strong>Please create a backup before resetting.</strong>
             </p>
             <div style={{ display: 'flex', gap: '15px' }}>
                <button style={{ 
                  flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', 
                  background: 'white', color: '#334155', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px'
                }}>
                  <Download size={16} /> Backup
                </button>
                <button style={{ 
                  flex: 1, padding: '12px', border: 'none', borderRadius: '10px', 
                  background: '#e11d48', color: 'white', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px'
                }}>
                  <Trash2 size={16} /> Reset
                </button>
             </div>
          </div>
        </div>

        {/* 5. SECURITY SECTION (بقي بعرض كامل في الأسفل) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <SecurityManager 
            supabaseEnabled={supabaseEnabled} 
            supabase={supabase} 
            currentUser={currentUser} 
            users={users} 
            setUsers={setUsers} 
            onLogout={onLogout} 
          />
        </div>

      </div>
    </div>
  );
}