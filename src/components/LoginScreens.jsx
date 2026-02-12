import React, { useState } from "react";
import { storeLoad, storeSave } from "../utils/helpers";

// استدعاء الصورة من مجلد public
const BG_IMAGE = "/maldives.jpg"; 

// اللون الأساسي
const PRIMARY_COLOR = "#0ea5e9"; 

// --- تعريف الـ CSS Styles ---
const styles = `
  html, body, #root { 
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden !important; 
    overscroll-behavior: none; 
    font-family: "Segoe UI", sans-serif;
  }

  .login-container {
    display: flex;
    height: 100vh; 
    width: 100vw;
    background: #fff;
    overflow: hidden;
  }

  .brand-side {
    flex: 1.6;
    height: 100%;
    background-image: url('${BG_IMAGE}');
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    position: relative;
    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
            mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
  }

  .form-side {
    flex: 0.8;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; 
    padding: 40px 80px;
    background: #ffffff;
    max-width: 550px;
    box-sizing: border-box;
    z-index: 10;
    position: relative;
  }

  .hotel-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30px;
    perspective: 1000px; 
  }
  
  .logo-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    margin-bottom: 20px;
    background: #fff;
    border: 4px solid #f0f9ff; 
    transform-style: preserve-3d;
    animation: coin-spin 8s linear infinite;
  }

  .hotel-logo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    backface-visibility: visible; 
  }

  @keyframes coin-spin {
    from { transform: rotateY(0deg); }
    to { transform: rotateY(360deg); }
  }

  .hotel-name {
    margin: 0; 
    font-size: 45px; 
    font-family: 'Brush Script MT', cursive;
    line-height: 1.1;
    text-align: center;
    background: -webkit-linear-gradient(45deg, #0ea5e9, #2563eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #0284c7;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  }

  .hotel-sub {
    font-size: 22px; 
    font-family: 'Brush Script MT', cursive; 
    color: #94a3b8;
    margin-top: 5px;
    text-align: center;
    display: block;
  }

  .form-content {
    width: 100%;
    max-width: 400px;
  }

  .input-label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: left;
  }

  .input-field {
    width: 100%;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 16px;
    margin-bottom: 24px;
    background: #f8fafc;
    transition: all 0.3s ease;
    box-sizing: border-box;
    color: #334155;
    font-weight: 600;
  }

  .input-field:focus {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1);
    outline: none;
  }
  
  .login-btn {
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
    color: white;
    font-weight: 800;
    font-size: 16px;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    margin-top: 10px;
    letter-spacing: 1px;
    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
  }

  .login-btn:hover {
    background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%);
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(37, 99, 235, 0.3);
  }

  .error-msg {
    color: #ef4444;
    margin-bottom: 20px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    background: #fef2f2;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #fee2e2;
  }

  .show-pin-label {
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }

  .bottom-actions {
    position: absolute;
    bottom: 30px;
    width: 100%;
    display: flex;
    justify-content: center;
    left: 0;
  }

  .system-config-btn {
    background: white;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
    padding: 10px 24px;
    border-radius: 50px; 
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  }
  
  .system-config-btn:hover {
    background: #f8fafc;
    color: #0ea5e9; 
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.05);
  }

  .system-config-btn span {
    font-size: 16px; 
  }

  /* --- Toggle Switch Styles --- */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 28px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #0ea5e9;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #0ea5e9;
  }

  input:checked + .slider:before {
    transform: translateX(22px);
  }

  .toggle-label {
    margin-left: 10px;
    font-size: 14px;
    color: #334155;
    font-weight: 600;
  }

  @media (max-width: 1024px) {
    .brand-side { display: none; }
    .form-side { flex: 1; padding: 40px; max-width: 100%; }
    .form-content { max-width: 100%; }
  }
`;

export function SecurityLoginScreen({ users, onLogin, onOpenCloudSettings }) {
  const [username, setUsername] = useState(users?.[0]?.username || "admin");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [showPin, setShowPin] = useState(false);

  const settings = storeLoad("ocean_settings_v1") || {};
  const hotelName = settings.hotelName || "Ocean Blue Lagoon";
  const logoUrl = settings.logoUrl || "/logo.png";

  const tryLogin = () => {
    const u = (users || []).find((x) => x.username === username);
    if (!u) return setErr("User account not found");
    if (String(u.pin || "") !== String(pin || "")) {
       return setErr("Incorrect Security PIN");
    }
    setErr("");
    onLogin(u);
  };

  const handlePinChange = (e) => {
    setPin(e.target.value);
    if (err) setErr("");
  };

  const handleOpenSettings = () => {
    if (onOpenCloudSettings) {
        onOpenCloudSettings();
    } else {
        alert("System Configuration function is not connected properly.");
    }
  };

  return (
    <>
      <style>{styles}</style>
      
      <div className="login-container">
        <div className="brand-side"></div>
        
        <div className="form-side">
          
          <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            
            <div className="hotel-header">
              <div className="logo-wrapper">
                <img 
                  src={logoUrl} 
                  alt="Hotel Logo" 
                  className="hotel-logo" 
                  onError={(e) => e.target.style.display='none'} 
                />
              </div>
              <h1 className="hotel-name">{hotelName}</h1>
              <span className="hotel-sub">Maldives Resort</span>
            </div>

            <div className="form-content">
              <label className="input-label">Select Administrator</label>
              <select 
                className="input-field" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
              >
                {(users || []).map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
              
              <label className="input-label">Security PIN</label>
              <input 
                 className="input-field" 
                 type={showPin ? "text" : "password"} 
                 value={pin} 
                 onChange={handlePinChange} 
                 onKeyDown={(e) => e.key === "Enter" && tryLogin()} 
                 placeholder="••••" 
                 style={{ 
                   letterSpacing: showPin ? "normal" : "6px", 
                   fontWeight: "bold",
                   fontFamily: showPin ? "inherit" : "monospace" 
                 }}
              />
              
              {err && <div className="error-msg">⚠ {err}</div>}
              
              <button className="login-btn" onClick={tryLogin}>Access Ocean Blue</button>
              
              <div style={{textAlign:"center", marginTop:20}}>
                  <label className="show-pin-label">
                    <input 
                      type="checkbox" 
                      checked={showPin} 
                      onChange={(e) => setShowPin(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    /> 
                    Show PIN
                  </label>
              </div>
            </div>
          </div>

          <div className="bottom-actions">
              <button className="system-config-btn" onClick={handleOpenSettings}>
                <span>⚙</span> System Configuration
              </button>
          </div>

        </div>
      </div>
    </>
  );
}

export function PreAuthCloudSyncScreen({ sbCfg, sbSaveCfg, onBack }) {
    const [url, setUrl] = useState(String(sbCfg?.url || ""));
    const [anon, setAnon] = useState(String(sbCfg?.anon || ""));
    const [enabled, setEnabled] = useState(!!sbCfg?.enabled);

    const doSave = () => { 
      sbSaveCfg({ url, anon, enabled }, null); 
      alert("Settings Saved!"); 
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
            <style>{styles}</style>
            <div style={{ padding: 40, background: "white", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", width: "100%", maxWidth: 500, textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 42, color: "#0ea5e9", marginBottom: 10 }}>Cloud Settings</h2>
                <p style={{ color: "#64748b", marginBottom: 30, fontSize: 14 }}>Configure your Supabase connection</p>
                
                <div style={{ textAlign: "left" }}>
                  
                  {/* 🔥 زر التبديل الجديد (Toggle Switch) */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "25px", padding: "10px", background: "#f1f5f9", borderRadius: "10px" }}>
                      <label className="toggle-switch">
                          <input 
                              type="checkbox" 
                              checked={enabled} 
                              onChange={(e) => setEnabled(e.target.checked)} 
                          />
                          <span className="slider round"></span>
                      </label>
                      <span className="toggle-label">
                          {enabled ? "Cloud Sync Enabled (Online)" : "Local Mode Only (Offline)"}
                      </span>
                  </div>

                  <label className="input-label">Supabase URL</label>
                  <input className="input-field" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xyz.supabase.co" disabled={!enabled} style={{opacity: enabled ? 1 : 0.6}} />
                  
                  <label className="input-label">Anon Key</label>
                  <input className="input-field" value={anon} onChange={e=>setAnon(e.target.value)} placeholder="public-anon-key" disabled={!enabled} style={{opacity: enabled ? 1 : 0.6}} />
                </div>

                <button className="login-btn" onClick={doSave}>Save & Update</button>
                
                <button 
                  onClick={onBack} 
                  style={{ marginTop: 20, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  ← Back to Login
                </button>
            </div>
        </div>
    );
}

export function SupabaseLoginScreen({ supabase, onOpenCloudSettings }) {
    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
            <style>{styles}</style>
            <div style={{ padding: 40, textAlign: "center", maxWidth: 500, background: "white", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 42, color: "#0ea5e9", marginBottom: 20 }}>Cloud Authentication</h2>
                <p style={{ color: "#64748b", marginBottom: 30 }}>Please sign in to continue</p>
                <button className="login-btn" onClick={onOpenCloudSettings}>Settings</button>
            </div>
        </div>
    );
}