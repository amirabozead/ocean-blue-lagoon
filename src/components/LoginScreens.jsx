import React, { useState } from "react";
import { storeLoad, storeSave } from "../utils/helpers";

// Hero image for brand panel (place maldives.jpg or any resort image in public/)
const BG_IMAGE = "/maldives.jpg";

// --- Professional hotel login styles ---
const styles = `
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden !important;
    overscroll-behavior: none;
    font-family: "Inter", system-ui, sans-serif;
  }

  .login-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: #0f172a;
    overflow: hidden;
  }

  /* Left: Brand / hero panel */
  .brand-side {
    flex: 1.4;
    min-width: 0;
    height: 100%;
    background-color: #0f172a;
    background-image: url('${BG_IMAGE}');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    position: relative;
  }

  .brand-side::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 58, 138, 0.75) 50%, rgba(15, 23, 42, 0.6) 100%);
    pointer-events: none;
  }

  .brand-content {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 56px;
    color: #fff;
    text-align: center;
  }

  .brand-badge {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
  }

  .brand-side .brand-logo {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid rgba(255, 255, 255, 0.25);
    margin-bottom: 28px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .brand-side .brand-name {
    font-family: 'Dancing Script', cursive;
    font-size: 48px;
    font-weight: 700;
    line-height: 1.15;
    margin: 0 0 8px 0;
    color: #fff;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .brand-side .brand-tagline {
    font-family: 'Dancing Script', cursive;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 48px 0;
    text-align: center;
  }

  .brand-side .brand-footer {
    margin-top: auto;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.5px;
  }

  /* Right: Form panel */
  .form-side {
    flex: 0.9;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    max-width: 520px;
    min-width: 400px;
    box-sizing: border-box;
    position: relative;
    border-left: 1px solid rgba(226, 232, 240, 0.6);
    box-shadow: -12px 0 40px rgba(0, 0, 0, 0.06), inset 1px 0 0 rgba(255, 255, 255, 0.8);
  }

  .form-inner {
    width: 100%;
    max-width: 380px;
    animation: fadeInUp 0.5s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .form-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .form-logo-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28px;
  }

  .form-side .form-logo {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid rgba(30, 64, 175, 0.15);
    display: block;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .form-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
    display: block;
  }

  .form-subtitle {
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .form-description {
    font-size: 14px;
    color: #64748b;
    margin-top: 8px;
    font-weight: 400;
  }

  .form-content {
    width: 100%;
    background: #fff;
    padding: 32px;
    border-radius: 16px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  }

  .input-group {
    margin-bottom: 24px;
  }

  .input-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }

  .input-label::before {
    content: '';
    width: 3px;
    height: 12px;
    background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%);
    border-radius: 2px;
  }

  .input-field {
    width: 100%;
    padding: 15px 18px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    margin-bottom: 0;
    background: #fafbfc;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    color: #0f172a;
    font-weight: 500;
  }

  .input-field:hover {
    border-color: #cbd5e1;
    background: #fff;
  }

  .input-field:focus {
    border-color: #1e40af;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(30, 64, 175, 0.1), 0 2px 8px rgba(30, 64, 175, 0.08);
    outline: none;
    transform: translateY(-1px);
  }

  .input-field::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }

  select.input-field {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    padding-right: 42px;
  }

  .login-btn {
    width: 100%;
    padding: 17px;
    background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%);
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 8px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    box-shadow: 0 4px 16px rgba(30, 64, 175, 0.4), 0 2px 4px rgba(30, 64, 175, 0.2);
    position: relative;
    overflow: hidden;
  }

  .login-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.25s;
  }

  .login-btn:hover {
    background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(30, 64, 175, 0.45), 0 4px 8px rgba(30, 64, 175, 0.25);
  }

  .login-btn:hover::before {
    opacity: 1;
  }

  .login-btn:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.35);
  }

  .error-msg {
    color: #b91c1c;
    margin-bottom: 20px;
    text-align: center;
    font-weight: 600;
    font-size: 13px;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    padding: 14px 16px;
    border-radius: 10px;
    border: 1.5px solid #fecaca;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 4px rgba(185, 28, 28, 0.1);
  }

  .error-msg::before {
    content: '⚠';
    font-size: 16px;
  }

  .show-pin-label {
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    user-select: none;
    margin-top: 20px;
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 0.2s, color 0.2s;
    font-weight: 500;
  }

  .show-pin-label:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .show-pin-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #1e40af;
  }

  .bottom-actions {
    position: absolute;
    bottom: 32px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
  }

  .system-config-btn {
    background: #fff;
    border: 1.5px solid #e2e8f0;
    color: #475569;
    font-size: 11px;
    cursor: pointer;
    padding: 11px 22px;
    border-radius: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .system-config-btn:hover {
    background: #f8fafc;
    color: #1e40af;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  .system-config-btn:active {
    transform: translateY(0);
  }

  .system-config-btn span {
    font-size: 15px;
    line-height: 1;
  }

  /* Toggle (Cloud settings screen) */
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
    background-color: #cbd5e1;
    transition: 0.25s;
    border-radius: 28px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background-color: #fff;
    transition: 0.25s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  input:checked + .slider {
    background-color: #1e40af;
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
    .form-side {
      flex: 1;
      padding: 40px 32px;
      max-width: 100%;
      min-width: 0;
      border-left: none;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }
    .form-inner { max-width: 100%; }
    .form-content {
      padding: 28px 24px;
    }
    .form-header {
      margin-bottom: 32px;
    }
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
        {/* Left: Hotel brand hero */}
        <div className="brand-side">
          <div className="brand-content">
            <span className="brand-badge">Staff Portal</span>
            <img
              src={logoUrl}
              alt=""
              className="brand-logo"
              onError={(e) => (e.target.style.display = "none")}
            />
            <h1 className="brand-name">{hotelName}</h1>
            <p className="brand-tagline">Maldives Resort</p>
            <p className="brand-footer">Confidential · Authorized personnel only</p>
          </div>
        </div>

        {/* Right: Sign-in form */}
        <div className="form-side">
          <div className="form-inner">
            <div className="form-header">
              <div className="form-logo-wrapper">
                <img
                  src={logoUrl}
                  alt=""
                  className="form-logo"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
              <span className="form-title">Back office</span>
              <h2 className="form-subtitle">Sign in to your account</h2>
              <p className="form-description">Enter your credentials to access the system</p>
            </div>

            <div className="form-content">
              <div className="input-group">
                <label className="input-label">Administrator</label>
                <select
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                >
                  {(users || []).map((u) => (
                    <option key={u.id} value={u.username}>{u.username}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Security PIN</label>
                <input
                  className="input-field"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  onKeyDown={(e) => e.key === "Enter" && tryLogin()}
                  placeholder="Enter your PIN"
                  style={{
                    letterSpacing: showPin ? "normal" : "6px",
                    fontFamily: showPin ? "inherit" : "ui-monospace, monospace",
                  }}
                />
              </div>

              {err && <div className="error-msg">{err}</div>}

              <button className="login-btn" onClick={tryLogin}>
                Sign in
              </button>

              <div style={{ textAlign: "center" }}>
                <label className="show-pin-label">
                  <input
                    type="checkbox"
                    checked={showPin}
                    onChange={(e) => setShowPin(e.target.checked)}
                  />
                  Show PIN
                </label>
              </div>
            </div>
          </div>

          <div className="bottom-actions">
            <button className="system-config-btn" onClick={handleOpenSettings}>
              <span>⚙</span> System configuration
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